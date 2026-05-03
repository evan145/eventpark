import time
from collections import defaultdict, deque
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

from .config import settings
from .database import engine, Base
from .routers import auth, host, admin, events, listings, bookings, pages


def _parse_rate(rate: str) -> tuple[int, int]:
    try:
        count_str, per = rate.split("/")
        count = int(count_str)
    except Exception:
        return 100, 60
    per = per.lower().strip()
    if per.startswith("second"):
        window = 1
    elif per.startswith("minute"):
        window = 60
    elif per.startswith("hour"):
        window = 3600
    elif per.startswith("day"):
        window = 86400
    else:
        window = 60
    return count, window


def create_app(rate_limit: str | None = None, https_redirect: bool | None = None) -> FastAPI:
    app = FastAPI(title="EventPark")

    Base.metadata.create_all(bind=engine)

    limit_value = rate_limit if rate_limit is not None else settings.RATE_LIMIT
    max_count, window_seconds = _parse_rate(limit_value)
    history: dict[str, deque] = defaultdict(deque)

    @app.middleware("http")
    async def rate_limit_mw(request: Request, call_next):
        if request.url.path.startswith("/api/"):
            client_ip = request.client.host if request.client else "anon"
            now = time.time()
            dq = history[client_ip]
            while dq and dq[0] <= now - window_seconds:
                dq.popleft()
            if len(dq) >= max_count:
                return JSONResponse(status_code=429, content={"detail": "rate limit exceeded"})
            dq.append(now)
        response = await call_next(request)
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(status_code=400, content={"detail": exc.errors()})

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    do_https = https_redirect if https_redirect is not None else settings.HTTPS_REDIRECT
    if do_https:
        app.add_middleware(HTTPSRedirectMiddleware)

    app.include_router(auth.router)
    app.include_router(host.router)
    app.include_router(admin.router)
    app.include_router(events.router)
    app.include_router(listings.router)
    app.include_router(bookings.router)
    app.include_router(pages.router)

    return app


app = create_app()
