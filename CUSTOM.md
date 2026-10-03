# LocalCDN-custom

Fork of [nobody/LocalCDN](https://codeberg.org/nobody/LocalCDN) - 保留全部 CDN 加速，只加私货。

## 私货规则（两类）

### 第一类：本地文件映射（custom-mappings.js + custom-resources.js）
域名 => 本地文件，用于 CDN 本地化或屏蔽。

- `static2.onlyfans.com/*` => `resources/custom/onlyfans/app.jsm` (本地嵌入)

### 第二类：域名重写（custom-redirects.js）
域名 => 等效域名，用于绕过不支持 ECH/H3 的域名。

- `abs-0.twimg.com` => `abs.twimg.com` (Twitter：abs-0 不支持 ECH/H3，abs 等效可用)

重写规则：URL 中的 `://old-domain/` 整体替换为 `://new-domain/`，路径和参数保留。
支持所有路径（通配符），确保完整域名匹配（避免 `evil-abs-0.twimg.com` 被误匹配）。

### 新增 JS 库（2026-10-03）
- `htmx` 1.9.12 (cdnjs)
- `preact` 10.22.0 (cdnjs)

## 文件结构

- `core/custom-mappings.js` - 第一类规则：域名 => 本地文件
- `core/custom-resources.js` - 本地文件资源定义
- `core/custom-redirects.js` - 第二类规则：域名 => 等效域名（在 `interceptor.handleRequest` 开头注入）
- `resources/custom/` - 自定义本地文件
- `resources/htmx/`, `resources/preact/` - 新增 JS 库

以上文件独立于上游，合 upstream 时无冲突。
`pages/background/background.html` 已注入 custom-redirects.js。

## 维护

### 同步上游
```bash
./scripts/sync-upstream.sh
```
- upstream remote：`https://codeberg.org/nobody/LocalCDN.git`（已配置）
- `core/custom-*.js`、`resources/custom/`、`resources/htmx/`、`resources/preact/`、`CUSTOM.md`、`scripts/` 与上游无重名，合并无冲突（2026-10-03 实测 `git merge upstream/main` 零冲突）
- 唯一改过的上游文件：`pages/background/background.html`（加 custom-*.js 引入）、`core/interceptor.js`（加域名重写钩子）、`manifest.json`（CSP 加 connect-src 放行规则同步），合并后检查这几处是否完好
- 同步脚本会自动检查 custom-* 文件和 background.html 引入

### 加新规则
- 本地文件：改 `core/custom-mappings.js` + `core/custom-resources.js` + `resources/custom/` 下加文件
- 域名重写：**不用重新打包**，直接改仓库里的 `rules/redirects.json`，扩展 24 小时内自动同步（见下方"在线规则同步"）
- 新 JS 库：`resources/<lib>/` 下加 `.jsm` 文件 + `core/custom-resources.js` 定义 + `core/custom-mappings.js` 映射

### 在线规则同步（2026-10-03）
域名重写规则支持在线更新，不用重新打包扩展：

- **规则文件**：`rules/redirects.json`（仓库内）
  ```json
  {"version": 1, "updated": "2026-10-03", "redirects": {"abs-0.twimg.com": "abs.twimg.com"}}
  ```
- **同步地址**：`https://cdn.jsdelivr.net/gh/anglesgirl/LocalCDN-custom@custom-main/rules/redirects.json`
  - jsdelivr 的 gh 镜像有缓存延迟（通常几分钟到几小时）；要实时生效可把 `core/custom-remote.js` 里的 `REMOTE_RULES_URL` 换成 `https://raw.githubusercontent.com/anglesgirl/LocalCDN-custom/custom-main/rules/redirects.json`
- **机制**：扩展启动时从 `browser.storage.local` 读缓存 -> TTL（24h）过期则后台 fetch 更新；失败静默，用本地内置规则兜底
- **合并策略**：远程优先，本地 `customRedirects` 兜底（`core/custom-remote.js` 的 `getEffectiveRedirects()`）
- **实现文件**：`core/custom-remote.js`（同步缓存 + 后台更新，interceptor 读同步内存缓存，无需改 `handleRequest` 为异步）
- **CSP**：`manifest.json` 的 `content_security_policy` 加了 `connect-src https://cdn.jsdelivr.net https://raw.githubusercontent.com`（否则 background 页 fetch 被拦）。上游同步时如 manifest 冲突，保留这行即可

### 去捐赠（2026-10-03）
已移除上游的捐赠相关 UI：
- 删 `pages/donate/`、`icons/donate.svg`
- popup、options、welcome 里的捐赠按钮/链接/选项全部移除
- `hideDonationButton` 设置项一并移除（core/constants.js、state-manager.js、messenger.js、options.js）
- 上游同步时如 donate 相关文件被加回，重新跑一遍清理即可

## 构建

Firefox: `web-ext build` 或 `make` 生成 xpi，Iceraven 内置到 `assets/extensions/`
