from __future__ import annotations
import requests
from bs4 import BeautifulSoup
from typing import Dict, List

from .types import ScrapeJob, ScrapedResult
from .common import build_headers, human_delay
from . import extractors


def fetch_page(url: str, headers: Dict[str, str], timeout_seconds: int) -> str:
    response = requests.get(url, headers=headers, timeout=timeout_seconds)
    response.raise_for_status()
    return response.text


def scrape_static(job: ScrapeJob) -> List[ScrapedResult]:
    headers = build_headers(job.request_options.headers, job.request_options.use_random_user_agent)

    results: List[ScrapedResult] = []

    def process_one(url: str) -> Dict[str, List[Dict]]:
        html = fetch_page(url, headers=headers, timeout_seconds=job.request_options.timeout_seconds)
        soup = BeautifulSoup(html, "lxml")
        content_map: Dict[str, List[Dict]] = {}
        filters = job.filters
        if "text" in job.content_types:
            content_map["text"] = extractors.extract_text(soup, filters)
        if "links" in job.content_types:
            content_map["links"] = extractors.extract_links(soup, filters)
        if "images" in job.content_types:
            content_map["images"] = extractors.extract_images(soup, filters)
        if "tables" in job.content_types:
            content_map["tables"] = extractors.extract_tables(soup, filters)
        if "emails" in job.content_types:
            content_map["emails"] = extractors.extract_emails(soup, filters)
        if "pattern" in job.content_types:
            content_map["pattern"] = extractors.extract_pattern(soup, job.pattern, filters)
        return content_map

    # Handle simple page parameter pagination or next-link selector
    visited = 0
    next_url = job.url
    while next_url and visited < max(1, job.max_pages):
        data_map = process_one(next_url)
        for key, data in data_map.items():
            results.append(ScrapedResult(url=next_url, content_type=key, data=data))
        visited += 1
        human_delay(job.request_options.delay_seconds_min, job.request_options.delay_seconds_max)

        if job.pagination_next_selector:
            # Try to find next link in the current page HTML
            html = fetch_page(next_url, headers=headers, timeout_seconds=job.request_options.timeout_seconds)
            soup = BeautifulSoup(html, "lxml")
            next_link = soup.select_one(job.pagination_next_selector)
            if next_link and next_link.get("href"):
                href = next_link.get("href")
                if href.startswith("http"):
                    next_url = href
                else:
                    # relative URL
                    from urllib.parse import urljoin
                    next_url = urljoin(next_url, href)
            else:
                next_url = None
        elif job.pagination_param:
            from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
            parsed = urlparse(next_url)
            qs = parse_qs(parsed.query)
            current_page = int(qs.get(job.pagination_param, ["1"])[0])
            qs[job.pagination_param] = [str(current_page + 1)]
            next_query = urlencode(qs, doseq=True)
            next_url = urlunparse(parsed._replace(query=next_query))
        else:
            next_url = None

    return results
