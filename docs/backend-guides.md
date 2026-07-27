# 后端学习接入指南

前端的接入点在 `src/services/http-decision-service.ts`。它只需要 REST JSON 响应符合 `docs/openapi.yaml`；不关心内部由规则、LangChain 还是人工审批产生结果。

## 方案 A：Python FastAPI

适合先快速理解 HTTP、Pydantic 模型和异步任务。建议环境为 Python 3.11+。

```bash
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn
```

实现顺序：

1. 将 OpenAPI 中的 `DecisionRequest`、`Decision`、`DecisionEvent` 写为 Pydantic model。
2. 用内存字典保存 `decisionId -> Decision`，先实现 `GET status`、`GET agents`、`POST decisions`。
3. 在 `POST execute` 中使用 `asyncio.create_task()` 逐个写入投票和事件；页面会轮询读取结果。
4. 配置 CORS，允许 Vite 本地地址 `http://localhost:5173`。
5. 后续把固定投票替换为 LangChain / OpenAI / 本地模型调用；无论模型输出什么，都要归一化为 `approve`、`reject` 或 `abstain`。

启动示例：

```bash
uvicorn app.main:app --reload --port 8000
```

## 方案 B：Java Spring Boot + LangChain4j

适合学习类型建模、分层架构和企业级可观测性。建议 JDK 21+ 与 Maven 3.9+ 或 Gradle 8+。

实现顺序：

1. 以 Spring Initializr 建立 Web 项目，加入 `spring-boot-starter-web`、Validation 与 LangChain4j 对应依赖。
2. 将 OpenAPI schema 映射为 Java `record`：`DecisionRequest`、`Decision`、`DecisionEvent`、`ApiError`。
3. 创建 `DecisionController` 暴露 6 个 v1 路由；在 `DecisionService` 中维护状态并编排三个 Agent。
4. 使用 `@Async` 或任务执行器处理投票，确保 `/execute` 不阻塞整个请求生命周期。
5. 使用 `@ControllerAdvice` 把异常统一输出为 API 文档的 `error` 结构；配置 CORS。
6. LangChain4j 返回的自然语言必须经由枚举校验，禁止直接写入前端的 `vote` 字段。

## 替换前端模拟器

1. 启动后端并确保 `GET /v1/system/status` 返回 `200`。
2. 新建 `.env.local`：

```bash
VITE_API_MODE=remote
VITE_API_BASE_URL=http://localhost:8000
```

3. 重启 Vite。若地址错误或服务离线，`ResilientDecisionService` 会退回本地模拟器，页面仍可演示。

## SSE 的后续演进

REST 轮询已满足首版。后续可新增 `GET /v1/decisions/{decisionId}/stream`，以 `text/event-stream` 发送 `DecisionEvent`。保留原 `/events` 接口，前端再新增流式适配器，因此不会破坏现有实现或 API 用户。
