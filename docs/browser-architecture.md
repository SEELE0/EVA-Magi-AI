# 浏览器执行架构

本应用可构建为纯静态文件。GitHub Pages 提供页面，浏览器直接请求用户填写的兼容模型 API；仓库不包含运行中的 Node.js 后端。

## 调用链

两套正式界面 → `useDecisionRuntime` → `DecisionEngine` → `AgentProvider` → 模拟节点或 Chat Completions API。

- `frontend/src/domain`：判定、节点配置、结果和计票规则。
- `frontend/src/application`：执行生命周期、轮询与历史记录组装。
- `frontend/src/providers`：模拟执行与 HTTP 模型协议；模型只返回严格 JSON 投票和用户可见理由。
- `frontend/src/storage`：公开配置和最近 30 次历史的本地存储。
- `frontend/src/features`：界面、交互和共享运行时 Hook。
- `frontend/src/services`：既有服务接口的兼容入口及可选 REST 客户端。旧 Mock/Resilient 服务仅保留兼容用途，默认工厂不使用它们。

## 执行与失败

执行前校验全部节点配置，然后并发调用三个节点，逐个更新结果。同一个判定 ID 只执行一次；重试需新建判定。运行时对配置取快照，后续编辑不会改写已执行结果。

模型必须返回 `{"vote":"approve|reject|abstain","reason":"完整答复"}`。不根据自由文本猜投票。有效投票保持原计票规则：赞成与反对比较，平票进入复议；合法弃权不计入两边。

网络错误、超时、非法模型输出和取消均属于执行失败，失败节点保留 pending，整次判定标为 failed/review，不会被当作弃权或自动降级成模拟结果。已成功节点的真实答复仍保留。界面卸载会取消正在进行的请求。

每个模型请求默认 90 秒超时，响应体不超过 256 KB，理由不超过 32000 字符。历史保留完整已接受理由，写入失败时不截断伪装成功。内存判定缓存最多 60 条，清理非运行记录。

## 配置与凭据

用户填写 BASE URL、MODEL、API KEY 和角色 Prompt。公开配置存入 localStorage，Key 只存在当前界面的内存中，刷新或切换界面后需要重新输入。Key 仅通过 Authorization 发往所填地址；页面不提供密钥托管。

外部地址要求 HTTPS，本机 loopback 地址允许 HTTP。地址不能包含账号、查询参数或片段，拒绝 HTTP 重定向。接口必须允许浏览器 CORS；本机服务还受浏览器本地网络访问策略限制。HTTP 错误正文不进入历史，模型回显的已知 Key 会在输出归档前脱敏。

## 构建与部署

运行 `npm test` 和 `npm run build`，发布 `frontend/dist`。Vite 使用相对资源路径 `base: './'`，支持仓库子路径；页面内导航使用 hash。构建期间使用 Node.js 不代表部署后需要 Node.js。

默认模式在浏览器执行，`VITE_API_MODE=mock` 是兼容历史的默认配置名称，实际是否请求模型由每个节点的连接方式决定。只有显式设置 `VITE_API_MODE=remote` 才连接另行部署的 REST 后端；该模式不会静默回退模拟服务。

API 测试使用模拟响应，不消耗真实模型额度；通过测试不代表任意供应商的 CORS、认证和输出兼容性均已验证。
