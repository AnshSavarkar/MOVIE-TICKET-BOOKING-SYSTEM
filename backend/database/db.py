import aiosqlite
import os
from typing import List, Dict, Any


class Database:
    def __init__(self, db_path: str):
        self.db_path = db_path

    async def init(self) -> None:
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        async with aiosqlite.connect(self.db_path) as db:
            await db.executescript((await self._read_schema()))
            # lightweight migration: ensure 'role' column exists on users
            try:
                db.row_factory = aiosqlite.Row
                cur = await db.execute("PRAGMA table_info(users)")
                cols = [row[1] for row in await cur.fetchall()]
                if 'role' not in cols:
                    await db.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
                # ensure poster_path column exists on movies (migration for poster storage)
                cur2 = await db.execute("PRAGMA table_info(movies)")
                movie_cols = [row[1] for row in await cur2.fetchall()]
                if 'poster_path' not in movie_cols:
                    await db.execute("ALTER TABLE movies ADD COLUMN poster_path TEXT DEFAULT ''")
                # add poster_blob and poster_mime if missing
                if 'poster_blob' not in movie_cols:
                    await db.execute("ALTER TABLE movies ADD COLUMN poster_blob BLOB")
                if 'poster_mime' not in movie_cols:
                    await db.execute("ALTER TABLE movies ADD COLUMN poster_mime TEXT DEFAULT ''")
            except Exception:
                # ignore migration issues; schema creation will cover fresh DBs
                pass
            await db.commit()

    async def _read_schema(self) -> str:
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        async with aiosqlite.connect(':memory:') as _:
            pass
        with open(schema_path, 'r', encoding='utf-8') as f:
            return f.read()

    async def seed(self) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("INSERT OR IGNORE INTO users(id, name, email, password_hash, role) VALUES (1, 'Admin', 'admin@gmail.com', 'admin', 'admin')")
            await db.execute("INSERT OR IGNORE INTO users(id, name, email, password_hash, role) VALUES (2, 'Demo User', 'demo@gmail.com', 'demo', 'user')")
                        # Movies: id, title, poster_url, description, genre
            MOVIES = [
                (1, 'Inception', 'https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg', 'A mind-bending thriller', 'Sci-Fi'),
                (2, 'Interstellar', 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', 'Space odyssey for humanity', 'Sci-Fi'),
                (3, 'The Dark Knight', 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 'Batman faces Joker', 'Action'),
                (4, 'Jawan', 'https://image.tmdb.org/t/p/w500/5VzG3PIa6dNqXA2dgfAoG5qPq7f.jpg', 'A soldier. An outlaw. A hero.', 'Thriller'),
                (5, 'Barbie', 'https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg', 'Barbie enters the real world', 'Comedy'),
                (6, 'Oppenheimer', 'https://image.tmdb.org/t/p/w500/ptpr0kGAckfQkJeJIt8bso4fSlP.jpg', 'The mind that changed the world.', 'Drama'),
                (7, 'Avengers: Endgame', 'https://image.tmdb.org/t/p/w500/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg', 'Avengers unite for the final battle.', 'Action')
            ]
            await db.executemany("INSERT OR IGNORE INTO movies(id, title, poster_url, description) VALUES (?,?,?,?)", [(m[0],m[1],m[2],f"{m[3]} [Genre: {m[4]}]") for m in MOVIES])
            await db.commit()
            # Download poster images to static/posters and update poster_path
            import httpx
            static_dir = os.path.join(os.path.dirname(__file__), '..', 'static', 'posters')
            os.makedirs(static_dir, exist_ok=True)
            for m in MOVIES:
                mid = m[0]
                url = m[2]
                if not url:
                    continue
                try:
                    resp = httpx.get(url, timeout=10.0)
                    if resp.status_code == 200:
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
                        await db.execute("UPDATE movies SET poster_path=? WHERE id=?", (rel, mid))
                        # also store blob + mime so backend can serve directly from DB if desired
                        try:
                            await db.execute("UPDATE movies SET poster_blob=?, poster_mime=? WHERE id=?", (resp.content, resp.headers.get('content-type','image/jpeg'), mid))
                        except Exception:
                            # sqlite may not support writing large blobs in some environments; ignore
                            pass
                        await db.commit()
                except Exception:
                    # ignore download failures; poster_url will remain available
                    pass
            SHOWS = [
                (1, 'PVR Koramangala', '2025-11-01T10:30:00', 8, 12),
                (1, 'PVR Koramangala', '2025-11-01T14:45:00', 8, 12),
                (1, 'INOX Whitefield', '2025-11-01T19:00:00', 8, 12),
                (1, 'INOX Whitefield', '2025-11-01T22:20:00', 8, 12),
                (2, 'PVR Orion Mall', '2025-11-02T12:00:00', 10, 16),
                (2, 'Carnival MG Road', '2025-11-02T16:00:00', 10, 16),
                (2, 'PVR Orion Mall', '2025-11-02T21:00:00', 10, 16),
                (3, 'INOX Garuda Mall', '2025-11-03T16:30:00', 10, 14),
                (3, 'PVR Phoenix', '2025-11-03T20:15:00', 10, 14),
                (3, 'PVR Forum', '2025-11-03T23:15:00', 12, 16),
                (4, 'Cinepolis Bannerghatta', '2025-11-04T09:15:00', 9, 13),
                (4, 'Carnival Bellandur', '2025-11-04T13:40:00', 9, 13),
                (4, 'Cinepolis Bannerghatta', '2025-11-04T18:05:00', 9, 13),
                (5, 'PVR Vega City', '2025-11-05T11:30:00', 8, 12),
                (5, 'PVR Vega City', '2025-11-05T15:00:00', 8, 12),
                (5, 'INOX Central', '2025-11-05T19:45:00', 8, 12),
                (6, 'INOX Orion Mall', '2025-11-06T13:00:00', 8, 12),
                (6, 'PVR Vega City', '2025-11-06T17:30:00', 8, 12),
                (6, 'Carnival Koramangala', '2025-11-06T21:30:00', 8, 12),
                (7, 'IMAX Mall of India', '2025-11-07T18:00:00', 10, 18),
                (7, 'PVR Phoenix', '2025-11-07T21:00:00', 10, 18),
            ]
            await db.executemany("INSERT OR IGNORE INTO shows(movie_id, theatre, show_time, rows, cols) VALUES (?,?,?,?,?)", SHOWS)
            await db.commit()

    async def create_user(self, email: str, password: str, name: str, role: str = 'user', is_google_user: bool = False) -> int:
        async with aiosqlite.connect(self.db_path) as db:
            # Check if email already exists
            cur = await db.execute("SELECT id FROM users WHERE email=?", (email,))
            existing = await cur.fetchone()
            if existing:
                raise ValueError("Email already registered")
            
            # For Google users, password can be None
            password_hash = password if password else ''
            cur = await db.execute("INSERT INTO users(name, email, password_hash, role) VALUES (?,?,?,?)", (name, email, password_hash, role))
            await db.commit()
            return cur.lastrowid

    async def get_user_by_email(self, email: str):
        """Get user by email (for Google OAuth)"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("SELECT * FROM users WHERE email=?", (email,))
            row = await cur.fetchone()
            return dict(row) if row else None

    async def verify_user(self, email: str, password: str):
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("SELECT * FROM users WHERE email=? AND password_hash=?", (email, password))
            row = await cur.fetchone()
            return dict(row) if row else None

    async def add_movie(self, title: str, poster_url: str, description: str) -> int:
        async with aiosqlite.connect(self.db_path) as db:
            cur = await db.execute("INSERT INTO movies(title, poster_url, description) VALUES (?,?,?)", (title, poster_url, description))
            await db.commit()
            return cur.lastrowid

    async def get_movies(self) -> List[Dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("SELECT * FROM movies ORDER BY id DESC")
            rows = await cur.fetchall()
            out = []
            import base64
            for r in rows:
                d = dict(r)
                # poster_blob may be binary; convert to base64 string for JSON transport if present
                pb = d.get('poster_blob')
                if pb is not None:
                    try:
                        # Some sqlite drivers may return memoryview or bytes
                        if isinstance(pb, memoryview):
                            pb = pb.tobytes()
                        d['poster_blob'] = base64.b64encode(pb).decode('ascii')
                    except Exception:
                        d['poster_blob'] = None
                out.append(d)
            return out

    async def delete_movie(self, movie_id: int) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM movies WHERE id=?", (movie_id,))
            await db.commit()

    async def add_show(self, movie_id: int, theatre: str, show_time: str, rows: int, cols: int) -> int:
        async with aiosqlite.connect(self.db_path) as db:
            cur = await db.execute(
                "INSERT INTO shows(movie_id, theatre, show_time, rows, cols) VALUES (?,?,?,?,?)",
                (movie_id, theatre, show_time, rows, cols)
            )
            await db.commit()
            return cur.lastrowid

    async def get_shows(self, movie_id: int) -> List[Dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("SELECT * FROM shows WHERE movie_id=? ORDER BY show_time", (movie_id,))
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

    async def delete_show(self, show_id: int) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM shows WHERE id=?", (show_id,))
            await db.commit()

    async def get_seats(self, show_id: int) -> Dict[str, Any]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("SELECT rows, cols FROM shows WHERE id=?", (show_id,))
            show = await cur.fetchone()
            if not show:
                return {"rows": 0, "cols": 0, "booked": []}
            cur2 = await db.execute("SELECT seat FROM bookings WHERE show_id=?", (show_id,))
            booked_rows = await cur2.fetchall()
            booked = [r[0] for r in booked_rows]
            return {"rows": show["rows"], "cols": show["cols"], "booked": booked}

    async def check_seats_available(self, show_id: int, seats: List[str]) -> bool:
        async with aiosqlite.connect(self.db_path) as db:
            cur = await db.execute(
                f"SELECT COUNT(*) FROM bookings WHERE show_id=? AND seat IN ({','.join('?' for _ in seats)})",
                (show_id, *seats)
            )
            (count,) = await cur.fetchone()
            return count == 0

    async def create_booking(self, user_id: int, show_id: int, seats: List[str]) -> int:
        async with aiosqlite.connect(self.db_path) as db:
            booking_ids: List[int] = []
            for seat in seats:
                cur = await db.execute(
                    "INSERT INTO bookings(user_id, show_id, seat) VALUES (?,?,?)",
                    (user_id, show_id, seat)
                )
                booking_ids.append(cur.lastrowid)
            await db.commit()
            return booking_ids[0]

    async def create_booking_group(self, user_id: int, show_id: int, seats: List[str], snacks_json: str, total: float) -> int:
        """Create a grouped booking: insert into booking_groups and individual bookings for seats."""
        async with aiosqlite.connect(self.db_path) as db:
            cur = await db.execute(
                "INSERT INTO booking_groups(user_id, show_id, seats_json, snacks_json, total) VALUES (?,?,?,?,?)",
                (user_id, show_id, ','.join(seats), snacks_json or '', total)
            )
            group_id = cur.lastrowid
            # insert individual seat bookings
            for seat in seats:
                await db.execute("INSERT INTO bookings(user_id, show_id, seat) VALUES (?,?,?)", (user_id, show_id, seat))
            await db.commit()
            return group_id

    async def set_group_qr(self, group_id: int, qr_b64: str) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("UPDATE booking_groups SET qr=? WHERE id=?", (qr_b64, group_id))
            await db.commit()

    async def get_booking_group(self, group_id: int):
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("SELECT * FROM booking_groups WHERE id=?", (group_id,))
            row = await cur.fetchone()
            return dict(row) if row else None

    async def get_user_bookings(self, user_id: int) -> List[Dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute(
                "SELECT b.id, b.seat, s.theatre, s.show_time, m.title FROM bookings b "
                "JOIN shows s ON b.show_id=s.id "
                "JOIN movies m ON s.movie_id=m.id WHERE b.user_id=? ORDER BY s.show_time DESC",
                (user_id,)
            )
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

