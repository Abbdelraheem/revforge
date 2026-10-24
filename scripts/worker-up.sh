#!/usr/bin/env bash
set -euo pipefail

# RevForge AI — Hourly Worker-on-Demand Boot & Autoshutdown Harness
# Usage: ./scripts/worker-up.sh [--idle-timeout-min 30]

IDLE_TIMEOUT_MIN="${WORKER_IDLE_SHUTDOWN_MIN:-30}"
WORKER_IMAGE="${REVFORGE_WORKER_IMAGE:-revforge/worker:latest}"
CONTAINER_NAME="revforge-worker-ondemand"

echo "========================================================"
echo " Starting RevForge On-Demand Worker"
echo " Image:        ${WORKER_IMAGE}"
echo " Idle Timeout: ${IDLE_TIMEOUT_MIN} minutes"
echo "========================================================"

# 1. Pull latest verified worker image
echo "[1/4] Pulling production worker image..."
docker pull "${WORKER_IMAGE}" || true

# 2. Cleanup stale instances if any
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[2/4] Removing previous worker container..."
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
fi

# 3. Start worker container with outbound egress tunnel and heartbeat
echo "[3/4] Launching worker daemon container..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --security-opt=no-new-privileges:true \
  --env-file .env.production \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /tmp/revforge-sandboxes:/tmp/revforge-sandboxes \
  "${WORKER_IMAGE}"

echo "[4/4] Worker is online and processing queues."

# 4. Monitor idle timeout for hourly shutdown
IDLE_SECONDS=0
CHECK_INTERVAL=30

echo "Monitoring worker queue depth. Machine will auto-shutdown after ${IDLE_TIMEOUT_MIN}m of continuous idle time."

while true; do
  sleep "${CHECK_INTERVAL}"

  # Inspect worker container logs for active jobs
  if docker logs --tail 20 "${CONTAINER_NAME}" 2>&1 | grep -q "processing job"; then
    IDLE_SECONDS=0
  else
    IDLE_SECONDS=$((IDLE_SECONDS + CHECK_INTERVAL))
  fi

  if [ "${IDLE_SECONDS}" -ge "$((IDLE_TIMEOUT_MIN * 60))" ]; then
    echo "Worker has been idle for ${IDLE_TIMEOUT_MIN} minutes. Initiating graceful shutdown..."
    docker stop -t 30 "${CONTAINER_NAME}" || true
    docker rm -f "${CONTAINER_NAME}" || true
    echo "Drained. Shutting down host instance..."
    sudo shutdown -h now || true
    exit 0
  fi
done
