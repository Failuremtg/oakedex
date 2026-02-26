# Shopify → Shelly Webhook

When you **sell something on Shopify**, this app receives a webhook and turns on your **Shelly smart plugs** (e.g. a light and a motor-driven disco ball). It runs on **Vercel** so it stays online even when your PC is off.

## How it works

1. You configure a **Shopify webhook** (e.g. **Order creation** or **Order paid**) to send POST requests to your Vercel URL.
2. This app verifies the webhook with Shopify’s HMAC, then calls the **Shelly Cloud API** to turn on the configured plugs.
3. Both plugs are turned on (with a short delay between calls to respect Shelly’s 1 req/sec rate limit).

## Setup

### 1. Deploy to Vercel

- Push this folder to GitHub (or deploy from the `shopify-shelly-webhook` directory).
- In [Vercel](https://vercel.com), import the project and deploy.
- Note your project URL, e.g. `https://shopify-shelly-xxx.vercel.app`.

### 2. Environment variables (Vercel)

In **Vercel → Project → Settings → Environment Variables**, add:

| Variable | Description |
|----------|-------------|
| `SHOPIFY_WEBHOOK_SECRET` | Shopify **API secret key** (from your Shopify app or Admin → Apps → Develop apps → API credentials). Used to verify webhooks. |
| `SHELLY_AUTH_KEY` | From [Shelly Cloud](https://home.shelly.cloud) → **User** → **Authorization cloud key**. |
| `SHELLY_SERVER_URI` | From the same Shelly page: **Server URI** (e.g. `https://xxx.shelly.cloud`). |
| `SHELLY_DEVICE_ID_LIGHT` | Device ID of the plug for the **light** (Shelly Cloud → device → Device information). |
| `SHELLY_DEVICE_ID_DISCO` | Device ID of the plug for the **disco ball** motor. |

Redeploy after adding or changing env vars.

### 3. Shelly Cloud

- Create an account at [home.shelly.cloud](https://home.shelly.cloud) and add your plugs.
- In **User settings** get the **Authorization cloud key** and **Server URI**.
- For each plug, open **Device information** and copy the **Device ID** (string like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` or similar).

### 4. Shopify webhook

- **Shopify Admin** → **Settings** → **Notifications** → scroll to **Webhooks**.
- Or, if you use a custom app: **Apps** → **Develop apps** → your app → **Configuration** → **Webhooks**.

Add a webhook:

- **Event:** e.g. **Order creation** or **Order paid** (depending on when you want the light/disco to trigger).
- **Format:** JSON.
- **URL:**  
  `https://YOUR_VERCEL_PROJECT.vercel.app/api/webhooks/shopify-order`

Use the same **API secret** (from the app that “owns” the webhook) as `SHOPIFY_WEBHOOK_SECRET` in Vercel.

## Local development

```bash
cd shopify-shelly-webhook
npm install
cp .env.example .env.local
# Edit .env.local with your real values
npm run dev
```

Webhook URL locally: `http://localhost:3000/api/webhooks/shopify-order`  
(Shopify can’t reach localhost; use a tunnel like [ngrok](https://ngrok.com) if you want to test webhooks locally.)

## Optional: turn off after a delay

This version only **turns on** the plugs. To turn them off after e.g. 30 seconds you’d need either:

- A **cron job** on Vercel (e.g. every minute) that checks “last sale time” and turns off after a delay, or  
- A separate **scheduled function** (e.g. Vercel + external scheduler or another service) that calls a “turn off” endpoint after a delay.

If you want, we can add a simple “turn off after N seconds” flow using a second API route and a delay (e.g. with `waitUntil` and a follow-up request, or a small database/cache to track last sale time).

## Security

- **Never** commit `.env` or `.env.local`.  
- Keep `SHOPIFY_WEBHOOK_SECRET` and `SHELLY_AUTH_KEY` secret; only set them in Vercel (and in local `.env.local` for dev).
