import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Site

router = APIRouter(prefix="/api/sites", tags=["sites"])


class SiteCreate(BaseModel):
    domain: str


def _clean_domain(raw: str) -> str:
    """Strip protocol, www., and any path from a domain string."""
    domain = raw.strip()
    # Remove protocol
    domain = re.sub(r"^https?://", "", domain)
    # Remove www.
    domain = re.sub(r"^www\.", "", domain)
    # Remove path (everything after first slash)
    domain = domain.split("/")[0]
    return domain.lower()


@router.get("/")
def list_sites(db: Session = Depends(get_db)):
    return db.query(Site).order_by(Site.created_at).all()


@router.post("/", status_code=201)
def create_site(body: SiteCreate, db: Session = Depends(get_db)):
    domain = _clean_domain(body.domain)
    existing = db.query(Site).filter(Site.domain == domain).first()
    if existing:
        raise HTTPException(status_code=409, detail="Domain already exists")
    site = Site(domain=domain)
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@router.delete("/{site_id}", status_code=204)
def delete_site(site_id: int, db: Session = Depends(get_db)):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    db.delete(site)
    db.commit()


@router.patch("/{site_id}/toggle")
def toggle_site(site_id: int, db: Session = Depends(get_db)):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    site.is_active = not site.is_active
    db.commit()
    db.refresh(site)
    return site
