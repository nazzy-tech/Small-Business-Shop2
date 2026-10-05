# Zam's Beauty mobile app

An Expo app for iOS and Android. It uses the same Supabase project as the website:

- Reads the public `products` table.
- Calls the existing `cart` Edge Function for cart load, save, and clear.
- Calls the existing `create-order` Edge Function for checkout and confirmation emails.
- Signs in with the same Google provider and Supabase Auth user as the website.
- Persists signed-in carts by Supabase user ID and listens for Supabase Realtime updates.

## Run locally

1. Copy `.env.example` to `.env` and use the same project URL and publishable key as the web app. These are public client settings. Never put a Supabase secret/service-role key in the app.
2. From this directory run `npm install`, then `npx expo start`.
3. Use a development build on a phone or an Android/iOS simulator. Google OAuth deep links need the app's `zamsbeauty://auth/callback` scheme, so Expo Go's temporary URLs should not be used for a production OAuth configuration.

## Supabase setup

Apply the repo migrations and deploy the existing `cart` and `create-order` functions to the same Supabase project. The account cart migration enables owner-only reads and adds `cart_snapshots` to the `supabase_realtime` publication.

Add `zamsbeauty://auth/callback` to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs. Google should continue to use Supabase's provider callback URL configured in the existing web app.

The mobile app and website share a cart after a user signs into the same Google account in both. Guest carts stay local to their browser/device until sign-in; the first sign-in moves that device's guest cart into the user's shared cart if one does not exist yet.
