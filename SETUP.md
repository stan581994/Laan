# Laan — One-Time Setup

## 1. Sudoers entry (allow hosts_manager.sh to run without password)

```bash
sudo visudo
```

Add this line at the end (replace `steven` with your username and update the path):

```
steven ALL = NOPASSWD: /Users/steven/Documents/playground/Laan/hosts_manager.sh
```

Make the script executable:

```bash
chmod +x /Users/steven/Documents/playground/Laan/hosts_manager.sh
chmod +x /Users/steven/Documents/playground/Laan/hosts_agent.py
```

## 2. Install uv (if not already installed)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## 3. Build the Docker image

```bash
cd /Users/steven/Documents/playground/Laan
docker build -t laan .
```

## 4. Build the app icon (requires the image to be built first)

```bash
chmod +x scripts/build_icon.sh
./scripts/build_icon.sh
```

## 5. Add your alarm sound

Copy your alarm sound file to:

```
frontend/public/alarm.mp3
```

Supported formats: `.mp3`, `.wav`, `.ogg`

## 6. Launch

Double-click `Laan.app` in Finder, or drag it to your Dock.

The app launcher will:
1. Start `hosts_agent.py` (if not already running)
2. Start the Docker container (if not already running)
3. Wait for the server to be ready
4. Open http://localhost:5000 in your browser

## Ports

| Service      | Port  |
|--------------|-------|
| Frontend     | 5000  |
| Backend API  | 7070  |
| Hosts agent  | 7072  |

## Data persistence

Session history is stored in a Docker named volume `laan-data`.
It persists across container restarts and rebuilds.
