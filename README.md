# MAGI CRT Decision Console

一个以 MAGI 决策系统为主题的前后端项目。当前已实现 React/Vite 前端，默认运行本地模拟器；后端工作区预留给 FastAPI 或 Spring Boot / LangChain4j，并通过 `docs/openapi.yaml` 约束 REST 契约。

## 启动

从仓库根目录执行：

```bash
npm install
npm run dev
```

根目录的 npm 脚本会转发到 `frontend/` 工作区。Vite 会输出本地访问地址，通常是 `http://localhost:5173`。

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
backend/                       后端工作区，预留 FastAPI / Agent 编排实现
docs/                          API 规范、接口说明与设计验证记录
frontend/                      React/Vite 前端应用
frontend/src/app/              前端入口、根组件与全局样式
frontend/src/domain/           前端领域模型与 API 数据类型
frontend/src/features/         开机动画、决策控制台和 MAGI 几何测试页
frontend/src/services/         Mock、HTTP 与故障降级适配层
package.json                   根工作区脚本与项目级工具
```

## 验证

```bash
npm run test
npm run build
```

完整接口说明见 [docs/API.md](docs/API.md)，OpenAPI 文件见 [docs/openapi.yaml](docs/openapi.yaml)。
