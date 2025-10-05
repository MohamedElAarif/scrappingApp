from typing import Optional
import random
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from .user_agents import USER_AGENTS
from .models import AntiBotOptions, LoginOptions


def build_chrome_driver(anti_bot: AntiBotOptions, headless: bool = True) -> webdriver.Chrome:
    chrome_options = Options()
    if headless:
        chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")

    if anti_bot.custom_user_agent:
        chrome_options.add_argument(f"--user-agent={anti_bot.custom_user_agent}")
    elif anti_bot.rotate_user_agents:
        chrome_options.add_argument(f"--user-agent={random.choice(USER_AGENTS)}")

    driver = webdriver.Chrome(options=chrome_options)
    return driver


def selenium_login(driver: webdriver.Chrome, login: LoginOptions, timeout: int = 20) -> None:
    if not login or not login.login_url:
        return
    driver.get(login.login_url)
    if login.username_selector and login.username is not None:
        WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.CSS_SELECTOR, login.username_selector)))
        driver.find_element(By.CSS_SELECTOR, login.username_selector).clear()
        driver.find_element(By.CSS_SELECTOR, login.username_selector).send_keys(login.username)
    if login.password_selector and login.password is not None:
        WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.CSS_SELECTOR, login.password_selector)))
        driver.find_element(By.CSS_SELECTOR, login.password_selector).clear()
        driver.find_element(By.CSS_SELECTOR, login.password_selector).send_keys(login.password)
    if login.submit_selector:
        driver.find_element(By.CSS_SELECTOR, login.submit_selector).click()
        # wait for navigation or some condition
        WebDriverWait(driver, timeout).until(lambda d: d.current_url != login.login_url)
