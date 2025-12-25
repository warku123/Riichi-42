# Riichi-42 日麻记分应用

这是一个专为日麻对局设计的记分与统计应用。采用 **Next.js** 作为前端框架，**Supabase** 作为后端数据库，并部署在 **Vercel** 上。

## 🚀 功能特性

- **数据看板**：实时展示玩家总分天梯榜（支持滚动查看）及最近五场对局记录。
- **对局管理**：
  - 支持记录 4 人点数，自动计算位次分。
  - **智能算分**：支持同分情况，自动平摊顺位奖励（例如两人并列第一，则平摊一、二位的得分）。
  - 支持对历史对局进行检索、修改和删除。
  - 集成可搜索的玩家下拉选择框（Select2 风格）。
- **用户管理**：支持添加新玩家及修改玩家名称（行内编辑）。
- **权限安全**：
  - 简单的管理后台登录（哈希加密存储凭证）。
  - API Key 中间件保护，防止后端接口被非法调用。
- **自动化计算**：核心算分逻辑经过单元测试验证，确保数据的准确性。

## 🛠 技术栈

- **前端**：Next.js (App Router), TypeScript, CSS Modules
- **后端**：Supabase (PostgreSQL)
- **部署**：Vercel
- **测试**：ts-node (单元测试)

## 📦 快速开始

### 1. 环境变量配置

在 `web` 目录下创建 `.env.local` 文件，并填写以下配置：

```env
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目地址
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥
API_KEY=你的API保护密钥
NEXT_PUBLIC_API_KEY=你的API保护密钥（需与上方一致，用于前端调用）
```

### 2. 数据库设置

请在 Supabase SQL Editor 中执行以下建表操作：

- `players` 表：存储玩家信息（ID 使用 `BIGSERIAL`）。
- `matches` 表：存储对局基础信息（备注、桌号、时间）。
- `match_results` 表：存储每场对局的具体得分和点数。
- `player_totals` 视图：用于实时计算玩家累计总分。

*(具体的 SQL 脚本可参考项目中的开发记录)*

### 3. 安装与运行

```bash
cd web
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可访问。

### 4. 运行单元测试

```bash
npm run test
```

## 📂 项目结构

```text
Riichi-42/
├── web/                  # Next.js 前端项目
│   ├── src/
│   │   ├── app/          # 页面路由与 API 路由
│   │   ├── lib/          # 通用工具类（算分逻辑、Supabase 客户端、权限校验）
│   │   ├── middleware.ts # API 安全中间件
│   │   └── globals.css   # 全局样式
│   └── package.json
└── README.md             # 项目说明文档
```

## 📝 算分逻辑

- 第一名：`20 + (点数/1000)`
- 第二名：`(点数/1000) - 20`
- 第三名：`(点数/1000) - 40`
- 第四名：`(点数/1000) - 60`
- **同分处理**：如果出现名次并列，则取对应名次分值的平均值。

