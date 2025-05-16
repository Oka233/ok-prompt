# 部署指南：使用 Vercel 和 Cloudflare Pages 部署 Monorepo

本指南介绍如何组织一个包含前端和后端代码的 Git Monorepo，并分别使用 Cloudflare Pages 部署前端、Vercel 部署 Python 云函数后端。

## 项目结构

推荐采用以下的项目结构，将前端和后端代码分别置于独立的子目录中：

```

your-monorepo/
├── .git/
├── .gitignore          \# 全局忽略文件 (node\_modules, **pycache** 等)
├── frontend/           \# 前端项目根目录 (部署到 Cloudflare Pages)
│   ├── public/         \# 静态资源
│   ├── src/            \# 前端源代码
│   ├── package.json    \# 前端依赖和脚本
│   ├── vercel.json     \# (可选) 前端 Vercel 配置，用于忽略此目录
│   ├── README.md       \# 前端 README
│   └── ... (其他前端文件或框架特定文件)
├── backend/            \# 后端 Python 项目根目录 (部署到 Vercel Functions)
│   ├── api/            \# Vercel Functions 目录 (Vercel 在此查找函数)
│   │   ├── **init**.py   \# (可选) Python 包初始化
│   │   └── your\_function.py \# 你的 Python 云函数文件
│   ├── requirements.txt \# Python 依赖文件
│   ├── vercel.json     \# 后端 Vercel 构建和路由配置
│   ├── README.md       \# 后端 README
│   └── ... (其他后端文件)
├── README.md           \# 整个 Monorepo 的 README
└── ... (其他顶层配置文件)

````

## 配置说明

关键在于分别配置 Vercel 和 Cloudflare Pages，使其识别并仅处理仓库中对应的子目录。

### 1. Vercel 配置 (针对后端 Python 函数)

1.  **创建 Vercel 项目**: 在 Vercel 中导入你的 Git 仓库创建一个新项目。
2.  **配置项目根目录 (Root Directory)**:
    * 进入 Vercel 项目的 **Settings** (设置) 页面。
    * 找到 **General** (通用) -> **Root Directory**。
    * 点击 **Edit** (编辑)，将根目录设置为 `backend`。
    * 保存更改。这告诉 Vercel 部署时进入 `backend` 目录进行操作。
3.  **配置 Build & Development Settings**:
    * 通常 Vercel 会自动检测到 Python 项目。
    * **Framework Preset**: 如果需要，手动选择 "Other"。
    * **Build Command**: 通常可以留空，Vercel 会自动安装 `requirements.txt` 中的依赖。如果需要，可以添加一个简单的命令，例如 `echo "Building backend functions"`。
    * **Output Directory**: 可以留空。
4.  **创建 `backend/vercel.json`**: 在 `backend/` 目录下创建此文件，配置 Vercel 如何处理该目录下的函数。

    ```json
    // backend/vercel.json
    {
      "builds": [
        {
          "src": "api/*.py",  // 查找 backend/api/ 下的所有 .py 文件作为函数入口
          "use": "@vercel/python" // 使用 Vercel 的 Python 构建器
        }
      ],
      "routes": [
        {
          "src": "/api/(.*)", // 匹配所有以 /api/ 开头的请求路径
          "dest": "/api/$1"   // 将请求路由到 api/ 目录下对应的文件 ($1 是匹配到的路径部分)
        }
      ]
    }
    ```
    例如，访问你的 Vercel 部署 URL `/api/your_function` 会路由到 `backend/api/your_function.py` 中定义的 handler。
5.  **创建 `.vercelignore` (在 Monorepo 根目录)**: 在仓库的最顶层创建或修改 `.vercelignore` 文件，告诉 Vercel 在构建和部署时忽略 `frontend/` 目录。

    ```
    # .vercelignore
    frontend/
    ```
6.  **配置环境变量**: 在 Vercel 项目设置中配置后端所需的任何环境变量。

### 2. Cloudflare Pages 配置 (针对前端)

1.  **创建 Cloudflare Pages 项目**: 在 Cloudflare Pages 中导入你的同一个 Git 仓库创建一个新项目。
2.  **配置构建设置**:
    * **Build command**: 输入你的前端项目的构建命令 (例如: `npm run build`, `yarn build`, `pnpm build`)。
    * **Build directory**: 输入你的前端项目构建完成后生成的静态文件目录 (例如: `dist`, `build`, `.next`, `public`)。**这个路径是相对于你下一步指定的 Root directory 的。**
    * **Root directory**: 这是告诉 Cloudflare Pages 在哪个子目录下找到前端代码并执行构建命令。设置为 `frontend`。
3.  **配置环境变量**: 在 Cloudflare Pages 项目设置中配置前端所需的任何环境变量。
4.  **(可选) 忽略后端**: Cloudflare Pages 通常只关心你指定的 Root Directory，但你也可以通过 `.cloudflarepagesignore` 文件（在 Monorepo 根目录）或在 Pages 项目设置中明确忽略 `backend/` 目录，以防万一。

### 3. Git 全局忽略文件 (`.gitignore`)

在 Monorepo 的顶层创建或修改 `.gitignore` 文件，确保忽略所有不需要提交到 Git 的文件和目录，特别是各子项目的构建输出、依赖目录等。


## 部署流程

1.  当你向 Git 仓库推送代码时。
2.  Vercel 会监听到代码变化，并根据其配置进入 `backend` 目录，安装 Python 依赖，构建并部署 Python 函数。
3.  Cloudflare Pages 也会监听到代码变化，并根据其配置进入 `frontend` 目录，安装前端依赖，执行构建命令，并部署前端静态文件。

通过这种方式，你可以清晰地分离前后端代码，并利用 Vercel 和 Cloudflare Pages 各自的优势进行部署。

## 本地开发注意事项

* 你需要分别在本地运行前端开发服务器 (通常通过 `npm start` 或类似命令) 和后端 Python 函数的本地模拟环境 (例如使用 Vercel CLI 的 `vercel dev` 命令在 `backend` 目录下运行，或者使用 Flask/FastAPI 等框架自带的开发服务器)。
* 确保在后端正确处理 **CORS (跨域资源共享)**，允许你的 Cloudflare Pages 前端域名访问你的 Vercel 后端 API。

