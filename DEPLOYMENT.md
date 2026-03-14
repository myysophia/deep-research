# AI论文撰写智能体 - 部署指南

## 🚀 快速部署

### Vercel 部署（最简单）

1. 点击按钮部署到 Vercel：
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

2. 在 Vercel 项目设置中添加环境变量：
   ```
   NEXT_PUBLIC_APP_NAME=AI论文撰写智能体
   GOOGLE_GENERATIVE_AI_API_KEY=your_api_key
   ```

3. 部署完成，访问你的 URL！

### Docker 部署（推荐）

```bash
# 构建镜像
docker build -f Dockerfile.optimized -t ai-thesis-writer .

# 运行容器
docker run -d -p 3000:3000 ai-thesis-writer
```

详细文档：[Docker 部署指南](./docs/DOCKER_DEPLOYMENT.md)

## 🎨 品牌定制

### 快速定制

在环境变量中添加：

```bash
NEXT_PUBLIC_APP_NAME=我的论文助手
NEXT_PUBLIC_APP_THEME_COLOR=#003366
NEXT_PUBLIC_APP_DESCRIPTION=AI-powered thesis writing platform
```

### 完整 OEM 配置

参考 [env.tpl](./env.tpl) 中的 OEM 配置部分。

## 📚 功能说明

### 学术模板

- 标准学术论文
- 实证研究论文
- 文献综述
- 案例分析

### 引用管理

- 支持 APA、MLA、Chicago、IEEE、GB7714
- BibTeX 导入/导出
- Zotero 集成

## 🔧 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

## 🐳 Docker Compose

```bash
# 启动所有服务
docker-compose up -d

# 包含 Nginx 和搜索
docker-compose -f docker-compose.production.yml \
  --profile with-nginx \
  --profile with-search \
  up -d
```

## 📖 更多文档

- [Docker 部署](./docs/DOCKER_DEPLOYMENT.md)
- [环境变量配置](./env.tpl)
- [README](./README.md)
