#!/usr/bin/env python3
"""Restore movies to a curated set, remove duplicates and extras, and ensure posters are downloaded.

Usage: python backend/restore_movies.py
"""
import os
import sqlite3
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from datetime import datetime, timedelta

ROOT = os.path.dirname(__file__)
DB = os.path.join(ROOT, 'movie.db')
STATIC_DIR = os.path.join(ROOT, 'static', 'posters')
os.makedirs(STATIC_DIR, exist_ok=True)

CURATED = [
    ( 'Inception', 'https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg', 'A mind-bending thriller [Genre: SciFi]' ),
    ( 'Interstellar', 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', 'Space odyssey for humanity [Genre: SciFi]' ),
    ( 'The Dark Knight', 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 'Batman faces Joker [Genre: Action]' ),
    ( 'Avengers: Endgame', 'https://image.tmdb.org/t/p/w500/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg', 'Avengers unite for the final battle [Genre: Action]' ),
    ( 'Barbie', 'https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg', 'Barbie enters the real world [Genre: Comedy]' ),
    ( 'Kung Fu Panda', 'https://image.tmdb.org/t/p/w500/wWt4JYXTg5Wr3xBW2phBrMKgp3x.jpg', 'A clumsy panda becomes the Dragon Warrior [Genre: Comedy]' ),
]

THEATRES = ['PVR Koramangala','INOX Whitefield','PVR Orion Mall','Cinepolis Bannerghatta']
TIMES = ['10:30:00','14:45:00','19:00:00','22:20:00']
START_DATE = datetime.now().date() + timedelta(days=1)


def download_to(path_no_ext: str, url: str):
    try:
        req = Request(url, headers={'User-Agent':'Mozilla/5.0'})
        with urlopen(req, timeout=15) as resp:
            data = resp.read()
            content_type = resp.headers.get('Content-Type','')
            ext = 'jpg'
            if 'png' in content_type: ext = 'png'
            elif 'webp' in content_type: ext = 'webp'
            elif 'jpeg' in content_type: ext = 'jpg'
            path_with_ext = path_no_ext if path_no_ext.lower().endswith(('.png','.jpg','.jpeg','.webp')) else f"{path_no_ext}.{ext}"
            with open(path_with_ext, 'wb') as fh:
                fh.write(data)
            return path_with_ext, data, (content_type or 'image/jpeg')
    except (HTTPError, URLError, Exception) as e:
        print(f"download failed for {url}: {e}")
        return None, None, None


def main():
    if not os.path.exists(DB):
        raise SystemExit(f"DB not found: {DB}")
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # 1) Remove duplicates by title (keep the lowest id that has poster)
    cur.execute("SELECT title, GROUP_CONCAT(id), COUNT(*) c FROM movies GROUP BY title HAVING c>1")
    dups = cur.fetchall()
    for d in dups:
        title = d['title']
        cur.execute("SELECT id, poster_path, poster_blob FROM movies WHERE title=? ORDER BY (poster_blob IS NOT NULL AND poster_blob!='') DESC, (poster_path IS NOT NULL AND poster_path!='') DESC, id ASC", (title,))
        rows = cur.fetchall()
        keep_id = rows[0]['id'] if rows else None
        del_ids = [r['id'] for r in rows[1:]]
        if del_ids:
            cur.executemany('DELETE FROM movies WHERE id=?', [(i,) for i in del_ids])
            print(f"Removed duplicates for '{title}', kept id {keep_id}, deleted {del_ids}")
    conn.commit()

    # 2) Delete movies not in curated set (to remove extra replacements)
    titles = tuple(t for (t,_,_) in CURATED)
    placeholders = ','.join('?' for _ in titles)
    cur.execute(f"DELETE FROM movies WHERE title NOT IN ({placeholders})", titles)
    print(f"Removed non-curated titles, changes={conn.total_changes}")
    conn.commit()

    # 3) Upsert curated movies and download posters
    cur.execute('SELECT id, title FROM movies')
    existing = {row['title']: row['id'] for row in cur.fetchall()}
    added = 0
    updated_posters = 0
    for title, url, desc in CURATED:
        if title in existing:
            mid = existing[title]
            cur.execute('UPDATE movies SET poster_url=?, description=? WHERE id=?', (url, desc, mid))
            conn.commit()
        else:
            cur.execute('INSERT INTO movies(title, poster_url, description) VALUES (?,?,?)', (title, url, desc))
            conn.commit()
            mid = cur.lastrowid
            existing[title] = mid
            added += 1
        # download poster
        target = os.path.join(STATIC_DIR, str(mid))
        path_with_ext, data, ctype = download_to(target, url)
        if not path_with_ext:
            # fallback to picsum
            from urllib.parse import quote
            fallback = f"https://picsum.photos/seed/{quote(title)}/500/750"
            path_with_ext, data, ctype = download_to(target, fallback)
        if path_with_ext:
            rel = os.path.relpath(path_with_ext, ROOT)
            cur.execute('UPDATE movies SET poster_path=?, poster_blob=?, poster_mime=? WHERE id=?', (rel, data, ctype, mid))
            conn.commit()
            updated_posters += 1
            print(f"Poster set for {title} -> {rel}")

    # 4) Ensure 3 shows per movie
    show_count = 0
    for idx, (title, _, _) in enumerate(CURATED):
        mid = existing[title]
        # clear old shows for this movie to avoid clutter
        cur.execute('DELETE FROM shows WHERE movie_id=?', (mid,))
        for i in range(3):
            show_dt = f"{START_DATE + timedelta(days=i)}T{TIMES[i%len(TIMES)]}"
            theatre = THEATRES[i%len(THEATRES)]
            cur.execute('INSERT INTO shows(movie_id, theatre, show_time, rows, cols) VALUES (?,?,?,?,?)', (mid, theatre, show_dt, 8, 12))
            show_count += 1
    conn.commit()

    print(f"Done. Added {added} movies, updated_posters {updated_posters}, created {show_count} shows.")
    conn.close()

if __name__ == '__main__':
    main()
