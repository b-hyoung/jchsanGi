# Core-CBT Agent API (FastAPI)

## 로컬 개발 실행

```bash
cd fastapi_app
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env  # 값 채우기
uvicorn main:app --reload --port 8001
```

헬스체크:
```bash
curl http://localhost:8001/health
```

## 테스트

```bash
pytest
```

## 환경변수 교체로 로컬 LLM 사용

```bash
LLM_BASE_URL=http://localhost:11434/v1 LLM_MODEL=gpt-oss:20b uvicorn main:app --reload --port 8001
```
