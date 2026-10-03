#!/bin/bash
# 同步上游 LocalCDN 更新
# 用法：./scripts/sync-upstream.sh
#
# custom-* 文件（core/custom-*.js、resources/custom/）是独立的，
# 与上游文件无重名，合并不会冲突。
# 唯一改过上游文件的地方：pages/background/background.html（加了两个 script 引入），
# 合并时注意检查。

set -e
cd "$(dirname "$0")/.."

echo "==> fetch upstream..."
git fetch upstream

echo "==> 当前分支: $(git branch --show-current)"
echo "==> 上游最新: $(git rev-parse --short upstream/main 2>/dev/null || git rev-parse --short upstream/master)"

echo "==> 合并中..."
git merge upstream/main --no-edit 2>/dev/null || git merge upstream/master --no-edit

echo ""
echo "==> 检查 custom-* 是否完好:"
for f in core/custom-redirects.js core/custom-resources.js core/custom-mappings.js; do
    if [ -f "$f" ]; then
        echo "  OK: $f"
    else
        echo "  MISSING: $f  <-- 注意！"
    fi
done
[ -d "resources/custom" ] && echo "  OK: resources/custom/" || echo "  MISSING: resources/custom/  <-- 注意！"

echo ""
echo "==> 检查 background.html 的 custom 引入:"
grep -c "custom-" pages/background/background.html 2>/dev/null || echo "  引入丢失，需要手动加回"

echo ""
echo "同步完成。"
