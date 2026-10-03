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

```bash
# 同步上游
git fetch upstream
git merge upstream/main
# 加新规则：
# - 本地文件：改 core/custom-mappings.js + core/custom-resources.js + resources/custom/ 下加文件
# - 域名重写：改 core/custom-redirects.js 的 customRedirects 对象
# - 新 JS 库：resources/<lib>/ 下加 .jsm 文件 + core/custom-resources.js 定义 + core/custom-mappings.js 映射
```

## 构建

Firefox: `web-ext build` 或 `make` 生成 xpi，Iceraven 内置到 `assets/extensions/`
