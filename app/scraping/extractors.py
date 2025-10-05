from bs4 import BeautifulSoup, NavigableString
from typing import Dict, List, Iterable
import re

from .types import Filters


def _get_roots(soup: BeautifulSoup, filters: Filters | None) -> List[BeautifulSoup]:
    if filters and filters.scope_selector:
        scoped = soup.select(filters.scope_selector)
        return list(scoped) if scoped else [soup]
    return [soup]


def _get_excluded_containers(soup: BeautifulSoup, filters: Filters | None) -> List:
    # Always ignore text in these tags
    base_exclude = "script, style, head, title, noscript"
    excluded = list(soup.select(base_exclude))
    if filters and filters.exclude_selectors:
        for sel in filters.exclude_selectors:
            excluded.extend(soup.select(sel))
    # De-duplicate
    seen = set()
    unique = []
    for el in excluded:
        if id(el) not in seen:
            seen.add(id(el))
            unique.append(el)
    return unique


def _get_included_containers(soup: BeautifulSoup, filters: Filters | None) -> List:
    if not (filters and filters.include_selectors):
        return []
    included: List = []
    for sel in filters.include_selectors:
        included.extend(soup.select(sel))
    # De-duplicate
    seen = set()
    uniq = []
    for el in included:
        if id(el) not in seen:
            seen.add(id(el))
            uniq.append(el)
    return uniq


def _is_within_any(element, containers: List) -> bool:
    if not containers:
        return False
    for parent in element.parents:
        if parent in containers:
            return True
    return False


def _iter_visible_strings(scoped_roots: Iterable, excluded_containers: List, included_containers: List) -> Iterable[str]:
    for root in scoped_roots:
        for node in root.find_all(string=True):
            if not isinstance(node, NavigableString):
                continue
            parent = node.parent
            if parent is None:
                continue
            # Exclude if inside any excluded container
            if _is_within_any(parent, excluded_containers):
                continue
            # If includes are specified, require being inside at least one included container
            if included_containers and not _is_within_any(parent, included_containers) and parent not in included_containers:
                continue
            text = str(node).strip()
            if text:
                yield text


def extract_text(soup: BeautifulSoup, filters: Filters | None = None) -> List[Dict[str, str]]:
    roots = _get_roots(soup, filters)
    excluded = _get_excluded_containers(soup, filters)
    included = _get_included_containers(soup, filters)

    parts: List[Dict[str, str]] = []
    seen: set[str] = set()
    for text in _iter_visible_strings(roots, excluded, included):
        if text not in seen:
            seen.add(text)
            parts.append({"text": text})
    return parts


def extract_links(soup: BeautifulSoup, filters: Filters | None = None) -> List[Dict[str, str]]:
    roots = _get_roots(soup, filters)
    excluded = _get_excluded_containers(soup, filters)
    included = _get_included_containers(soup, filters)

    href_re = re.compile(filters.href_regex) if (filters and filters.href_regex) else None
    links: List[Dict[str, str]] = []
    seen_pairs: set[tuple[str, str]] = set()

    for root in roots:
        for a in root.find_all("a", href=True):
            if _is_within_any(a, excluded):
                continue
            if included and not _is_within_any(a, included) and a not in included:
                continue
            href = a.get("href", "")
            if href_re and not href_re.search(href):
                continue
            text = a.get_text(strip=True)
            key = (text, href)
            if key in seen_pairs:
                continue
            seen_pairs.add(key)
            links.append({"text": text, "href": href})
    return links


def extract_images(soup: BeautifulSoup, filters: Filters | None = None) -> List[Dict[str, str]]:
    roots = _get_roots(soup, filters)
    excluded = _get_excluded_containers(soup, filters)
    included = _get_included_containers(soup, filters)

    images: List[Dict[str, str]] = []
    seen_srcs: set[str] = set()
    for root in roots:
        for img in root.find_all("img"):
            if _is_within_any(img, excluded):
                continue
            if included and not _is_within_any(img, included) and img not in included:
                continue
            src = img.get("src", "")
            alt = img.get("alt", "")
            if src and src not in seen_srcs:
                seen_srcs.add(src)
                images.append({"src": src, "alt": alt})
    return images


def extract_tables(soup: BeautifulSoup, filters: Filters | None = None) -> List[Dict[str, str]]:
    roots = _get_roots(soup, filters)
    excluded = _get_excluded_containers(soup, filters)
    included = _get_included_containers(soup, filters)

    tables: List[Dict[str, List[List[str]]]] = []
    for root in roots:
        for table in root.find_all("table"):
            if _is_within_any(table, excluded):
                continue
            if included and not _is_within_any(table, included) and table not in included:
                continue
            rows: List[List[str]] = []
            for tr in table.find_all("tr"):
                cols = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]
                if cols:
                    rows.append(cols)
            if rows:
                tables.append({"rows": rows})
    return tables


def extract_emails(soup: BeautifulSoup, filters: Filters | None = None) -> List[Dict[str, str]]:
    roots = _get_roots(soup, filters)
    excluded = _get_excluded_containers(soup, filters)
    included = _get_included_containers(soup, filters)

    email_re = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
    emails: Dict[str, str] = {}

    # From mailto links
    for root in roots:
        for a in root.find_all("a", href=True):
            if _is_within_any(a, excluded):
                continue
            if included and not _is_within_any(a, included) and a not in included:
                continue
            href = a.get("href", "")
            if href.lower().startswith("mailto:"):
                addr = href.split(":", 1)[1].split("?", 1)[0]
                if addr and email_re.fullmatch(addr) and addr not in emails:
                    emails[addr] = "mailto"

    # From visible text
    for text in _iter_visible_strings(roots, excluded, included):
        for m in email_re.finditer(text):
            addr = m.group(0)
            if addr not in emails:
                emails[addr] = "text"

    return [{"email": addr, "source": source} for addr, source in emails.items()]


def extract_pattern(soup: BeautifulSoup, pattern: str | None, filters: Filters | None = None) -> List[Dict[str, str]]:
    if not pattern:
        return []
    try:
        compiled = re.compile(pattern)
    except re.error:
        return []

    roots = _get_roots(soup, filters)
    excluded = _get_excluded_containers(soup, filters)
    included = _get_included_containers(soup, filters)

    matches: List[Dict[str, str]] = []
    seen: set[str] = set()
    for text in _iter_visible_strings(roots, excluded, included):
        for m in compiled.finditer(text):
            val = m.group(0)
            if val in seen:
                continue
            seen.add(val)
            matches.append({"match": val})
    return matches
