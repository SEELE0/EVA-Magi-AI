# 后端实现与联调指南

当前状态：`backend/` 只有无框架依赖的内部端口骨架，**不是可启动的 API 服务**。HTTP 行为以 [openapi.yaml](openapi.yaml) 为准，内部扩展边界见 `backend/app/ports.py`。

## 推荐技术路线

首个可运行版本建议使用 Python 3.11+、FastAPI、Pydantic v2、Uvicorn 和 SQLAlchemy。先做内存仓库，再替换为 PostgreSQL；首版可用 `asyncio` 后台任务，生产环境再换成任务队列。

建议目录：

```text
backend/app/
├── main.py                 FastAPI 创建、CORS、中间件
├── api/                    REST 路由和 HTTP DTO
├── application/            创建/执行判定、裁定聚合
├── domain/                 Decision、Agent、Output、Event
├── providers/              OpenAI-compatible、本地模型适配器
├── repositories/           内存/PostgreSQL/Secret Store 实现
└── ports.py                已预留的框架无关 Protocol
```

## 从零实现顺序

1. 安装开发依赖：

   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install fastapi 'uvicorn[standard]' pydantic httpx
   ```

2. 根据 OpenAPI 建立 Pydantic DTO，先实现 `GET /v1/system/status`、`GET /v1/agents` 和配置 GET/PUT。
3. 用内存字典实现 DecisionRepository，补 `POST /v1/decisions`、单条读取、历史分页和事件。
4. 实现幂等 `/execute`：使用 decisionId 锁或状态条件，已是 `running/completed` 时直接返回当前对象。
5. 为三个节点各组装一份 `AgentInvocation`，用 `asyncio.gather()` 并行调用 Provider Adapter；每个调用有独立超时和取消处理。
6. 将供应商自然语言结果校验并归一化为 `approve/reject/abstain`，保存 `AgentOutput`，最后按固定规则聚合 verdict。
7. 实现 `/results`，只返回用户可见最终内容和公开 provider 元数据。
8. 内存版本通过契约测试后，再接 PostgreSQL、加密凭据和任务队列。

启动目标：

```bash
uvicorn app.main:app --reload --port 8000
```

这条命令要等 `app/main.py` 和 FastAPI 依赖真正加入后才可用；当前仓库执行它会失败是预期状态。

## 数据与存储

推荐最小实体：

| 实体 | 关键字段 |
| --- | --- |
| `agent_configurations` | agent_id、connection、base_url、model、role_prompt、credential_ref、updated_at |
| `decisions` | id、subject、priority、status、verdict、created_at、completed_at |
| `decision_votes` | decision_id、agent_id、vote、updated_at |
| `agent_outputs` | decision_id、agent_id、role、vote、output、公开 provider 元数据、latency_ms |
| `decision_events` | id、decision_id、kind、agent_id、message、timestamp |

API Key 不应与公开配置同列明文保存。开发环境至少使用应用级加密；生产环境优先保存 Secret Manager/Vault 引用。数据库、日志、异常监控和事件内容都不得出现原始密钥。

## Provider Adapter

每个适配器只负责：构造供应商请求、调用配置的 Base URL/Model、解析为 `AgentOutput`。应用层负责超时、重试、幂等和裁定。角色卡应由服务端读取，不信任客户端提交的 AgentId 或角色名称。

安全要求：

- `baseUrl` 默认只允许 HTTPS；阻止 `169.254.169.254`、云元数据域名、环回和私网地址。只有 `local-compatible` 且命中显式 allowlist 时允许本地地址。
- 禁止把 API Key 放入 URL、错误消息或追踪标签。
- 限制议题、角色卡、请求体和输出长度；模型响应必须过结构校验。
- “完整输出”只保存最终答复/理由/风险/建议，不采集隐藏 chain-of-thought。
- 供应商失败可重试有限次数；超时或部分失败应写 `failure` 事件并进入 `failed` 或 `review`，不要伪造投票。

## 并发与裁定

`POST /execute` 应快速返回，后台运行三个 Agent。单机开发可用 `asyncio.create_task()`；多实例生产环境使用 Celery、Dramatiq、ARQ 或云任务队列，并用数据库唯一约束/分布式锁保证同一 decisionId 只执行一次。

建议裁定规则：

```text
approve_count > reject_count  -> approved
reject_count > approve_count  -> rejected
otherwise                      -> review
```

必须同时保存三票、每个 Agent 的公开输出和最终 verdict，历史明细才可复现。

## 前端联调

后端实现并启动后，在 `frontend/.env.local` 写入：

```env
VITE_API_MODE=remote
VITE_API_BASE_URL=http://localhost:8000
```

允许的本地 CORS Origin 通常是 `http://localhost:5173`。重启 Vite 后先检查：

```bash
curl http://localhost:8000/v1/system/status
curl http://localhost:8000/v1/agents
curl http://localhost:8000/v1/agents/MELCHIOR-1/configuration
curl 'http://localhost:8000/v1/decisions?limit=30'
```

当前 `HttpDecisionService` 只接入基础状态/创建/执行/事件。真正把配置和历史迁移到后端时，应在前端服务层增加对应方法，不要在 React 组件里直接 `fetch`。远程不可用时，现有 resilient service 会回退到 Mock。

## 验证清单

```bash
npm run lint:api
PYTHONPYCACHEPREFIX=/tmp/magi-backend-pycache python3 -m compileall -q backend/app
```

在 `backend/` 目录运行无第三方依赖的预留端口测试：

```bash
PYTHONPYCACHEPREFIX=/tmp/magi-backend-test-pycache python3 -m unittest discover -s tests -p 'test_*.py'
```

后端实现后还应增加：OpenAPI 契约测试、配置响应不含 secret 的安全测试、`/execute` 幂等测试、三 Provider 超时/部分失败测试、历史分页测试和真实浏览器联调。

## Java 备选

也可使用 JDK 21 + Spring Boot + LangChain4j。保持相同边界：Controller 对齐 OpenAPI；Application Service 编排三节点；Provider Adapter 封装模型；Repository/Secret Store 隔离持久化。使用 `@Async` 或任务执行器，`@ControllerAdvice` 统一错误结构。只要 REST 契约不变，前端无需因后端语言改变而重写。
