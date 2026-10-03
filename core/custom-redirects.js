'use strict';

/**
 * Custom Redirects - 域名重写规则（第二类私货）
 *
 * 与 custom-mappings.js 的区别：
 * - custom-mappings：域名 => 本地文件（CDN 本地化）
 * - custom-redirects：域名 => 等效域名（重定向，如 abs-0.twimg.com => abs.twimg.com）
 *
 * 场景：某些域名不支持 ECH/H3（如 abs-0.twimg.com），但等效域名可用。
 * 规则：URL 中的 ://old-domain/ 整体替换为 ://new-domain/，路径/参数保留。
 * 支持通配符：键为完整域名，匹配该域名下所有路径。
 *
 * 单独文件，合上游无冲突。
 */

const customRedirects = {
    // Twitter/X：abs-0 不支持 ECH/H3，abs 等效可用
    'abs-0.twimg.com': 'abs.twimg.com',
};

/**
 * 检查 URL 是否命中重写规则，返回重写后的 URL，否则返回 null
 * @param {string} url - 原始请求 URL
 * @returns {string|null} - 重写后的 URL，或 null（无命中）
 */
function customRedirectUrl(url) {
    if (typeof url !== 'string' || url.length === 0) {
        return null;
    }
    for (const oldDomain of Object.keys(customRedirects)) {
        const newDomain = customRedirects[oldDomain];
        // 匹配 ://old-domain/ 或 ://old-domain 结尾（无路径）
        const marker = '://' + oldDomain;
        const idx = url.indexOf(marker);
        if (idx !== -1) {
            const after = idx + marker.length;
            // 确保是完整域名匹配：后面必须是 /、:、?、# 或结尾
            const nextChar = url.charAt(after);
            if (nextChar === '' || nextChar === '/' || nextChar === ':' ||
                nextChar === '?' || nextChar === '#') {
                return url.slice(0, idx) + '://' + newDomain + url.slice(after);
            }
        }
    }
    return null;
}
