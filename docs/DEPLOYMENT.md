# RevForge AI — Production Deployment Guide

## 1. Infrastructure Architecture

```
                    [ Cloudflare Edge / WAF ]
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    [ Next.js 15 Web Nodes ]       [ Static Assets / R2 ]
               │
       ┌───────┴───────┐
       ▼               ▼
[ PostgreSQL (Neon) ]  [ Redis (Upstash) ]
       ▲
       │
[ gVisor Disassembly Fleet ] (Hetzner / AWS bare-metal workers)
```

---

## 2. Environment Variables Configuration

Ensure the following variables are defined in your production deployment environment:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Application environment | `production` |
| `APP_URL` | Canonical public application URL | `https://revforge.ai` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host/db` |
| `MOCK_SANDBOX` | Toggle mock simulation (`true` for staging/dev) | `false` |
| `PADDLE_API_KEY` | Paddle Billing v2 secret API key | `padd_live_...` |
| `PADDLE_WEBHOOK_SECRET_KEY` | Paddle webhook HMAC secret key | `padd_wsec_...` |
| `PADDLE_ENVIRONMENT` | Paddle target mode | `production` |
| `NEXTAUTH_SECRET` | 32+ character cryptographic secret | `crypto.randomBytes(32).toString('hex')` |
| `NEXTAUTH_URL` | Auth callback base URL | `https://revforge.ai` |
| `R2_ACCOUNT_ID` | Cloudflare R2 Account ID | `c2a49b...` |
| `R2_ACCESS_KEY_ID` | R2 Access Key ID | `...` |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Access Key | `...` |
| `R2_BUCKET_NAME` | S3-compatible bucket name | `revforge-production-vault` |

---

## 3. Database Schema Provisioning

Apply schema migrations using Drizzle ORM:
```bash
# Push schema changes directly to production database
npm run drizzle-kit push
```

---

## 4. Paddle Webhook Configuration

1. In your **Paddle Developer Dashboard**, navigate to **Notifications** > **Webhooks**.
2. Add Endpoint URL: `https://revforge.ai/api/webhook/paddle`
3. Subscribed Events:
   - `transaction.completed`
   - `transaction.paid`
4. Copy the generated **Webhook Secret Key** and set it in your environment as `PADDLE_WEBHOOK_SECRET_KEY`.

---

## 5. gVisor Worker Daemon Installation (Linux Host)

On your dedicated sandbox worker nodes (e.g. Ubuntu 24.04 LTS):

```bash
# 1. Install gVisor runsc runtime
curl -fsSL https://gvisor.dev/archive.key | sudo gpg --dearmor -o /usr/share/keyrings/gvisor-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/gvisor-archive-keyring.gpg] https://storage.googleapis.com/gvisor/releases release main" | sudo tee /etc/apt/sources.list.d/gvisor.list
sudo apt-get update && sudo apt-get install -y runsc

# 2. Configure Docker daemon to use gVisor
sudo runsc install
sudo systemctl restart docker

# 3. Build the sandbox container
docker build -t revforge-sandbox:latest -f docker/Dockerfile.sandbox .

# 4. Start the background reconstruction worker
npm run worker
```
