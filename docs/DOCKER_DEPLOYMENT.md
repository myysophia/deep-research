# Docker 部署指南 - AI论文撰写智能体

本文档说明如何使用 Docker 部署 AI论文撰写智能体。

## 🚀 快速开始

### 方式 1: 使用 Docker Compose（推荐）

1. **克隆仓库并进入目录**
   ```bash
   git clone https://github.com/myysophia/deep-research.git
   cd deep-research
   ```

2. **配置环境变量（可选）**
   ```bash
   cp env.tpl .env
   # 编辑 .env 文件，添加你的 API keys 和品牌配置
   ```

3. **启动服务**
   ```bash
   # 简单启动（无数据库持久化）
   docker-compose up -d

   # 或使用生产配置（包含数据持久化）
   docker-compose -f docker-compose.production.yml up -d
   ```

4. **访问应用**
   ```
   http://localhost:3000
   ```

### 方式 2: 使用 Docker 命令

1. **构建镜像**
   ```bash
   docker build -f Dockerfile.optimized -t ai-thesis-writer .
   ```

2. **运行容器**
   ```bash
   docker run -d \
     --name ai-thesis-writer \
     -p 3000:3000 \
     -e NEXT_PUBLIC_APP_NAME="我的论文助手" \
     -e GOOGLE_GENERATIVE_AI_API_KEY=your_api_key \
     ai-thesis-writer
   ```

## 🎨 OEM 品牌定制

### 环境变量配置

在 `docker-compose.yml` 或 `.env` 文件中设置以下变量：

```bash
# 应用基础信息
NEXT_PUBLIC_APP_NAME=我的大学论文助手
NEXT_PUBLIC_APP_TITLE=Thesis Writer
NEXT_PUBLIC_APP_DESCRIPTION=AI-powered thesis writing platform

# 视觉定制
NEXT_PUBLIC_APP_THEME_COLOR=#003366
NEXT_PUBLIC_APP_BACKGROUND_COLOR=#FFFFFF
NEXT_PUBLIC_APP_LOGO=my-logo.svg

# 页脚信息
NEXT_PUBLIC_APP_FOOTER=© 2025 My University. All rights reserved.
NEXT_PUBLIC_APP_REPO_URL=https://github.com/myuniversity/thesis-writer
NEXT_PUBLIC_APP_DOCS_URL=https://docs.myuniversity.edu/thesis-writer
```

### 构建自定义镜像

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_NAME="My Thesis Writer" \
  --build-arg NEXT_PUBLIC_APP_DESCRIPTION="Custom thesis writing platform" \
  -t my-thesis-writer:custom \
  .
```

## 📦 生产环境部署

### 包含 Nginx 反向代理

```bash
docker-compose -f docker-compose.production.yml --profile with-nginx up -d
```

### 包含本地搜索引擎 (SearXNG)

```bash
docker-compose -f docker-compose.production.yml --profile with-search up -d
```

### 完整部署（Nginx + SearXNG）

```bash
docker-compose -f docker-compose.production.yml \
  --profile with-nginx \
  --profile with-search \
  up -d
```

## 🔐 安全配置

### 设置访问密码

```bash
docker run -d \
  --name ai-thesis-writer \
  -p 3000:3000 \
  -e ACCESS_PASSWORD=your_secure_password \
  ai-thesis-writer
```

### 使用 SSL/TLS

1. 将 SSL 证书放在 `./ssl/` 目录
2. 配置 Nginx (`./nginx.conf`)
3. 启动服务：

```bash
docker-compose -f docker-compose.production.yml --profile with-nginx up -d
```

## 🐳 Docker 镜像管理

### 查看日志
```bash
docker-compose logs -f app
```

### 进入容器
```bash
docker exec -it ai-thesis-writer sh
```

### 重启服务
```bash
docker-compose restart app
```

### 停止服务
```bash
docker-compose down
```

### 更新镜像
```bash
docker-compose pull
docker-compose up -d --build
```

## 📊 数据持久化

生产配置已包含数据卷挂载：

```yaml
volumes:
  - thesis-data:/app/data
```

数据存储在 Docker volume `thesis-data` 中。

### 备份数据
```bash
docker run --rm \
  -v thesis-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/thesis-data-backup.tar.gz /data
```

### 恢复数据
```bash
docker run --rm \
  -v thesis-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/thesis-data-backup.tar.gz -C /
```

## 🔧 常见问题

### Q: 容器启动后立即退出
A: 检查环境变量配置，确保 API keys 正确。查看日志：
```bash
docker-compose logs app
```

### Q: 无法访问应用
A: 检查端口是否被占用：
```bash
docker ps
netstat -tuln | grep 3000
```

### Q: 内存不足
A: 限制 Docker 内存使用：
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G
```

## 📝 CI/CD 集成

项目包含 GitHub Actions workflow，自动构建和推送 Docker 镜像。

### 查看工作流
```bash
gh workflow list
gh workflow view ci.yml
```

### 手动触发构建
```bash
gh workflow run ci.yml
```

## 🌐 部署到云平台

### Docker Hub
```bash
docker tag ai-thesis-writer:latest myusername/ai-thesis-writer:latest
docker push myusername/ai-thesis-writer:latest
```

### GitHub Container Registry
```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
docker tag ai-thesis-writer:latest ghcr.io/username/ai-thesis-writer:latest
docker push ghcr.io/username/ai-thesis-writer:latest
```

### AWS ECS
参考 AWS ECS 文档，使用上面构建的镜像。

## 📚 更多资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Next.js Docker 部署](https://nextjs.org/docs/deployment#docker-image)
