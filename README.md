# dsh-network-proxy-settings

为 DSH desktop 提供图形化网络代理设置。支持 HTTP、HTTPS、SOCKS5、代理账号密码、`NO_PROXY`、连通性测试，以及按用途启用代理。

## 功能

- 可同时启用 **HTTP 代理、HTTPS 代理、通用/SOCKS 代理** 三组端点
- 每组可独立选择代理传输协议（HTTP / HTTPS / SOCKS5），并分别填写主机、端口、账号和密码
- 路由顺序为：`NO_PROXY` → 对应 HTTP/HTTPS 专用代理 → 通用/SOCKS 代理 → 直连
- 密码保存在 DSH 凭据库，普通配置文件不保存密码
- 三类独立开关：
  1. **DSH Host 与模型请求**：设置全局 undici dispatcher，覆盖 Host 插件和大部分 LLM Provider 的 Node `fetch`
  2. **子进程与 GUI 发起的命令**：在 DSH 进程内设置 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY`、`NO_PROXY`
  3. **npm/pnpm 插件安装**：向当前 DSH profile 的 `.npmrc` 写入带边界标记的配置块
- 可选写入 **Windows 用户环境变量**，让新开的终端以及重启后的 DSH 继承代理
- 支持 `NO_PROXY` 精确主机、`.domain` / `*.domain` 后缀、端口规则和 `*`
- 设置页内测试指定 HTTP/HTTPS 地址
- 保存和重置采用串行事务；持久化步骤失败时回滚已完成的修改
- 中英文界面

## 兼容性

- Node.js `>=20.18.1`
- DSH `0.1.7-rc.2 desktop`（当前实测目标）
- 开发环境固定使用 pnpm `11.7.0`
- Windows 用户环境变量持久化只支持 Windows；其他代理范围仍可在 DSH 支持的平台使用

## 安装

从本地源码安装：

```powershell
git clone https://github.com/JacobCodeShow/dsh-network-proxy-settings.git
cd dsh-network-proxy-settings
dsh plugin add .
```

然后重启 DSH desktop，在「设置 → 网络代理」中配置。

### 第一次安装本插件时网络本身就需要代理

代理插件必须先安装才能加载，因此它无法代理自己的首次下载。首次安装前可在 PowerShell 临时设置：

```powershell
$env:HTTP_PROXY  = 'http://user:password@proxy.company.com:8080'
$env:HTTPS_PROXY = $env:HTTP_PROXY
$env:ALL_PROXY   = $env:HTTP_PROXY

dsh plugin add .
```

账号或密码含 `@`、`:`、`/` 等字符时需先进行 URL 编码。安装完成并在设置页保存后，可关闭该终端。

## 设置项

| 设置 | 作用 |
|---|---|
| HTTP 代理 | 优先处理 `http://` 目标；未启用时回退到通用/SOCKS 代理 |
| HTTPS 代理 | 优先处理 `https://` 目标；代理传输协议本身可以是 HTTP CONNECT、HTTPS 或 SOCKS5 |
| 通用/SOCKS 代理 | 对应 `ALL_PROXY`，作为 HTTP/HTTPS 专用代理缺失时的后备代理 |
| DSH Host 与模型请求 | 即时切换全局 undici 路由 dispatcher，按目标协议选择代理 |
| 子进程与 GUI 发起的命令 | 分别设置 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 和 `NO_PROXY` |
| npm/pnpm 插件安装 | 原子更新 `$DSH_PROFILE_DIR/.npmrc` 中独立的 `proxy` 与 `https-proxy` |
| Windows 用户环境变量 | 更新 `HKCU\Environment` 并通知系统环境已变化；新终端和重启后的应用生效 |
| NO_PROXY | 在选择任何代理前匹配需要直连的内网、本机地址等目标 |

每个请求只会选择一条代理路径，不会同时串联三个代理。建议先配置所需端点并只开启「DSH Host 与模型请求」，保存后点击「测试代理」。确认成功后，再按需开启插件安装和用户环境变量持久化。页面存在未保存修改时会禁用测试按钮，避免误把旧配置的测试结果当成新配置结果。

## 数据存储

| 数据 | 位置 | 是否可能含明文密码 |
|---|---|---|
| 普通代理配置 | `$DSH_PROFILE_DIR/.dsh-network-proxy-settings.json` | 否 |
| 三组独立密码和环境变量归属记录 | DSH 凭据库，键为 `dsh-network-proxy-settings/auth` | 密码由凭据库保护 |
| 包管理器代理 | `$DSH_PROFILE_DIR/.npmrc` 的受管配置块 | 是，启用认证代理时 |
| Windows 用户环境变量 | `HKCU\Environment` | 是，启用认证代理时 |

保存操作会先验证配置，再依次更新可持久化状态，最后切换当前进程环境和全局 dispatcher。任一步骤失败时，插件会反向恢复本次操作已经修改的文件、凭据、注册表和进程环境。并发保存与重置会按顺序执行。

## 旧配置迁移

配置版本已升级为 v2。加载 v1 单代理配置时会自动映射：

- 原 HTTP 或 HTTPS 代理同时迁移为已启用的「HTTP 代理」和「HTTPS 代理」，保持旧版对两类请求都生效的行为。
- 原 SOCKS5 代理迁移为已启用的「通用/SOCKS 代理」。
- 原单密码在首次加载时映射到迁移后启用的端点；下一次保存时写为三组独立密码记录。

迁移不会把密码写入普通配置 JSON。

## 安全说明

- 密码默认只存入 DSH 凭据库。
- **开启 npm/pnpm 插件安装**时，npm/pnpm 要求代理 URL 出现在 profile 的 `.npmrc`，因此账号密码会以明文出现在该文件。
- **开启 Windows 用户环境变量持久化**时，带账号密码的 URL 会以明文出现在 `HKCU\Environment`。
- 设置页会在上述两种情况显示明确警告。若公司代理允许，优先使用短期凭据或本机无认证代理转发器。
- 插件日志及 API 错误会遮蔽 URL 中的代理凭据。
- 停用并清除时，只恢复仍与本插件最后写入值一致的 Windows 环境变量；用户或其他程序之后修改的值不会被覆盖。
- `NO_PROXY` 拒绝 CR/LF/NUL，防止向 `.npmrc` 注入额外配置行。

## 输入与连通性测试限制

- 代理主机最长 255 字符，账号最长 1024 字符，密码最长 4096 字符。
- `NO_PROXY` 最长 8192 字符；不解析 CIDR 网段。
- 测试 URL 最长 4096 字符，只允许不含账号密码的 HTTP/HTTPS URL。
- 连通性测试最多跟随 3 次 HTTP 重定向，总时限 15 秒，最多读取 1 MiB 响应体。

## 边界

- 「DSH Host」覆盖 Node/undici 网络栈；Electron/Chromium 页面导航、系统浏览器以及不使用 Node fetch 的原生程序不一定受此开关控制。
- 已经打开的外部终端不会继承 DSH 进程环境；需开启用户环境变量持久化并新开终端，或手动设置环境变量。
- SOCKS5 对 DSH Host 由插件直接支持；npm/pnpm 是否接受 `socks5://` 取决于对应包管理器版本。
- 如果其他组件替换了本插件正在管理的全局 dispatcher 或进程代理环境变量，本插件会停止覆盖并返回错误，避免误改其他组件状态。

## 保存失败后的恢复

正常失败会自动回滚。如果页面仍提示配置不一致：

1. 记录页面错误信息并重启 DSH。
2. 检查 `$DSH_PROFILE_DIR/.dsh-network-proxy-settings.json` 是否为合法 JSON。
3. 检查 `$DSH_PROFILE_DIR/.npmrc` 中 `dsh-network-proxy-settings:begin/end` 标记是否完整且成对。
4. 检查 `HKCU\Environment` 中代理变量是否被其他工具修改；插件不会覆盖已经发生外部变化的值。
5. 回到设置页执行「停用并清除」，确认无误后重新保存。

不要手工把密码写回普通配置 JSON；需要重新输入密码时请通过设置页保存。

## 开发与验证

```powershell
corepack prepare pnpm@11.7.0 --activate
pnpm install --frozen-lockfile --config.auto-install-peers=false
pnpm run check
pnpm run test:coverage
pnpm pack --dry-run
```

测试覆盖 v1→v2 配置/密码迁移、三组配置校验、HTTP/HTTPS/通用回退路由、独立认证 URL、`NO_PROXY`、`.npmrc` 受管块、保存/重置事务、完整回滚、环境变量归属、连通性响应限制，以及 HTTP/SOCKS5 本地真实隧道请求。CI 在 Windows/Linux 和 Node 20.18.1/22 上执行相同门禁。

## 文件结构

| 文件 | 作用 |
|---|---|
| `cordis.patch.yml` | 将 Host 插件挂载到 DSH bundle |
| `src/host.mjs` | 代理 dispatcher、SOCKS5、事务、环境变量、npmrc、凭据与本地 API |
| `src/shared.mjs` | 配置校验、URL/脱敏、NO_PROXY 和 npmrc 公共逻辑 |
| `src/client.jsx` | 「网络代理」设置页 |
| `scripts/build-client.mjs` | 生成 DSH client ModuleLoader bundle |
| `test/` | 单元、生命周期和回环网络测试 |
| `pnpm-lock.yaml` | 可复现依赖版本和完整性哈希 |
| `.github/workflows/ci.yml` | 跨平台持续集成门禁 |
| `CHANGELOG.md` | 版本变更记录 |

## License

MIT
