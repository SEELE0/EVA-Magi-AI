# MAGI REST API v1

本规范是前端与未来后端之间的唯一契约。React 页面只依赖 `DecisionService` 的领域模型，因此后端从 FastAPI 换到 Spring Boot 不需要改动页面组件。

基础地址：`{VITE_API_BASE_URL}`，示例为 `http://localhost:8000`。所有接口使用 JSON；生产环境可增加 `Authorization: Bearer <token>`，首版不强制认证。

## 调用流程

1. `GET /v1/system/status` 确认服务可用。
2. `GET /v1/agents` 读取三个 MAGI 人格节点。
3. `POST /v1/decisions` 创建议题，取得 `decisionId`。
4. `POST /v1/decisions/{decisionId}/execute` 触发投票。
5. 以 200 至 500ms 间隔轮询 `GET /v1/decisions/{decisionId}` 和 `GET /v1/decisions/{decisionId}/events`，直到 `status` 为 `completed` 或 `failed`。

## 通用规则

- 时间字段使用 ISO 8601 UTC 字符串，例如 `2026-07-26T10:32:11.027Z`。
- `AgentId` 固定为 `MELCHIOR-1`、`BALTHASAR-2`、`CASPER-3`。
- 投票值为 `approve`、`reject`、`abstain`、`pending`。
- 执行状态为 `draft`、`running`、`completed`、`failed`。
- 最终裁定为 `approved`、`rejected`、`review`、`pending`。
- 生产服务应当把 `POST /execute` 设计为幂等：同一已执行的 `decisionId` 重复调用时，直接返回当前决策数据。

## 接口

### `GET /v1/system/status`

返回服务连接与协议状态。

```json
{
  "systemName": "MAGI DECISION SYSTEM",
  "connection": "online",
  "source": "remote",
  "protocol": "MAGI/3.0 REST",
  "uptimeSeconds": 4820,
  "updatedAt": "2026-07-26T10:32:11.027Z"
}
```

### `GET /v1/agents`

返回三个节点的固定角色、健康度和最近延迟。

```json
[
  {
    "id": "MELCHIOR-1",
    "role": "SCIENTIFIC LOGIC",
    "health": "nominal",
    "latencyMs": 18,
    "vote": "pending"
  }
]
```

### `POST /v1/decisions`

创建一个尚未执行的议题。

```json
{
  "subject": "批准第 07 区域防御协议升级",
  "priority": "critical"
}
```

`subject` 必填，去除首尾空白后长度应为 1 到 90 个字符；`priority` 可选，取值 `low`、`normal`、`critical`，默认 `normal`。`simulationHint` 仅供本地演示器测试，不建议真实后端实现。

### `GET /v1/decisions/{decisionId}`

读取议题与最新投票状态。`votes` 必须始终包含三个 AgentId，即使尚未投票也返回 `pending`。

### `POST /v1/decisions/{decisionId}/execute`

开始或重取一次投票执行。成功时返回 `200` 与当前 `Decision`；服务可异步计算，初始响应的 `status` 可为 `running`。

```bash
curl -X POST http://localhost:8000/v1/decisions/dec-0123abcd/execute \
  -H 'Content-Type: application/json'
```

### `GET /v1/decisions/{decisionId}/events`

按时间升序返回日志。可选查询参数 `after` 是上一条事件的 ISO 时间；服务返回时间严格晚于该值的条目。前端首版不依赖该参数，但后端实现时应支持它以降低轮询负担。

```json
[
  {
    "id": "evt-e27d10aa",
    "decisionId": "dec-0123abcd",
    "kind": "vote",
    "timestamp": "2026-07-26T10:32:14.120Z",
    "agentId": "MELCHIOR-1",
    "message": "MELCHIOR-1 => APPROVE"
  }
]
```

## 错误格式

所有非 2xx 响应都使用同一结构：

```json
{
  "error": {
    "code": "DECISION_NOT_FOUND",
    "message": "未找到指定的决策议题。",
    "requestId": "req_8d7b31"
  }
}
```

建议状态码：`400` 参数错误、`401` 未认证、`403` 无权限、`404` 资源不存在、`409` 当前状态不允许操作、`422` 语义校验失败、`429` 限流、`500` 服务错误。

## 前端字段映射

| API 字段 | 前端用途 |
| --- | --- |
| `SystemStatus.connection` | 顶栏 UPLINK 颜色与降级提示 |
| `SystemStatus.source` | 顶栏 SOURCE，显示 `mock` 或 `remote` |
| `Agent.vote` / `Decision.votes` | 三角节点的承认、否决、弃权状态 |
| `Decision.verdict` | FINAL VERDICT 面板 |
| `DecisionEvent[]` | EVENT TRACE 操作日志 |

完整机器可读定义见 [openapi.yaml](openapi.yaml)。
