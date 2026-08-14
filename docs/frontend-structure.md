# 前端代码结构说明

本文档说明 `frontend/` 中的代码分层、运行入口、数据流和扩展约定。前端使用 React、TypeScript、Vite 和 Vitest，默认运行本地 Mock 决策服务。

## 目录总览

```text
frontend/
├── asset/                              原始图像资源
├── index.html                          主应用 HTML 入口
├── magi-boot-test.html                 MAGI 几何动画预览入口
├── nerv-logo-anime-test.html           NERV 标志动画预览入口
├── src/
│   ├── app/                              主应用组装与全局样式
│   ├── domain/                           跨界面、跨服务共用的领域类型
│   ├── features/
│   │   ├── bios-start/                  BIOS 自检动画组件与实验入口
│   │   ├── boot-intro/                  主页 CRT/POST 开机层
│   │   ├── decision-console/            MAGI 决策控制台
│   │   ├── magi-boot/                   MAGI 几何启动组件与预览页
│   │   └── nerv-logo-anime/             NERV 标志组件与预览页
│   ├── services/                         决策服务接口、Mock、HTTP 与降级适配
│   └── vite-env.d.ts                    Vite 生成的类型声明
├── package.json                        前端依赖与命令
├── tsconfig*.json                      TypeScript 配置
└── vite.config.ts                      Vite/Vitest 及多页构建配置
```

`frontend/dist/` 和 `frontend/node_modules/` 分别是构建产物与第三方依赖，不属于需要手工维护的源码。

## 运行入口

### 主应用

`index.html` 加载 `src/app/main.tsx`，由 React 渲染 `App.tsx`。`App` 按以下顺序组装页面：

1. `BootIntro`：显示 CRT 电源与 POST 系统自检动画。
2. `DecisionConsole`：显示主决策控制台并处理业务交互。

`BootIntro` 检测到 `prefers-reduced-motion: reduce` 时会直接跳过动画。

### 独立预览页

Vite 配置了四个构建入口：

| 页面 | React 入口 | 用途 |
| --- | --- | --- |
| `index.html` | `src/app/main.tsx` | 完整应用 |
| `magi-boot-test.html` | `src/features/magi-boot/main.tsx` | 单独调试 MAGI 几何动画 |
| `nerv-logo-anime-test.html` | `src/features/nerv-logo-anime/main.tsx` | 单独调试 NERV 标志动画 |
| `bios-start-test.html` | `src/features/bios-start/BiosStart.tsx` | BIOS 自检动画的实验入口 |

预览页用于组件级视觉验证，不参与主应用的业务路由。`bios-start-test.html` 目前直接加载组件模块，属于实验性入口；若要像其他预览页一样独立渲染，需要补充 React `createRoot` 入口。

## 分层与依赖方向

```mermaid
flowchart LR
    App["app / features"] --> Domain["domain types"]
    App --> Contract["DecisionService"]
    Factory["createDecisionService"] --> Mock["MockDecisionService"]
    Factory --> Resilient["ResilientDecisionService"]
    Resilient --> HTTP["HttpDecisionService"]
    Resilient --> Mock
    Mock --> Domain
    HTTP --> API["REST API"]
```

依赖应从界面与功能层流向领域和服务层。服务层不应导入 React 组件，领域层不应依赖具体的 HTTP 或 Mock 实现。

## 领域层

`src/domain/decision.ts` 是前端的共享数据契约，定义：

- MAGI 节点、健康状态和投票值。
- 决策请求、决策状态和最终裁定。
- 系统连接状态与 Mock/Remote 来源。
- 决策事件和 API 错误结构。

增加或修改 API 字段时，先更新领域类型与 `docs/openapi.yaml`，再调整服务实现和界面。

## 服务层

### `DecisionService`

`src/services/decision-service.ts` 定义界面层唯一依赖的服务接口：

- 读取系统状态和 Agent 列表。
- 创建、读取和执行决策。
- 读取决策事件。

React 组件不直接调用 `fetch`，因此可以在不改动界面的情况下替换数据源。

### 实现与选择策略

| 文件 | 职责 |
| --- | --- |
| `mock-decision-service.ts` | 在内存中模拟完整决策过程，支持 standard/reject/review 场景 |
| `http-decision-service.ts` | 按 REST 契约请求远程后端，并将网络与 HTTP 错误转换为 `DecisionServiceError` |
| `resilient-decision-service.ts` | 远程请求失败后一次性切换至 Mock，后续请求继续使用 Mock |
| `create-decision-service.ts` | 根据 Vite 环境变量组装正确的服务实例 |

运行模式：

```env
# 默认值，不依赖后端
VITE_API_MODE=mock

# 优先请求远程服务，失败后降级到 Mock
VITE_API_MODE=remote
VITE_API_BASE_URL=http://localhost:8000
```

## 决策控制台

`DecisionConsole.tsx` 是主要业务容器，负责：

- 初始化系统状态与三个 MAGI Agent。
- 管理场景、议题、优先级、执行状态和错误信息。
- 创建并执行决策，每 220ms 轮询决策与事件，完成后刷新系统状态。
- 将投票、裁定和事件数据映射到界面。

`ConsolePrimitives.tsx` 提供 `AgentNode`、`PanelTitle`、`Readout` 和 `Telemetry` 等展示组件。`console-config.ts` 集中管理默认 Agent、场景议题与状态文案，避免把静态配置散落在主组件中。

## 动画组件

### `BiosStart`

显示橙色 CRT BIOS 硬件自检、三个 MAGI 节点上线与终端交接动画。组件已由 `features/bios-start/index.ts` 导出，但主应用 `App.tsx` 中的导入仍处于注释状态，当前主页继续使用 `BootIntro`。

### `NervLogoAnime`

通过 `size`、`fadeOut`、`className` 和 `style` 调整展示，默认在进场与停留后淡出。`index.ts` 是对外导出入口。

### `MagiBootTest` / `MagiBoot`

通过 SVG 绘制核心三角形、同心圆和三个人格分支。支持 `size`、`className`、`style` 和 `onReplay`，点击或使用 Enter/空格键可重播。`MagiBoot` 是 `MagiBootTest` 的导出别名。

## 典型数据流

1. 用户选择模拟场景，输入议题与优先级。
2. `DecisionConsole` 调用 `DecisionService.createDecision`。
3. 界面获得 `decisionId` 后调用 `executeDecision`。
4. 执行期间定时调用 `getDecision` 和 `getEvents`。
5. 领域对象驱动 Agent 投票、最终裁定和事件日志渲染。
6. Remote 模式下若后端失败，`ResilientDecisionService` 切换至 Mock，顶栏显示降级状态。

## 测试与构建

```bash
npm run test
npm run build
```

当前单元测试覆盖：

- Mock 服务的三种裁定路径。
- Remote 不可用时的自动降级。
- NERV 标志和 MAGI 几何动画的静态结构渲染。
- BIOS 自检动画的关键文案与终端结构渲染。

新增服务实现时，应继续实现 `DecisionService` 接口；新增独立视觉页时，需同时在 `vite.config.ts` 的 `build.rollupOptions.input` 中注册 HTML 入口。

## 源码许可标识

项目自行维护的 TypeScript/TSX 源码文件使用 `SPDX-License-Identifier: AGPL-3.0-or-later` 文件头。第三方依赖、构建产物和自动生成文件不应添加项目版权声明。
