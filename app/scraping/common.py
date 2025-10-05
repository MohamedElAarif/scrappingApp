import random
import time
from typing import Dict

DEFAULT_USER_AGENTS = [
    # A small rotating list; can be extended
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0",
]


def build_headers(base: Dict[str, str] | None, use_random_user_agent: bool) -> Dict[str, str]:
    headers: Dict[str, str] = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }
    if base:
        headers.update(base)
    if use_random_user_agent and "User-Agent" not in headers:
        headers["User-Agent"] = random.choice(DEFAULT_USER_AGENTS)
    return headers


def human_delay(min_seconds: float, max_seconds: float) -> None:
    if max_seconds <= 0:
        return
    delay = random.uniform(max(0.0, min_seconds), max_seconds)
    time.sleep(delay)
