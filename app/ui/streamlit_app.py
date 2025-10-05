import streamlit as st
from typing import List

from app.scraping.types import ScrapeJob, RequestOptions, LoginCredentials
from app.scraping.static_scraper import scrape_static
from app.scraping.dynamic_scraper import scrape_dynamic
from app.export.exporter import export_results

st.set_page_config(page_title="Web Scraper", page_icon="🕷️", layout="wide")

st.title("Web Scraper with Export")

with st.form("scrape_form"):
    url = st.text_input("Target URL", placeholder="https://example.com")
    content_types: List[str] = st.multiselect(
        "Content to scrape",
        ["text", "images", "tables", "links"],
        default=["links", "text"],
    )

    col1, col2, col3 = st.columns(3)
    with col1:
        javascript_render = st.toggle("Render JavaScript (Selenium)", value=False)
        max_pages = st.number_input("Max pages", min_value=1, max_value=100, value=1)
        pagination_param = st.text_input("Pagination param (e.g. page)", value="")
    with col2:
        pagination_next_selector = st.text_input("Next link CSS selector", value="")
        timeout_seconds = st.number_input("Timeout (s)", min_value=5, max_value=120, value=30)
        use_random_user_agent = st.toggle("Random User-Agent", value=True)
    with col3:
        delay_min = st.number_input("Delay min (s)", min_value=0.0, max_value=10.0, value=0.5)
        delay_max = st.number_input("Delay max (s)", min_value=0.0, max_value=15.0, value=2.0)

    with st.expander("Optional login"):
        username = st.text_input("Username", value="")
        password = st.text_input("Password", value="", type="password")
        username_selector = st.text_input("Username CSS selector", value="")
        password_selector = st.text_input("Password CSS selector", value="")
        submit_selector = st.text_input("Submit button CSS selector", value="")

    export_fmt = st.selectbox("Export format", ["CSV", "JSON", "Excel"], index=0)
    submitted = st.form_submit_button("Scrape")

results = []
if submitted:
    if not url or not content_types:
        st.warning("Please enter a URL and select at least one content type.")
    else:
        req_opts = RequestOptions(
            timeout_seconds=int(timeout_seconds),
            use_random_user_agent=use_random_user_agent,
            delay_seconds_min=float(delay_min),
            delay_seconds_max=float(delay_max),
        )
        login = None
        if username and password and username_selector and password_selector:
            login = LoginCredentials(
                username=username,
                password=password,
                username_selector=username_selector,
                password_selector=password_selector,
                submit_selector=submit_selector or None,
            )

        job = ScrapeJob(
            url=url,
            content_types=content_types,
            pagination_param=pagination_param or None,
            pagination_next_selector=pagination_next_selector or None,
            max_pages=int(max_pages),
            login=login,
            request_options=req_opts,
            javascript_render=bool(javascript_render),
        )

        with st.spinner("Scraping in progress..."):
            try:
                if javascript_render:
                    results = scrape_dynamic(job)
                else:
                    results = scrape_static(job)
                st.success(f"Scraped {len(results)} result groups.")
            except Exception as e:
                st.error(f"Error: {e}")

if results:
    st.subheader("Preview")
    # Display a small sample for each content type
    from collections import defaultdict
    grouped = defaultdict(list)
    for r in results:
        grouped[r.content_type].extend(r.data)

    for ctype, data in grouped.items():
        st.markdown(f"**{ctype.capitalize()}**")
        if data:
            import pandas as pd
            df = pd.DataFrame(data)
            st.dataframe(df.head(100), use_container_width=True)
        else:
            st.write("No data.")

    st.subheader("Download")
    try:
        fmt = export_fmt.lower()
        blob = export_results(results, fmt)
        mime = {
            "csv": "text/csv",
            "json": "application/json",
            "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }.get(fmt, "application/octet-stream")
        filename = f"scrape_results.{ 'xlsx' if fmt in ('excel','xlsx') else fmt }"
        st.download_button("Download results", data=blob, file_name=filename, mime=mime)
    except Exception as e:
        st.error(f"Export error: {e}")

st.caption("Tip: For dynamic sites, enable JavaScript rendering. Use either pagination param or next-link selector.")
