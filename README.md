# Couple Gift Card — full setup

Stack: vanilla HTML/JS + Supabase (DB, Storage, Edge Functions) + Razorpay + Cloudflare Pages.
Same pattern as SurpriseIt: save-before-payment, paid only flips via server-side signature check.

## Flow
1. `index.html` — sender fills both names, 4-digit passcode, 3 photos, message → creates an unpaid row in `cards`, uploads photos to Storage.
2. `preview.html?id=...` — shows the live card inside an iframe with a tiled "PREVIEW" watermark overlay, plus **Edit** (back to index.html?id=) and **Generate Link — ₹99** buttons.
3. Generate Link → calls `create-order` Edge Function → Razorpay Checkout opens → on success, browser calls `verify-payment` Edge Function which checks the HMAC signature server-side and sets `paid = true`. Only then is the real link shown.
4. `card.html?id=...` — the actual gift: landing screen → 4-digit passcode → 3 gift boxes (cake / photos / letter) → back button returns to gifts. Blocked entirely if `paid` is false (except when `&preview=1`, used only by preview.html's iframe).

## 1. Supabase setup
1. Open your project → SQL Editor → paste the whole contents of `supabase.sql` → Run.
   This creates the `cards` table, RLS policies, and the `card-photos` storage bucket.
2. Install the CLI if you haven't: `npm install -g supabase`
3. Login + link your project:
   ```
   supabase login
   supabase link --project-ref iliakhaufgpjjtwamisn
   ```
4. Set secrets (get your Razorpay **Key Secret** from Razorpay Dashboard → Settings → API Keys — don't use the key id you gave me, that's public, you need the secret too):
   ```
   supabase secrets set RAZORPAY_KEY_ID=rzp_live_SzQtvFAXjL2NL5
   supabase secrets set RAZORPAY_KEY_SECRET=aMqLLhxnkpo82eF0qtsf9ZC2
   ```
5. Deploy both functions:
   ```
   supabase functions deploy create-order --no-verify-jwt
   supabase functions deploy verify-payment --no-verify-jwt
   ```
   (`--no-verify-jwt` because these are called with the anon key from the browser, not a logged-in user JWT.)


## 2. Frontend (Cloudflare Pages)
The whole `public/` folder is the site. Deploy it as-is:
```
cd public
npx wrangler pages deploy . --project-name=couplegift
```
Or just connect the repo in the Cloudflare dashboard with build output directory = `public`. No build step needed — it's plain HTML/JS.

## 3. Using it
- Go to `index.html`, fill the form, hit "Preview it"
- On `preview.html`, check it looks right, then hit "Generate link — ₹99"
- Pay with a real card/UPI (it's `rzp_live_...`, so this is real money — test with a small Razorpay test mode key first if you want to dry-run the flow, then swap back to live)
- Copy the final `card.html?id=...` link and send it

## Notes / things to add later (same pattern as your other projects)
- **Cleanup cron**: unpaid cards + their uploaded photos will pile up in storage. Add a `pg_cron` job + a small Edge Function to delete `cards` rows (and matching storage objects) where `paid = false` and `created_at < now() - interval '7 days'`, exactly like you did for SurpriseIt/Lumina.
- **Passcode**: stored in plaintext in the `cards` table, same as the Pinterest reference site. Fine for this use case (it's not protecting anything sensitive), but don't reuse it as a real password anywhere.
- **Amount**: currently hardcoded ₹99 (9900 paise) in the `amount` default on the table. Change the default in `supabase.sql` if you want a different price, or make it a query param later.
- **Domain/share previews**: if you want WhatsApp/Instagram link previews (like you fixed on SurpriseIt with the hash-fragment stripping issue), add Open Graph meta tags to `card.html` with a static teaser image — don't put the real photos in OG tags or the surprise leaks in the preview thumbnail.
# couple
