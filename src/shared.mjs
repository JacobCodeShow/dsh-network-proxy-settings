export const ROUTE_PREFIX = "/network-proxy";
export const CREDENTIAL_KEY = "dsh-network-proxy-settings/auth";
export const CONFIG_VERSION = 2;
export const PROXY_KEYS = Object.freeze(["http", "https", "all"]);
export const NPMRC_BEGIN = "# dsh-network-proxy-settings:begin";
export const NPMRC_END = "# dsh-network-proxy-settings:end";

const DEFAULT_ENDPOINTS = Object.freeze({
  http: Object.freeze({ enabled: false, scheme: "http", host: "127.0.0.1", port: 7890, username: "" }),
  https: Object.freeze({ enabled: false, scheme: "http", host: "127.0.0.1", port: 7890, username: "" }),
  all: Object.freeze({ enabled: false, scheme: "socks5", host: "127.0.0.1", port: 1080, username: "" }),
});

export const DEFAULT_CONFIG = Object.freeze({
  version: CONFIG_VERSION,
  proxies: DEFAULT_ENDPOINTS,
  noProxy: "localhost,127.0.0.1,::1",
  testUrl: "https://registry.npmjs.org/-/ping",
  scopes: Object.freeze({
    runtime: false,
    children: false,
    packageManager: false,
    persistUserEnv: false,
  }),
});

const ALLOWED_SCHEMES = new Set(["http", "https", "socks5"]);
const ENDPOINT_LABELS = Object.freeze({ http: "HTTP 代理", https: "HTTPS 代理", all: "通用/SOCKS 代理" });
const MAX_HOST_LENGTH = 255;
const MAX_USERNAME_LENGTH = 1024;
const MAX_PASSWORD_LENGTH = 4096;
const MAX_NO_PROXY_LENGTH = 8192;
const MAX_TEST_URL_LENGTH = 4096;

function proxyAuthorityHost(host) {
  const bracketed = host.startsWith("[") && host.endsWith("]");
  const bare = bracketed ? host.slice(1, -1) : host;
  return bare.includes(":") ? `[${bare}]` : bare;
}

function isValidProxyHost(host) {
  if (!host || host.length > MAX_HOST_LENGTH) return false;
  if (/\s|[/?#@\0]/.test(host) || host.includes("://")) return false;
  const bracketed = host.startsWith("[") && host.endsWith("]");
  if ((host.includes("[") || host.includes("]")) && !bracketed) return false;
  if (bracketed && !host.slice(1, -1).includes(":")) return false;
  try {
    const url = new URL(`http://${proxyAuthorityHost(host)}:1`);
    return url.username === "" && url.password === "" && url.port === "1" && url.pathname === "/";
  } catch {
    return false;
  }
}

function normalizeEndpoint(input, defaults) {
  const source = input && typeof input === "object" ? input : {};
  const portNumber = Number(source.port ?? defaults.port);
  return {
    enabled: source.enabled === true,
    scheme: String(source.scheme ?? defaults.scheme).trim().toLowerCase().replace(/:$/, ""),
    host: String(source.host ?? defaults.host).trim(),
    port: Number.isInteger(portNumber) ? portNumber : Number.NaN,
    username: String(source.username ?? "").trim(),
  };
}

function legacyProxies(input) {
  const scheme = String(input?.scheme ?? "http").trim().toLowerCase().replace(/:$/, "");
  const legacy = { enabled: true, scheme, host: input?.host, port: input?.port, username: input?.username };
  if (scheme === "socks5") return { all: legacy };
  return { http: legacy, https: legacy };
}

export function normalizeConfig(input = {}) {
  const scopes = input?.scopes ?? {};
  const proxyInput = input?.proxies && typeof input.proxies === "object"
    ? input.proxies
    : (input && ("scheme" in input || "host" in input || "port" in input) ? legacyProxies(input) : {});
  return {
    version: CONFIG_VERSION,
    proxies: Object.fromEntries(PROXY_KEYS.map((key) => [key, normalizeEndpoint(proxyInput[key], DEFAULT_ENDPOINTS[key])])),
    noProxy: String(input?.noProxy ?? DEFAULT_CONFIG.noProxy).trim(),
    testUrl: String(input?.testUrl ?? DEFAULT_CONFIG.testUrl).trim(),
    scopes: {
      runtime: scopes.runtime === true,
      children: scopes.children === true,
      packageManager: scopes.packageManager === true,
      persistUserEnv: scopes.persistUserEnv === true,
    },
  };
}

function validateEndpoint(key, endpoint, errors) {
  if (!endpoint.enabled) return;
  const label = ENDPOINT_LABELS[key];
  if (!ALLOWED_SCHEMES.has(endpoint.scheme)) errors.push(`${label}协议必须是 http、https 或 socks5`);
  if (!endpoint.host) errors.push(`${label}地址不能为空`);
  else if (!isValidProxyHost(endpoint.host)) errors.push(`${label}地址必须是有效的主机名或 IP，且不超过 ${MAX_HOST_LENGTH} 个字符`);
  if (!Number.isInteger(endpoint.port) || endpoint.port < 1 || endpoint.port > 65535) errors.push(`${label}端口必须是 1 到 65535 的整数`);
  if (endpoint.username.length > MAX_USERNAME_LENGTH) errors.push(`${label}账号不能超过 ${MAX_USERNAME_LENGTH} 个字符`);
}

export function validateConfig(input) {
  const config = normalizeConfig(input);
  const errors = [];
  for (const key of PROXY_KEYS) validateEndpoint(key, config.proxies[key], errors);
  if (Object.values(config.scopes).some(Boolean) && !PROXY_KEYS.some((key) => config.proxies[key].enabled)) {
    errors.push("启用代理生效范围时，至少需要启用一个代理端点");
  }
  if (config.noProxy.length > MAX_NO_PROXY_LENGTH) errors.push(`NO_PROXY 不能超过 ${MAX_NO_PROXY_LENGTH} 个字符`);
  if (/[\r\n\0]/.test(config.noProxy)) errors.push("NO_PROXY 不能包含换行符或 NUL 字符");
  if (config.testUrl.length > MAX_TEST_URL_LENGTH) {
    errors.push(`测试网址不能超过 ${MAX_TEST_URL_LENGTH} 个字符`);
  } else if (config.testUrl) {
    try {
      const url = new URL(config.testUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") errors.push("测试网址必须使用 http 或 https");
      if (url.username || url.password) errors.push("测试网址不能包含账号或密码");
    } catch {
      errors.push("测试网址格式无效");
    }
  }
  return { config, errors };
}

export function buildProxyUrl(endpoint, password = "") {
  const normalized = normalizeEndpoint({ ...endpoint, enabled: true }, DEFAULT_ENDPOINTS.http);
  const errors = [];
  validateEndpoint("http", normalized, errors);
  if (errors.length) throw new Error(errors.join("；"));
  const normalizedPassword = String(password ?? "");
  if (normalizedPassword.length > MAX_PASSWORD_LENGTH) throw new Error(`代理密码不能超过 ${MAX_PASSWORD_LENGTH} 个字符`);
  const auth = normalized.username
    ? `${encodeURIComponent(normalized.username)}:${encodeURIComponent(normalizedPassword)}@`
    : "";
  return `${normalized.scheme}://${auth}${proxyAuthorityHost(normalized.host)}:${normalized.port}`;
}

export function redactProxyUrl(proxyUrl) {
  try {
    const url = new URL(proxyUrl);
    if (url.username || url.password) {
      url.username = url.username ? "***" : "";
      url.password = url.password ? "***" : "";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return "<invalid proxy>";
  }
}

export function publicConfig(config, { hasPasswords = {}, applied = false, warnings = [] } = {}) {
  return {
    ...normalizeConfig(config),
    hasPasswords: Object.fromEntries(PROXY_KEYS.map((key) => [key, hasPasswords[key] === true])),
    applied,
    warnings,
  };
}

export function replaceMarkedBlock(source, lines) {
  let base = String(source ?? "");
  while (true) {
    const begin = base.indexOf(NPMRC_BEGIN);
    const end = base.indexOf(NPMRC_END);
    if (begin < 0 && end < 0) break;
    if (begin < 0 || end < begin) throw new Error(".npmrc 中的代理配置块标记不完整或顺序错误");
    const nested = base.indexOf(NPMRC_BEGIN, begin + NPMRC_BEGIN.length);
    if (nested >= 0 && nested < end) throw new Error(".npmrc 中存在嵌套的代理配置块标记");
    base = `${base.slice(0, begin)}${base.slice(end + NPMRC_END.length)}`;
  }
  base = base.replace(/(?:\r?\n)+$/g, "");
  if (!Array.isArray(lines) || lines.length === 0) return base ? `${base}\n` : "";
  const block = [NPMRC_BEGIN, ...lines, NPMRC_END].join("\n");
  return base ? `${base}\n\n${block}\n` : `${block}\n`;
}

function splitRule(rule) {
  let value = rule.trim().toLowerCase();
  if (!value) return null;
  if (value.includes("://")) {
    try {
      const url = new URL(value);
      return { host: url.hostname.toLowerCase(), port: url.port || undefined };
    } catch {
      return null;
    }
  }
  if (value.startsWith("[")) {
    const close = value.indexOf("]");
    if (close >= 0) {
      const port = value[close + 1] === ":" ? value.slice(close + 2) : undefined;
      return { host: value.slice(1, close), port };
    }
  }
  const colonCount = (value.match(/:/g) ?? []).length;
  if (colonCount === 1) {
    const [host, port] = value.split(":");
    if (/^\d+$/.test(port)) return { host, port };
  }
  return { host: value.replace(/^\*\./, "."), port: undefined };
}

export function shouldBypassProxy(target, noProxy) {
  const url = target instanceof URL ? target : new URL(String(target));
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  for (const raw of String(noProxy ?? "").split(",")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed === "*") return true;
    const parsed = splitRule(trimmed);
    if (!parsed || (parsed.port && parsed.port !== port)) continue;
    const ruleHost = parsed.host.replace(/^\[|\]$/g, "").replace(/\.$/, "");
    if (ruleHost.startsWith(".")) {
      const suffix = ruleHost.slice(1);
      if (hostname === suffix || hostname.endsWith(`.${suffix}`)) return true;
    } else if (hostname === ruleHost) {
      return true;
    }
  }
  return false;
}

export function npmrcLines(proxyUrls, noProxy) {
  const urls = typeof proxyUrls === "string" ? { http: proxyUrls, https: proxyUrls } : (proxyUrls ?? {});
  const lines = [];
  if (urls.http) lines.push(`proxy=${urls.http}`);
  if (urls.https) lines.push(`https-proxy=${urls.https}`);
  if (noProxy) lines.push(`noproxy=${noProxy}`);
  return lines;
}
