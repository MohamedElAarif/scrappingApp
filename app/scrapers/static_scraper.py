import random
import time
from typing import Dict, Any, List

import requests
from bs4 import BeautifulSoup

from app.utils.models import ScrapeOptions, ScrapedData
from app.utils.user_agents import USER_AGENTS
from app.extractors.extractors import extract_text, extract_images, extract_links, extract_tables
from app.utils.pagination import iterate_query_pagination
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser


SESSION = requests.Session()


def _build_headers(options: ScrapeOptions) -> Dict[str, str]:
    if options.anti_bot.custom_user_agent:
        ua = options.anti_bot.custom_user_agent
    elif options.anti_bot.rotate_user_agents:
        ua = random.choice(USER_AGENTS)
    else:
        ua = USER_AGENTS[0]
    return {
        "User-Agent": ua,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Connection": "keep-alive",
    }


def _sleep_jitter(options: ScrapeOptions) -> None:
    delay = random.uniform(options.anti_bot.min_delay_seconds, options.anti_bot.max_delay_seconds)
    time.sleep(delay)


def _scrape_single(url: str, options: ScrapeOptions) -> Dict[str, Any]:
    headers = _build_headers(options)
    # robots.txt (best-effort)
    if options.anti_bot.respect_robots_txt:
        try:
            parsed = urlparse(url)
            robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
            rp = RobotFileParser()
            rp.set_url(robots_url)
            rp.read()
            ua = headers.get("User-Agent", "*")
            if not rp.can_fetch(ua, url):
                return {"url": url, "error": "Disallowed by robots.txt"}
        except Exception:
            pass
    resp = SESSION.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'html.parser')
    page_result: Dict[str, Any] = {"url": url}
    if "text" in options.content_types:
        page_result["text"] = extract_text(soup)
    if "images" in options.content_types:
        page_result["images"] = extract_images(soup, url)
    if "links" in options.content_types:
        page_result["links"] = extract_links(soup, url)
    if "tables" in options.content_types:
        page_result["tables"] = extract_tables(soup)
    return page_result


def scrape_static(options: ScrapeOptions) -> ScrapedData:
    data = ScrapedData(source_url=options.url, used_selenium=False)
    urls: List[str]
    if options.pagination.enabled and options.pagination.query_param:
        urls = list(
            iterate_query_pagination(
                options.url,
                options.pagination.query_param,
                options.pagination.start_page,
                options.pagination.max_pages,
            )
        )
    else:
        urls = [options.url]

    for idx, url in enumerate(urls):
        try:
            _sleep_jitter(options)
            page_result = _scrape_single(url, options)
            data.pages.append(page_result)
        except Exception as e:
            data.errors.append(f"{url}: {e}")
            data.pages.append({"url": url, "error": str(e)})
        if options.pagination.enabled and options.pagination.delay_seconds:
            time.sleep(options.pagination.delay_seconds)
    return data
