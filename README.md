# TITANIUM v12.0

Institutional Trading Terminal

## Setup Instructions

### 1. Start Backend (The Engine)
Open a terminal and run:

```bash
cd backend
pip install -r requirements.txt
python main.py
```

This starts the WebSocket server on `ws://localhost:8000/ws` and API at `http://localhost:8000`.

### 2. Start Frontend (The Terminal)
Open a new terminal and run:

```bash
npm install
npm run dev
```

### Troubleshooting
- If you see `WS Connection Error`, ensure `main.py` is running and port 8000 is not blocked.
- The logs in the terminal will show "Client Connected" when the frontend successfully links to the backend.
