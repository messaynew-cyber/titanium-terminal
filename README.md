# TITANIUM v12.0

Institutional Trading Terminal

## Quick Start for Beginners

### 1. Initialize Git (First Time Only)
If you have not set up the version history yet, do this first:

**How to open the Terminal (CMD):**
1. Open this folder in File Explorer.
2. Click the address bar at the top.
3. Type `cmd` and hit **Enter**.

**Run these commands:**
```bash
git init
git add .
git commit -m "Initial setup"
```

### 2. Start Backend (The Engine)
This handles the math and data simulation.

```bash
cd backend
# If you don't have these installed yet, just try running the python command
pip install -r requirements.txt
python main.py
```
*Keep this window open!*

### 3. Start Frontend (The App)
Open a **new** terminal window (repeat the CMD step above), then run:

```bash
npm install
npm run dev
```

---

## Troubleshooting
- **'git' is not recognized**: Download and install [Git for Windows](https://git-scm.com/download/win).
- **'npm' is not recognized**: Download and install [Node.js](https://nodejs.org/).
- **'python' is not recognized**: Download and install [Python](https://www.python.org/).
- **WS Connection Error**: Ensure the backend window is still running and didn't close.
