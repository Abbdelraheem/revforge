# RevForge AI — Human Launch Checklist

Follow these steps before opening the platform to public traffic:

1. **Brand & Domain**:
   - Check `src/config/brand.ts` to confirm final product name, support email, and brand tagline.
   - Point your DNS records to the host and configure `APP_URL`.

2. **Paddle Billing Activation**:
   - Create your Paddle Billing account.
   - Submit your domain for approval in Paddle's dashboard.
   - Configure the Webhook destination URL: `https://yourdomain.com/api/webhooks/paddle`.
   - Copy your live API Key and Webhook Secret Key into `.env`:
     ```env
     PAYMENT_PROVIDER=paddle
     PADDLE_API_KEY=your_live_paddle_api_key
     PADDLE_WEBHOOK_SECRET_KEY=your_live_paddle_webhook_secret
     PADDLE_ENVIRONMENT=production
     ```

3. **Anthropic LLM API**:
   - Obtain an Anthropic API Key and set:
     ```env
     ANTHROPIC_API_KEY=sk-ant-api03-...
     LLM_PROVIDER=anthropic
     ```

4. **Transactional Email (Resend)**:
   - Configure your Resend API credentials for delivery notifications:
     ```env
     RESEND_API_KEY=re_live_...
     EMAIL_FROM=notifications@yourdomain.com
     ```

5. **Legal & Clean-Room IP Compliance**:
   - Have a specialized technology lawyer review your Terms of Service, Acceptable Use Policy, and Clean-Room IP guidelines to ensure compliance with reverse-engineering protections and non-infringement standards.

6. **Production Infrastructure (Database & Storage)**:
   - Provision a PostgreSQL 16 database and Redis instance.
   - Run `npx drizzle-kit migrate` to apply migrations and RLS policies.
   - Run `npx tsx src/db/seed.ts` to create the Pricing Config v1 and the superadmin account.
   - Configure your S3-compatible object storage (e.g., Cloudflare R2 or AWS S3).

7. **Sandbox & Workers**:
   - Ensure the worker machine runs Docker with gVisor (`runsc`) enabled.
   - Set `SANDBOX_RUNTIME=runsc`.
   - Start the worker daemon using `npm run worker` or via Docker Compose.

8. **End-to-End Live Verification**:
   - Run the full suite with live provider configurations:
     ```bash
     npm run e2e:live
     ```
