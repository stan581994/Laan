from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import sites, sessions, stats

app = FastAPI(title="Laan")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(sites.router)
app.include_router(sessions.router)
app.include_router(stats.router)


@app.get("/health")
def health():
    return {"status": "ok"}
