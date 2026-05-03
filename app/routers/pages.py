from pathlib import Path
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, Response
from fastapi.templating import Jinja2Templates

router = APIRouter()

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


@router.get("/", response_class=HTMLResponse)
async def landing(request: Request):
    """Landing page."""
    return templates.TemplateResponse(request, "index.html")


@router.get("/sitemap.xml")
async def sitemap():
    """Sitemap."""
    xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"
        "<url><loc>/</loc></url>"
        "</urlset>"
    )
    return Response(content=xml, media_type="application/xml")


@router.get("/robots.txt")
async def robots():
    """Robots.txt."""
    body = "User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n"
    return Response(content=body, media_type="text/plain")


@router.get("/health")
async def health():
    return {"status": "ok"}
