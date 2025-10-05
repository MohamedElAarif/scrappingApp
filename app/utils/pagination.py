from typing import Iterator, Optional
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse


def iterate_query_pagination(url: str, param: str, start_page: int, max_pages: int) -> Iterator[str]:
    """Yield paginated URLs by incrementing a query parameter."""
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    for page in range(start_page, start_page + max_pages):
        query[param] = [str(page)]
        new_query = urlencode(query, doseq=True)
        yield urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
