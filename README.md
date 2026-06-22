# 绿建评价 4.0

> **绿色 · 智能 · 高效**

基于 AI 的绿色建筑技术评审系统，支持材料上传、智能预审、多维度评审、结果导出等完整流程。

## 技术栈

**前端**
- React 18 + TypeScript
- Vite 5
- Zustand 状态管理
- react-virtuoso 虚拟列表

**后端**
- FastAPI
- SQLAlchemy + SQLite
- JWT 认证
- SSE 流式响应

**AI 服务**
- 通义千问 qwen-plus (dashscope API)
- 五维度评审体系（技术先进性、绿色低碳、工程成熟度、经济适用性、材料质量）

## 快速开始

### 1. 安装依赖

```bash
# 前端
cd frontend
npm install

# 后端
cd ../backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 配置环境变量

创建 `backend/.env` 文件：

```bash
# AI 服务配置
LLM_API_KEY=***
LLM_MODEL=qwen-plus
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 数据库
DATABASE_URL=sqlite:///./data/green_building.db

# JWT 密钥
SECRET_KEY=***
```

### 3. 启动服务

```bash
# 后端（端口 8000）
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000

# 前端（端口 3000，新终端）
cd frontend
npm run dev
```

### 4. 访问应用

打开浏览器访问：http://localhost:3000

默认管理员账号：
- 手机号：13800138000
- 密码：admin123

## 核心功能

### 📁 项目管理
- 创建/编辑/删除项目
- 项目看板（待评审/进行中/评审中/已完成）
- 项目搜索和筛选

### 📤 材料上传
- 拖拽上传
- 支持 PDF/Word/Excel/图片
- 自动文档解析

### 🔍 智能预审
- 材料完整性检查
- 质量评分
- 问题清单和改进建议

### 🚀 AI 评审
- 五维度自动评分
- 证据链追溯
- 置信度等级（A-E）
- 横向查重比对

### 📊 结果导出
- 评审报告（Word/PDF）
- 详细评分明细
- 改进建议

### 👥 多账号管理
- 支持多账号登录
- 快速账号切换
- 角色权限控制（管理员/专家/用户）

## 项目结构

```
green-building-web/
├── frontend/          # React 前端
│   ├── src/
│   │   ├── components/  # 组件
│   │   ├── stores/      # Zustand 状态
│   │   ├── services/    # API 服务
│   │   └── styles/      # CSS 样式
│   └── package.json
│
├── backend/           # FastAPI 后端
│   ├── api/           # API 路由
│   ├── models/        # 数据模型
│   ├── services/      # 业务逻辑
│   │   ├── evaluation_engine.py  # AI 评审引擎
│   │   ├── llm_service.py        # LLM 服务
│   │   └── document_parser.py    # 文档解析
│   ├── data/          # 数据目录
│   └── main.py        # FastAPI 入口
│
└── README.md
```

## API 文档

启动后端后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 开发状态

✅ 前端 UI 完成  
✅ 后端 API 完成  
✅ 数据库自动初始化  
✅ AI 评审引擎集成  
✅ 多账号管理  
✅ 帮助中心  
⚠️ 需要配置 LLM_API_KEY 才能使用 AI 功能  

## License

MIT
