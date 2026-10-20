# Sandboxed Crawl Container with Playwright
FROM mcr.microsoft.com/playwright:v1.49.0-noble

USER 10001:10001
WORKDIR /workspace

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENTRYPOINT ["node"]
