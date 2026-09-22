# MAGI Backend（预留工作区）

当前目录**不是可运行后端**：尚无 FastAPI/Spring Boot 路由、数据库或模型供应商依赖。主应用在浏览器中运行，可使用模拟节点或用户配置的兼容 API。

浏览器判定逻辑位于 `frontend/src/application`、`domain`、`providers` 和 `storage`，详见 [浏览器架构](../docs/browser-architecture.md)。

- REST 唯一契约：[`../docs/openapi.yaml`](../docs/openapi.yaml)
- 接口与示例：[`../docs/API.md`](../docs/API.md)
- 从零实现、存储、安全与联调：[`../docs/backend-guides.md`](../docs/backend-guides.md)
- 内部扩展边界：[`app/ports.py`](app/ports.py)

`ports.py` 只使用 Python 标准库，预留了 Provider、节点配置存储、判定仓库和编排器 Protocol；它不发送任何网络请求，也不保存真实 API Key。

当前可执行检查：

```bash
PYTHONPYCACHEPREFIX=/tmp/magi-backend-pycache python3 -m compileall -q app
PYTHONPYCACHEPREFIX=/tmp/magi-backend-test-pycache python3 -m unittest discover -s tests -p 'test_*.py'
```

未来加入 `app/main.py` 和 FastAPI 依赖后，开发服务器目标命令为：

```bash
uvicorn app.main:app --reload --port 8000
```
