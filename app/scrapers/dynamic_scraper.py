import random
import time
from typing import Dict, Any, List

from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from app.utils.models import ScrapeOptions, ScrapedData
from app.utils.selenium_driver import build_chrome_driver, selenium_login
from app.extractors.extractors import extract_text, extract_images, extract_links, extract_tables
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser


def scrape_dynamic(options: ScrapeOptions) -> ScrapedData:
    data = ScrapedData(source_url=options.url, used_selenium=True)
    driver = build_chrome_driver(options.anti_bot, headless=True)
    try:
        if options.login:
            selenium_login(driver, options.login)

        driver.get(options.url)
        if options.wait_selector:
            WebDriverWait(driver, int(options.wait_seconds)).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, options.wait_selector))
            )
        # robots.txt (best-effort)
        if options.anti_bot.respect_robots_txt:
            try:
                parsed = urlparse(options.url)
                robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
                rp = RobotFileParser()
                rp.set_url(robots_url)
                rp.read()
                if not rp.can_fetch("*", options.url):
                    data.pages.append({"url": options.url, "error": "Disallowed by robots.txt"})
                    return data
            except Exception:
                pass

        html = driver.page_source
        soup = BeautifulSoup(html, 'html.parser')
        page_result: Dict[str, Any] = {"url": options.url}
        if "text" in options.content_types:
            page_result["text"] = extract_text(soup)
        if "images" in options.content_types:
            page_result["images"] = extract_images(soup, options.url)
        if "links" in options.content_types:
            page_result["links"] = extract_links(soup, options.url)
        if "tables" in options.content_types:
            page_result["tables"] = extract_tables(soup)
        data.pages.append(page_result)

        # Pagination via next-link selector if provided
        if options.pagination.enabled and options.pagination.next_link_selector:
            for _ in range(options.pagination.max_pages - 1):
                try:
                    next_el = WebDriverWait(driver, 5).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, options.pagination.next_link_selector))
                    )
                    next_el.click()
                    if options.wait_selector:
                        WebDriverWait(driver, int(options.wait_seconds)).until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, options.wait_selector))
                        )
                    time.sleep(options.pagination.delay_seconds)
                    soup = BeautifulSoup(driver.page_source, 'html.parser')
                    page_result = {"url": driver.current_url}
                    if "text" in options.content_types:
                        page_result["text"] = extract_text(soup)
                    if "images" in options.content_types:
                        page_result["images"] = extract_images(soup, driver.current_url)
                    if "links" in options.content_types:
                        page_result["links"] = extract_links(soup, driver.current_url)
                    if "tables" in options.content_types:
                        page_result["tables"] = extract_tables(soup)
                    data.pages.append(page_result)
                except Exception as e:
                    data.errors.append(f"pagination: {e}")
                    break
    except Exception as e:
        data.errors.append(str(e))
    finally:
        driver.quit()
    return data
