# Cloud sync setup

lock.in works completely offline by default — your tasks live in your browser and never leave your
device. If you want to **sign in and sync across laptops**, connect a free Supabase project. It stays
free for personal use, and the data lives in *your* project, not anyone else's.

Takes about 5 minutes, once.

## 1. Create a free project

1. Go to [supabase.com](https://supabase.com) and sign up (free, no card).
2. Click **New project**. Give it any name, pick a region near you, and set a database password.
3. Wait ~1 minute for it to finish provisioning.

## 2. Create the table

Open **SQL Editor** in the sidebar, paste this in, and hit **Run**:

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

Row-level security means **only you** can read or write your own row — even though the anon key is
public, nobody else can touch your data.

## 3. Copy your keys

Go to **Project Settings → API** and copy:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon public** key — a long string starting with `eyJ...`

In lock.in, open **Settings → Account & cloud sync → Set up sync**, paste both, and hit **Connect**.

## 4. Turn on sign-in methods

In **Authentication → Providers**:

- **Email** is on by default. That's all you need for email + password accounts.
  - To skip the confirmation email while testing, turn off *Confirm email*.
- **Google** — toggle it on, then follow Supabase's prompt to create a Google OAuth client in the
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Paste the client ID and
  secret into Supabase, and add the callback URL Supabase shows you to the Google client's
  *Authorized redirect URIs*.

Finally, in **Authentication → URL Configuration**, add your app addresses to **Redirect URLs**:

```
https://niceyraiyani.github.io/lock.in/
http://localhost:5173/
```

## How syncing behaves

- Your whole dataset is stored as **one snapshot row per user**, and changes upload a few seconds
  after you make them.
- Signing in on a **new, empty device** downloads your cloud data.
- If a device has data and the cloud is empty, it **uploads**.
- If both changed since they last synced, lock.in **asks you** which version to keep instead of
  silently overwriting.
- Not signed in? Nothing leaves your browser. Export/Import backups still work exactly as before.
