# Fluentia · Render 免费部署

这是一个给 Render 免费 Web Service 用的最小项目包。

## 上传到 GitHub

1. 注册 / 登录 GitHub。
2. 新建一个仓库，例如 `fluentia`，选择 Private 或 Public 都可以。
3. 打开本文件夹，把里面的**所有内容**上传到仓库根目录：
   - `Dockerfile`
   - `render.yaml`
   - `server.mjs`
   - `package.json`
   - `public/` 整个文件夹

> 不要多套一层文件夹；`Dockerfile` 和 `render.yaml` 必须在仓库根目录。

## 在 Render 部署

1. 用 GitHub 登录 [Render](https://render.com)。
2. 点击 **New + → Blueprint**，连接 GitHub，选择刚才的仓库。
3. Render 会读取 `render.yaml`。如果询问 `SITE_PASSWORD`，填写你给 Joyee 设置的访问密码。
4. 点击 **Apply / Create**，等待构建完成。
5. 得到固定网址，类似：
   ```
   https://fluentia-xxxx.onrender.com
   ```
6. 打开网址，用户名 `Joyee`，密码是你刚填的访问密码。

如果没有用 Blueprint，也可以手动：

- **New + → Web Service**
- 选择仓库
- Runtime 选 **Docker**
- Instance Type 选 **Free**
- 环境变量：
  - `SITE_USER=Joyee`
  - `SITE_PASSWORD=你设置的访问密码`
  - `ALLOW_PRIVATE_ENDPOINTS=0`
  - `RATE_LIMIT_PER_MINUTE=60`
  - `NODE_ENV=production`

## 注意

- Render 免费实例闲置约 15 分钟后会休眠，朋友第一次打开可能要等 20–50 秒。
- 网址固定，不依赖你的电脑开机。
- 数据保存在访问者自己的浏览器里；Render 不保存对话和 API Key。
- Render 免费层不需要信用卡（如果页面要求绑定，请先不要继续，告诉我）。
