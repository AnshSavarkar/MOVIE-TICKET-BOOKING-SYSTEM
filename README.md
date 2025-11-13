Distributed Movie Ticket Booking System

A full-stack, BookMyShow-like ticket booking app demonstrating distributed computing concepts: RPC (RMI-style), multithreading, clock synchronization, leader election, replication and consistency models, and load balancing.

Tech Stack
- Backend: FastAPI (Python), SQLite (for demo; swap to MySQL/Mongo easily)
- Frontend: React + Vite + Tailwind CSS
- Realtime: WebSocket
- Load Balancer: Python process simulating multiple backend nodes

Project Structure
```
movie-ticket-booking-system/
├── backend/
│   ├── server_main.py
│   ├── load_balancer.py
│   ├── requirements.txt
│   ├── election/
│   │   ├── bully.py
│   │   └── ring.py
│   ├── clock_sync/
│   │   ├── cristian.py
│   │   ├── berkeley.py
│   │   ├── lamport.py
│   │   └── vector.py
│   ├── consistency/
│   │   ├── strict.py
│   │   ├── sequential.py
│   │   ├── causal.py
│   │   └── eventual.py
│   ├── replication/
│   │   └── manager.py
│   ├── database/
│   │   ├── schema.sql
│   │   └── db.py
│   └── utils/
│       ├── multithread_handler.py
│       ├── rmi_interface.py
│       └── network_manager.py
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── api/api.js
│       ├── index.css
│       ├── main.jsx
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── MovieDetails.jsx
│       │   ├── SeatSelection.jsx
│       │   ├── Confirmation.jsx
│       │   └── AdminDashboard.jsx
│       └── components/
│           ├── Navbar.jsx
│           ├── MovieCard.jsx
│           ├── SeatGrid.jsx
│           └── MetricsCard.jsx
```

Quick Start

Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python server_main.py --init-db
uvicorn server_main:app --host 127.0.0.1 --port 8001 --reload
uvicorn server_main:app --host 127.0.0.1 --port 8002 --reload
uvicorn server_main:app --host 127.0.0.1 --port 8003 --reload
python load_balancer.py --strategy round_robin --nodes 127.0.0.1:8001,127.0.0.1:8002,127.0.0.1:8003
```

Frontend
```bash
cd frontend
npm install
npm run dev
```

Distributed Features Overview
- Experiment 1 (RPC/RMI): `utils/rmi_interface.py` provides RPC-like client with typed method calls to nodes.
- Experiment 2 (Multithreading): Seat booking uses thread locks; feedback chat demo uses threaded handler (`utils/multithread_handler.py`).
- Experiment 3 (Clock Sync): Cristian and Berkeley time sync endpoints; logical ordering via Lamport clocks; vector clocks for causal ops.
- Experiment 4 (Election): Bully and Ring election algorithms with coordinator tracking in memory.
- Experiment 5 (Consistency/Replication): Multiple models exposed at `/consistency/test` and used for replica updates via `replication/manager.py`.
- Experiment 6 (Load Balancing): Strategies in `load_balancer.py`: round-robin, random, least-connections, weighted-response-time + metrics.

Environment
- Default DB: SQLite file `movie.db` in `backend/` for ease of running. Swap to MySQL/Mongo by changing `database/db.py` and `requirements.txt`.
- CORS enabled for frontend dev.

Notes
- Local simulation of distributed concepts via multiple FastAPI instances.
- Admin dashboard shows metrics and lets you trigger elections.

License
MIT
