#!/usr/bin/env python3
"""Repair posters: remove movies with missing/unfetchable posters and add replacements.

Usage: run from the `backend` folder's parent in the repo: python backend/repair_posters.py
"""
import sqlite3
import os
import sys
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import mimetypes

ROOT = os.path.dirname(__file__)
DB = os.path.join(ROOT, 'movie.db')
STATIC_DIR = os.path.join(ROOT, 'static', 'posters')
os.makedirs(STATIC_DIR, exist_ok=True)

def download_to(path, url):
    try:
        req = Request(url, headers={'User-Agent':'Mozilla/5.0'})
        with urlopen(req, timeout=15) as resp:
            data = resp.read()
            content_type = resp.headers.get('Content-Type','')
            # ensure extension
            ext = 'jpg'
            if 'png' in content_type: ext = 'png'
            elif 'webp' in content_type: ext = 'webp'
            elif 'jpeg' in content_type: ext = 'jpg'
            path_with_ext = path if path.lower().endswith(('.png','.jpg','.jpeg','.webp')) else f"{path}.{ext}"
            with open(path_with_ext, 'wb') as fh:
                fh.write(data)
            return path_with_ext, data, content_type
    except (HTTPError, URLError, Exception) as e:
        print(f"download failed for {url}: {e}")
        return None, None, None

def main():
    if not os.path.exists(DB):
        print("DB not found at", DB)
        sys.exit(1)
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute('SELECT id, title, poster_path, poster_url FROM movies')
    rows = cur.fetchall()
    to_delete = []
    updated = 0
    for r in rows:
        mid = r['id']
        title = r['title']
        ppath = r['poster_path'] or ''
        purl = r['poster_url'] or ''
        file_exists = False
        if ppath:
            full = os.path.join(ROOT, ppath)
            if os.path.exists(full):
                file_exists = True
        if file_exists:
            print(f"OK: movie {mid} '{title}' has poster file {ppath}")
            continue
        # try to download from poster_url
        if purl:
            target = os.path.join(STATIC_DIR, str(mid))
            path_with_ext, data, ctype = download_to(target, purl)
            if path_with_ext:
                rel = os.path.relpath(path_with_ext, ROOT)
                try:
                    cur.execute('UPDATE movies SET poster_path=?, poster_blob=?, poster_mime=? WHERE id=?', (rel, data, ctype, mid))
                    conn.commit()
                    updated += 1
                    print(f"Downloaded poster for movie {mid} '{title}' -> {rel}")
                    continue
                except Exception as e:
                    print('DB update failed for', mid, e)
        # if we get here, can't fetch poster: mark for deletion
        print(f"Will remove movie {mid} '{title}' — poster missing and could not be fetched")
        to_delete.append(mid)

    # delete failing movies
    if to_delete:
        cur.executemany('DELETE FROM movies WHERE id=?', [(i,) for i in to_delete])
        conn.commit()
        print(f"Deleted {len(to_delete)} movies: {to_delete}")

    # add replacement movies (picsum seeds or TMDB stable urls)
    replacements = [
        ( 'Oppenheimer', 'https://image.tmdb.org/t/p/w500/ptpr0kGAckfQkJeJIt8bso4fSlP.jpg', 'A historical drama' ),
        ( 'Jawan', 'https://image.tmdb.org/t/p/w500/5VzG3PIa6dNqXA2dgfAoG5qPq7f.jpg', 'A soldier. An outlaw. A hero.' ),
        ( 'Spider-Man: No Way Home', 'https://picsum.photos/seed/spiderman/500/750', 'Superhero action' ),
        ( 'Deadpool', 'https://picsum.photos/seed/deadpool/500/750', 'Action comedy' ),
    ]
    added = 0
    for title, url, desc in replacements:
        try:
            cur.execute('INSERT INTO movies(title, poster_url, description) VALUES (?,?,?)', (title, url, desc))
            conn.commit()
            mid = cur.lastrowid
            target = os.path.join(STATIC_DIR, str(mid))
            path_with_ext, data, ctype = download_to(target, url)
            if path_with_ext:
                rel = os.path.relpath(path_with_ext, ROOT)
                cur.execute('UPDATE movies SET poster_path=?, poster_blob=?, poster_mime=? WHERE id=?', (rel, data, ctype, mid))
                conn.commit()
                print(f"Added movie {mid} '{title}' with poster {rel}")
                added += 1
        except Exception as e:
            print('Failed to add', title, e)

    print(f"Finished. posters updated: {updated}, movies added: {added}")
    conn.close()

if __name__ == '__main__':
    main()
