from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import asyncio
import argparse
import time
import os
import aiosqlite
import logging
from google.oauth2 import id_token
from google.auth.transport import requests
 

from database.db import Database
from utils.multithread_handler import SeatLockManager
from utils.network_manager import NodeRegistry
from replication.manager import ReplicationManager


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: Optional[str] = "user"


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    token: str


class AddMovieRequest(BaseModel):
    title: str
    poster_url: Optional[str] = None
    description: Optional[str] = None


class AddShowRequest(BaseModel):
    movie_id: int
    theatre: str
    show_time: str
    rows: int
    cols: int


class BookRequest(BaseModel):
    show_id: int
    seats: List[str]
    user_id: int


class BookGroupRequest(BaseModel):
    show_id: int
    seats: List[str]
    user_id: int
    snacks: Optional[Dict[str, int]] = None


app = FastAPI(title="Distributed Movie Ticket Booking System")

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = Database(db_path=os.path.join(os.path.dirname(__file__), "movie.db"))
seat_lock_manager = SeatLockManager()
node_registry = NodeRegistry()
replication_manager = ReplicationManager(node_registry=node_registry)


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/lb/metrics")
async def lb_metrics() -> Dict[str, Dict]:
    """Return simulated load balancer metrics for demo"""
    import random
    # Simulate metrics for 3 backend servers
    return {
        "requests_served": {
            "8001": random.randint(100, 500),
            "8002": random.randint(100, 500),
            "8003": random.randint(100, 500)
        },
        "avg_response_ms": {
            "8001": round(random.uniform(10, 100), 2),
            "8002": round(random.uniform(10, 100), 2),
            "8003": round(random.uniform(10, 100), 2)
        },
        "conn_counts": {
            "8001": random.randint(1, 50),
            "8002": random.randint(1, 50),
            "8003": random.randint(1, 50)
        }
    }


# Global state to track server health for demo
server_health = {
    "8001": {"status": "healthy", "last_heartbeat": time.time()},
    "8002": {"status": "healthy", "last_heartbeat": time.time()},
    "8003": {"status": "healthy", "last_heartbeat": time.time()}
}


@app.get("/replication/status")
async def replication_status() -> Dict:
    """Get replication and server health status"""
    import random
    current_time = time.time()
    
    # Update last_heartbeat for healthy servers
    for server_id in server_health:
        if server_health[server_id]["status"] == "healthy":
            server_health[server_id]["last_heartbeat"] = current_time
    
    # Count healthy servers
    healthy_servers = sum(1 for s in server_health.values() if s["status"] == "healthy")
    
    return {
        "total_servers": len(server_health),
        "healthy_servers": healthy_servers,
        "failed_servers": len(server_health) - healthy_servers,
        "replication_enabled": True,
        "replication_factor": 3,
        "servers": {
            server_id: {
                "status": info["status"],
                "uptime_seconds": round(current_time - info["last_heartbeat"], 2) if info["status"] == "healthy" else "N/A",
                "replica_lag_ms": round(random.uniform(5, 50), 2) if info["status"] == "healthy" else "N/A"
            }
            for server_id, info in server_health.items()
        },
        "data_synchronized": healthy_servers >= 2,
        "can_handle_failure": healthy_servers >= 2
    }


@app.post("/replication/simulate-failure")
async def simulate_server_failure(server_id: str) -> Dict:
    """Simulate a server failure"""
    if server_id not in server_health:
        raise HTTPException(status_code=404, detail=f"Server {server_id} not found")
    
    server_health[server_id]["status"] = "failed"
    
    healthy_count = sum(1 for s in server_health.values() if s["status"] == "healthy")
    
    return {
        "message": f"Server {server_id} marked as failed",
        "server_id": server_id,
        "remaining_healthy_servers": healthy_count,
        "system_operational": healthy_count >= 1,
        "failover_triggered": True,
        "redirecting_to": [s_id for s_id, info in server_health.items() if info["status"] == "healthy"][:1]
    }


@app.post("/replication/recover")
async def recover_server(server_id: str) -> Dict:
    """Recover a failed server"""
    if server_id not in server_health:
        raise HTTPException(status_code=404, detail=f"Server {server_id} not found")
    
    server_health[server_id]["status"] = "healthy"
    server_health[server_id]["last_heartbeat"] = time.time()
    
    return {
        "message": f"Server {server_id} recovered successfully",
        "server_id": server_id,
        "status": "healthy",
        "syncing_data": True,
        "sync_progress": "100%"
    }


@app.on_event("startup")
async def _startup():
    db_file = os.path.join(os.path.dirname(__file__), "movie.db")
    # Always run migrations/schema to ensure any new tables/columns are created.
    # Only seed when the DB file did not previously exist.
    existed = os.path.exists(db_file)
    await db.init()
    if not existed:
        await db.seed()
    # Ensure each movie has at least a few shows so frontend can list theatres/times.
    try:
        movies = await db.get_movies()
        # default theatres and times (will be reused across movies if none exist)
        default_theatres = ['PVR Koramangala', 'INOX Whitefield', 'Carnival MG Road', 'PVR Orion Mall']
        default_times = ['2025-11-14T10:30:00', '2025-11-14T14:45:00', '2025-11-14T19:00:00', '2025-11-14T22:20:00']
        for m in movies:
            shows = await db.get_shows(m['id'])
            if not shows or len(shows) == 0:
                # create up to 4 shows for this movie
                for i in range(min(len(default_theatres), len(default_times))):
                    try:
                        await db.add_show(m['id'], default_theatres[i], default_times[i], 8, 12)
                    except Exception:
                        pass
    except Exception:
        # ignore; this is best-effort to populate demo shows
        pass


@app.post("/init")
async def init_db():
    await db.init()
    await db.seed()
    return {"status": "initialized"}


@app.post("/auth/register")
async def register(req: RegisterRequest):
    try:
        user_id = await db.create_user(req.email, req.password, req.name, req.role or 'user')
        return {"user_id": user_id, "role": req.role or 'user'}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.verify_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"user_id": user["id"], "name": user["name"], "role": user.get("role", "user")}


@app.post("/auth/google")
async def google_auth(req: GoogleAuthRequest):
    """Authenticate user with Google OAuth token"""
    try:
        # Verify the Google token
        # You'll need to set your Google Client ID here
        GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "YOUR_GOOGLE_CLIENT_ID")
        
        idinfo = id_token.verify_oauth2_token(
            req.token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Extract user info from Google token
        email = idinfo.get('email')
        name = idinfo.get('name', email.split('@')[0])
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not found in token")
        
        # Check if user exists, if not create a new user
        user = await db.get_user_by_email(email)
        
        if not user:
            # Create new user with Google auth
            user_id = await db.create_user(email, None, name, 'user', is_google_user=True)
            return {"user_id": user_id, "name": name, "role": "user"}
        else:
            return {"user_id": user["id"], "name": user["name"], "role": user.get("role", "user")}
            
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@app.get("/movies")
async def list_movies():
    return await db.get_movies()


@app.post("/admin/movies")
async def add_movie(req: AddMovieRequest):
    movie_id = await db.add_movie(req.title, req.poster_url or "", req.description or "")
    return {"movie_id": movie_id}


@app.delete("/admin/movies/{movie_id}")
async def delete_movie(movie_id: int):
    await db.delete_movie(movie_id)
    return {"deleted": True}


@app.get("/shows/{movie_id}")
async def list_shows(movie_id: int):
    return await db.get_shows(movie_id)


@app.post("/admin/shows")
async def add_show(req: AddShowRequest):
    show_id = await db.add_show(req.movie_id, req.theatre, req.show_time, req.rows, req.cols)
    return {"show_id": show_id}


@app.delete("/admin/shows/{show_id}")
async def delete_show(show_id: int):
    await db.delete_show(show_id)
    return {"deleted": True}


@app.get("/seats/{show_id}")
async def get_seats(show_id: int):
    return await db.get_seats(show_id)


@app.post("/book")
async def book_tickets(req: BookRequest):
    # Experiment 2: Multithreading and synchronization to prevent double-booking
    async with seat_lock_manager.async_lock(req.show_id, req.seats):
        available = await db.check_seats_available(req.show_id, req.seats)
        if not available:
            raise HTTPException(status_code=409, detail="One or more seats already booked")
        booking_id = await db.create_booking(req.user_id, req.show_id, req.seats)
        # Experiment 5: Replication (propagate updates)
        x=await replication_manager.propagate_booking({
            "booking_id": booking_id,
            "user_id": req.user_id,
            "show_id": req.show_id,
            "seats": req.seats,
            "timestamp": time.time(),
        })
        await notify_seat_updates(req.show_id)
        print("x",x)
        return {"booking_id": booking_id}


@app.post('/book_group')
async def book_group(req: BookGroupRequest):
    # lock seats
    async with seat_lock_manager.async_lock(req.show_id, req.seats):
        available = await db.check_seats_available(req.show_id, req.seats)
        if not available:
            raise HTTPException(status_code=409, detail="One or more seats already booked")
        # compute seats total using a simple pricing model: regular=200, premium=350, recliner=500
        # Seat naming uses unambiguous prefixes: S=Standard(regular), P=Premium, R=Recliner.
        # Any label without P/R prefix is treated as regular for backward compatibility.
        seat_total = 0.0
        for s in req.seats:
            # infer type by prefix (R=Recliner, P=Premium) else Regular
            t = 'regular'
            if s.upper().startswith('R'):
                t = 'recliner'
            elif s.upper().startswith('P'):
                t = 'premium'
            if t == 'regular':
                seat_total += 200
            elif t == 'premium':
                seat_total += 350
            elif t == 'recliner':
                seat_total += 500
        snacks = req.snacks or {}
        snacks_total = 0.0
        # example snack prices
        SNACK_PRICES = {'popcorn': 120, 'soda': 60, 'nachos': 150, 'combo': 250}
        for k, qty in snacks.items():
            price = SNACK_PRICES.get(k.lower(), 0)
            snacks_total += price * int(qty)
        total = seat_total + snacks_total
        # create booking group
        import json
        group_id = await db.create_booking_group(req.user_id, req.show_id, req.seats, json.dumps(snacks), total)
        # generate QR containing group_id and total
        payload = f"booking_group:{group_id};user:{req.user_id};show:{req.show_id};total:{total}"
        try:
            import qrcode
            import io
            img = qrcode.make(payload)
            bio = io.BytesIO()
            img.save(bio, format='PNG')
            bio.seek(0)
            import base64
            b64 = base64.b64encode(bio.read()).decode('ascii')
            await db.set_group_qr(group_id, b64)
        except Exception as e:
            logging.exception("Failed to generate or store QR for booking group %s", group_id)
            # Fallback: try an external QR generation service (QuickChart) to avoid requiring
            # the `qrcode` package in the runtime. This fetches a PNG and stores its base64.
            try:
                logging.info("QR generation fallback: attempting QuickChart for group %s", group_id)
                import httpx
                from urllib.parse import quote
                payload_enc = quote(payload)
                qurl = f"https://quickchart.io/qr?text={payload_enc}&size=500&format=png"
                resp = httpx.get(qurl, timeout=10.0)
                logging.info("QuickChart response: %s", getattr(resp, 'status_code', 'no-status'))
                if resp.status_code == 200:
                    import base64
                    b64 = base64.b64encode(resp.content).decode('ascii')
                    await db.set_group_qr(group_id, b64)
                else:
                    logging.warning("QuickChart returned non-200 for group %s: %s", group_id, resp.status_code)
                    b64 = ''
            except Exception:
                logging.exception("QuickChart fallback failed for booking group %s", group_id)
                b64 = ''
        # notify seats
        await notify_seat_updates(req.show_id)
        return {'group_id': group_id, 'total': total, 'qr_base64': b64}


@app.get("/bookings/{user_id}")
async def my_bookings(user_id: int):
    return await db.get_user_bookings(user_id)


@app.get('/booking_group/{group_id}')
async def get_booking_group(group_id: int):
    """Return booking group record (includes qr base64 if generated)."""
    group = await db.get_booking_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Booking group not found")
    return group


active_ws: Dict[int, List[WebSocket]] = {}


async def notify_seat_updates(show_id: int):
    seats = await db.get_seats(show_id)
    for ws in list(active_ws.get(show_id, [])):
        try:
            await ws.send_json({"type": "seat_update", "show_id": show_id, "seats": seats})
        except Exception:
            pass


@app.websocket("/ws/seats/{show_id}")
async def ws_seats(websocket: WebSocket, show_id: int):
    await websocket.accept()
    active_ws.setdefault(show_id, []).append(websocket)
    try:
        await websocket.send_json({"type": "hello", "show_id": show_id})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        active_ws[show_id].remove(websocket)


# Experiment 3: Clock Synchronization (simple stubs)
@app.get("/clock/cristian")
async def cristian_time():
    server_time = time.time()
    return {"server_time": server_time}


@app.get("/clock/lamport")
async def lamport():
    # Placeholder lamport clock increment per request
    node_registry.increment_lamport()
    return {"lamport": node_registry.lamport_clock}


# Experiment 4: Election Controls
@app.post("/election/start")
async def start_election(algorithm: str = "bully"):
    leader = node_registry.run_election(algorithm)
    return {"leader": leader, "algorithm": algorithm}


# Experiment 5: Consistency test endpoint
@app.get("/consistency/test")
async def consistency_test(model: str = "eventual"):
    result = await replication_manager.simulate_consistency(model)
    return result


@app.get("/movies/{movie_id}/poster")
async def movie_poster(movie_id: int):
    # Return the poster file stored on disk for the movie, if available
    async with aiosqlite.connect(db.db_path) as adb:
        adb.row_factory = aiosqlite.Row
        cur = await adb.execute("SELECT poster_blob, poster_mime, poster_path, poster_url FROM movies WHERE id=?", (movie_id,))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Movie not found")
        poster_blob = row["poster_blob"]
        poster_mime = row["poster_mime"] or ''
        poster_path = row["poster_path"]
        # prefer serving blob from DB if present
        if poster_blob:
            return Response(content=poster_blob, media_type=poster_mime or 'image/jpeg')
        # otherwise serve from filesystem if poster_path exists
        if not poster_path:
            # no local poster saved
            raise HTTPException(status_code=404, detail="Poster not found")
        full = os.path.join(os.path.dirname(__file__), poster_path)
        if not os.path.exists(full):
            raise HTTPException(status_code=404, detail="Poster file missing")
        # guess content type by extension
        import mimetypes
        ctype, _ = mimetypes.guess_type(full)
        return FileResponse(full, media_type=ctype or 'application/octet-stream')


@app.post('/admin/fetch_posters')
async def admin_fetch_posters():
    # Download posters for movies that have poster_url but no poster_path yet.
    count = 0
    static_dir = os.path.join(os.path.dirname(__file__), 'static', 'posters')
    os.makedirs(static_dir, exist_ok=True)
    import httpx
    async with aiosqlite.connect(db.db_path) as conn:
        conn.row_factory = aiosqlite.Row
        cur = await conn.execute("SELECT id, poster_url, title FROM movies WHERE poster_url IS NOT NULL AND (poster_path IS NULL OR poster_path='')")
        import urllib.parse
        rows = await cur.fetchall()
        for r in rows:
            mid = r['id']
            url = r.get('poster_url') or ''
            title = r.get('title') or str(mid)
            tried_urls = []
            success = False

            # helper to attempt download from a URL
            def _try_download(u):
                try:
                    resp = httpx.get(u, timeout=15.0, follow_redirects=True)
                    tried_urls.append((u, resp.status_code))
                    if resp.status_code == 200 and resp.content:
                        ct = resp.headers.get('content-type','')
                        ext = 'jpg'
                        if 'png' in ct:
                            ext = 'png'
                        elif 'jpeg' in ct:
                            ext = 'jpg'
                        elif 'webp' in ct:
                            ext = 'webp'
                        filename = f"{mid}.{ext}"
                        full = os.path.join(static_dir, filename)
                        with open(full, 'wb') as fh:
                            fh.write(resp.content)
                        rel = os.path.join('static','posters', filename)
                        return rel
                except Exception:
                    tried_urls.append((u, 'error'))
                return None

            # 1) try original poster_url if present
            if url:
                relpath = _try_download(url)
                if relpath:
                    await conn.execute("UPDATE movies SET poster_path=? WHERE id=?", (relpath, mid))
                    count += 1
                    success = True

            # 2) if original failed or missing, fall back to a placeholder (picsum) so UI always has something
            if not success:
                placeholder = f"https://picsum.photos/seed/{urllib.parse.quote(title)}/{500}/{750}"
                relpath = _try_download(placeholder)
                if relpath:
                    await conn.execute("UPDATE movies SET poster_path=? WHERE id=?", (relpath, mid))
                    count += 1
                    success = True
            # commit per-movie to persist progressively
            await conn.commit()

@app.post('/admin/add_and_fetch')
async def admin_add_and_fetch(payload: List[Dict]):
    """Add movies (if not present) and fetch their posters.
    Payload: [{"title":..., "poster_url":..., "description":...}, ...]
    Returns: {added: n, fetched: m}
    """
    static_dir = os.path.join(os.path.dirname(__file__), 'static', 'posters')
    os.makedirs(static_dir, exist_ok=True)
    import httpx
    import urllib.parse
    added = 0
    fetched = 0
    async with aiosqlite.connect(db.db_path) as conn:
        conn.row_factory = aiosqlite.Row
        for item in payload:
            title = item.get('title')
            poster_url = item.get('poster_url')
            desc = item.get('description','')
            # check if movie exists
            cur = await conn.execute('SELECT id FROM movies WHERE title=?', (title,))
            row = await cur.fetchone()
            if row:
                mid = row['id']
            else:
                cur2 = await conn.execute('INSERT INTO movies(title, poster_url, description) VALUES (?,?,?)', (title, poster_url or '', desc or ''))
                await conn.commit()
                mid = cur2.lastrowid
                added += 1
            # update poster_url if provided
            if poster_url:
                await conn.execute('UPDATE movies SET poster_url=? WHERE id=?', (poster_url, mid))
                await conn.commit()
                tried_urls = []
                def _try_download(u):
                    try:
                        resp = httpx.get(u, timeout=15.0, follow_redirects=True)
                        tried_urls.append((u, resp.status_code))
                        if resp.status_code == 200 and resp.content:
                            ct = resp.headers.get('content-type','')
                            ext = 'jpg'
                            if 'png' in ct: ext = 'png'
                            elif 'jpeg' in ct: ext = 'jpg'
                            elif 'webp' in ct: ext = 'webp'
                            filename = f"{mid}.{ext}"
                            full = os.path.join(static_dir, filename)
                            with open(full, 'wb') as fh:
                                fh.write(resp.content)
                            rel = os.path.join('static','posters', filename)
                            return rel
                    except Exception:
                        tried_urls.append((u, 'error'))
                    return None

                success = False
                if poster_url:
                    relpath = _try_download(poster_url)
                    if relpath:
                        await conn.execute('UPDATE movies SET poster_path=? WHERE id=?', (relpath, mid))
                        await conn.commit()
                        fetched += 1
                        success = True

                if not success:
                    # use placeholder based on title so each movie gets a distinct image
                    ph = f"https://picsum.photos/seed/{urllib.parse.quote(title or str(mid))}/{500}/{750}"
                    relpath = _try_download(ph)
                    if relpath:
                        await conn.execute('UPDATE movies SET poster_path=? WHERE id=?', (relpath, mid))
                        await conn.commit()
                        fetched += 1
                        success = True
            # also attempt to store image bytes into DB (poster_blob/poster_mime) for quicker serving
            try:
                # if we have a file saved, read and store blob; otherwise if _try_download returned a path, use that
                final_path = None
                if poster_url and success:
                    # we downloaded something in the block above
                    final_path = os.path.join('static', 'posters', f"{mid}.jpg")
                elif success and relpath:
                    final_path = relpath
                if final_path and os.path.exists(os.path.join(os.path.dirname(__file__), '..', final_path)):
                    ffull = os.path.join(os.path.dirname(__file__), '..', final_path)
                    with open(ffull, 'rb') as fh:
                        data = fh.read()
                    mime = 'image/jpeg'
                    await conn.execute('UPDATE movies SET poster_blob=?, poster_mime=? WHERE id=?', (data, mime, mid))
                    await conn.commit()
            except Exception:
                pass
    return {'added': added, 'fetched': fetched}


@app.post('/admin/fetch_posters_tmdb')
async def admin_fetch_posters_tmdb(api_key: Optional[str] = None):
    """Search TMDB for each movie and download poster into the DB as blob (requires TMDB API key).
    If api_key is not provided, reads TMDB_API_KEY from environment.
    """
    key = api_key or os.environ.get('TMDB_API_KEY')
    if not key:
        raise HTTPException(status_code=400, detail="TMDB API key required (pass api_key or set TMDB_API_KEY)")
    import httpx
    import urllib.parse
    fetched = 0
    async with aiosqlite.connect(db.db_path) as conn:
        conn.row_factory = aiosqlite.Row
        cur = await conn.execute("SELECT id, title FROM movies WHERE (poster_blob IS NULL OR poster_blob='')")
        rows = await cur.fetchall()
        for r in rows:
            mid = r['id']
            title = r['title']
            try:
                search_url = f"https://api.themoviedb.org/3/search/movie?api_key={key}&query={urllib.parse.quote(title)}"
                sresp = httpx.get(search_url, timeout=10.0)
                if sresp.status_code != 200:
                    continue
                data = sresp.json()
                results = data.get('results') or []
                if not results:
                    continue
                poster_path = results[0].get('poster_path')
                if not poster_path:
                    continue
                img_url = f"https://image.tmdb.org/t/p/original{poster_path}"
                iresp = httpx.get(img_url, timeout=15.0)
                if iresp.status_code == 200 and iresp.content:
                    mime = iresp.headers.get('content-type','image/jpeg')
                    # store blob + mime
                    await conn.execute('UPDATE movies SET poster_blob=?, poster_mime=? WHERE id=?', (iresp.content, mime, mid))
                    await conn.commit()
                    fetched += 1
            except Exception:
                continue
    return {'fetched': fetched}


@app.post('/admin/fetch_posters_google')
async def admin_fetch_posters_google(api_key: Optional[str] = None, cx: Optional[str] = None):
    """Use Google Custom Search (Images) to find posters for movies and store them in DB.
    Requires Google API key and a Custom Search Engine ID (cx). If not passed as params,
    the endpoint will read TMDB_API_KEY and TMDB_CX from environment variables.
    """
    key = api_key or os.environ.get('GOOGLE_API_KEY')
    cxid = cx or os.environ.get('GOOGLE_CX')
    if not key or not cxid:
        raise HTTPException(status_code=400, detail="Google API key and search engine id (cx) required")
    import httpx
    import urllib.parse
    fetched = 0
    static_dir = os.path.join(os.path.dirname(__file__), 'static', 'posters')
    os.makedirs(static_dir, exist_ok=True)
    async with aiosqlite.connect(db.db_path) as conn:
        conn.row_factory = aiosqlite.Row
        cur = await conn.execute("SELECT id, title FROM movies WHERE poster_blob IS NULL OR poster_blob=''")
        rows = await cur.fetchall()
        for r in rows:
            mid = r['id']
            title = r['title']
            try:
                q = urllib.parse.quote(title + ' movie poster')
                url = f"https://www.googleapis.com/customsearch/v1?q={q}&cx={cxid}&searchType=image&key={key}&num=1"
                resp = httpx.get(url, timeout=10.0)
                if resp.status_code != 200:
                    continue
                data = resp.json()
                items = data.get('items') or []
                if not items:
                    continue
                img_link = items[0].get('link')
                if not img_link:
                    continue
                # download image
                iresp = httpx.get(img_link, timeout=15.0)
                if iresp.status_code == 200 and iresp.content:
                    ct = iresp.headers.get('content-type','image/jpeg')
                    ext = 'jpg'
                    if 'png' in ct:
                        ext = 'png'
                    elif 'webp' in ct:
                        ext = 'webp'
                    filename = f"{mid}.{ext}"
                    full = os.path.join(static_dir, filename)
                    with open(full, 'wb') as fh:
                        fh.write(iresp.content)
                    rel = os.path.join('static','posters', filename)
                    await conn.execute('UPDATE movies SET poster_path=?, poster_blob=?, poster_mime=? WHERE id=?', (rel, iresp.content, ct, mid))
                    await conn.commit()
                    fetched += 1
            except Exception:
                # ignore per-movie failures
                continue
    return {'fetched': fetched}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--init-db", action="store_true")
    args = parser.parse_args()
    if args.init_db:
        asyncio.run(db.init())
        asyncio.run(db.seed())
        print("Database initialized with sample data.")

