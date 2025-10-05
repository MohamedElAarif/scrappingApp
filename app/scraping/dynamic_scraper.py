from __future__ import annotations
from typing import Dict, List
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

from .types import ScrapeJob, ScrapedResult, LoginCredentials
from .common import human_delay
from . import extractors


def build_driver(headless: bool = True, user_agent: str | None = None) -> webdriver.Chrome:
    options = ChromeOptions()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    if user_agent:
        options.add_argument(f"--user-agent={user_agent}")
    chrome_bin = os.environ.get("CHROME_BIN")
    if chrome_bin:
        options.binary_location = chrome_bin

    driver = webdriver.Chrome(ChromeDriverManager().install(), options=options)
    return driver


def maybe_login(driver: webdriver.Chrome, login: LoginCredentials, timeout_seconds: int) -> None:
    if not (login.username and login.password and login.username_selector and login.password_selector):
        return
    driver.get(driver.current_url)
    try:
        WebDriverWait(driver, timeout_seconds).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, login.username_selector))
        )
        user_input = driver.find_element(By.CSS_SELECTOR, login.username_selector)
        pass_input = driver.find_element(By.CSS_SELECTOR, login.password_selector)
        user_input.clear(); user_input.send_keys(login.username)
        pass_input.clear(); pass_input.send_keys(login.password)
        if login.submit_selector:
            driver.find_element(By.CSS_SELECTOR, login.submit_selector).click()
        else:
            pass_input.submit()
    except TimeoutException:
        pass


def get_dynamic_html(driver: webdriver.Chrome, url: str, timeout_seconds: int) -> str:
    driver.get(url)
    try:
        WebDriverWait(driver, timeout_seconds).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
    except TimeoutException:
        pass
    return driver.page_source


def scrape_dynamic(job: ScrapeJob) -> List[ScrapedResult]:
    user_agent = None
    if job.request_options.use_random_user_agent:
        from .common import DEFAULT_USER_AGENTS
        import random
        user_agent = random.choice(DEFAULT_USER_AGENTS)

    driver = build_driver(headless=True, user_agent=user_agent)

    results: List[ScrapedResult] = []
    try:
        visited = 0
        next_url = job.url
        while next_url and visited < max(1, job.max_pages):
            html = get_dynamic_html(driver, next_url, job.request_options.timeout_seconds)
            if job.login:
                maybe_login(driver, job.login, job.request_options.timeout_seconds)
                html = driver.page_source

            soup = BeautifulSoup(html, "lxml")
            if "text" in job.content_types:
                results.append(ScrapedResult(url=next_url, content_type="text", data=extractors.extract_text(soup)))
            if "links" in job.content_types:
                results.append(ScrapedResult(url=next_url, content_type="links", data=extractors.extract_links(soup)))
            if "images" in job.content_types:
                results.append(ScrapedResult(url=next_url, content_type="images", data=extractors.extract_images(soup)))
            if "tables" in job.content_types:
                results.append(ScrapedResult(url=next_url, content_type="tables", data=extractors.extract_tables(soup)))

            visited += 1
            human_delay(job.request_options.delay_seconds_min, job.request_options.delay_seconds_max)

            if job.pagination_next_selector:
                next_link = soup.select_one(job.pagination_next_selector)
                if next_link and next_link.get("href"):
                    href = next_link.get("href")
                    if href.startswith("http"):
                        next_url = href
                    else:
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
    finally:
        driver.quit()

    return results
