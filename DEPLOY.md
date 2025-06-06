# 部署指南：使用 Cloudflare Pages 部署前端项目

本指南介绍如何组织你的前端代码，并使用 Cloudflare Pages 部署你的前端应用。

## 项目结构

推荐采用以下的项目结构，将前端代码置于独立的 `frontend` 目录下：

```
your-project/
├── .git/
├── .gitignore          # 全局忽略文件 (node_modules, **pycache** 等)
├── frontend/           # 前端项目根目录 (部署到 Cloudflare Pages)
│   ├── public/         # 静态资源
│   ├── src/            # 前端源代码
│   ├── package.json    # 前端依赖和脚本
│   ├── README.md       # 前端 README
│   └── ... (其他前端文件或框架特定文件)
└── ... (其他顶层配置文件)
```

---

## 配置说明

你需要配置 Cloudflare Pages，使其识别并处理你的前端项目目录。

### Cloudflare Pages 配置

1.  **创建 Cloudflare Pages 项目**: 在 Cloudflare Pages 中导入你的 Git 仓库创建一个新项目。
2.  **配置构建设置**:
    * **Build command**: 输入你的前端项目的构建命令 (例如: `npm run build`, `yarn build`, `pnpm build`)。
    * **Build directory**: 输入你的前端项目构建完成后生成的静态文件目录 (例如: `dist`, `build`, `.next`, `public`)。**这个路径是相对于你下一步指定的 Root directory 的。**
    * **Root directory**: 这是告诉 Cloudflare Pages 在哪个子目录下找到前端代码并执行构建命令。设置为 `frontend`。
3.  **配置环境变量**: 在 Cloudflare Pages 项目设置中配置前端所需的任何环境变量。

---

## 部署流程

1.  当你向 Git 仓库推送代码时。
2.  Cloudflare Pages 会监听到代码变化，并根据其配置进入 `frontend` 目录，安装前端依赖，执行构建命令，并部署前端静态文件。

---

## 本地开发注意事项

你需要在本地运行前端开发服务器 (通常通过 `npm run dev` 或类似命令)。