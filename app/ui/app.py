import json
import zipfile
import io
from typing import List

import streamlit as st

from app.utils.models import ScrapeOptions, LoginOptions, PaginationOptions, AntiBotOptions
from app.scrapers.static_scraper import scrape_static
from app.scrapers.dynamic_scraper import scrape_dynamic
from app.exporters.exporters import to_json_bytes, to_csv_bytes, to_excel_bytes


st.set_page_config(page_title="Local Web Scraper", layout="wide")

st.title("Local Web Scraper")

with st.form("scrape_form"):
    url = st.text_input("Target URL", placeholder="https://example.com")
    content_types = st.multiselect(
        "Content types",
        options=["text", "images", "links", "tables"],
        default=["text", "links"],
    )
    use_selenium = st.checkbox("Use Selenium (for JS-rendered)")

    with st.expander("Login (optional)"):
        login_enabled = st.checkbox("Enable login")
        login = None
        if login_enabled:
            login_url = st.text_input("Login URL")
            username = st.text_input("Username")
            password = st.text_input("Password", type="password")
            username_selector = st.text_input("Username CSS selector", value="#username")
            password_selector = st.text_input("Password CSS selector", value="#password")
            submit_selector = st.text_input("Submit CSS selector", value="button[type=submit]")
            login = LoginOptions(
                username=username or None,
                password=password or None,
                username_selector=username_selector or None,
                password_selector=password_selector or None,
                submit_selector=submit_selector or None,
                login_url=login_url or None,
            )

    with st.expander("Pagination"):
        pagination_enabled = st.checkbox("Enable pagination")
        pagination = PaginationOptions(enabled=False)
        if pagination_enabled:
            mode = st.selectbox("Mode", options=["query_param", "next_link_selector"])
            if mode == "query_param":
                query_param = st.text_input("Query param name", value="page")
                start_page = st.number_input("Start page", value=1, min_value=1)
                max_pages = st.number_input("Max pages", value=3, min_value=1)
                delay_seconds = st.number_input("Delay between pages (s)", value=1.0, min_value=0.0)
                pagination = PaginationOptions(
                    enabled=True,
                    query_param=query_param,
                    start_page=int(start_page),
                    max_pages=int(max_pages),
                    delay_seconds=float(delay_seconds),
                )
            else:
                next_link_selector = st.text_input("Next link CSS selector", value="a.next")
                max_pages = st.number_input("Max pages", value=3, min_value=1)
                delay_seconds = st.number_input("Delay between pages (s)", value=1.0, min_value=0.0)
                pagination = PaginationOptions(
                    enabled=True,
                    next_link_selector=next_link_selector,
                    max_pages=int(max_pages),
                    delay_seconds=float(delay_seconds),
                )

    with st.expander("Anti-bot settings"):
        rotate_user_agents = st.checkbox("Rotate user agents", value=True)
        custom_user_agent = st.text_input("Custom user agent")
        min_delay = st.number_input("Min delay (s)", value=0.5, min_value=0.0)
        max_delay = st.number_input("Max delay (s)", value=2.0, min_value=0.0)
        wait_selector = st.text_input("Wait CSS selector (Selenium)")
        wait_seconds = st.number_input("Wait seconds (Selenium)", value=5.0, min_value=0.0)

    submitted = st.form_submit_button("Scrape")

if submitted:
    if not url:
        st.error("Please enter a URL.")
    else:
        anti_bot = AntiBotOptions(
            rotate_user_agents=rotate_user_agents,
            custom_user_agent=custom_user_agent or None,
            min_delay_seconds=float(min_delay),
            max_delay_seconds=float(max_delay),
        )
        options = ScrapeOptions(
            url=url,
            content_types=content_types or ["text"],
            use_selenium=use_selenium,
            login=login,
            pagination=pagination,
            anti_bot=anti_bot,
            wait_selector=wait_selector or None,
            wait_seconds=float(wait_seconds),
        )
        with st.spinner("Scraping..."):
            result = scrape_dynamic(options) if use_selenium else scrape_static(options)
        st.success("Done")

        st.subheader("Preview")
        st.json(result.__dict__)

        st.subheader("Downloads")
        json_bytes = to_json_bytes({"meta": {"source_url": result.source_url, "used_selenium": result.used_selenium, "errors": result.errors}, "pages": result.pages})
        csv_bytes = to_csv_bytes(result.pages)
        excel_bytes = to_excel_bytes(result.pages)

        c1, c2, c3, c4 = st.columns(4)
        with c1:
            st.download_button("Download JSON", data=json_bytes, file_name="scraped.json", mime="application/json")
        with c2:
            st.download_button("Download CSV", data=csv_bytes, file_name="scraped.csv", mime="text/csv")
        with c3:
            st.download_button("Download Excel", data=excel_bytes, file_name="scraped.xlsx", mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        with c4:
            with io.BytesIO() as zip_buf:
                with zipfile.ZipFile(zip_buf, 'w', zipfile.ZIP_DEFLATED) as zf:
                    zf.writestr('scraped.json', json_bytes)
                    zf.writestr('scraped.csv', csv_bytes)
                    zf.writestr('scraped.xlsx', excel_bytes)
                st.download_button("Download All (ZIP)", data=zip_buf.getvalue(), file_name="scraped.zip", mime="application/zip")

st.caption("Runs locally. For authenticated sites, ensure you have permission to scrape.")
