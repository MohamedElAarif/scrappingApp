from dataclasses import dataclass, field
from typing import Dict, List, Optional, Literal, Any

ContentType = Literal["text", "images", "tables", "links"]


@dataclass
class RequestOptions:
    headers: Dict[str, str] = field(default_factory=dict)
    timeout_seconds: int = 30
    use_random_user_agent: bool = True
    delay_seconds_min: float = 0.5
    delay_seconds_max: float = 2.0


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


@dataclass
class ScrapedResult:
    url: str
    content_type: ContentType
    data: List[Dict[str, Any]]
    metadata: Dict[str, Any] = field(default_factory=dict)
