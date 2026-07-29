# 🌸 focus garden

A cozy, ADHD-friendly todo + focus timer. Capture thoughts fast, organize them
gently, pick a few tasks for a focus session, and stay in flow with a flexible
timer — all private and local to your browser.

**Live:** https://niceyraiyani.github.io/focus-garden/

## Why it exists

Built for one person's brain: capture-first so nothing gets lost, one clear
thing to focus on at a time, a parking lot for distracting thoughts, and gentle
productivity insights that never punish rest days.

## Features

- **Inbox-first capture** — every thought lands in the Inbox, organize into
  lists later. Optional due date, priority, notes, subtasks, tags, and a 1–5
  🌸 effort level.
- **Lists & tags** — drag-and-drop manual ordering plus non-destructive
  sort/filter (due date, priority, effort, newest).
- **Focus sessions** — build an ordered queue, work one active task at a time,
  switch when needed. A configurable minimum (default 30 min) gives a gentle
  nudge, then keeps counting while you're in flow.
- **Parking lot** — capture a distraction in one step; it's saved to your Inbox
  instantly and shown beside the timer.
- **Insights** — focused hours, completed tasks, daily/weekly comparison,
  time-by-list breakdown, session history, and workday-aware streaks.
- **Cozy cyber-cottagecore** — flat pastel design, light + dark themes, line-art
  flowers, an optional focus companion, and gentle celebrations. No gradients,
  fully keyboard accessible, respects reduced motion.
- **Local-first PWA** — installable, works offline, all data stays in your
  browser (IndexedDB). Export/import JSON backups any time.

## Privacy

No account, no server, no telemetry. Your data lives only in this browser
profile. Clearing site data erases it — so export a backup now and then
(Settings → Your data).

## Tech

React 19 · TypeScript · Vite · Dexie (IndexedDB) · dnd-kit · Vitest. Structured
behind a repository boundary with stable ids and timestamps so cloud sync can be
added later without rewriting the UI.

## Develop

```bash
npm install --legacy-peer-deps
npm run dev        # local dev server with hot reload
npm test           # run the test suite
npm run build      # type-check + production build
npm run lint       # oxlint
node scripts/gen-icons.mjs   # regenerate PWA icons from public/icon.svg
```

## Deploy

Pushing to `main` triggers the GitHub Actions workflow
(`.github/workflows/deploy.yml`), which tests, builds, and publishes to GitHub
Pages. The Vite `base` is `/focus-garden/`; override with the `VITE_BASE` env var
if hosting elsewhere.
