# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 的组织方式。

## [Unreleased]

## [0.1.1-dsh-0.2.0-rc.1] - 2026-09-30

### Changed

- 单代理三选一模型升级为可同时启用的「HTTP 代理」「HTTPS 代理」「通用/SOCKS 代理」三组模型。
- 请求按 `NO_PROXY`、目标协议专用代理、通用代理、直连的顺序路由。
- `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY`、npm `proxy` 与 `https-proxy` 分别写入对应端点。
- 三组代理分别保存密码；v1 单代理配置和单密码会自动迁移到 v2。
- 最低 Node.js 版本调整为 20.18.1，与 undici 7 的运行要求一致。
- 保存、重置和启动应用改为串行事务，失败时回滚文件、凭据、注册表和进程环境。
- 全局 dispatcher 与进程环境变量改用归属检查，避免覆盖其他组件后续修改。
- Windows 用户环境变量由 `setx` 改为可回滚的注册表更新，并保留启用前的原始值。
- 连通性测试增加 15 秒总时限、1 MiB 响应限制及最多 3 次安全重定向。
- Client 增加未保存状态，存在未保存修改时禁止测试旧配置。
- 每组代理卡片支持独立折叠和展开；折叠后仅显示启用状态、代理协议、主机和端口摘要。
- 服务端警告改为由 Client 本地化的稳定代码。

### Fixed

- 修复保存失败后部分运行时状态仍然生效的问题。
- 修复停用后 Dispose 可能重新恢复旧代理环境变量的问题。
- 修复 `NO_PROXY` 为空或 Windows 环境变量部分写入时难以清理的问题。
- 修复 undici 7 不再接受 `maxRedirections` 请求选项导致连通性测试失败的问题。
- 拒绝畸形主机、带凭据的测试 URL 以及 `NO_PROXY` 换行注入。
- 检测并拒绝损坏的 `.npmrc` 受管块，同时清理重复的完整受管块。

### Added

- 保存、重置、事务回滚、响应限制和 Windows 环境变量规划测试。
- pnpm 锁文件、跨平台 GitHub Actions 门禁和覆盖率脚本。
- 数据存储、限制、事务语义和失败恢复文档。

## [0.1.0-dsh-0.1.7-rc.2]

### Added

- 初始版本：HTTP、HTTPS、SOCKS5、认证、`NO_PROXY`、作用域开关和连通性测试。
