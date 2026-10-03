'use strict';

/**
 * Custom Remote Rules - 在线规则同步（第三类私货）
 *
 * 域名重写规则不用重新打包：扩展启动时从线上拉取 rules/redirects.json，
 * 24 小时更新一次。拉取失败静默，用本地内置规则兜底。
 *
 * 工作原理（同步缓存 + 后台更新）：
 * - interceptor.handleRequest 是同步的，不能 await，所以维护一份同步内存缓存
 *   `effectiveRedirectsCache`，customRedirectUrl() 直接读它。
 * - background 页加载时：先读 browser.storage.local 的缓存 -> 再判断是否过期 ->
 *   过期则后台 fetch 更新。
 *
 * 单独文件，合上游无冲突。
 */

const REMOTE_RULES_URL = 'https://cdn.jsdelivr.net/gh/anglesgirl/LocalCDN-custom@custom-main/rules/redirects.json';
// 实时性要求高可换：'https://raw.githubusercontent.com/anglesgirl/LocalCDN-custom/custom-main/rules/redirects.json'
const REMOTE_RULES_CACHE_KEY = 'custom_remote_redirects';
const REMOTE_RULES_TS_KEY = 'custom_remote_redirects_ts';
const REMOTE_RULES_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时
const REMOTE_FETCH_TIMEOUT_MS = 10000; // 10 秒

// 同步内存缓存：初始 = 本地内置规则，保证任何时候都有规则可用
let effectiveRedirectsCache = Object.assign({}, typeof customRedirects !== 'undefined' ? customRedirects : {});

/**
 * 供 custom-redirects.js 的 customRedirectUrl() 调用（同步）。
 * 远程优先，本地兜底。
 * @returns {Object} - {oldDomain: newDomain}
 */
function getEffectiveRedirects() {
    return effectiveRedirectsCache;
}

/**
 * 合并远程规则到内存缓存（远程优先）。
 * @param {Object} remote - 远程 redirects 对象
 */
function mergeRemoteRedirects(remote) {
    if (!remote || typeof remote !== 'object') {
        return;
    }
    const local = typeof customRedirects !== 'undefined' ? customRedirects : {};
    effectiveRedirectsCache = Object.assign({}, local, remote);
}

/**
 * 从线上拉取规则，失败静默（返回 false），不影响原有功能。
 * @returns {Promise<boolean>} - 是否成功更新
 */
async function fetchRemoteRules() {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);
        let resp;
        try {
            resp = await fetch(REMOTE_RULES_URL, { signal: controller.signal, cache: 'no-store' });
        } finally {
            clearTimeout(timer);
        }
        if (!resp || !resp.ok) {
            return false;
        }
        const data = await resp.json();
        if (!data || typeof data.redirects !== 'object' || data.redirects === null) {
            return false;
        }
        mergeRemoteRedirects(data.redirects);
        // 持久化到 storage.local
        try {
            const save = {};
            save[REMOTE_RULES_CACHE_KEY] = data.redirects;
            save[REMOTE_RULES_TS_KEY] = Date.now();
            chrome.storage.local.set(save);
        } catch (e) { /* 静默 */ }
        return true;
    } catch (e) {
        // 超时/断网/JSON 非法，全部静默
        return false;
    }
}

/**
 * 启动/定时触发：先用 storage 缓存，再判断 TTL 过期则后台更新。
 */
function refreshRemoteRulesIfNeeded() {
    try {
        chrome.storage.local.get([REMOTE_RULES_TS_KEY, REMOTE_RULES_CACHE_KEY], (items) => {
            try {
                const ts = items && items[REMOTE_RULES_TS_KEY] ? items[REMOTE_RULES_TS_KEY] : 0;
                const cached = items ? items[REMOTE_RULES_CACHE_KEY] : null;
                if (cached && typeof cached === 'object') {
                    mergeRemoteRedirects(cached);
                }
                if (Date.now() - ts > REMOTE_RULES_TTL_MS) {
                    fetchRemoteRules();
                }
            } catch (e) { /* 静默 */ }
        });
    } catch (e) { /* chrome.storage 不可用时静默 */ }
}

// background 页加载即触发；每小时检查一次 TTL
try {
    refreshRemoteRulesIfNeeded();
    setInterval(refreshRemoteRulesIfNeeded, 60 * 60 * 1000);
} catch (e) { /* 静默 */ }
