import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

function loadClientBundle(source) {
  let definition;
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(value) { definition = value; },
      },
    },
  };
  vm.runInNewContext(source, sandbox, { filename: "lib/client.js" });
  assert.equal(definition.id, "dsh-network-proxy-settings");
  const react = {
    useEffect() {},
    useMemo(factory) { return factory(); },
    useState(initial) {
      const value = typeof initial === "function" ? initial() : initial;
      return [value, () => {}];
    },
  };
  const jsx = { jsx() { return null; }, jsxs() { return null; } };
  return definition.factory((id) => {
    if (id === "react") return react;
    if (id === "react/jsx-runtime") return jsx;
    throw new Error(`unexpected client dependency: ${id}`);
  });
}

test("built client bundle registers bilingual settings section", async () => {
  const source = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");
  assert.match(source, /aria-expanded/);
  const client = loadClientBundle(source);
  assert.equal(client.name, "network-proxy-settings-ui");
  assert.deepEqual([...client.inject], ["slots", "locale"]);

  let dictionaries;
  let section;
  let component;
  const ctx = {
    locale: {
      register(_name, value) { dictionaries = value; },
      bind() { return (key) => dictionaries.en[key] ?? key; },
    },
    slots: {
      inject(name, callback) {
        assert.equal(name, "settings.section");
        callback();
      },
      register(value, nextComponent) {
        section = value;
        component = nextComponent;
        return () => {};
      },
    },
  };
  client.apply(ctx);
  assert.equal(dictionaries.en.title, "Network proxy");
  assert.equal(dictionaries.zh.title, "网络代理");
  assert.equal(dictionaries.zh.expandProxy, "展开");
  assert.equal(dictionaries.zh.collapseProxy, "折叠");
  assert.equal(section.id, "network-proxy-settings");
  assert.equal(section.label(), "Network Proxy");
  assert.equal(typeof component, "function");
});
