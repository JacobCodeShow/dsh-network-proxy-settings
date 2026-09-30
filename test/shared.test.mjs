import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONFIG,
  buildProxyUrl,
  normalizeConfig,
  npmrcLines,
  redactProxyUrl,
  replaceMarkedBlock,
  shouldBypassProxy,
  validateConfig,
} from "../src/shared.mjs";

test("default configuration is fail-safe and enables no scope or proxy", () => {
  const config = normalizeConfig(DEFAULT_CONFIG);
  assert.deepEqual(config.scopes, {
    runtime: false,
    children: false,
    packageManager: false,
    persistUserEnv: false,
  });
  assert.deepEqual(Object.fromEntries(Object.entries(config.proxies).map(([key, value]) => [key, value.enabled])), {
    http: false,
    https: false,
    all: false,
  });
});

test("legacy configuration migrates to protocol-specific or common proxy", () => {
  const http = normalizeConfig({ scheme: "http", host: "old.proxy", port: 8080, username: "old" });
  assert.equal(http.version, 2);
  assert.equal(http.proxies.http.enabled, true);
  assert.equal(http.proxies.https.enabled, true);
  assert.equal(http.proxies.all.enabled, false);
  assert.equal(http.proxies.https.host, "old.proxy");

  const socks = normalizeConfig({ scheme: "socks5", host: "127.0.0.1", port: 1080 });
  assert.equal(socks.proxies.http.enabled, false);
  assert.equal(socks.proxies.https.enabled, false);
  assert.equal(socks.proxies.all.enabled, true);
  assert.equal(socks.proxies.all.scheme, "socks5");
});

test("authenticated proxy URL encodes credentials", () => {
  const url = buildProxyUrl({
    scheme: "http",
    host: "proxy.company.test",
    port: 8080,
    username: "domain\\user name",
    scopes: {},
  }, "p@ss:/word");
  assert.equal(url, "http://domain%5Cuser%20name:p%40ss%3A%2Fword@proxy.company.test:8080");
  const redacted = redactProxyUrl(url);
  assert.equal(redacted.includes("domain"), false);
  assert.equal(redacted.includes("word"), false);
  assert.match(redacted, /^http:\/\/\*\*\*:\*\*\*@proxy\.company\.test:8080$/);
});

test("validation rejects embedded URLs, invalid ports and enabled scopes without endpoints", () => {
  const { errors } = validateConfig({ scheme: "http", host: "http://proxy/path", port: 70000, scopes: {} });
  assert.equal(errors.length >= 2, true);
  assert.match(validateConfig({ scopes: { runtime: true } }).errors.join("；"), /至少需要启用一个代理端点/);
});

test("validation rejects malformed hosts, npmrc injection and URL credentials", () => {
  assert.equal(validateConfig({ host: "[", port: 8080 }).errors.length > 0, true);
  assert.equal(validateConfig({ host: "[proxy.example]", port: 8080 }).errors.length > 0, true);
  assert.match(
    validateConfig({ host: "proxy.example", port: 8080, noProxy: "localhost\nregistry=evil" }).errors.join("；"),
    /NO_PROXY/,
  );
  assert.match(
    validateConfig({ host: "proxy.example", port: 8080, testUrl: "https://user:secret@example.test" }).errors.join("；"),
    /账号或密码/,
  );
});

test("proxy URL accepts bracketed and unbracketed IPv6 hosts", () => {
  assert.equal(buildProxyUrl({ scheme: "http", host: "::1", port: 8080 }), "http://[::1]:8080");
  assert.equal(buildProxyUrl({ scheme: "http", host: "[::1]", port: 8080 }), "http://[::1]:8080");
});

test("NO_PROXY handles exact host, suffix, wildcard and port", () => {
  assert.equal(shouldBypassProxy("https://localhost/x", "localhost"), true);
  assert.equal(shouldBypassProxy("https://api.company.local/x", ".company.local"), true);
  assert.equal(shouldBypassProxy("https://company.local/x", "*.company.local"), true);
  assert.equal(shouldBypassProxy("https://example.com:8443/x", "example.com:8443"), true);
  assert.equal(shouldBypassProxy("https://example.com/x", "example.com:8443"), false);
  assert.equal(shouldBypassProxy("https://anything.test/x", "*"), true);
});

test("managed npmrc block preserves unrelated user settings", () => {
  const original = "registry=https://registry.example/\nstrict-ssl=false\n";
  const withProxy = replaceMarkedBlock(original, npmrcLines({
    http: "http://http-proxy:8080",
    https: "http://https-proxy:8443",
  }, "localhost"));
  assert.match(withProxy, /registry=https:\/\/registry\.example\//);
  assert.match(withProxy, /# dsh-network-proxy-settings:begin/);
  assert.match(withProxy, /proxy=http:\/\/http-proxy:8080/);
  assert.match(withProxy, /https-proxy=http:\/\/https-proxy:8443/);
  const changed = replaceMarkedBlock(withProxy, npmrcLines("http://new:9000", "localhost"));
  assert.equal((changed.match(/# dsh-network-proxy-settings:begin/g) ?? []).length, 1);
  assert.match(changed, /http:\/\/new:9000/);
  const removed = replaceMarkedBlock(changed, []);
  assert.equal(removed, original);
});

test("managed npmrc block removes duplicates and rejects malformed markers", () => {
  const block = `${replaceMarkedBlock("", npmrcLines("http://old:8080", ""))}\n`;
  const deduplicated = replaceMarkedBlock(`${block}${block}`, npmrcLines("http://new:9000", ""));
  assert.equal((deduplicated.match(/# dsh-network-proxy-settings:begin/g) ?? []).length, 1);
  assert.match(deduplicated, /http:\/\/new:9000/);
  assert.throws(() => replaceMarkedBlock("# dsh-network-proxy-settings:begin\nproxy=x\n", []), /标记不完整/);
  assert.throws(() => replaceMarkedBlock("# dsh-network-proxy-settings:end\n", []), /顺序错误/);
});
