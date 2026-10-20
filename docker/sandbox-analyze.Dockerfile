# Sandboxed Static Analysis Container
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    binutils \
    file \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

USER 10001:10001
WORKDIR /workspace

ENTRYPOINT ["node"]
