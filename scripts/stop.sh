#!/bin/bash

# 停止绿色建筑评价系统 Web 版

echo "🛑 停止绿色建筑评价系统..."

# 停止后端
if pkill -f "uvicorn main:app"; then
    echo "✅ 后端服务已停止"
else
    echo "⚠️  后端服务未运行"
fi

# 停止前端
if pkill -f "python3 -m http.server 3000"; then
    echo "✅ Web 服务已停止"
else
    echo "⚠️  Web 服务未运行"
fi

echo "✅ 所有服务已停止"
