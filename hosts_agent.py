#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["fastapi>=0.111.0", "uvicorn[standard]>=0.30.0"]
# ///
"""
Host-side agent that modifies /etc/hosts on behalf of the Docker container.
Run with: uv run hosts_agent.py
The Docker backend calls http://localhost:7072/block and /restore.
"""
import os
import subprocess
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Laan Hosts Agent")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SCRIPT = Path(__file__).parent / "hosts_manager.sh"


class DomainsPayload(BaseModel):
    domains: list[str]


def _run(action: str, domains: list[str] | None = None):
    cmd = ["sudo", str(SCRIPT), action]
    if domains:
        cmd.extend(domains)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr or "hosts_manager failed")
    return result.stdout


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/block")
def block(payload: DomainsPayload):
    output = _run("block", payload.domains)
    return {"blocked": payload.domains, "output": output}


@app.post("/restore")
def restore():
    output = _run("restore")
    return {"restored": True, "output": output}


@app.get("/status")
def status():
    output = _run("status")
    return {"entries": output.strip().splitlines()}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=7072)
