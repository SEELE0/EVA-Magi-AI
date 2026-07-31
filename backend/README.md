# MAGI Backend

Backend workspace for the future MAGI decision service.

The current implementation is still frontend-driven and uses the mock decision service by default. The REST contract is documented in `../docs/openapi.yaml`; a FastAPI service can be added under `backend/app/` without changing the frontend component tree.

Suggested first implementation target:

```bash
uvicorn app.main:app --reload --port 8000
```
