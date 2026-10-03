# 页面设计迁移到 main

来源：`Github_Pages` 的页面版本 `6c0e114`，目标基础：`main` 的 `0eb00e3`。

## 保留

- 现代页、原设页、开机选择、节点几何、CRT、状态颜色、字体、语言切换和响应式布局。
- `main` 原有的 `frontend/src/services` HTTP 接口、取消和轮询流程。
- `backend/`、`docs/openapi.yaml` 及后端指南；本次没有实现或修改后端。
- 原有 Mock 服务仅作为 main 已有的本地页面预览模式。

## 排除

- `Github_Pages` 的浏览器判定引擎、模型 Provider、投票解析和计算。
- 浏览器直接向模型服务发送 `/chat/completions` 请求。
- GitHub Pages 工作流、浏览器执行架构文档与专用构建配置。

## 设置边界

节点名称、角色、连接参数、全局参数和设定书保留为界面草稿。API Key 仍只在页面内存中，不保存或上传。
草稿不会用于执行模型；配置弹窗已在四种语言中明确说明这一点。
“测试后端连接”及顶部状态按钮调用项目服务的系统状态/节点接口，不测试用户填写的模型地址。
后续真实配置保存、设定书生效和模型测试由后端实现后再接入。

## 启动

默认使用 HTTP 后端适配层，后端请求失败会报错，不切换为前端模拟结果。环境变量：

```dotenv
VITE_API_MODE=remote
VITE_API_BASE_URL=http://localhost:8000
```

`main` 当前后端目录是预留骨架，还没有可运行服务。只有显式设置 `VITE_API_MODE=mock` 时使用原有 Mock 预览。
