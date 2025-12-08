#!/bin/bash
# 编译 TypeScript 到 JavaScript

echo "开始编译 TypeScript..."

cd "$(dirname "$0")"

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
fi

# 编译
echo "正在编译..."
npx tsc

# 检查结果
if [ -f "js/game.js" ]; then
    echo "✅ 编译成功！"
    echo "生成的文件："
    ls -lh js/game.js
    ls -lh js/games/*.js | head -10
else
    echo "❌ 编译失败，请检查错误信息"
fi

