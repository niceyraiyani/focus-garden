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

Row-level security means **only you** can read or write your own row. The anon key below is public
by design; without your login it can't touch your data.

---

## Part 3 — Connect lock.in (2 min)

7. Sidebar → **Project Settings** (gear, bottom left) → **API**.
8. Copy two values:
   - **Project URL** — like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`

   > Use the key labelled **anon public**, *not* `service_role`. The service key bypasses row-level
   > security and must never go in a browser.

9. Open lock.in → **Settings** → **Account & cloud sync** → **Use my own Supabase project**.
10. Paste both values and click **Connect**.

**Only want email + password?** You're done — click **Need an account?**, enter an email and
password, and you're syncing.

> This connects *this device only*. To make it the default for everyone, do Part 6 as well.

---

## Part 4 — Add "Continue with Google" (5 min, optional)

11. Supabase sidebar → **Authentication** → **Sign In / Providers** → **Google** → toggle **Enable**.
12. Leave that panel open — it shows a **Callback URL** like
    `https://abcdefgh.supabase.co/auth/v1/callback`. Copy it.
13. In a new tab open the
    [Google Cloud Console credentials page](https://console.cloud.google.com/apis/credentials).
    - Create a project if prompted (any name).
    - If it asks you to configure the **OAuth consent screen** first: choose **External**, fill in an
      app name and your email, then **Save and continue** through the remaining steps.
14. Click **+ Create Credentials** → **OAuth client ID**:
    - **Application type:** Web application
    - **Authorized redirect URIs** → **+ Add URI** → paste the callback URL from step 12
    - Click **Create**
15. Copy the **Client ID** and **Client Secret** into the Supabase Google provider panel → **Save**.

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
| `VITE_SUPABASE_ANON_KEY` | your **anon public** key from step 8 |

18. Re-run the deploy: **Actions** → **Deploy to GitHub Pages** → **Run workflow**.

From then on, anyone opening the app sees **Continue with Google** straight away, with
*Use my own Supabase project* tucked underneath for anyone who prefers their own.

> **Variables, not Secrets.** The anon key is public by design — it's compiled into the JavaScript
> the browser downloads, so it can't be hidden, and it doesn't need to be. Row-level security is what
> keeps each person's data private. Never put the `service_role` key here.

For local development, copy `.env.example` to `.env.local` and fill in the same two values.
`.env*` files are gitignored so real keys stay out of the repo.

---

## Test it

**Settings → Account & cloud sync → Continue with Google.** After signing in you should see your
email and **"Synced just now"**.

To bring in another device: open the same address there, sign in with the same account, and your
tasks download automatically.

---

## How syncing behaves

- Your whole dataset is stored as **one snapshot row per user**, uploaded a few seconds after you
  make a change.
- Signing in on a **new, empty device** downloads your cloud data.
- A device with data and an empty cloud **uploads**.
- If both sides changed since they last synced, lock.in **asks which version to keep** instead of
  silently overwriting.
- Signed out, nothing leaves your browser. Export/Import backups still work exactly as before.

---

## Troubleshooting

| What you see | Fix |
| --- | --- |
| `redirect_uri_mismatch` | The URI in step 14 doesn't exactly match the Supabase callback from step 12. |
| "URL not allowed" / redirect refused | Redo step 16 — the address needs the trailing `/`. |
| Sign-up appears to do nothing | Authentication → Providers → Email → turn off *Confirm email*, or check your inbox for the confirmation mail. |
| `relation "snapshots" does not exist` | The SQL in step 6 didn't run. Run it again and confirm "Success". |
| `new row violates row-level security policy` | The three policies in step 6 didn't all get created — re-run that block. |
| Stuck on "Syncing…" | Open the browser console; a 401 usually means the anon key was pasted incompletely. |
