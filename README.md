# MAGI CRT Decision Console

一个以 MAGI 决策系统为主题的 React 单页控制台。首版默认运行本地模拟器，同时定义了可由 FastAPI 或 Spring Boot / LangChain4j 实现的 REST 契约。

## 启动

```bash
npm install
npm run dev
```

Vite 会输出本地访问地址，通常是 `http://localhost:5173`。

## 运行模式

默认不需要任何后端：

```bash
VITE_API_MODE=mock
```

接入后端时，在 `.env.local` 中设置：

```bash
VITE_API_MODE=remote
VITE_API_BASE_URL=http://localhost:8000
```

若远程服务不可访问，界面会自动切回本地模拟器，并在顶栏显示降级连接状态。

## 开机动画

访问 `http://localhost:5173/` 会播放 NERV 标志的扇形展开、CRT 开机和系统自检动画，然后进入 MAGI 决策控制台。

## 模拟场景

- `STANDARD`：两票承认，一票否决。
- `REJECT PATH`：两票否决，一票承认。
- `REVIEW PATH`：承认、否决、弃权各一票，结果进入人工复核。

## 项目结构

```text
src/domain.ts                  领域模型与 API 数据类型
src/services/                  Mock、HTTP 与故障降级适配层
src/App.tsx                    MAGI 控制台页面
src/styles.css                 CRT 屏幕与响应式视觉
docs/openapi.yaml              REST API 机器可读规范
docs/API.md                    中文接口文档与调用说明
docs/backend-guides.md         FastAPI / Spring Boot 学习接入路线
```

## 验证

```bash
npm run test
npm run build
```

完整接口说明见 [docs/API.md](docs/API.md)，OpenAPI 文件见 [docs/openapi.yaml](docs/openapi.yaml)。
