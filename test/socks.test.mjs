import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { request } from "undici";
import { createDispatcher, RoutingDispatcher } from "../src/host.mjs";

function socketReader(socket) {
  let buffer = Buffer.alloc(0);
  let pending;
  const pump = () => {
    if (!pending || buffer.length < pending.size) return;
    const value = buffer.subarray(0, pending.size);
    buffer = buffer.subarray(pending.size);
    const resolve = pending.resolve;
    pending = undefined;
    resolve(value);
  };
  const onData = (chunk) => { buffer = Buffer.concat([buffer, chunk]); pump(); };
  socket.on("data", onData);
  return {
    read(size) { return new Promise((resolve) => { pending = { size, resolve }; pump(); }); },
    detach() { socket.off("data", onData); if (buffer.length) socket.unshift(buffer); },
  };
}

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

async function close(server) {
  if (!server.listening) return;
  server.close();
  await once(server, "close");
}

test("routing dispatcher selects HTTP, HTTPS, common fallback and NO_PROXY direct routes", async () => {
  const calls = [];
  const fake = (name) => ({
    dispatch() { calls.push(name); return name; },
    async close() {},
    async destroy() {},
  });
  const dispatcher = new RoutingDispatcher({
    routes: { http: fake("http"), https: fake("https"), all: fake("all") },
    direct: fake("direct"),
    noProxy: "localhost",
  });
  assert.equal(dispatcher.dispatch({ origin: "http://example.test" }, {}), "http");
  assert.equal(dispatcher.dispatch({ origin: "https://example.test" }, {}), "https");
  assert.equal(dispatcher.dispatch({ origin: "https://localhost" }, {}), "direct");

  const fallback = new RoutingDispatcher({ routes: { all: fake("fallback") }, direct: fake("direct-2"), noProxy: "" });
  assert.equal(fallback.dispatch({ origin: "http://example.test" }, {}), "fallback");
  assert.equal(fallback.dispatch({ origin: "https://example.test" }, {}), "fallback");
  await Promise.all([dispatcher.close(), fallback.close()]);
  assert.deepEqual(calls.slice(0, 5), ["http", "https", "direct", "fallback", "fallback"]);
});

test("SOCKS5 username/password tunnel carries an undici HTTPS request", async () => {
  const [key, cert] = await Promise.all([
    readFile(new URL("./fixtures/localhost-key.pem", import.meta.url)),
    readFile(new URL("./fixtures/localhost-cert.pem", import.meta.url)),
  ]);
  const target = https.createServer({ key, cert }, (_req, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("through-socks-https");
  });
  const targetPort = await listen(target);
  let observedAuth;
  const socks = net.createServer((client) => {
    void (async () => {
      const reader = socketReader(client);
      const greeting = await reader.read(2);
      const methods = await reader.read(greeting[1]);
      assert.equal(greeting[0], 5);
      assert.equal(methods.includes(2), true);
      client.write(Buffer.from([5, 2]));
      const authHead = await reader.read(2);
      const username = (await reader.read(authHead[1])).toString("utf8");
      const passwordLength = (await reader.read(1))[0];
      const password = (await reader.read(passwordLength)).toString("utf8");
      observedAuth = { username, password };
      client.write(Buffer.from([1, 0]));
      const connectHead = await reader.read(5);
      assert.equal(connectHead[0], 5);
      assert.equal(connectHead[1], 1);
      assert.equal(connectHead[3], 3);
      const destinationHost = (await reader.read(connectHead[4])).toString("utf8");
      const portBytes = await reader.read(2);
      const destinationPort = portBytes.readUInt16BE(0);
      const upstream = net.createConnection({ host: destinationHost, port: destinationPort });
      await once(upstream, "connect");
      client.write(Buffer.from([5, 0, 0, 1, 127, 0, 0, 1, 0, 0]));
      reader.detach();
      client.pipe(upstream).pipe(client);
    })().catch((error) => client.destroy(error));
  });
  const socksPort = await listen(socks);
  const dispatcher = createDispatcher({
    scheme: "socks5",
    host: "127.0.0.1",
    port: socksPort,
    username: "alice",
    noProxy: "",
    testUrl: "https://example.test",
    scopes: {},
    rejectUnauthorized: false,
  }, "s3cret");
  try {
    const response = await request(`https://127.0.0.1:${targetPort}/`, { dispatcher });
    assert.equal(response.statusCode, 200);
    assert.equal(await response.body.text(), "through-socks-https");
    assert.deepEqual(observedAuth, { username: "alice", password: "s3cret" });
  } finally {
    await dispatcher.close();
    await close(socks);
    await close(target);
  }
});

test("HTTP CONNECT proxy receives encoded Basic credentials", async () => {
  const target = http.createServer((_req, res) => res.end("through-http-proxy"));
  const targetPort = await listen(target);
  let observedAuthorization;
  const proxy = http.createServer();
  proxy.on("connect", (req, client, head) => {
    observedAuthorization = req.headers["proxy-authorization"];
    const [host, port] = req.url.split(":");
    const upstream = net.createConnection({ host, port: Number(port) }, () => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) upstream.write(head);
      client.pipe(upstream).pipe(client);
    });
    upstream.on("error", (error) => client.destroy(error));
  });
  const proxyPort = await listen(proxy);
  const dispatcher = createDispatcher({
    scheme: "http",
    host: "127.0.0.1",
    port: proxyPort,
    username: "alice@example.com",
    noProxy: "",
    testUrl: "http://example.test",
    scopes: {},
  }, "p@ss:word");
  try {
    const response = await request(`http://127.0.0.1:${targetPort}/`, { dispatcher });
    assert.equal(await response.body.text(), "through-http-proxy");
    assert.equal(observedAuthorization, `Basic ${Buffer.from("alice@example.com:p@ss:word").toString("base64")}`);
  } finally {
    await dispatcher.close();
    await close(proxy);
    await close(target);
  }
});

test("NO_PROXY bypasses an unavailable proxy", async () => {
  const target = http.createServer((_req, res) => res.end("direct"));
  const port = await listen(target);
  const dispatcher = createDispatcher({
    scheme: "http",
    host: "127.0.0.1",
    port: 1,
    username: "",
    noProxy: "127.0.0.1",
    testUrl: "http://example.test",
    scopes: {},
  }, "");
  try {
    const response = await request(`http://127.0.0.1:${port}/`, { dispatcher });
    assert.equal(await response.body.text(), "direct");
  } finally {
    await dispatcher.close();
    await close(target);
  }
});
