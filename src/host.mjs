import { spawn } from "node:child_process";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import net from "node:net";
import tls from "node:tls";
import {
  Agent,
  Dispatcher,
  ProxyAgent,
  getGlobalDispatcher,
  request,
  setGlobalDispatcher,
} from "undici";
import {
  CREDENTIAL_KEY,
  DEFAULT_CONFIG,
  PROXY_KEYS,
  ROUTE_PREFIX,
  buildProxyUrl,
  normalizeConfig,
  npmrcLines,
  publicConfig,
  redactProxyUrl,
  replaceMarkedBlock,
  shouldBypassProxy,
  validateConfig,
} from "./shared.mjs";

export const name = "network-proxy-settings";
export const inject = ["webServer", "credentials"];

const BODY_LIMIT = 64 * 1024;
const TEST_TIMEOUT_MS = 15_000;
const TEST_BODY_LIMIT = 1024 * 1024;
const ENV_KEYS = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "all_proxy", "no_proxy"];
const PERSIST_KEYS = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"];

function profileDir() {
  return process.env.DSH_PROFILE_DIR || process.env.DSH_HOME || process.cwd();
}

function configPath() {
  return join(profileDir(), ".dsh-network-proxy-settings.json");
}

function npmrcPath() {
  return join(profileDir(), ".npmrc");
}

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function safeErrorMessage(error) {
  return String(error?.message ?? error)
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+(?::[^\s/@]*)?@/gi, "$1***@");
}

function sameOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function guard(req, res, method) {
  if (!sameOrigin(req)) {
    json(res, 403, { ok: false, error: "forbidden origin" });
    return false;
  }
  if (req.method !== method) {
    json(res, 405, { ok: false, error: "method not allowed" });
    return false;
  }
  return true;
}

function jsonObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Buffer.isBuffer(value)) {
    throw new Error("JSON body must be an object");
  }
  return value;
}

function readJsonBody(req) {
  if (req?.body !== undefined && req.body !== null) {
    try {
      if (typeof req.body === "object") return Promise.resolve(jsonObject(req.body));
      if (Buffer.byteLength(String(req.body), "utf8") > BODY_LIMIT) throw new Error("body too large");
      return Promise.resolve(jsonObject(JSON.parse(req.body)));
    } catch (error) {
      return Promise.reject(error instanceof SyntaxError ? new Error("invalid JSON body") : error);
    }
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(jsonObject(JSON.parse(Buffer.concat(chunks).toString("utf8"))));
      } catch (error) {
        reject(error instanceof SyntaxError ? new Error("invalid JSON body") : error);
      }
    });
    req.on("error", reject);
  });
}

async function readTextFileState(file) {
  try {
    return { exists: true, content: await readFile(file, "utf8") };
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, content: "" };
    throw error;
  }
}

async function writeTextFileAtomic(file, content) {
  await mkdir(profileDir(), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temporary, content, "utf8");
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

async function restoreTextFileState(file, state) {
  if (state.exists) await writeTextFileAtomic(file, state.content);
  else await unlink(file).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
}

async function loadConfig() {
  const state = await readTextFileState(configPath());
  if (!state.exists) return normalizeConfig(DEFAULT_CONFIG);
  const parsed = JSON.parse(state.content);
  const { config, errors } = validateConfig(parsed);
  if (errors.length) throw new Error(`代理配置无效：${errors.join("；")}`);
  return config;
}

async function saveConfig(config) {
  await writeTextFileAtomic(configPath(), `${JSON.stringify(normalizeConfig(config), null, 2)}\n`);
}

function isSecretRecord(record) {
  return record?.kind === "grant" && record.payload && typeof record.payload === "object";
}

function stringRecord(value) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item === "string" || item === null));
}

async function readSecret(ctx) {
  const record = await ctx.credentials.readRecord(CREDENTIAL_KEY);
  if (!isSecretRecord(record)) {
    return { exists: false, record: undefined, passwords: {}, legacyPassword: "", persistedEnv: {}, previousUserEnv: {} };
  }
  return {
    exists: true,
    record,
    passwords: stringRecord(record.payload.passwords),
    legacyPassword: typeof record.payload.password === "string" ? record.payload.password : "",
    persistedEnv: stringRecord(record.payload.persistedEnv),
    previousUserEnv: stringRecord(record.payload.previousUserEnv),
  };
}

function passwordsForConfig(secret, config) {
  const passwords = Object.fromEntries(PROXY_KEYS.map((key) => [key, String(secret.passwords?.[key] ?? "")]));
  if (secret.legacyPassword && !PROXY_KEYS.some((key) => passwords[key])) {
    for (const key of PROXY_KEYS) {
      if (config.proxies[key].enabled) passwords[key] = secret.legacyPassword;
    }
  }
  return passwords;
}

async function writeSecret(ctx, secret) {
  await ctx.credentials.modifyRecord(CREDENTIAL_KEY, () => ({
    kind: "grant",
    payload: {
      passwords: Object.fromEntries(PROXY_KEYS.map((key) => [key, String(secret.passwords?.[key] ?? "")])),
      persistedEnv: stringRecord(secret.persistedEnv),
      previousUserEnv: stringRecord(secret.previousUserEnv),
    },
  }));
}

async function restoreSecret(ctx, secret) {
  await ctx.credentials.modifyRecord(CREDENTIAL_KEY, () => secret.exists ? secret.record : undefined);
}

function onceCallback(callback) {
  let called = false;
  return (error, socket) => {
    if (called) return;
    called = true;
    callback(error, socket);
  };
}

function createSocketReader(socket) {
  let buffered = Buffer.alloc(0);
  let pending;
  let failure;
  const pump = () => {
    if (!pending || buffered.length < pending.size) return;
    const { size, resolve } = pending;
    pending = undefined;
    const value = buffered.subarray(0, size);
    buffered = buffered.subarray(size);
    resolve(value);
  };
  const onData = (chunk) => {
    buffered = Buffer.concat([buffered, chunk]);
    pump();
  };
  const onError = (error) => {
    failure = error;
    if (pending) {
      const { reject } = pending;
      pending = undefined;
      reject(error);
    }
  };
  const onClose = () => onError(new Error("SOCKS5 proxy closed the connection"));
  socket.on("data", onData);
  socket.once("error", onError);
  socket.once("close", onClose);
  return {
    read(size) {
      if (failure) return Promise.reject(failure);
      if (pending) return Promise.reject(new Error("concurrent SOCKS5 reads are not supported"));
      return new Promise((resolve, reject) => {
        pending = { size, resolve, reject };
        pump();
      });
    },
    detach() {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
      if (buffered.length) socket.unshift(buffered);
      buffered = Buffer.alloc(0);
    },
  };
}

function writeSocket(socket, data) {
  return new Promise((resolve, reject) => {
    socket.write(data, (error) => error ? reject(error) : resolve());
  });
}

async function openSocks5Tunnel(config, password, destinationHost, destinationPort) {
  const socket = net.createConnection({ host: config.host, port: config.port });
  socket.setTimeout(15_000, () => socket.destroy(new Error("SOCKS5 proxy connection timed out")));
  try {
    await new Promise((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", reject);
    });
    const reader = createSocketReader(socket);
    const username = Buffer.from(config.username || "", "utf8");
    const passwordBytes = Buffer.from(String(password ?? ""), "utf8");
    if (username.length > 255 || passwordBytes.length > 255) throw new Error("SOCKS5 username/password is too long");
    const methods = username.length ? Buffer.from([0x05, 0x02, 0x00, 0x02]) : Buffer.from([0x05, 0x01, 0x00]);
    await writeSocket(socket, methods);
    const greeting = await reader.read(2);
    if (greeting[0] !== 0x05 || greeting[1] === 0xff) throw new Error("SOCKS5 proxy rejected all authentication methods");
    if (greeting[1] === 0x02) {
      await writeSocket(socket, Buffer.concat([
        Buffer.from([0x01, username.length]), username,
        Buffer.from([passwordBytes.length]), passwordBytes,
      ]));
      const auth = await reader.read(2);
      if (auth[1] !== 0x00) throw new Error("SOCKS5 username or password was rejected");
    } else if (greeting[1] !== 0x00) {
      throw new Error(`unsupported SOCKS5 authentication method ${greeting[1]}`);
    }
    const destination = Buffer.from(destinationHost, "utf8");
    if (destination.length > 255) throw new Error("SOCKS5 destination hostname is too long");
    await writeSocket(socket, Buffer.concat([
      Buffer.from([0x05, 0x01, 0x00, 0x03, destination.length]),
      destination,
      Buffer.from([(destinationPort >> 8) & 0xff, destinationPort & 0xff]),
    ]));
    const response = await reader.read(4);
    if (response[0] !== 0x05 || response[1] !== 0x00) throw new Error(`SOCKS5 CONNECT failed with code ${response[1]}`);
    if (response[3] === 0x01) await reader.read(4);
    else if (response[3] === 0x04) await reader.read(16);
    else if (response[3] === 0x03) {
      const length = (await reader.read(1))[0];
      await reader.read(length);
    } else {
      throw new Error(`invalid SOCKS5 address type ${response[3]}`);
    }
    await reader.read(2);
    reader.detach();
    socket.setTimeout(0);
    return socket;
  } catch (error) {
    socket.destroy();
    throw error;
  }
}

export function createSocksAgent(config, password) {
  return new Agent({
    connect(options, callback) {
      const done = onceCallback(callback);
      const destinationHost = String(options.hostname ?? options.host ?? "").replace(/^\[|\]$/g, "");
      const destinationPort = Number(options.port || (options.protocol === "https:" ? 443 : 80));
      openSocks5Tunnel(config, password, destinationHost, destinationPort).then((socket) => {
        if (options.protocol !== "https:") {
          done(null, socket);
          return;
        }
        const requestedServername = options.servername || destinationHost;
        const secure = tls.connect({
          socket,
          servername: net.isIP(requestedServername) ? undefined : requestedServername,
          ALPNProtocols: ["http/1.1"],
          rejectUnauthorized: config.rejectUnauthorized !== false && options.rejectUnauthorized !== false,
        });
        secure.once("secureConnect", () => done(null, secure));
        secure.once("error", (error) => done(error, null));
      }).catch((error) => done(error, null));
    },
  });
}

export class RoutingDispatcher extends Dispatcher {
  constructor({ routes, direct, noProxy }) {
    super();
    this.routes = routes;
    this.direct = direct;
    this.noProxy = noProxy;
  }

  dispatch(options, handler) {
    const origin = options.origin instanceof URL ? options.origin : new URL(String(options.origin));
    if (shouldBypassProxy(origin, this.noProxy)) return this.direct.dispatch(options, handler);
    const route = origin.protocol === "https:"
      ? (this.routes.https ?? this.routes.all)
      : (this.routes.http ?? this.routes.all);
    return (route ?? this.direct).dispatch(options, handler);
  }

  resources() {
    return new Set([this.direct, ...Object.values(this.routes).filter(Boolean)]);
  }

  async close() {
    await Promise.allSettled([...this.resources()].map((dispatcher) => dispatcher.close()));
  }

  async destroy(error) {
    await Promise.allSettled([...this.resources()].map((dispatcher) => dispatcher.destroy(error)));
  }
}

function createEndpointDispatcher(endpoint, password) {
  const proxyUrl = buildProxyUrl(endpoint, password);
  return endpoint.scheme === "socks5"
    ? createSocksAgent(endpoint, password)
    : new ProxyAgent({ uri: proxyUrl });
}

export function createDispatcher(config, passwords = {}) {
  const normalized = normalizeConfig(config);
  const passwordMap = typeof passwords === "string"
    ? Object.fromEntries(PROXY_KEYS.map((key) => [key, passwords]))
    : passwords;
  const routes = {};
  for (const key of PROXY_KEYS) {
    if (!normalized.proxies[key].enabled) continue;
    const raw = config?.proxies?.[key] ?? (key === "all" ? config : {});
    const endpoint = { ...normalized.proxies[key], rejectUnauthorized: raw?.rejectUnauthorized };
    routes[key] = createEndpointDispatcher(endpoint, passwordMap?.[key] ?? "");
  }
  return new RoutingDispatcher({ routes, direct: new Agent(), noProxy: normalized.noProxy });
}

async function requestFollowingRedirects(target, options, maximum = 3) {
  let current = target instanceof URL ? target : new URL(String(target));
  for (let redirects = 0; ; redirects += 1) {
    const response = await request(current, options);
    const location = response.headers.location;
    const redirect = [301, 302, 303, 307, 308].includes(response.statusCode) && location;
    if (!redirect) return response;
    if (redirects >= maximum) {
      response.body.destroy();
      throw new Error(`测试网址重定向超过 ${maximum} 次`);
    }
    const next = new URL(location, current);
    if (!["http:", "https:"].includes(next.protocol) || next.username || next.password) {
      response.body.destroy();
      throw new Error("测试网址重定向到了不受支持或包含凭据的地址");
    }
    response.body.destroy();
    current = next;
  }
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function proxyUrlsForConfig(config, passwords = {}) {
  const configured = {};
  for (const key of PROXY_KEYS) {
    const endpoint = config.proxies[key];
    if (endpoint.enabled) configured[key] = buildProxyUrl(endpoint, passwords[key] ?? "");
  }
  return {
    http: configured.http ?? configured.all ?? null,
    https: configured.https ?? configured.all ?? null,
    all: configured.all ?? null,
  };
}

function processProxyValues(config, proxyUrls) {
  return {
    HTTP_PROXY: proxyUrls.http,
    HTTPS_PROXY: proxyUrls.https,
    ALL_PROXY: proxyUrls.all,
    NO_PROXY: config.noProxy || null,
    http_proxy: proxyUrls.http,
    https_proxy: proxyUrls.https,
    all_proxy: proxyUrls.all,
    no_proxy: config.noProxy || null,
  };
}

function currentProcessValue(key) {
  return hasOwn(process.env, key) ? process.env[key] : null;
}

function setProcessValue(key, value) {
  if (value === null || value === undefined || value === "") delete process.env[key];
  else process.env[key] = value;
}

function createProcessEnvironmentManager() {
  let managed = {};
  let original = {};
  return {
    snapshot() {
      return {
        values: Object.fromEntries(ENV_KEYS.map((key) => [key, currentProcessValue(key)])),
        managed: { ...managed },
        original: { ...original },
      };
    },
    restore(snapshot) {
      for (const key of ENV_KEYS) setProcessValue(key, snapshot.values[key]);
      managed = { ...snapshot.managed };
      original = { ...snapshot.original };
    },
    assertOwned() {
      for (const key of Object.keys(managed)) {
        if (currentProcessValue(key) !== managed[key]) {
          throw new Error(`进程环境变量 ${key} 已被其他组件修改，已停止覆盖`);
        }
      }
    },
    apply(config, proxyUrls) {
      this.assertOwned();
      if (config.scopes.children) {
        const desired = processProxyValues(config, proxyUrls);
        for (const key of ENV_KEYS) {
          if (!hasOwn(managed, key)) original[key] = currentProcessValue(key);
          setProcessValue(key, desired[key]);
          managed[key] = desired[key];
        }
        return;
      }
      this.release();
    },
    release() {
      for (const key of Object.keys(managed)) {
        if (currentProcessValue(key) === managed[key]) setProcessValue(key, original[key]);
        delete managed[key];
        delete original[key];
      }
    },
    clearInherited(previous) {
      for (const key of PERSIST_KEYS) {
        if (!hasOwn(previous, key)) continue;
        for (const candidate of [key, key.toLowerCase()]) {
          if (currentProcessValue(candidate) === previous[key]) setProcessValue(candidate, null);
        }
      }
    },
  };
}

async function updateNpmrc(config, proxyUrls) {
  const file = npmrcPath();
  const previous = await readTextFileState(file);
  const next = replaceMarkedBlock(
    previous.content,
    config.scopes.packageManager ? npmrcLines(proxyUrls, config.noProxy) : [],
  );
  if (next === previous.content) return previous;
  if (next) await writeTextFileAtomic(file, next);
  else await restoreTextFileState(file, { exists: false, content: "" });
  return previous;
}

function runFile(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else {
        const error = new Error(`${command} exited ${code}: ${stderr.trim() || stdout.trim()}`);
        error.exitCode = code;
        reject(error);
      }
    });
  });
}

async function queryWindowsUserEnvironment() {
  const { stdout } = await runFile("reg.exe", ["query", "HKCU\\Environment"]);
  const values = {};
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^\s*([^\s]+)\s+REG_\w+\s*(.*)$/i);
    if (match && PERSIST_KEYS.includes(match[1].toUpperCase())) values[match[1].toUpperCase()] = match[2];
  }
  return values;
}

async function setWindowsUserEnvironment(name, value) {
  if (value === null || value === undefined) {
    await runFile("reg.exe", ["delete", "HKCU\\Environment", "/v", name, "/f"]);
  } else {
    await runFile("reg.exe", ["add", "HKCU\\Environment", "/v", name, "/t", "REG_SZ", "/d", value, "/f"]);
  }
}

export function planWindowsUserEnvironment(desired, current, previousOwned = {}, previousOriginal = {}) {
  const operations = {};
  const persistedEnv = {};
  const originalEnv = {};
  for (const key of PERSIST_KEYS) {
    const currentValue = hasOwn(current, key) ? current[key] : null;
    const stillOwned = hasOwn(previousOwned, key) && currentValue === previousOwned[key];
    const originalValue = stillOwned
      ? (hasOwn(previousOriginal, key) ? previousOriginal[key] : null)
      : currentValue;
    if (hasOwn(desired, key)) {
      if (currentValue !== desired[key]) operations[key] = desired[key];
      persistedEnv[key] = desired[key];
      originalEnv[key] = originalValue;
    } else if (stillOwned && currentValue !== originalValue) {
      operations[key] = originalValue;
    }
  }
  return { operations, persistedEnv, previousUserEnv: originalEnv };
}

async function notifyWindowsEnvironmentChanged() {
  const script = [
    "$signature='[DllImport(\"user32.dll\", CharSet=CharSet.Unicode, SetLastError=true)] public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint flags, uint timeout, out UIntPtr result);'",
    "$native=Add-Type -MemberDefinition $signature -Name NativeMethods -Namespace DshProxy -PassThru",
    "$result=[UIntPtr]::Zero",
    "[void]$native::SendMessageTimeout([IntPtr]0xffff,0x1a,[UIntPtr]::Zero,'Environment',2,5000,[ref]$result)",
  ].join(";");
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  await runFile("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded]);
}

async function restoreWindowsUserEnvironment(snapshot, keys) {
  for (const key of [...keys].reverse()) {
    await setWindowsUserEnvironment(key, hasOwn(snapshot, key) ? snapshot[key] : null);
  }
  if (keys.length) await notifyWindowsEnvironmentChanged();
}

async function persistWindowsUserEnvironment(config, proxyUrls, previousSecret) {
  if (!config.scopes.persistUserEnv && Object.keys(previousSecret.persistedEnv).length === 0) {
    return { persistedEnv: {}, previousUserEnv: {}, rollback: async () => {} };
  }
  if (process.platform !== "win32") {
    if (config.scopes.persistUserEnv) throw new Error("用户环境变量持久化目前只支持 Windows");
    return { persistedEnv: {}, previousUserEnv: {}, rollback: async () => {} };
  }
  const desired = config.scopes.persistUserEnv
    ? {
        ...(proxyUrls.http ? { HTTP_PROXY: proxyUrls.http } : {}),
        ...(proxyUrls.https ? { HTTPS_PROXY: proxyUrls.https } : {}),
        ...(proxyUrls.all ? { ALL_PROXY: proxyUrls.all } : {}),
        ...(config.noProxy ? { NO_PROXY: config.noProxy } : {}),
      }
    : {};
  const snapshot = await queryWindowsUserEnvironment();
  const plan = planWindowsUserEnvironment(
    desired,
    snapshot,
    previousSecret.persistedEnv,
    previousSecret.previousUserEnv,
  );
  const changed = [];
  try {
    for (const [key, value] of Object.entries(plan.operations)) {
      await setWindowsUserEnvironment(key, value);
      changed.push(key);
    }
    if (changed.length) await notifyWindowsEnvironmentChanged();
  } catch (error) {
    await restoreWindowsUserEnvironment(snapshot, changed).catch(() => {});
    throw error;
  }
  return {
    persistedEnv: plan.persistedEnv,
    previousUserEnv: plan.previousUserEnv,
    rollback: () => restoreWindowsUserEnvironment(snapshot, changed),
  };
}

function warningsFor(config) {
  const warnings = [];
  const hasAuthenticatedProxy = PROXY_KEYS.some((key) => config.proxies[key].enabled && config.proxies[key].username);
  if (hasAuthenticatedProxy && config.scopes.packageManager) warnings.push("warningNpmrcCredentials");
  if (hasAuthenticatedProxy && config.scopes.persistUserEnv) warnings.push("warningUserEnvCredentials");
  if (config.scopes.persistUserEnv) warnings.push("warningRestartRequired");
  return warnings;
}

export function apply(ctx) {
  const processEnvironment = createProcessEnvironmentManager();
  let activeDispatcher = null;
  let dispatcherToRestore = null;
  let currentConfig = normalizeConfig(DEFAULT_CONFIG);
  let startupError;
  let disposed = false;

  const assertRuntimeOwnership = () => {
    if (activeDispatcher && getGlobalDispatcher() !== activeDispatcher) {
      throw new Error("全局网络 Dispatcher 已被其他组件替换，已停止覆盖");
    }
  };

  const installRuntimeDispatcher = (candidate) => {
    assertRuntimeOwnership();
    const previous = activeDispatcher;
    if (candidate) {
      if (!activeDispatcher) dispatcherToRestore = getGlobalDispatcher();
      setGlobalDispatcher(candidate);
      activeDispatcher = candidate;
    } else if (activeDispatcher) {
      setGlobalDispatcher(dispatcherToRestore);
      activeDispatcher = null;
      dispatcherToRestore = null;
    }
    globalThis.__dshNetworkProxyManaged = activeDispatcher !== null;
    return previous;
  };

  const closeReplacedDispatcher = (previous) => {
    if (previous && previous !== activeDispatcher) void previous.close().catch(() => {});
  };

  const rollbackAll = async (undos, originalError) => {
    const rollbackErrors = [];
    for (const undo of [...undos].reverse()) {
      try {
        await undo();
      } catch (error) {
        rollbackErrors.push(safeErrorMessage(error));
      }
    }
    if (!rollbackErrors.length) throw originalError;
    throw new Error(`${safeErrorMessage(originalError)}；回滚失败：${rollbackErrors.join("；")}`);
  };

  const applyStartupLocalState = async (config, passwords) => {
    const proxyUrls = proxyUrlsForConfig(config, passwords);
    const candidate = config.scopes.runtime ? createDispatcher(config, passwords) : null;
    const processSnapshot = processEnvironment.snapshot();
    let npmrcSnapshot;
    try {
      assertRuntimeOwnership();
      processEnvironment.assertOwned();
      npmrcSnapshot = await updateNpmrc(config, proxyUrls);
      processEnvironment.apply(config, proxyUrls);
      const previous = installRuntimeDispatcher(candidate);
      closeReplacedDispatcher(previous);
      currentConfig = config;
    } catch (error) {
      processEnvironment.restore(processSnapshot);
      if (npmrcSnapshot) await restoreTextFileState(npmrcPath(), npmrcSnapshot).catch(() => {});
      if (candidate && candidate !== activeDispatcher) await candidate.close().catch(() => {});
      throw error;
    }
  };

  const commitConfiguration = async (config, passwords, { reset = false } = {}) => {
    if (disposed) throw new Error("插件正在停止，不能再修改代理配置");
    const proxyUrls = proxyUrlsForConfig(config, passwords);
    const candidate = config.scopes.runtime ? createDispatcher(config, passwords) : null;
    const previousSecret = await readSecret(ctx);
    const previousConfigFile = await readTextFileState(configPath());
    const processSnapshot = processEnvironment.snapshot();
    const undos = [];
    let windowsState;
    try {
      assertRuntimeOwnership();
      processEnvironment.assertOwned();

      windowsState = await persistWindowsUserEnvironment(config, proxyUrls, previousSecret);
      undos.push(windowsState.rollback);

      const npmrcSnapshot = await updateNpmrc(config, proxyUrls);
      undos.push(() => restoreTextFileState(npmrcPath(), npmrcSnapshot));

      if (reset) await ctx.credentials.modifyRecord(CREDENTIAL_KEY, () => undefined);
      else {
        await writeSecret(ctx, {
          exists: true,
          passwords,
          persistedEnv: windowsState.persistedEnv,
          previousUserEnv: windowsState.previousUserEnv,
        });
      }
      undos.push(() => restoreSecret(ctx, previousSecret));

      if (reset) await restoreTextFileState(configPath(), { exists: false, content: "" });
      else await saveConfig(config);
      undos.push(() => restoreTextFileState(configPath(), previousConfigFile));

      processEnvironment.apply(config, proxyUrls);
      if (!config.scopes.children) processEnvironment.clearInherited(previousSecret.persistedEnv);
      undos.push(() => processEnvironment.restore(processSnapshot));

      const previousDispatcher = installRuntimeDispatcher(candidate);
      currentConfig = reset ? normalizeConfig(DEFAULT_CONFIG) : config;
      startupError = undefined;
      closeReplacedDispatcher(previousDispatcher);
      return { proxyUrls, secret: reset ? null : { passwords, ...windowsState } };
    } catch (error) {
      if (candidate && candidate !== activeDispatcher) await candidate.close().catch(() => {});
      return rollbackAll(undos, error);
    }
  };

  const startup = (async () => {
    const config = await loadConfig();
    const secret = await readSecret(ctx);
    await applyStartupLocalState(config, passwordsForConfig(secret, config));
  })().catch((error) => {
    startupError = safeErrorMessage(error);
    ctx.logger?.warn?.("dsh-network-proxy-settings startup apply failed: %s", startupError);
  });

  let mutationTail = startup;
  const enqueueMutation = (operation) => {
    const result = mutationTail.then(operation, operation);
    mutationTail = result.catch(() => {});
    return result;
  };

  const configResponse = async () => {
    await mutationTail;
    const secret = await readSecret(ctx);
    const passwords = passwordsForConfig(secret, currentConfig);
    return publicConfig(currentConfig, {
      hasPasswords: Object.fromEntries(PROXY_KEYS.map((key) => [key, passwords[key].length > 0])),
      applied: !startupError,
      warnings: warningsFor(currentConfig),
    });
  };

  ctx.webServer.register({
    kind: "exact",
    path: `${ROUTE_PREFIX}/config`,
    handler: async (req, res) => {
      if (!guard(req, res, "GET")) return;
      try {
        json(res, 200, { ok: true, config: await configResponse(), startupError });
      } catch (error) {
        json(res, 500, { ok: false, error: safeErrorMessage(error) });
      }
    },
  });

  ctx.webServer.register({
    kind: "exact",
    path: `${ROUTE_PREFIX}/save`,
    handler: async (req, res) => {
      if (!guard(req, res, "POST")) return;
      let body;
      try {
        body = await readJsonBody(req);
      } catch (error) {
        json(res, 400, { ok: false, error: safeErrorMessage(error) });
        return;
      }
      const { config, errors } = validateConfig(body?.config ?? body);
      if (errors.length) {
        json(res, 400, { ok: false, error: errors.join("；"), errors });
        return;
      }
      try {
        const result = await enqueueMutation(async () => {
          const oldSecret = await readSecret(ctx);
          const passwords = passwordsForConfig(oldSecret, config);
          for (const key of PROXY_KEYS) {
            const clear = body?.clearPassword === true
              || body?.clearPasswords?.[key] === true
              || (Array.isArray(body?.clearPasswords) && body.clearPasswords.includes(key));
            if (clear) passwords[key] = "";
            else if (typeof body?.passwords?.[key] === "string" && body.passwords[key] !== "") passwords[key] = body.passwords[key];
            else if (typeof body?.password === "string" && config.proxies[key].enabled) passwords[key] = body.password;
          }
          const committed = await commitConfiguration(config, passwords);
          return { ...committed, passwords };
        });
        const appliedUrls = PROXY_KEYS
          .filter((key) => result.proxyUrls[key])
          .map((key) => `${key}=${redactProxyUrl(result.proxyUrls[key])}`)
          .join(", ");
        ctx.logger?.info?.("dsh-network-proxy-settings applied: %s", appliedUrls || "direct");
        json(res, 200, {
          ok: true,
          config: publicConfig(config, {
            hasPasswords: Object.fromEntries(PROXY_KEYS.map((key) => [key, result.passwords[key].length > 0])),
            applied: true,
            warnings: warningsFor(config),
          }),
        });
      } catch (error) {
        json(res, 500, { ok: false, error: safeErrorMessage(error) });
      }
    },
  });

  ctx.webServer.register({
    kind: "exact",
    path: `${ROUTE_PREFIX}/test`,
    handler: async (req, res) => {
      if (!guard(req, res, "POST")) return;
      await mutationTail;
      let secret;
      let body = {};
      try {
        secret = await readSecret(ctx);
        body = await readJsonBody(req);
      } catch (error) {
        json(res, 400, { ok: false, error: safeErrorMessage(error) });
        return;
      }
      const target = String(body?.url || currentConfig.testUrl || DEFAULT_CONFIG.testUrl);
      let targetUrl;
      try {
        targetUrl = new URL(target);
        if (!["http:", "https:"].includes(targetUrl.protocol) || targetUrl.username || targetUrl.password) {
          throw new Error("unsupported URL");
        }
      } catch {
        json(res, 400, { ok: false, error: "测试网址必须是有效且不含凭据的 HTTP/HTTPS URL" });
        return;
      }
      const dispatcher = createDispatcher(currentConfig, passwordsForConfig(secret, currentConfig));
      const started = Date.now();
      const signal = AbortSignal.timeout(TEST_TIMEOUT_MS);
      try {
        const response = await requestFollowingRedirects(targetUrl, {
          dispatcher,
          method: "GET",
          headersTimeout: 12_000,
          bodyTimeout: 12_000,
          signal,
        });
        let received = 0;
        for await (const chunk of response.body) {
          received += chunk.byteLength;
          if (received > TEST_BODY_LIMIT) throw new Error(`测试响应超过 ${TEST_BODY_LIMIT} 字节限制`);
        }
        const elapsedMs = Date.now() - started;
        const ok = response.statusCode >= 200 && response.statusCode < 400;
        json(res, ok ? 200 : 502, {
          ok,
          statusCode: response.statusCode,
          elapsedMs,
          target: targetUrl.toString(),
          error: ok ? undefined : `目标返回 HTTP ${response.statusCode}`,
        });
      } catch (error) {
        json(res, 502, {
          ok: false,
          elapsedMs: Date.now() - started,
          target: targetUrl.toString(),
          error: signal.aborted ? `测试请求超过 ${TEST_TIMEOUT_MS} 毫秒` : safeErrorMessage(error),
        });
      } finally {
        await dispatcher.close().catch(() => {});
      }
    },
  });

  ctx.webServer.register({
    kind: "exact",
    path: `${ROUTE_PREFIX}/reset`,
    handler: async (req, res) => {
      if (!guard(req, res, "POST")) return;
      try {
        await enqueueMutation(async () => {
          const disabled = normalizeConfig({
            ...currentConfig,
            scopes: { runtime: false, children: false, packageManager: false, persistUserEnv: false },
          });
          await commitConfiguration(disabled, {}, { reset: true });
        });
        json(res, 200, { ok: true, config: publicConfig(currentConfig) });
      } catch (error) {
        json(res, 500, { ok: false, error: safeErrorMessage(error) });
      }
    },
  });

  ctx.on?.("dispose", () => {
    disposed = true;
    return enqueueMutation(async () => {
      processEnvironment.release();
      const previous = activeDispatcher;
      if (activeDispatcher && getGlobalDispatcher() === activeDispatcher) {
        setGlobalDispatcher(dispatcherToRestore);
      }
      activeDispatcher = null;
      dispatcherToRestore = null;
      globalThis.__dshNetworkProxyManaged = false;
      if (previous) await previous.close().catch(() => {});
    });
  });
}
