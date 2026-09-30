import { useEffect, useMemo, useState } from "react";

export const name = "network-proxy-settings-ui";
export const inject = ["slots", "locale"];

const PROXY_KEYS = ["http", "https", "all"];

const DICTS = {
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
    endpointSummary: "{scheme} · {host}:{port}",
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
    routingHint: "Routing order: NO_PROXY → matching HTTP/HTTPS proxy → common/SOCKS proxy → direct connection.",
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
    saving: "Saving…",
    test: "Test proxy",
    testing: "Testing…",
    reset: "Disable and clear",
    resetConfirm: "Disable all proxy scopes and remove all saved proxy passwords/configuration?",
    loading: "Loading…",
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
    warningRestartRequired: "Persistent user environment changes apply to newly started terminals and applications; restart DSH to verify them.",
  },
  zh: {
    nav: "网络代理",
    title: "网络代理",
    intro: "可同时配置 HTTP 代理、HTTPS 代理和通用/SOCKS 代理。请求优先使用对应协议代理，未配置时回退到通用代理。",
    httpProxy: "HTTP 代理",
    httpProxyDesc: "用于 HTTP 目标网址；未启用时回退到通用/SOCKS 代理。",
    httpsProxy: "HTTPS 代理",
    httpsProxyDesc: "用于 HTTPS 目标网址；代理传输协议本身仍可选择 HTTP CONNECT。",
    allProxy: "通用/SOCKS 代理",
    allProxyDesc: "对应 ALL_PROXY，并在 HTTP 或 HTTPS 专用代理未启用时作为后备代理。",
    enableProxy: "启用此代理",
    expandProxy: "展开",
    collapseProxy: "折叠",
    endpointSummary: "{scheme} · {host}:{port}",
    protocol: "代理传输协议",
    host: "代理网址/IP",
    hostHint: "只填写主机名或 IP，不要包含协议、路径和账号。",
    port: "端口",
    username: "账号",
    password: "密码",
    passwordSaved: "已保存密码；留空表示继续使用原密码。",
    passwordEmpty: "可选；密码保存在 DSH 凭据库。",
    clearPassword: "移除已保存密码",
    passwordCleared: "保存时将移除已保存的密码。",
    noProxy: "直连列表（NO_PROXY）",
    noProxyHint: "使用逗号分隔主机或域名后缀，例如 localhost,.company.local",
    routingHint: "路由顺序：NO_PROXY → 对应 HTTP/HTTPS 代理 → 通用/SOCKS 代理 → 直连。",
    scopes: "生效范围",
    runtime: "DSH Host 与模型请求",
    runtimeDesc: "设置全局 Node/undici 路由 dispatcher，覆盖 DSH 服务及大部分模型提供方。",
    children: "子进程与 GUI 发起的命令",
    childrenDesc: "分别设置 HTTP_PROXY、HTTPS_PROXY、ALL_PROXY 和 NO_PROXY。",
    packageManager: "npm/pnpm 插件安装",
    packageManagerDesc: "向当前 DSH profile 的 .npmrc 分别写入 proxy 和 https-proxy。",
    persist: "持久化到 Windows 用户环境变量",
    persistDesc: "让之后新开的终端和重启后的 DSH 继承所有已配置代理变量。",
    testUrl: "连通性测试网址",
    save: "保存并应用",
    saving: "保存中…",
    test: "测试代理",
    testing: "测试中…",
    reset: "停用并清除",
    resetConfirm: "确认关闭所有代理范围，并删除全部已保存密码和配置吗？",
    loading: "加载中…",
    saved: "代理配置已保存并应用。",
    testOk: "代理连接成功：HTTP {status}，耗时 {ms} ms",
    failed: "操作失败",
    inactive: "尚未启用",
    active: "已配置",
    socksHint: "SOCKS5 的 DSH Host 模式通过内置隧道 dispatcher 实现；npm/pnpm 是否支持取决于包管理器版本。",
    unsaved: "有未保存修改",
    saveBeforeTest: "请先保存当前修改，再测试已应用的代理配置。",
    warningNpmrcCredentials: "npm/pnpm 开关会把含账号密码的代理 URL 明文写入当前 DSH profile 的 .npmrc。",
    warningUserEnvCredentials: "用户环境变量开关会把含账号密码的代理 URL 明文写入 Windows HKCU\\Environment。",
    warningRestartRequired: "用户环境变量只影响之后启动的终端和应用；请重启 DSH 后验证完整生效范围。",
  },
};

const EMPTY = {
  version: 2,
  proxies: {
    http: { enabled: false, scheme: "http", host: "127.0.0.1", port: 7890, username: "" },
    https: { enabled: false, scheme: "http", host: "127.0.0.1", port: 7890, username: "" },
    all: { enabled: false, scheme: "socks5", host: "127.0.0.1", port: 1080, username: "" },
  },
  noProxy: "localhost,127.0.0.1,::1",
  testUrl: "https://registry.npmjs.org/-/ping",
  scopes: { runtime: false, children: false, packageManager: false, persistUserEnv: false },
};

const EMPTY_PASSWORDS = Object.freeze({ http: "", https: "", all: "" });
const EMPTY_FLAGS = Object.freeze({ http: false, https: false, all: false });

const css = {
  root: { maxWidth: 820, display: "flex", flexDirection: "column", gap: 18, fontFamily: "inherit" },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { margin: 0, fontSize: 18, fontWeight: 600 },
  intro: { margin: 0, fontSize: 14, lineHeight: "22px", opacity: 0.72 },
  badge: { padding: "3px 10px", borderRadius: 12, fontSize: 12, background: "rgba(128,128,128,.16)", whiteSpace: "nowrap" },
  card: { border: "1px solid rgba(128,128,128,.32)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 14 },
  collapsedCard: { gap: 10 },
  endpointDisabled: { opacity: .68 },
  endpointHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  endpointToggle: { flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, padding: 0, borderRadius: 17, border: "1px solid rgba(128,128,128,.42)", background: "transparent", color: "inherit", cursor: "pointer", transition: "color .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease" },
  endpointToggleActive: { color: "#4c6ef5", borderColor: "rgba(76,110,245,.62)", background: "rgba(76,110,245,.10)", boxShadow: "0 2px 8px rgba(76,110,245,.16)" },
  endpointSummary: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, paddingLeft: 28, fontSize: 13, lineHeight: "20px" },
  summaryProtocol: { padding: "1px 7px", borderRadius: 10, background: "rgba(128,128,128,.14)", fontSize: 11, fontWeight: 600 },
  summaryAddress: { overflowWrap: "anywhere", fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" },
  grid: { display: "grid", gridTemplateColumns: "minmax(180px,2fr) minmax(90px,1fr)", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  label: { fontSize: 13, fontWeight: 500 },
  hint: { margin: 0, fontSize: 12, lineHeight: "18px", opacity: .62 },
  input: { boxSizing: "border-box", width: "100%", height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid rgba(128,128,128,.42)", background: "transparent", color: "inherit", font: "inherit", fontSize: 14 },
  select: { boxSizing: "border-box", width: "100%", height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid rgba(128,128,128,.42)", background: "var(--background, transparent)", color: "inherit", font: "inherit", fontSize: 14 },
  sectionTitle: { margin: 0, fontSize: 14, fontWeight: 600 },
  option: { display: "grid", gridTemplateColumns: "20px 1fr", gap: 8, alignItems: "start" },
  checkbox: { width: 16, height: 16, marginTop: 2 },
  optionName: { fontSize: 14, lineHeight: "20px", fontWeight: 500 },
  optionDesc: { margin: "2px 0 0", fontSize: 12, lineHeight: "18px", opacity: .65 },
  warning: { padding: "10px 12px", border: "1px solid rgba(245,159,0,.45)", background: "rgba(245,159,0,.10)", borderRadius: 8, fontSize: 12, lineHeight: "19px" },
  info: { padding: "10px 12px", border: "1px solid rgba(76,110,245,.35)", background: "rgba(76,110,245,.07)", borderRadius: 8, fontSize: 12, lineHeight: "19px" },
  error: { padding: "10px 12px", border: "1px solid rgba(224,49,49,.45)", background: "rgba(224,49,49,.08)", borderRadius: 8, color: "#e03131", fontSize: 13, lineHeight: "19px" },
  success: { padding: "10px 12px", border: "1px solid rgba(47,158,68,.40)", background: "rgba(47,158,68,.08)", borderRadius: 8, color: "#2f9e44", fontSize: 13, lineHeight: "19px" },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  button: { height: 34, padding: "0 14px", borderRadius: 17, border: "1px solid rgba(128,128,128,.42)", background: "transparent", color: "inherit", cursor: "pointer", font: "inherit", fontSize: 13 },
  primary: { border: "none", background: "#4c6ef5", color: "white" },
  danger: { color: "#e03131" },
  clear: { alignSelf: "flex-start", border: "none", background: "transparent", padding: 0, color: "#4c6ef5", cursor: "pointer", font: "inherit", fontSize: 12 },
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
      ...(config.proxies?.[key] || {}),
    }])),
    noProxy: config.noProxy ?? EMPTY.noProxy,
    testUrl: config.testUrl || EMPTY.testUrl,
    scopes: { ...EMPTY.scopes, ...(config.scopes || {}) },
  };
}

function EndpointEditor({ proxyKey, endpoint, password, hasPassword, clearPassword, t, onEndpoint, onPassword, onClear }) {
  const [expanded, setExpanded] = useState(false);
  const [toggleActive, setToggleActive] = useState(false);
  const titleKey = proxyKey === "all" ? "allProxy" : `${proxyKey}Proxy`;
  const descriptionKey = `${titleKey}Desc`;
  const summary = t("endpointSummary")
    .replace("{scheme}", String(endpoint.scheme || "—").toUpperCase())
    .replace("{host}", endpoint.host || "—")
    .replace("{port}", endpoint.port || "—");
  return (
    <div style={{
      ...css.card,
      ...(expanded ? {} : css.collapsedCard),
      ...(endpoint.enabled ? {} : css.endpointDisabled),
    }}>
      <div style={css.endpointHeader}>
        <label style={{ ...css.option, flex: "1 1 auto" }}>
          <input style={css.checkbox} type="checkbox" checked={endpoint.enabled}
            onChange={(event) => onEndpoint("enabled", event.target.checked)} />
          <span>
            <span style={css.optionName}>{t(titleKey)}</span>
            {expanded && <p style={css.optionDesc}>{t(descriptionKey)}</p>}
          </span>
        </label>
        <button
          type="button"
          style={{ ...css.endpointToggle, ...((toggleActive || expanded) ? css.endpointToggleActive : {}) }}
          aria-expanded={expanded}
          aria-label={`${expanded ? t("collapseProxy") : t("expandProxy")} ${t(titleKey)}`}
          title={expanded ? t("collapseProxy") : t("expandProxy")}
          onMouseEnter={() => setToggleActive(true)}
          onMouseLeave={() => setToggleActive(false)}
          onFocus={() => setToggleActive(true)}
          onBlur={() => setToggleActive(false)}
          onClick={() => setExpanded((current) => !current)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d={expanded ? "M4 10L8 6L12 10" : "M4 6L8 10L12 6"}
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {!expanded && (
        <div style={css.endpointSummary} title={summary}>
          <span style={css.summaryProtocol}>{String(endpoint.scheme || "—").toUpperCase()}</span>
          <span style={css.summaryAddress}>{endpoint.host || "—"}:{endpoint.port || "—"}</span>
        </div>
      )}
      {expanded && (
        <>
          <div style={css.grid}>
            <label style={css.field}>
              <span style={css.label}>{t("protocol")}</span>
              <select style={css.select} disabled={!endpoint.enabled} value={endpoint.scheme}
                onChange={(event) => onEndpoint("scheme", event.target.value)}>
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </label>
            <label style={css.field}>
              <span style={css.label}>{t("port")}</span>
              <input style={css.input} disabled={!endpoint.enabled} type="number" min="1" max="65535" value={endpoint.port}
                onChange={(event) => onEndpoint("port", event.target.value)} />
            </label>
          </div>
          <label style={css.field}>
            <span style={css.label}>{t("host")}</span>
            <input style={css.input} disabled={!endpoint.enabled} value={endpoint.host} placeholder="proxy.company.com"
              onChange={(event) => onEndpoint("host", event.target.value)} />
            <span style={css.hint}>{t("hostHint")}</span>
          </label>
          <div style={css.grid}>
            <label style={css.field}>
              <span style={css.label}>{t("username")}</span>
              <input style={css.input} disabled={!endpoint.enabled} autoComplete="username" value={endpoint.username}
                onChange={(event) => onEndpoint("username", event.target.value)} />
            </label>
            <label style={css.field}>
              <span style={css.label}>{t("password")}</span>
              <input style={css.input} disabled={!endpoint.enabled} type="password" autoComplete="new-password" value={password}
                placeholder={hasPassword && !clearPassword ? "••••••••" : ""}
                onChange={(event) => onPassword(event.target.value)} />
              <span style={css.hint}>{hasPassword && !clearPassword ? t("passwordSaved") : t("passwordEmpty")}</span>
            </label>
          </div>
          {hasPassword && !clearPassword && (
            <button type="button" style={css.clear} onClick={onClear}>{t("clearPassword")}</button>
          )}
          {clearPassword && <span style={css.hint}>{t("passwordCleared")}</span>}
        </>
      )}
    </div>
  );
}

function ProxySettings({ t = (key) => DICTS.en[key] ?? key }) {
  const [form, setForm] = useState(() => editableConfig());
  const [appliedForm, setAppliedForm] = useState(() => editableConfig());
  const [passwords, setPasswords] = useState({ ...EMPTY_PASSWORDS });
  const [hasPasswords, setHasPasswords] = useState({ ...EMPTY_FLAGS });
  const [clearPasswords, setClearPasswords] = useState({ ...EMPTY_FLAGS });
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(null);
  const enabled = useMemo(() => Object.values(appliedForm.scopes).some(Boolean), [appliedForm.scopes]);
  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(appliedForm)
      || Object.values(passwords).some((value) => value !== "")
      || Object.values(clearPasswords).some(Boolean),
    [form, appliedForm, passwords, clearPasswords],
  );

  useEffect(() => {
    let alive = true;
    api("config")
      .then((data) => {
        if (!alive) return;
        const config = editableConfig(data.config || EMPTY);
        setForm(config);
        setAppliedForm(config);
        setHasPasswords({ ...EMPTY_FLAGS, ...(data.config?.hasPasswords || {}) });
        setWarnings(data.config?.warnings || []);
        if (data.startupError) setMessage({ kind: "error", text: data.startupError });
      })
      .catch((error) => alive && setMessage({ kind: "error", text: error.message }))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const field = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const scope = (name, value) => setForm((current) => ({
    ...current,
    scopes: { ...current.scopes, [name]: value },
  }));
  const endpointField = (key, name, value) => setForm((current) => ({
    ...current,
    proxies: { ...current.proxies, [key]: { ...current.proxies[key], [name]: value } },
  }));
  const endpointPassword = (key, value) => {
    setPasswords((current) => ({ ...current, [key]: value }));
    setClearPasswords((current) => ({ ...current, [key]: false }));
  };

  const save = async () => {
    setBusy("save");
    setMessage(null);
    try {
      const changedPasswords = Object.fromEntries(PROXY_KEYS
        .filter((key) => passwords[key] !== "")
        .map((key) => [key, passwords[key]]));
      const data = await api("save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: form, passwords: changedPasswords, clearPasswords }),
      });
      const savedConfig = editableConfig(data.config);
      setForm(savedConfig);
      setAppliedForm(savedConfig);
      setPasswords({ ...EMPTY_PASSWORDS });
      setClearPasswords({ ...EMPTY_FLAGS });
      setHasPasswords({ ...EMPTY_FLAGS, ...(data.config.hasPasswords || {}) });
      setWarnings(data.config.warnings || []);
      setMessage({ kind: "success", text: t("saved") });
    } catch (error) {
      setMessage({ kind: "error", text: `${t("failed")}：${error.message}` });
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
        body: JSON.stringify({ url: form.testUrl }),
      });
      setMessage({
        kind: "success",
        text: t("testOk").replace("{status}", data.statusCode).replace("{ms}", data.elapsedMs),
      });
    } catch (error) {
      setMessage({ kind: "error", text: `${t("failed")}：${error.message}` });
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
      setMessage({ kind: "error", text: `${t("failed")}：${error.message}` });
    } finally {
      setBusy("");
    }
  };

  if (loading) return <div style={css.root}>{t("loading")}</div>;

  const visibleWarnings = new Set(warnings);
  const authenticated = PROXY_KEYS.some((key) => form.proxies[key].enabled && form.proxies[key].username);
  if (authenticated && form.scopes.packageManager) visibleWarnings.add("warningNpmrcCredentials");
  if (authenticated && form.scopes.persistUserEnv) visibleWarnings.add("warningUserEnvCredentials");
  if (form.scopes.persistUserEnv) visibleWarnings.add("warningRestartRequired");
  const hasSocks = PROXY_KEYS.some((key) => form.proxies[key].enabled && form.proxies[key].scheme === "socks5");

  return (
    <div style={css.root}>
      <div>
        <div style={css.head}>
          <h2 style={css.title}>{t("title")}</h2>
          <span style={css.badge}>{dirty ? t("unsaved") : (enabled ? t("active") : t("inactive"))}</span>
        </div>
        <p style={css.intro}>{t("intro")}</p>
      </div>

      <div style={css.info}>{t("routingHint")}</div>

      {PROXY_KEYS.map((key) => (
        <EndpointEditor
          key={key}
          proxyKey={key}
          endpoint={form.proxies[key]}
          password={passwords[key]}
          hasPassword={hasPasswords[key]}
          clearPassword={clearPasswords[key]}
          t={t}
          onEndpoint={(name, value) => endpointField(key, name, value)}
          onPassword={(value) => endpointPassword(key, value)}
          onClear={() => {
            setClearPasswords((current) => ({ ...current, [key]: true }));
            setPasswords((current) => ({ ...current, [key]: "" }));
          }}
        />
      ))}

      <div style={css.card}>
        <label style={css.field}>
          <span style={css.label}>{t("noProxy")}</span>
          <input style={css.input} value={form.noProxy} onChange={(event) => field("noProxy", event.target.value)} />
          <span style={css.hint}>{t("noProxyHint")}</span>
        </label>
      </div>

      <div style={css.card}>
        <h3 style={css.sectionTitle}>{t("scopes")}</h3>
        {[
          ["runtime", "runtime", "runtimeDesc"],
          ["children", "children", "childrenDesc"],
          ["packageManager", "packageManager", "packageManagerDesc"],
          ["persistUserEnv", "persist", "persistDesc"],
        ].map(([key, label, description]) => (
          <label key={key} style={css.option}>
            <input style={css.checkbox} type="checkbox" checked={form.scopes[key]}
              onChange={(event) => scope(key, event.target.checked)} />
            <span>
              <span style={css.optionName}>{t(label)}</span>
              <p style={css.optionDesc}>{t(description)}</p>
            </span>
          </label>
        ))}
        {hasSocks && <div style={css.warning}>{t("socksHint")}</div>}
        {[...visibleWarnings].map((warning) => <div key={warning} style={css.warning}>{t(warning)}</div>)}
      </div>

      <label style={css.field}>
        <span style={css.label}>{t("testUrl")}</span>
        <input style={css.input} value={form.testUrl} onChange={(event) => field("testUrl", event.target.value)} />
      </label>

      {dirty && <div style={css.warning}>{t("saveBeforeTest")}</div>}
      {message && <div style={message.kind === "error" ? css.error : css.success}>{message.text}</div>}
      <div style={css.actions}>
        <button type="button" style={{ ...css.button, ...css.primary }} disabled={!!busy} onClick={save}>
          {busy === "save" ? t("saving") : t("save")}
        </button>
        <button type="button" style={css.button} disabled={!!busy || dirty} onClick={test}>
          {busy === "test" ? t("testing") : t("test")}
        </button>
        <button type="button" style={{ ...css.button, ...css.danger }} disabled={!!busy} onClick={reset}>
          {t("reset")}
        </button>
      </div>
    </div>
  );
}

export function apply(ctx) {
  ctx.locale.register("dsh-network-proxy-settings", DICTS);
  const t = ctx.locale.bind("dsh-network-proxy-settings");
  ctx.slots.inject("settings.section", () => ctx.slots.register(
    {
      name: "settings.section",
      id: "network-proxy-settings",
      order: 12,
      label: () => t("nav"),
      inject: () => ({ t }),
    },
    ProxySettings,
  ));
}
