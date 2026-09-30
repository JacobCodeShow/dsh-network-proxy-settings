window.__ModuleLoader__.load({
	id: "dsh-network-proxy-settings",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.jsx
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var name = "network-proxy-settings-ui";
var inject = ["slots", "locale"];
var PROXY_KEYS = ["http", "https", "all"];
var DICTS = {
  en: {
    nav: "Network Proxy",
    title: "Network proxy",
    intro: "Configure HTTP, HTTPS and common/SOCKS proxies independently. Requests use a protocol-specific proxy first, then the common proxy as fallback.",
    httpProxy: "HTTP proxy",
    httpProxyDesc: "Used for HTTP target URLs. Falls back to the common proxy when disabled.",
    httpsProxy: "HTTPS proxy",
    httpsProxyDesc: "Used for HTTPS target URLs. The proxy transport itself may still be HTTP CONNECT.",
    allProxy: "Common/SOCKS proxy",
    allProxyDesc: "Sets ALL_PROXY and acts as the fallback for HTTP or HTTPS when their dedicated proxy is disabled.",
    enableProxy: "Enable this proxy",
    expandProxy: "Expand",
    collapseProxy: "Collapse",
    endpointSummary: "{scheme} \xB7 {host}:{port}",
    protocol: "Proxy transport",
    host: "Proxy host",
    hostHint: "Hostname or IP only, without protocol or path.",
    port: "Port",
    username: "Username",
    password: "Password",
    passwordSaved: "A password is saved. Leave blank to keep it.",
    passwordEmpty: "Optional. Stored in the DSH credential store.",
    clearPassword: "Remove saved password",
    passwordCleared: "The saved password will be removed when you save.",
    noProxy: "Direct-connect list (NO_PROXY)",
    noProxyHint: "Comma-separated hosts or domain suffixes, for example localhost,.company.local",
    routingHint: "Routing order: NO_PROXY \u2192 matching HTTP/HTTPS proxy \u2192 common/SOCKS proxy \u2192 direct connection.",
    scopes: "Apply to",
    runtime: "DSH Host and LLM requests",
    runtimeDesc: "Uses a global Node/undici routing dispatcher for DSH services and most providers.",
    children: "Child processes and GUI-triggered commands",
    childrenDesc: "Exports HTTP_PROXY, HTTPS_PROXY, ALL_PROXY and NO_PROXY independently.",
    packageManager: "npm/pnpm plugin installation",
    packageManagerDesc: "Writes separate proxy and https-proxy entries to this DSH profile's .npmrc.",
    persist: "Persist to Windows user environment",
    persistDesc: "Makes new terminals and restarted DSH processes inherit all configured proxy variables.",
    testUrl: "Connectivity test URL",
    save: "Save and apply",
    saving: "Saving\u2026",
    test: "Test proxy",
    testing: "Testing\u2026",
    reset: "Disable and clear",
    resetConfirm: "Disable all proxy scopes and remove all saved proxy passwords/configuration?",
    loading: "Loading\u2026",
    saved: "Proxy settings saved and applied.",
    testOk: "Proxy connected: HTTP {status}, {ms} ms",
    failed: "Operation failed",
    inactive: "Not enabled",
    active: "Configured",
    socksHint: "SOCKS5 runtime mode uses the built-in tunnel dispatcher; npm/pnpm support depends on the installed package-manager version.",
    unsaved: "Unsaved changes",
    saveBeforeTest: "Save the current changes before testing the applied proxy.",
    warningNpmrcCredentials: "npm/pnpm support stores authenticated proxy URLs in plaintext in this profile's .npmrc.",
    warningUserEnvCredentials: "Windows persistence stores authenticated proxy URLs in plaintext in HKCU\\Environment.",
    warningRestartRequired: "Persistent user environment changes apply to newly started terminals and applications; restart DSH to verify them."
  },
  zh: {
    nav: "\u7F51\u7EDC\u4EE3\u7406",
    title: "\u7F51\u7EDC\u4EE3\u7406",
    intro: "\u53EF\u540C\u65F6\u914D\u7F6E HTTP \u4EE3\u7406\u3001HTTPS \u4EE3\u7406\u548C\u901A\u7528/SOCKS \u4EE3\u7406\u3002\u8BF7\u6C42\u4F18\u5148\u4F7F\u7528\u5BF9\u5E94\u534F\u8BAE\u4EE3\u7406\uFF0C\u672A\u914D\u7F6E\u65F6\u56DE\u9000\u5230\u901A\u7528\u4EE3\u7406\u3002",
    httpProxy: "HTTP \u4EE3\u7406",
    httpProxyDesc: "\u7528\u4E8E HTTP \u76EE\u6807\u7F51\u5740\uFF1B\u672A\u542F\u7528\u65F6\u56DE\u9000\u5230\u901A\u7528/SOCKS \u4EE3\u7406\u3002",
    httpsProxy: "HTTPS \u4EE3\u7406",
    httpsProxyDesc: "\u7528\u4E8E HTTPS \u76EE\u6807\u7F51\u5740\uFF1B\u4EE3\u7406\u4F20\u8F93\u534F\u8BAE\u672C\u8EAB\u4ECD\u53EF\u9009\u62E9 HTTP CONNECT\u3002",
    allProxy: "\u901A\u7528/SOCKS \u4EE3\u7406",
    allProxyDesc: "\u5BF9\u5E94 ALL_PROXY\uFF0C\u5E76\u5728 HTTP \u6216 HTTPS \u4E13\u7528\u4EE3\u7406\u672A\u542F\u7528\u65F6\u4F5C\u4E3A\u540E\u5907\u4EE3\u7406\u3002",
    enableProxy: "\u542F\u7528\u6B64\u4EE3\u7406",
    expandProxy: "\u5C55\u5F00",
    collapseProxy: "\u6298\u53E0",
    endpointSummary: "{scheme} \xB7 {host}:{port}",
    protocol: "\u4EE3\u7406\u4F20\u8F93\u534F\u8BAE",
    host: "\u4EE3\u7406\u7F51\u5740/IP",
    hostHint: "\u53EA\u586B\u5199\u4E3B\u673A\u540D\u6216 IP\uFF0C\u4E0D\u8981\u5305\u542B\u534F\u8BAE\u3001\u8DEF\u5F84\u548C\u8D26\u53F7\u3002",
    port: "\u7AEF\u53E3",
    username: "\u8D26\u53F7",
    password: "\u5BC6\u7801",
    passwordSaved: "\u5DF2\u4FDD\u5B58\u5BC6\u7801\uFF1B\u7559\u7A7A\u8868\u793A\u7EE7\u7EED\u4F7F\u7528\u539F\u5BC6\u7801\u3002",
    passwordEmpty: "\u53EF\u9009\uFF1B\u5BC6\u7801\u4FDD\u5B58\u5728 DSH \u51ED\u636E\u5E93\u3002",
    clearPassword: "\u79FB\u9664\u5DF2\u4FDD\u5B58\u5BC6\u7801",
    passwordCleared: "\u4FDD\u5B58\u65F6\u5C06\u79FB\u9664\u5DF2\u4FDD\u5B58\u7684\u5BC6\u7801\u3002",
    noProxy: "\u76F4\u8FDE\u5217\u8868\uFF08NO_PROXY\uFF09",
    noProxyHint: "\u4F7F\u7528\u9017\u53F7\u5206\u9694\u4E3B\u673A\u6216\u57DF\u540D\u540E\u7F00\uFF0C\u4F8B\u5982 localhost,.company.local",
    routingHint: "\u8DEF\u7531\u987A\u5E8F\uFF1ANO_PROXY \u2192 \u5BF9\u5E94 HTTP/HTTPS \u4EE3\u7406 \u2192 \u901A\u7528/SOCKS \u4EE3\u7406 \u2192 \u76F4\u8FDE\u3002",
    scopes: "\u751F\u6548\u8303\u56F4",
    runtime: "DSH Host \u4E0E\u6A21\u578B\u8BF7\u6C42",
    runtimeDesc: "\u8BBE\u7F6E\u5168\u5C40 Node/undici \u8DEF\u7531 dispatcher\uFF0C\u8986\u76D6 DSH \u670D\u52A1\u53CA\u5927\u90E8\u5206\u6A21\u578B\u63D0\u4F9B\u65B9\u3002",
    children: "\u5B50\u8FDB\u7A0B\u4E0E GUI \u53D1\u8D77\u7684\u547D\u4EE4",
    childrenDesc: "\u5206\u522B\u8BBE\u7F6E HTTP_PROXY\u3001HTTPS_PROXY\u3001ALL_PROXY \u548C NO_PROXY\u3002",
    packageManager: "npm/pnpm \u63D2\u4EF6\u5B89\u88C5",
    packageManagerDesc: "\u5411\u5F53\u524D DSH profile \u7684 .npmrc \u5206\u522B\u5199\u5165 proxy \u548C https-proxy\u3002",
    persist: "\u6301\u4E45\u5316\u5230 Windows \u7528\u6237\u73AF\u5883\u53D8\u91CF",
    persistDesc: "\u8BA9\u4E4B\u540E\u65B0\u5F00\u7684\u7EC8\u7AEF\u548C\u91CD\u542F\u540E\u7684 DSH \u7EE7\u627F\u6240\u6709\u5DF2\u914D\u7F6E\u4EE3\u7406\u53D8\u91CF\u3002",
    testUrl: "\u8FDE\u901A\u6027\u6D4B\u8BD5\u7F51\u5740",
    save: "\u4FDD\u5B58\u5E76\u5E94\u7528",
    saving: "\u4FDD\u5B58\u4E2D\u2026",
    test: "\u6D4B\u8BD5\u4EE3\u7406",
    testing: "\u6D4B\u8BD5\u4E2D\u2026",
    reset: "\u505C\u7528\u5E76\u6E05\u9664",
    resetConfirm: "\u786E\u8BA4\u5173\u95ED\u6240\u6709\u4EE3\u7406\u8303\u56F4\uFF0C\u5E76\u5220\u9664\u5168\u90E8\u5DF2\u4FDD\u5B58\u5BC6\u7801\u548C\u914D\u7F6E\u5417\uFF1F",
    loading: "\u52A0\u8F7D\u4E2D\u2026",
    saved: "\u4EE3\u7406\u914D\u7F6E\u5DF2\u4FDD\u5B58\u5E76\u5E94\u7528\u3002",
    testOk: "\u4EE3\u7406\u8FDE\u63A5\u6210\u529F\uFF1AHTTP {status}\uFF0C\u8017\u65F6 {ms} ms",
    failed: "\u64CD\u4F5C\u5931\u8D25",
    inactive: "\u5C1A\u672A\u542F\u7528",
    active: "\u5DF2\u914D\u7F6E",
    socksHint: "SOCKS5 \u7684 DSH Host \u6A21\u5F0F\u901A\u8FC7\u5185\u7F6E\u96A7\u9053 dispatcher \u5B9E\u73B0\uFF1Bnpm/pnpm \u662F\u5426\u652F\u6301\u53D6\u51B3\u4E8E\u5305\u7BA1\u7406\u5668\u7248\u672C\u3002",
    unsaved: "\u6709\u672A\u4FDD\u5B58\u4FEE\u6539",
    saveBeforeTest: "\u8BF7\u5148\u4FDD\u5B58\u5F53\u524D\u4FEE\u6539\uFF0C\u518D\u6D4B\u8BD5\u5DF2\u5E94\u7528\u7684\u4EE3\u7406\u914D\u7F6E\u3002",
    warningNpmrcCredentials: "npm/pnpm \u5F00\u5173\u4F1A\u628A\u542B\u8D26\u53F7\u5BC6\u7801\u7684\u4EE3\u7406 URL \u660E\u6587\u5199\u5165\u5F53\u524D DSH profile \u7684 .npmrc\u3002",
    warningUserEnvCredentials: "\u7528\u6237\u73AF\u5883\u53D8\u91CF\u5F00\u5173\u4F1A\u628A\u542B\u8D26\u53F7\u5BC6\u7801\u7684\u4EE3\u7406 URL \u660E\u6587\u5199\u5165 Windows HKCU\\Environment\u3002",
    warningRestartRequired: "\u7528\u6237\u73AF\u5883\u53D8\u91CF\u53EA\u5F71\u54CD\u4E4B\u540E\u542F\u52A8\u7684\u7EC8\u7AEF\u548C\u5E94\u7528\uFF1B\u8BF7\u91CD\u542F DSH \u540E\u9A8C\u8BC1\u5B8C\u6574\u751F\u6548\u8303\u56F4\u3002"
  }
};
var EMPTY = {
  version: 2,
  proxies: {
    http: { enabled: false, scheme: "http", host: "127.0.0.1", port: 7890, username: "" },
    https: { enabled: false, scheme: "http", host: "127.0.0.1", port: 7890, username: "" },
    all: { enabled: false, scheme: "socks5", host: "127.0.0.1", port: 1080, username: "" }
  },
  noProxy: "localhost,127.0.0.1,::1",
  testUrl: "https://registry.npmjs.org/-/ping",
  scopes: { runtime: false, children: false, packageManager: false, persistUserEnv: false }
};
var EMPTY_PASSWORDS = Object.freeze({ http: "", https: "", all: "" });
var EMPTY_FLAGS = Object.freeze({ http: false, https: false, all: false });
var css = {
  root: { maxWidth: 820, display: "flex", flexDirection: "column", gap: 18, fontFamily: "inherit" },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { margin: 0, fontSize: 18, fontWeight: 600 },
  intro: { margin: 0, fontSize: 14, lineHeight: "22px", opacity: 0.72 },
  badge: { padding: "3px 10px", borderRadius: 12, fontSize: 12, background: "rgba(128,128,128,.16)", whiteSpace: "nowrap" },
  card: { border: "1px solid rgba(128,128,128,.32)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 14 },
  collapsedCard: { gap: 10 },
  endpointDisabled: { opacity: 0.68 },
  endpointHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  endpointToggle: { flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, padding: 0, borderRadius: 17, border: "1px solid rgba(128,128,128,.42)", background: "transparent", color: "inherit", cursor: "pointer", transition: "color .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease" },
  endpointToggleActive: { color: "#4c6ef5", borderColor: "rgba(76,110,245,.62)", background: "rgba(76,110,245,.10)", boxShadow: "0 2px 8px rgba(76,110,245,.16)" },
  endpointSummary: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, paddingLeft: 28, fontSize: 13, lineHeight: "20px" },
  summaryProtocol: { padding: "1px 7px", borderRadius: 10, background: "rgba(128,128,128,.14)", fontSize: 11, fontWeight: 600 },
  summaryAddress: { overflowWrap: "anywhere", fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" },
  grid: { display: "grid", gridTemplateColumns: "minmax(180px,2fr) minmax(90px,1fr)", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  label: { fontSize: 13, fontWeight: 500 },
  hint: { margin: 0, fontSize: 12, lineHeight: "18px", opacity: 0.62 },
  input: { boxSizing: "border-box", width: "100%", height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid rgba(128,128,128,.42)", background: "transparent", color: "inherit", font: "inherit", fontSize: 14 },
  select: { boxSizing: "border-box", width: "100%", height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid rgba(128,128,128,.42)", background: "var(--background, transparent)", color: "inherit", font: "inherit", fontSize: 14 },
  sectionTitle: { margin: 0, fontSize: 14, fontWeight: 600 },
  option: { display: "grid", gridTemplateColumns: "20px 1fr", gap: 8, alignItems: "start" },
  checkbox: { width: 16, height: 16, marginTop: 2 },
  optionName: { fontSize: 14, lineHeight: "20px", fontWeight: 500 },
  optionDesc: { margin: "2px 0 0", fontSize: 12, lineHeight: "18px", opacity: 0.65 },
  warning: { padding: "10px 12px", border: "1px solid rgba(245,159,0,.45)", background: "rgba(245,159,0,.10)", borderRadius: 8, fontSize: 12, lineHeight: "19px" },
  info: { padding: "10px 12px", border: "1px solid rgba(76,110,245,.35)", background: "rgba(76,110,245,.07)", borderRadius: 8, fontSize: 12, lineHeight: "19px" },
  error: { padding: "10px 12px", border: "1px solid rgba(224,49,49,.45)", background: "rgba(224,49,49,.08)", borderRadius: 8, color: "#e03131", fontSize: 13, lineHeight: "19px" },
  success: { padding: "10px 12px", border: "1px solid rgba(47,158,68,.40)", background: "rgba(47,158,68,.08)", borderRadius: 8, color: "#2f9e44", fontSize: 13, lineHeight: "19px" },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  button: { height: 34, padding: "0 14px", borderRadius: 17, border: "1px solid rgba(128,128,128,.42)", background: "transparent", color: "inherit", cursor: "pointer", font: "inherit", fontSize: 13 },
  primary: { border: "none", background: "#4c6ef5", color: "white" },
  danger: { color: "#e03131" },
  clear: { alignSelf: "flex-start", border: "none", background: "transparent", padding: 0, color: "#4c6ef5", cursor: "pointer", font: "inherit", fontSize: 12 }
};
async function api(path, options) {
  const response = await fetch(`/network-proxy/${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}
function editableConfig(config = EMPTY) {
  return {
    version: 2,
    proxies: Object.fromEntries(PROXY_KEYS.map((key) => [key, {
      ...EMPTY.proxies[key],
      ...config.proxies?.[key] || {}
    }])),
    noProxy: config.noProxy ?? EMPTY.noProxy,
    testUrl: config.testUrl || EMPTY.testUrl,
    scopes: { ...EMPTY.scopes, ...config.scopes || {} }
  };
}
function EndpointEditor({ proxyKey, endpoint, password, hasPassword, clearPassword, t, onEndpoint, onPassword, onClear }) {
  const [expanded, setExpanded] = (0, import_react.useState)(false);
  const [toggleActive, setToggleActive] = (0, import_react.useState)(false);
  const titleKey = proxyKey === "all" ? "allProxy" : `${proxyKey}Proxy`;
  const descriptionKey = `${titleKey}Desc`;
  const summary = t("endpointSummary").replace("{scheme}", String(endpoint.scheme || "\u2014").toUpperCase()).replace("{host}", endpoint.host || "\u2014").replace("{port}", endpoint.port || "\u2014");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
    ...css.card,
    ...expanded ? {} : css.collapsedCard,
    ...endpoint.enabled ? {} : css.endpointDisabled
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: css.endpointHeader, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { ...css.option, flex: "1 1 auto" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            style: css.checkbox,
            type: "checkbox",
            checked: endpoint.enabled,
            onChange: (event) => onEndpoint("enabled", event.target.checked)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.optionName, children: t(titleKey) }),
          expanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: css.optionDesc, children: t(descriptionKey) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          style: { ...css.endpointToggle, ...toggleActive || expanded ? css.endpointToggleActive : {} },
          "aria-expanded": expanded,
          "aria-label": `${expanded ? t("collapseProxy") : t("expandProxy")} ${t(titleKey)}`,
          title: expanded ? t("collapseProxy") : t("expandProxy"),
          onMouseEnter: () => setToggleActive(true),
          onMouseLeave: () => setToggleActive(false),
          onFocus: () => setToggleActive(true),
          onBlur: () => setToggleActive(false),
          onClick: () => setExpanded((current) => !current),
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "path",
            {
              d: expanded ? "M4 10L8 6L12 10" : "M4 6L8 10L12 6",
              stroke: "currentColor",
              strokeWidth: "1.75",
              strokeLinecap: "round",
              strokeLinejoin: "round"
            }
          ) })
        }
      )
    ] }),
    !expanded && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: css.endpointSummary, title: summary, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.summaryProtocol, children: String(endpoint.scheme || "\u2014").toUpperCase() }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: css.summaryAddress, children: [
        endpoint.host || "\u2014",
        ":",
        endpoint.port || "\u2014"
      ] })
    ] }),
    expanded && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: css.grid, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: css.field, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.label, children: t("protocol") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "select",
            {
              style: css.select,
              disabled: !endpoint.enabled,
              value: endpoint.scheme,
              onChange: (event) => onEndpoint("scheme", event.target.value),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "http", children: "HTTP" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "https", children: "HTTPS" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "socks5", children: "SOCKS5" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: css.field, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.label, children: t("port") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              style: css.input,
              disabled: !endpoint.enabled,
              type: "number",
              min: "1",
              max: "65535",
              value: endpoint.port,
              onChange: (event) => onEndpoint("port", event.target.value)
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: css.field, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.label, children: t("host") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            style: css.input,
            disabled: !endpoint.enabled,
            value: endpoint.host,
            placeholder: "proxy.company.com",
            onChange: (event) => onEndpoint("host", event.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.hint, children: t("hostHint") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: css.grid, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: css.field, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.label, children: t("username") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              style: css.input,
              disabled: !endpoint.enabled,
              autoComplete: "username",
              value: endpoint.username,
              onChange: (event) => onEndpoint("username", event.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: css.field, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.label, children: t("password") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              style: css.input,
              disabled: !endpoint.enabled,
              type: "password",
              autoComplete: "new-password",
              value: password,
              placeholder: hasPassword && !clearPassword ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "",
              onChange: (event) => onPassword(event.target.value)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.hint, children: hasPassword && !clearPassword ? t("passwordSaved") : t("passwordEmpty") })
        ] })
      ] }),
      hasPassword && !clearPassword && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: css.clear, onClick: onClear, children: t("clearPassword") }),
      clearPassword && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.hint, children: t("passwordCleared") })
    ] })
  ] });
}
function ProxySettings({ t = (key) => DICTS.en[key] ?? key }) {
  const [form, setForm] = (0, import_react.useState)(() => editableConfig());
  const [appliedForm, setAppliedForm] = (0, import_react.useState)(() => editableConfig());
  const [passwords, setPasswords] = (0, import_react.useState)({ ...EMPTY_PASSWORDS });
  const [hasPasswords, setHasPasswords] = (0, import_react.useState)({ ...EMPTY_FLAGS });
  const [clearPasswords, setClearPasswords] = (0, import_react.useState)({ ...EMPTY_FLAGS });
  const [warnings, setWarnings] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [busy, setBusy] = (0, import_react.useState)("");
  const [message, setMessage] = (0, import_react.useState)(null);
  const enabled = (0, import_react.useMemo)(() => Object.values(appliedForm.scopes).some(Boolean), [appliedForm.scopes]);
  const dirty = (0, import_react.useMemo)(
    () => JSON.stringify(form) !== JSON.stringify(appliedForm) || Object.values(passwords).some((value) => value !== "") || Object.values(clearPasswords).some(Boolean),
    [form, appliedForm, passwords, clearPasswords]
  );
  (0, import_react.useEffect)(() => {
    let alive = true;
    api("config").then((data) => {
      if (!alive) return;
      const config = editableConfig(data.config || EMPTY);
      setForm(config);
      setAppliedForm(config);
      setHasPasswords({ ...EMPTY_FLAGS, ...data.config?.hasPasswords || {} });
      setWarnings(data.config?.warnings || []);
      if (data.startupError) setMessage({ kind: "error", text: data.startupError });
    }).catch((error) => alive && setMessage({ kind: "error", text: error.message })).finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);
  const field = (name2, value) => setForm((current) => ({ ...current, [name2]: value }));
  const scope = (name2, value) => setForm((current) => ({
    ...current,
    scopes: { ...current.scopes, [name2]: value }
  }));
  const endpointField = (key, name2, value) => setForm((current) => ({
    ...current,
    proxies: { ...current.proxies, [key]: { ...current.proxies[key], [name2]: value } }
  }));
  const endpointPassword = (key, value) => {
    setPasswords((current) => ({ ...current, [key]: value }));
    setClearPasswords((current) => ({ ...current, [key]: false }));
  };
  const save = async () => {
    setBusy("save");
    setMessage(null);
    try {
      const changedPasswords = Object.fromEntries(PROXY_KEYS.filter((key) => passwords[key] !== "").map((key) => [key, passwords[key]]));
      const data = await api("save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: form, passwords: changedPasswords, clearPasswords })
      });
      const savedConfig = editableConfig(data.config);
      setForm(savedConfig);
      setAppliedForm(savedConfig);
      setPasswords({ ...EMPTY_PASSWORDS });
      setClearPasswords({ ...EMPTY_FLAGS });
      setHasPasswords({ ...EMPTY_FLAGS, ...data.config.hasPasswords || {} });
      setWarnings(data.config.warnings || []);
      setMessage({ kind: "success", text: t("saved") });
    } catch (error) {
      setMessage({ kind: "error", text: `${t("failed")}\uFF1A${error.message}` });
    } finally {
      setBusy("");
    }
  };
  const test = async () => {
    setBusy("test");
    setMessage(null);
    try {
      const data = await api("test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: form.testUrl })
      });
      setMessage({
        kind: "success",
        text: t("testOk").replace("{status}", data.statusCode).replace("{ms}", data.elapsedMs)
      });
    } catch (error) {
      setMessage({ kind: "error", text: `${t("failed")}\uFF1A${error.message}` });
    } finally {
      setBusy("");
    }
  };
  const reset = async () => {
    if (!window.confirm(t("resetConfirm"))) return;
    setBusy("reset");
    setMessage(null);
    try {
      await api("reset", { method: "POST" });
      const empty = editableConfig();
      setForm(empty);
      setAppliedForm(empty);
      setPasswords({ ...EMPTY_PASSWORDS });
      setHasPasswords({ ...EMPTY_FLAGS });
      setClearPasswords({ ...EMPTY_FLAGS });
      setWarnings([]);
      setMessage({ kind: "success", text: t("inactive") });
    } catch (error) {
      setMessage({ kind: "error", text: `${t("failed")}\uFF1A${error.message}` });
    } finally {
      setBusy("");
    }
  };
  if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: css.root, children: t("loading") });
  const visibleWarnings = new Set(warnings);
  const authenticated = PROXY_KEYS.some((key) => form.proxies[key].enabled && form.proxies[key].username);
  if (authenticated && form.scopes.packageManager) visibleWarnings.add("warningNpmrcCredentials");
  if (authenticated && form.scopes.persistUserEnv) visibleWarnings.add("warningUserEnvCredentials");
  if (form.scopes.persistUserEnv) visibleWarnings.add("warningRestartRequired");
  const hasSocks = PROXY_KEYS.some((key) => form.proxies[key].enabled && form.proxies[key].scheme === "socks5");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: css.root, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: css.head, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: css.title, children: t("title") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.badge, children: dirty ? t("unsaved") : enabled ? t("active") : t("inactive") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: css.intro, children: t("intro") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: css.info, children: t("routingHint") }),
    PROXY_KEYS.map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      EndpointEditor,
      {
        proxyKey: key,
        endpoint: form.proxies[key],
        password: passwords[key],
        hasPassword: hasPasswords[key],
        clearPassword: clearPasswords[key],
        t,
        onEndpoint: (name2, value) => endpointField(key, name2, value),
        onPassword: (value) => endpointPassword(key, value),
        onClear: () => {
          setClearPasswords((current) => ({ ...current, [key]: true }));
          setPasswords((current) => ({ ...current, [key]: "" }));
        }
      },
      key
    )),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: css.card, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: css.field, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.label, children: t("noProxy") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { style: css.input, value: form.noProxy, onChange: (event) => field("noProxy", event.target.value) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.hint, children: t("noProxyHint") })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: css.card, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { style: css.sectionTitle, children: t("scopes") }),
      [
        ["runtime", "runtime", "runtimeDesc"],
        ["children", "children", "childrenDesc"],
        ["packageManager", "packageManager", "packageManagerDesc"],
        ["persistUserEnv", "persist", "persistDesc"]
      ].map(([key, label, description]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: css.option, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            style: css.checkbox,
            type: "checkbox",
            checked: form.scopes[key],
            onChange: (event) => scope(key, event.target.checked)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.optionName, children: t(label) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: css.optionDesc, children: t(description) })
        ] })
      ] }, key)),
      hasSocks && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: css.warning, children: t("socksHint") }),
      [...visibleWarnings].map((warning) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: css.warning, children: t(warning) }, warning))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: css.field, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: css.label, children: t("testUrl") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { style: css.input, value: form.testUrl, onChange: (event) => field("testUrl", event.target.value) })
    ] }),
    dirty && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: css.warning, children: t("saveBeforeTest") }),
    message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: message.kind === "error" ? css.error : css.success, children: message.text }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: css.actions, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: { ...css.button, ...css.primary }, disabled: !!busy, onClick: save, children: busy === "save" ? t("saving") : t("save") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: css.button, disabled: !!busy || dirty, onClick: test, children: busy === "test" ? t("testing") : t("test") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: { ...css.button, ...css.danger }, disabled: !!busy, onClick: reset, children: t("reset") })
    ] })
  ] });
}
function apply(ctx) {
  ctx.locale.register("dsh-network-proxy-settings", DICTS);
  const t = ctx.locale.bind("dsh-network-proxy-settings");
  ctx.slots.inject("settings.section", () => ctx.slots.register(
    {
      name: "settings.section",
      id: "network-proxy-settings",
      order: 12,
      label: () => t("nav"),
      inject: () => ({ t })
    },
    ProxySettings
  ));
}

		return module.exports;
	}
});
