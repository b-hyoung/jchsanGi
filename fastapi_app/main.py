"""FastAPI 앱 엔트리포인트."""
from fastapi import FastAPI
from config import get_settings

app = FastAPI(title="Core-CBT Agent API", version="0.1.0")


@app.get("/health")
async def health():
    settings = get_settings()
    return {
        "status": "ok",
        "llm_model": settings.llm_model,
        "llm_base_url": settings.llm_base_url,
    }
