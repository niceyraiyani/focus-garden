# Cloud sync setup

> **Just using lock.in?** You don't need any of this. Open **Settings → Account & cloud sync** and
> sign in — that's it. This guide is for whoever *runs* the app.

lock.in works completely offline by default — tasks live in the browser and never leave the device.
Connecting a free Supabase project turns on **sign in + sync across devices**.

You have two options:

| | Set up once by the owner | Each person brings their own |
| --- | --- | --- |
| Setup for users | **None** — click and go | ~10 minutes each |
| Whose project holds the data | The owner's | Their own |
| Who can read a user's tasks | **Only that user** (row-level security) | Only that user |

**Parts 1–5 set up the project. Part 6 bakes it into the deployed app** so everyone gets zero-setup
sign-in. Skip Part 6 and each person can still connect their own project from Settings →
*Use my own Supabase project*.

Takes about 5–10 minutes, once.

---

## Part 1 — Create your project (2 min)

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign in with GitHub.
2. Click **New project**.
3. Fill in:
   - **Name:** `lockin`
   - **Database Password:** click *Generate* (you won't need it day to day — save it anyway)
   - **Region:** whichever is closest to you
4. Click **Create new project** and wait ~1 minute while it provisions.

---

## Part 2 — Create the table (1 min)

5. Sidebar → **SQL Editor** → **New query**.
6. Paste this in and click **Run**:

```sql
create table if not exists public.snapshots (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  device text,
  -- Bumped on every write. A device must name the revision it is replacing,
  -- so a stale device can't overwrite newer work from another one.
  rev bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.snapshots enable row level security;

create policy "own snapshot select" on public.snapshots
  for select using (auth.uid() = user_id);
create policy "own snapshot insert" on public.snapshots
  for insert with check (auth.uid() = user_id);
create policy "own snapshot update" on public.snapshots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

You should see **"Success. No rows returned"** — that's what we want.

Row-level security means **only you** can read or write your own row. The public key below is public
by design; without your login it can't touch your data.

> **Already created this table without `rev`?** Add the column with:
> ```sql
> alter table public.snapshots add column if not exists rev bigint not null default 1;
> ```

---

## Part 3 — Connect lock.in (2 min)

7. Sidebar → **Project Settings** (gear, bottom left) → **API Keys**.
8. Copy two values:
   - **Project URL** — like `https://abcdefgh.supabase.co`. If it isn't on this page, it's under
     **Project Settings → Data API**, or you can rebuild it from the project ref shown in your
     dashboard address bar: `https://<project-ref>.supabase.co`.
   - The **public** key. Supabase has two generations of these and *either* works:
     - new format — **Publishable key**, starts `sb_publishable_…`
     - legacy — **anon public**, a long string starting `eyJ…`

   > Never use **Secret key** (`sb_secret_…`) or the legacy `service_role`. Those bypass row-level
   > security entirely and must never reach a browser.

9. Open lock.in → **Settings** → **Account & cloud sync** → **Use my own Supabase project**.
10. Paste both values and click **Connect**.

**Only want email + password?** You're done — click **Need an account?**, enter an email and
password, and you're syncing. See *Turn off email confirmation* below first; it saves a
detour.

> This connects *this device only*. To make it the default for everyone, do Part 6 as well.

---

## Part 3b — Turn off email confirmation (30 sec, recommended)

Out of the box Supabase emails you a confirmation link before a new account works. The link
returns to your project's **Site URL**, which defaults to `localhost:3000` — so you confirm
successfully and then land on a dead page. For a personal app it's pure friction.

**Authentication → Sign In / Providers → Email → turn off *Confirm email* → Save.**

Sign-up then works instantly. (If you'd rather keep confirmation on, set
**Authentication → URL Configuration → Site URL** to
`https://niceyraiyani.github.io/lock.in/` first, so the link lands somewhere real.)

> Once your own account exists, consider turning **off** *Allow new users to sign up* on the
> same screen. The app is public and the key ships in the JavaScript, so anyone who finds it
> could otherwise create an account in your project. Row-level security means they could never
> see your data — but there's no reason to host strangers. Turning it off doesn't affect you:
> **signing in on a new device still works**, it just blocks new accounts.

---

## Part 4 — Add "Continue with Google" (5 min, optional)

Google reorganised this console — it's now **Google Auth Platform**, not *APIs & Services →
Credentials*. Email + password works without any of this.

11. Supabase sidebar → **Authentication** → **Sign In / Providers** → **Google** → toggle **Enable**.
12. Leave that panel open. Copy its **Callback URL** — `https://<project-ref>.supabase.co/auth/v1/callback`.
13. In a new tab open the [Google Cloud Console](https://console.cloud.google.com/) and create a
    project (any name).
14. Go to **Google Auth Platform → Branding**. Set an app name and your email, then save. Under
    **Authorized domains** add `supabase.co`.
15. **Google Auth Platform → Audience**: choose **External**. It starts in *Testing*, where only
    named accounts can sign in — so click **Add users** and add your own Google address.

    > Skipping this is the usual cause of "Access blocked: app has not completed verification".
    > For a personal app, staying in Testing with yourself as the only user is fine and avoids
    > Google's verification review entirely.

16. **Google Auth Platform → Clients** → **Create client**:
    - **Application type:** Web application
    - **Authorized redirect URIs** → **Add URI** → paste the callback URL from step 12.
      This is the *Supabase* callback, not your app's address — a very easy one to get wrong.
    - **Authorized JavaScript origins** → add `https://niceyraiyani.github.io`
    - **Create**
17. Copy the **Client ID** and **Client Secret** into the Supabase Google panel → **Save**.

lock.in asks your project which providers are enabled, so the **Continue with Google** button
appears by itself on the next page load. No redeploy needed.

---

## Part 5 — Allow your app's address (30 sec) — don't skip

16. Supabase → **Authentication** → **URL Configuration** → **Redirect URLs** → **Add URL**:

```
https://niceyraiyani.github.io/lock.in/
```

Add `http://localhost:5173/` too if you run the app locally.

> The trailing slash matters. lock.in redirects back to `window.location.origin + BASE_URL`, which is
> exactly `https://niceyraiyani.github.io/lock.in/`. A missing slash is the most common cause of
> "redirect not allowed".

---

## Part 6 — Make it the default for everyone (1 min)

So nobody else has to repeat any of this, bake the project into the deployed build.

17. On GitHub: **Settings** → **Secrets and variables** → **Actions** → **Variables** tab →
    **New repository variable**. Add both:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | your Project URL from step 8 |
| `VITE_SUPABASE_ANON_KEY` | your public key from step 8 (`sb_publishable_…` or legacy `eyJ…`) |

18. Re-run the deploy: **Actions** → **Deploy to GitHub Pages** → **Run workflow**.

From then on, anyone opening the app sees **Continue with Google** straight away, with
*Use my own Supabase project* tucked underneath for anyone who prefers their own.

> **Variables, not Secrets.** The public key is public by design — it's compiled into the JavaScript
> the browser downloads, so it can't be hidden, and it doesn't need to be. Row-level security is what
> keeps each person's data private. Never put the `service_role` key here.

For local development, copy `.env.example` to `.env.local` and fill in the same two values.
`.env*` files are gitignored so real keys stay out of the repo.

---

## Test it

**Settings → Account & cloud sync.**

1. **First device:** click **Need an account?**, enter an email and a password, then
   **Create account**. You should see your email and **"Synced just now"**.
2. **Every other device:** open the same address, same screen, enter the same details and
   click **Sign in**. Your tasks download automatically.

Only providers your project has enabled are offered, so if you don't see **Continue with
Google**, Google isn't switched on (Part 4) — email and password work regardless.

To move an existing device's data up: sign in there *first*. A device with tasks and an empty
cloud uploads; a signed-in empty device downloads.

---

## How syncing behaves

- Your whole dataset is stored as **one snapshot row per user**, uploaded a few seconds after you
  make a change.
- Signing in on a **new, empty device** downloads your cloud data.
- A device with data and an empty cloud **uploads**.
- Every upload names the revision it's replacing. If another device wrote first, the upload is
  **refused rather than overwriting it**, and lock.in asks you which copy to keep.
- Deleting things counts as a change, so clearing your tasks on one device is never mistaken for a
  fresh install and quietly undone by the old cloud copy.
- Signed out, nothing leaves your browser. Export/Import backups still work exactly as before.

---

## Troubleshooting

| What you see | Fix |
| --- | --- |
| `redirect_uri_mismatch` | The URI in step 16 doesn't exactly match the Supabase callback from step 12. It's the *Supabase* callback, not your app's address. |
| `Access blocked: … has not completed verification` | Your Google app is in *Testing* and your account isn't listed — add it under Google Auth Platform → **Audience** → *Test users* (step 15). |
| "URL not allowed" / redirect refused | Redo step 16 — the address needs the trailing `/`. |
| Sign-up appears to do nothing | Authentication → Providers → Email → turn off *Confirm email*, or check your inbox for the confirmation mail. |
| `relation "snapshots" does not exist` | The SQL in step 6 didn't run. Run it again and confirm "Success". |
| `column "rev" does not exist` | The table predates the revision check — run the `alter table … add column rev` snippet under step 6. |
| `new row violates row-level security policy` | The three policies in step 6 didn't all get created — re-run that block. |
| Stuck on "Syncing…" | Open the browser console; a 401 usually means the public key was pasted incompletely. |
| `Invalid API key` | You pasted a **Secret** key (`sb_secret_…` / `service_role`) instead of the publishable/anon one, or only part of it. |
