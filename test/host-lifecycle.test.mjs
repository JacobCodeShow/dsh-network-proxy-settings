import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent, getGlobalDispatcher, setGlobalDispatcher } from "undici";
import { apply, planWindowsUserEnvironment } from "../src/host.mjs";

const ENV_KEYS = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "all_proxy", "no_proxy"];

function responseCapture() {
  let status;
  let headers;
  let body;
  let finish;
  const completed = new Promise((resolve) => { finish = resolve; });
  return {
    response: {
      writeHead(code, nextHeaders) { status = code; headers = nextHeaders; },
      end(value) { body = value; finish(); },
    },
    completed,
    result() { return { status, headers, body: JSON.parse(body) }; },
  };
}

async function callRoute(routes, path, { method = "GET", headers = {}, body } = {}) {
  const capture = responseCapture();
  await routes.get(path)({ method, headers, body }, capture.response);
  await capture.completed;
  return capture.result();
}

function createContext() {
  const routes = new Map();
  let dispose;
  let record;
  let beforeModify;
  const ctx = {
    credentials: {
      async readRecord() { return record; },
      async modifyRecord(_key, updater) {
        if (beforeModify) await beforeModify();
        record = updater(record);
      },
    },
    webServer: {
      register(route) { routes.set(route.path, route.handler); },
    },
    logger: { warn() {}, info() {} },
    on(event, handler) { if (event === "dispose") dispose = handler; },
  };
  return {
    ctx,
    routes,
    record: () => record,
    setRecord(value) { record = value; },
    dispose: () => dispose?.(),
    setBeforeModify(handler) { beforeModify = handler; },
  };
}

function snapshotProcessEnvironment() {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
}

function assertProcessEnvironment(snapshot) {
  for (const key of ENV_KEYS) assert.equal(process.env[key], snapshot[key], key);
}

function proxyConfig(overrides = {}) {
  const base = {
    proxies: {
      http: { enabled: true, scheme: "http", host: "127.0.0.1", port: 18080, username: "alice" },
      https: { enabled: true, scheme: "http", host: "127.0.0.2", port: 18443, username: "bob" },
      all: { enabled: false, scheme: "socks5", host: "127.0.0.1", port: 1080, username: "" },
    },
    noProxy: "localhost,127.0.0.1",
    testUrl: "https://example.test/ping",
    scopes: { runtime: false, children: false, packageManager: false, persistUserEnv: false },
  };
  return {
    ...base,
    ...overrides,
    proxies: Object.fromEntries(Object.entries(base.proxies).map(([key, endpoint]) => [
      key,
      { ...endpoint, ...(overrides.proxies?.[key] ?? {}) },
    ])),
    scopes: { ...base.scopes, ...(overrides.scopes ?? {}) },
  };
}

async function withProfile(run) {
  const directory = await mkdtemp(join(tmpdir(), "dsh-network-proxy-settings-test-"));
  const previousProfile = process.env.DSH_PROFILE_DIR;
  process.env.DSH_PROFILE_DIR = directory;
  try {
    await run(directory);
  } finally {
    if (previousProfile === undefined) delete process.env.DSH_PROFILE_DIR;
    else process.env.DSH_PROFILE_DIR = previousProfile;
    await rm(directory, { recursive: true, force: true });
  }
}

test("settings API enforces origin, method and object JSON bodies", async () => {
  await withProfile(async () => {
    const fixture = createContext();
    apply(fixture.ctx);
    try {
      const crossOrigin = await callRoute(fixture.routes, "/network-proxy/config", {
        headers: { origin: "http://evil.example", host: "127.0.0.1:19387" },
      });
      assert.equal(crossOrigin.status, 403);

      const wrongMethod = await callRoute(fixture.routes, "/network-proxy/config", { method: "POST" });
      assert.equal(wrongMethod.status, 405);

      const arrayBody = await callRoute(fixture.routes, "/network-proxy/save", {
        method: "POST",
        body: "[]",
      });
      assert.equal(arrayBody.status, 400);
      assert.match(arrayBody.body.error, /must be an object/);

      const invalidJson = await callRoute(fixture.routes, "/network-proxy/save", {
        method: "POST",
        body: "{",
      });
      assert.equal(invalidJson.status, 400);
      assert.match(invalidJson.body.error, /invalid JSON/);
    } finally {
      await fixture.dispose();
    }
  });
});

test("first activation is fail-safe and exposes a disabled settings API", async () => {
  await withProfile(async () => {
    const fixture = createContext();
    apply(fixture.ctx);
    try {
      const result = await callRoute(fixture.routes, "/network-proxy/config");
      assert.equal(result.status, 200);
      assert.equal(result.headers["cache-control"], "no-store");
      assert.deepEqual(result.body.config.scopes, {
        runtime: false,
        children: false,
        packageManager: false,
        persistUserEnv: false,
      });
      assert.equal(result.body.config.applied, true);
      assert.deepEqual(Object.fromEntries(Object.entries(result.body.config.proxies).map(([key, value]) => [key, value.enabled])), {
        http: false,
        https: false,
        all: false,
      });
      assert.deepEqual(result.body.config.hasPasswords, { http: false, https: false, all: false });
    } finally {
      await fixture.dispose();
    }
  });
});

test("legacy config and single password migrate to HTTP and HTTPS proxy groups", async () => {
  await withProfile(async (directory) => {
    await writeFile(join(directory, ".dsh-network-proxy-settings.json"), JSON.stringify({
      version: 1,
      scheme: "http",
      host: "legacy.proxy",
      port: 8080,
      username: "legacy-user",
      noProxy: "localhost",
      testUrl: "https://example.test",
      scopes: { runtime: false, children: false, packageManager: false, persistUserEnv: false },
    }), "utf8");
    const fixture = createContext();
    fixture.setRecord({ kind: "grant", payload: { password: "legacy-secret", persistedEnv: {} } });
    apply(fixture.ctx);
    try {
      const loaded = await callRoute(fixture.routes, "/network-proxy/config");
      assert.equal(loaded.status, 200);
      assert.equal(loaded.body.config.version, 2);
      assert.equal(loaded.body.config.proxies.http.enabled, true);
      assert.equal(loaded.body.config.proxies.https.enabled, true);
      assert.deepEqual(loaded.body.config.hasPasswords, { http: true, https: true, all: false });

      const saved = await callRoute(fixture.routes, "/network-proxy/save", {
        method: "POST",
        body: { config: loaded.body.config },
      });
      assert.equal(saved.status, 200);
      assert.deepEqual(fixture.record().payload.passwords, {
        http: "legacy-secret",
        https: "legacy-secret",
        all: "",
      });
      assert.equal("password" in fixture.record().payload, false);
    } finally {
      await fixture.dispose();
    }
  });
});

test("save and reset update then restore files, credentials and process environment", async () => {
  await withProfile(async (directory) => {
    const environment = snapshotProcessEnvironment();
    const fixture = createContext();
    apply(fixture.ctx);
    try {
      const config = proxyConfig({
        scopes: { runtime: false, children: true, packageManager: true, persistUserEnv: false },
      });
      const saved = await callRoute(fixture.routes, "/network-proxy/save", {
        method: "POST",
        body: { config, passwords: { http: "http-secret", https: "https-secret" } },
      });
      assert.equal(saved.status, 200);
      assert.equal(process.env.HTTP_PROXY, "http://alice:http-secret@127.0.0.1:18080");
      assert.equal(process.env.HTTPS_PROXY, "http://bob:https-secret@127.0.0.2:18443");
      assert.equal(process.env.ALL_PROXY, undefined);
      const npmrc = await readFile(join(directory, ".npmrc"), "utf8");
      assert.match(npmrc, /proxy=http:\/\/alice:http-secret@127\.0\.0\.1:18080/);
      assert.match(npmrc, /https-proxy=http:\/\/bob:https-secret@127\.0\.0\.2:18443/);
      assert.deepEqual(fixture.record().payload.passwords, { http: "http-secret", https: "https-secret", all: "" });

      const reset = await callRoute(fixture.routes, "/network-proxy/reset", { method: "POST", body: {} });
      assert.equal(reset.status, 200);
      assertProcessEnvironment(environment);
      await assert.rejects(access(join(directory, ".npmrc")));
      await assert.rejects(access(join(directory, ".dsh-network-proxy-settings.json")));
      assert.equal(fixture.record(), undefined);
    } finally {
      await fixture.dispose();
      assertProcessEnvironment(environment);
    }
  });
});

test("failed dispatcher ownership check rolls back the entire second save", async () => {
  await withProfile(async (directory) => {
    const environment = snapshotProcessEnvironment();
    const originalDispatcher = getGlobalDispatcher();
    const externalDispatcher = new Agent();
    const fixture = createContext();
    apply(fixture.ctx);
    try {
      const first = proxyConfig({
        scopes: { runtime: true, children: true, packageManager: true, persistUserEnv: false },
      });
      const firstSave = await callRoute(fixture.routes, "/network-proxy/save", {
        method: "POST",
        body: { config: first, passwords: { http: "first", https: "first-https" } },
      });
      assert.equal(firstSave.status, 200);
      const firstProxyUrl = "http://alice:first@127.0.0.1:18080";
      assert.equal(process.env.HTTP_PROXY, firstProxyUrl);

      let replaceOnce = true;
      fixture.setBeforeModify(async () => {
        if (!replaceOnce) return;
        replaceOnce = false;
        setGlobalDispatcher(externalDispatcher);
      });
      const second = proxyConfig({
        proxies: { http: { host: "127.0.0.3", port: 19090 } },
        scopes: { runtime: true, children: true, packageManager: true, persistUserEnv: false },
      });
      const secondSave = await callRoute(fixture.routes, "/network-proxy/save", {
        method: "POST",
        body: { config: second, passwords: { http: "second", https: "second-https" } },
      });
      assert.equal(secondSave.status, 500);
      assert.match(secondSave.body.error, /Dispatcher/);
      assert.equal(getGlobalDispatcher(), externalDispatcher);
      assert.equal(process.env.HTTP_PROXY, firstProxyUrl);
      assert.deepEqual(fixture.record().payload.passwords, { http: "first", https: "first-https", all: "" });
      assert.equal(
        JSON.parse(await readFile(join(directory, ".dsh-network-proxy-settings.json"), "utf8")).proxies.http.host,
        "127.0.0.1",
      );
      const npmrc = await readFile(join(directory, ".npmrc"), "utf8");
      assert.match(npmrc, /alice:first@127\.0\.0\.1:18080/);
      assert.doesNotMatch(npmrc, /second|19090/);
    } finally {
      fixture.setBeforeModify(undefined);
      await fixture.dispose();
      setGlobalDispatcher(originalDispatcher);
      await externalDispatcher.close();
      assertProcessEnvironment(environment);
    }
  });
});

test("connectivity test rejects responses larger than the configured limit", async () => {
  await withProfile(async () => {
    const server = http.createServer((_req, res) => res.end(Buffer.alloc(1024 * 1024 + 1, 1)));
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const fixture = createContext();
    apply(fixture.ctx);
    try {
      const result = await callRoute(fixture.routes, "/network-proxy/test", {
        method: "POST",
        body: { url: `http://127.0.0.1:${server.address().port}/large` },
      });
      assert.equal(result.status, 502);
      assert.match(result.body.error, /响应超过/);
    } finally {
      await fixture.dispose();
      server.close();
      await once(server, "close");
    }
  });
});

test("Windows environment plan restores owned values and preserves external changes", () => {
  const updated = planWindowsUserEnvironment(
    { HTTP_PROXY: "http://new", HTTPS_PROXY: "http://new" },
    { HTTP_PROXY: "http://old", HTTPS_PROXY: "http://manual" },
    { HTTP_PROXY: "http://old", HTTPS_PROXY: "http://old" },
    { HTTP_PROXY: "http://original", HTTPS_PROXY: null },
  );
  assert.deepEqual(updated.operations, { HTTP_PROXY: "http://new", HTTPS_PROXY: "http://new" });
  assert.deepEqual(updated.previousUserEnv, { HTTP_PROXY: "http://original", HTTPS_PROXY: "http://manual" });

  const disabled = planWindowsUserEnvironment(
    {},
    { HTTP_PROXY: "http://old", HTTPS_PROXY: "http://manual" },
    { HTTP_PROXY: "http://old", HTTPS_PROXY: "http://old" },
    { HTTP_PROXY: "http://original", HTTPS_PROXY: null },
  );
  assert.deepEqual(disabled.operations, { HTTP_PROXY: "http://original" });
  assert.deepEqual(disabled.persistedEnv, {});
});
