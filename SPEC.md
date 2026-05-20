# Spec: Laan — Personal Focus Web App

## Objective

A locally-deployed personal productivity web app. The user defines a focus session
(task description + duration), the app blocks distracting sites by toggling entries
in `/etc/hosts`, and tracks sessions for gamified progress. Single user (Steven),
runs on localhost, never deployed publicly.

## Tech Stack

| Layer        | Choice                          |
|--------------|---------------------------------|
| Frontend     | React 18 + Vite + Tailwind CSS  |
| Backend      | FastAPI (Python 3.11+) via `uv` |
| Database     | SQLite via SQLAlchemy (sync)    |
| Container    | Single Docker image             |
| Serving      | nginx (port 5000) + uvicorn (port 7070) via supervisord |
| Hosts mgmt   | hosts_agent.py on host → hosts_manager.sh (sudoers NOPASSWD) |
| Desktop app  | macOS .app bundle               |

## Commands

```bash
# One-time setup
sudo visudo   # add: steven ALL = NOPASSWD: /path/to/laan/hosts_manager.sh
chmod +x hosts_manager.sh hosts_agent.py

# Run hosts agent (Mac, outside Docker)
uv run hosts_agent.py

# Build Docker image
docker build -t laan .

# Run
docker compose up -d

# Or double-click Laan.app from Finder/Dock
```

## Ports

- Frontend (nginx):  5000
- Backend (uvicorn): 7070
- Hosts agent (Mac): 7072  ← not in Docker

## Project Structure

```
Laan/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── achievements.py
│   └── routers/
│       ├── sites.py
│       ├── sessions.py
│       └── stats.py
├── frontend/
│   ├── src/
│   │   ├── api/client.ts
│   │   ├── components/Layout.tsx
│   │   ├── hooks/useTimer.ts, useSession.ts
│   │   └── pages/SessionPage.tsx, BlocklistPage.tsx, HistoryPage.tsx
│   └── public/
│       └── alarm.mp3        ← user-provided
├── hosts_manager.sh          ← privileged, sudoers NOPASSWD
├── hosts_agent.py            ← runs on Mac host, PEP 723 inline deps
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── supervisord.conf
├── logo.svg
├── scripts/build_icon.sh
└── Laan.app/                 ← double-click launcher
```

## Core Features

### Focus Session
- Task name + optional description
- Duration in hours+minutes → break budget = ceil(minutes / 40) × 5-min breaks
- Start → sites blocked; End/Abandon → sites restored
- Main timer counts down; alarm on expiry (can go overtime)
- Break budget is a manual allowance — user decides when to use each break

### Site Blocker
- UI list of sites with toggle + add/remove
- `/etc/hosts` only touched at session start/end
- All entries tagged `# laan-block` so restore is surgical

### Gamification
- Daily streak (consecutive days with ≥1 completed session)
- Weekly goal (sessions/week, user-configurable)
- Achievements (7 defined, extensible)
- Session history table

## Boundaries

- **Always**: tag all `/etc/hosts` entries `# laan-block`; only expose API on 127.0.0.1
- **Ask first**: schema changes after first use, new dependencies
- **Never**: touch `/etc/hosts` lines not tagged `# laan-block`; expose on non-loopback

## Achievements

| Key          | Condition                              |
|--------------|----------------------------------------|
| first_laan   | First completed session                |
| dedicated    | 7-day streak                           |
| disciplined  | 30-day streak                          |
| century      | 100 total sessions                     |
| deep_work    | Single session ≥ 3 hours              |
| clean_week   | 5 sessions in one calendar week        |
| no_breaks    | 2h+ session with 0 breaks used         |
