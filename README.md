# Zam's Beauty

A responsive beauty storefront and delivery checkout built with React, Vite and Supabase. The product catalogue, anonymous browser cart snapshots, orders and newsletter list live in Supabase/Postgres. Checkout validates prices against the database on the server before saving. Confirmation email delivery uses Mailgun from a Supabase Edge Function. Google sign-in uses the Supabase Auth Google provider.

## Run locally

1. Install Node.js 20 or later.
2. Run `npm install` and copy `.env.example` to `.env`.
3. Create a Supabase project; put its project URL and publishable/anon key in `.env`.
4. Run `npx supabase login`, `npx supabase link --project-ref YOUR_PROJECT_REF`, then `npx supabase db push`.
5. Set the Edge Function secrets in Supabase:

   ```sh
   npx supabase secrets set MAILGUN_DOMAIN=YOUR_MAILGUN_DOMAIN MAILGUN_API_KEY=YOUR_MAILGUN_API_KEY MAILGUN_FROM_EMAIL="Zam's Beauty <orders@YOUR_MAILGUN_DOMAIN>" SITE_URL=http://localhost:5173
   ```

6. Deploy the order and newsletter functions:

   ```sh
   npx supabase functions deploy create-order --no-verify-jwt
   npx supabase functions deploy subscribe --no-verify-jwt
   npx supabase functions deploy cart --no-verify-jwt
   ```

7. Run `npm run dev`.

The Supabase CLI injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into deployed functions. Never expose the service-role or Mailgun key in the frontend or commit them to the repository. `SITE_URL` controls the allowed browser origin for the Edge Functions; use the production origin when deployed.

## Google sign-in setup

1. In Google Cloud Console, create/select a project and configure the **OAuth consent screen** with the shop's name and contact details. Add authorized domains and test users as needed.
2. Create an **OAuth client ID** with application type **Web application**. Add your Supabase Auth callback URL as an authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
3. In Supabase Dashboard → **Authentication → Sign In / Providers → Google**, enable the provider and paste the Google client ID and client secret.
4. In Supabase Dashboard → **Authentication → URL Configuration**, set the site URL and add local (`http://localhost:5173/**`) and production site URLs to the redirect allow list.

The shop uses Supabase's OAuth flow; Google OAuth secrets stay in Supabase and are never shipped to the browser.

## Mailgun setup

Verify a sending domain in Mailgun and configure its DNS. Use an authorized sender for `MAILGUN_FROM_EMAIL`. Until Mailgun is configured, checkout still records the order and returns a successful order placement, but no email can be delivered; the order's `email_status` will be `failed` so it can be retried or followed up.

## Deployment

Deploy the Vite app to a static host (for example, Netlify or Vercel) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured. Set `SITE_URL` to the production origin using `npx supabase secrets set SITE_URL=https://YOUR_SHOP_DOMAIN`, and add that origin to Supabase Auth's allowed redirects. Apply migrations and deploy all three Edge Functions. Products, order records, cart snapshots and newsletter subscribers are stored in PostgreSQL. The browser keeps a cached cart copy for offline continuity.

## Checkout and fulfilment

The checkout calculates a ₦2,000 delivery charge below ₦50,000 and free delivery at ₦50,000 or above. This is a configured starting point and should be updated to reflect the shop's actual delivery pricing and coverage. Checkout currently records the customer and order and explains that the team will confirm payment and delivery; no card charge or payment-provider integration is configured.
