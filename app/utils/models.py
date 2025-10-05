from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class LoginOptions:
    username: Optional[str] = None
    password: Optional[str] = None
    username_selector: Optional[str] = None
    password_selector: Optional[str] = None
    submit_selector: Optional[str] = None
    login_url: Optional[str] = None


@dataclass
class PaginationOptions:
    enabled: bool = False
    # Either a query param like 'page' with start/end
    query_param: Optional[str] = None
    start_page: int = 1
    max_pages: int = 1
    # Or a CSS selector to click next link (for Selenium)
    next_link_selector: Optional[str] = None
    # Optional delay between pages
    delay_seconds: float = 1.0


@dataclass
class AntiBotOptions:
    rotate_user_agents: bool = True
    custom_user_agent: Optional[str] = None
    min_delay_seconds: float = 0.5
    max_delay_seconds: float = 2.0
    respect_robots_txt: bool = False


@dataclass
class ScrapeOptions:
    url: str = ""
    content_types: List[str] = field(default_factory=lambda: ["text"])  # text, images, links, tables
    use_selenium: bool = False
    login: Optional[LoginOptions] = None
    pagination: PaginationOptions = field(default_factory=PaginationOptions)
    anti_bot: AntiBotOptions = field(default_factory=AntiBotOptions)
    # For JS-rendered: optional wait conditions
    wait_selector: Optional[str] = None
    wait_seconds: float = 5.0


@dataclass
class ScrapedData:
    pages: List[Dict[str, Any]] = field(default_factory=list)
    # meta information for export
    source_url: str = ""
    used_selenium: bool = False
    errors: List[str] = field(default_factory=list)
