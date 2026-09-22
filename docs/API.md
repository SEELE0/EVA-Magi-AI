# MAGI REST API v1.1

本文件解释前端与未来后端的调用方式；机器可读的唯一契约是 [openapi.yaml](openapi.yaml)。当前 `backend/` 仍是预留工作区，主应用默认由浏览器执行引擎驱动：每个节点可选择固定模拟 Provider 或用户填写的兼容模型 API，配置和历史记录保存在浏览器端。

基础地址由 `VITE_API_BASE_URL` 指定，开发环境示例为 `http://localhost:8000`。所有接口使用 JSON。生产部署应启用 HTTPS 和身份认证。

## 页面与接口映射

| 页面能力 | 预留接口 |
| --- | --- |
| 顶栏连接状态 | `GET /v1/system/status` |
| 三个固定 MAGI 节点 | `GET /v1/agents` |
| 打开/保存节点配置 | `GET` / `PUT /v1/agents/{agentId}/configuration` |
| 创建并执行判定 | `POST /v1/decisions`、`POST /v1/decisions/{decisionId}/execute` |
| 判定动画与逐票状态 | 轮询 `GET /v1/decisions/{decisionId}` 与 `/events` |
| 历史列表 | `GET /v1/decisions?limit=30&cursor=...` |
| 历史明细和三 Agent 完整输出 | `GET /v1/decisions/{decisionId}/results` |

## 推荐调用流程

1. 读取系统状态和三个节点。
2. 用户点击节点时读取公开配置；保存时只向 `PUT` 请求发送新 API Key。
3. 创建议题并取得 `decisionId`。
4. 调用幂等的 `/execute`；服务立即返回 `running`，在后台并行执行三个 Agent。
5. 每 200–500ms 轮询决策和事件，直到 `completed` 或 `failed`。
6. 完成后读取 `/results`。历史子页面通过 `GET /v1/decisions` 分页，点击记录后再读取结果。

## 节点配置

```http
GET /v1/agents/MELCHIOR-1/configuration
```

响应只包含公开字段：

```json
{
  "agentId": "MELCHIOR-1",
  "role": "科学者論理",
  "connection": "openai-compatible",
  "baseUrl": "https://provider.example/v1",
  "model": "example-model",
  "rolePrompt": "以可验证证据和风险边界给出最终答复。",
  "credentialConfigured": true
}
```

更新配置：

```http
PUT /v1/agents/MELCHIOR-1/configuration
Content-Type: application/json
```

```json
{
  "connection": "openai-compatible",
  "baseUrl": "https://provider.example/v1",
  "model": "example-model",
  "rolePrompt": "以可验证证据和风险边界给出最终答复。",
  "apiKey": "仅在写入时提交"
}
```

`apiKey` 是 write-only：响应、日志、事件和历史记录都不得返回它。省略该字段表示保留旧凭据；`clearCredential: true` 表示删除。服务端应加密保存或只保存 Secret Manager 引用。

## 创建、执行与轮询

```http
POST /v1/decisions
Content-Type: application/json
```

```json
{
  "subject": "批准第 07 区域防御协议升级",
  "priority": "critical"
}
```

`subject` 去除首尾空白后长度为 1–240。`simulationHint` 只用于本地 Mock，真实后端应忽略。

```bash
curl -X POST http://localhost:8000/v1/decisions/dec-0123abcd/execute
curl http://localhost:8000/v1/decisions/dec-0123abcd
curl http://localhost:8000/v1/decisions/dec-0123abcd/events
```

`votes` 始终包含 `MELCHIOR-1`、`BALTHASAR-2`、`CASPER-3`；未完成节点返回 `pending`。重复调用 `/execute` 不应启动第二次任务，而应返回当前状态。

## 历史与完整输出

```http
GET /v1/decisions?limit=30
GET /v1/decisions/dec-0123abcd/results
```

结果示例：

```json
{
  "decisionId": "dec-0123abcd",
  "verdict": "approved",
  "outputs": [
    {
      "agentId": "MELCHIOR-1",
      "role": "科学者論理",
      "vote": "approve",
      "output": "【结论】承认。\n\n【理由】……\n\n【主要风险】……\n\n【建议】……",
      "connection": "openai-compatible",
      "baseUrl": "https://provider.example/v1",
      "model": "example-model",
      "latencyMs": 842,
      "generatedAt": "2026-08-14T03:30:00Z"
    }
  ]
}
```

实际响应必须恰好包含三个节点。这里的“完整输出”是面向用户的最终答复、理由、风险和建议，不是模型隐藏推理或 chain-of-thought；后端不应请求、保存或返回隐藏推理。

## 枚举与裁定

- 投票：`approve`、`reject`、`abstain`、`pending`。
- 状态：`draft`、`running`、`completed`、`failed`。
- 裁定：`approved`、`rejected`、`review`、`pending`。
- Provider：`mock`、`openai-compatible`、`local-compatible`。
- 建议裁定规则：承认票多于否决票为 `approved`，否决票更多为 `rejected`，否则为 `review`。

## 错误与安全

所有非 2xx 响应使用：

```json
{
  "error": {
    "code": "DECISION_NOT_FOUND",
    "message": "未找到指定的决策议题。",
    "requestId": "req_8d7b31"
  }
}
```

后端至少要做到：

- API Key 不回传、不写日志、不进入决策输出或事件。
- 对 `baseUrl` 做协议、域名/IP 和端口校验，阻止云元数据地址和未授权内网访问；本地兼容模式使用单独 allowlist。
- 对供应商调用设置连接、读取和总超时；失败时写公开错误摘要，不写原始凭据。
- 对角色卡长度、议题长度和模型返回结构做服务端校验。
- CORS 只允许实际前端域名；生产环境启用认证、限流和审计。
