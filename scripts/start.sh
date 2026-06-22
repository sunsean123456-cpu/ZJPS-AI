#!/bin/bash

# 绿色建筑评价系统 Web 版启动脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🏗️  绿色建筑评价系统 Web 版"
echo "=============================="
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 Python 3，请先安装"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装"
    exit 1
fi

# 后端依赖
echo "📦 检查后端依赖..."
cd "$PROJECT_DIR/backend"
if [ ! -d ".venv" ]; then
    echo "   创建虚拟环境..."
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

# 前端依赖
echo "📦 检查前端依赖..."
cd "$PROJECT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "   安装前端依赖..."
    npm install
fi

# 构建前端
echo "🔨 构建前端..."
npm run build

# 启动后端
echo ""
echo "🚀 启动后端服务..."
cd "$PROJECT_DIR/backend"
source .venv/bin/activate

# 检查是否已有服务运行
if lsof -i :8000 &> /dev/null; then
    echo "⚠️  端口 8000 已被占用，尝试停止旧服务..."
    pkill -f "uvicorn main:app" || true
    sleep 2
fi

# 启动后端（后台运行）
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ 后端已启动 (PID: $BACKEND_PID)"

# 等待后端启动
sleep 3

# 服务前端静态文件
echo "🌐 启动 Web 服务..."
cd "$PROJECT_DIR/frontend/dist"

if lsof -i :3000 &> /dev/null; then
    echo "⚠️  端口 3000 已被占用，尝试停止旧服务..."
    pkill -f "python3 -m http.server 3000" || true
    sleep 2
fi

nohup python3 -m http.server 3000 > ../../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Web 服务已启动 (PID: $FRONTEND_PID)"

echo ""
echo "=============================="
echo "✅ 系统已启动完成！"
echo ""
echo "🌐 访问地址: http://localhost:3000"
echo "📡 API 文档: http://localhost:8000/docs"
echo ""
echo "📋 默认管理员账号:"
echo "   手机号: 13800000000"
echo "   密码: admin123"
echo ""
echo "🛑 停止服务:"
echo "   kill $BACKEND_PID  # 停止后端"
echo "   kill $FRONTEND_PID  # 停止前端"
echo "   或者运行: ./scripts/stop.sh"
echo "=============================="
