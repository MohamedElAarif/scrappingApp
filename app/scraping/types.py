from dataclasses import dataclass, field
from typing import Dict, List, Optional, Literal, Any

ContentType = Literal["text", "images", "tables", "links", "emails", "pattern"]


@dataclass
class RequestOptions:
    headers: Dict[str, str] = field(default_factory=dict)
    timeout_seconds: int = 30
    use_random_user_agent: bool = True
    delay_seconds_min: float = 0.5
    delay_seconds_max: float = 2.0


@dataclass
class Filters:
    """Optional extraction filters and scoping.

    - scope_selector: restrict scraping to elements within this CSS selector
    - include_selectors: if provided, only extract from elements matching any of these selectors
    - exclude_selectors: skip elements that are inside any of these selectors
    - href_regex: optional regex to filter link hrefs
    """
    scope_selector: Optional[str] = None
    include_selectors: List[str] = field(default_factory=list)
    exclude_selectors: List[str] = field(default_factory=list)
    href_regex: Optional[str] = None


@dataclass
class LoginCredentials:
    username: Optional[str] = None
    password: Optional[str] = None
    username_selector: Optional[str] = None
    password_selector: Optional[str] = None
    submit_selector: Optional[str] = None


@dataclass
class ScrapeJob:
    url: str
    content_types: List[ContentType]
    pagination_param: Optional[str] = None  # e.g. "page"
    pagination_next_selector: Optional[str] = None  # CSS selector for next link
    max_pages: int = 1
    login: Optional[LoginCredentials] = None
    request_options: RequestOptions = field(default_factory=RequestOptions)
    javascript_render: bool = False
    # New capabilities
    filters: Optional[Filters] = None
    # Used when content_types includes "pattern"
    pattern: Optional[str] = None


@dataclass
class ScrapedResult:
    url: str
    content_type: ContentType
    data: List[Dict[str, Any]]
    metadata: Dict[str, Any] = field(default_factory=dict)
