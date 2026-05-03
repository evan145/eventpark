import random
import string
from datetime import datetime, timezone


def generate_confirmation_code(now: datetime | None = None) -> str:
    if now is None:
        now = datetime.now(timezone.utc)
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"EP-{now.strftime('%Y%m%d')}-{suffix}"
