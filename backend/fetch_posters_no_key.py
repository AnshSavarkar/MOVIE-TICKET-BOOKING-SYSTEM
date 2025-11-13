#!/usr/bin/env python3
import os
import sqlite3
import httpx
import time
import mimetypes

BASE = os.path.dirname(__file__)
DB = os.path.join(BASE, 'movie.db')
STATIC_DIR = os.path.join(BASE, 'static', 'posters')
os.makedirs(STATIC_DIR, exist_ok=True)

USER_AGENT = 'Mozilla/5.0 (compatible; PosterFetcher/1.0; +https://example.com)'


def duckduckgo_image_search(query, max_results=10):
    """Use DuckDuckGo unofficial i.js endpoint to search images."""
    url = 'https://duckduckgo.com/i.js'
    params = {'q': query}
    headers = {'User-Agent': USER_AGENT}
    results = []
    with httpx.Client(headers=headers, timeout=15.0) as client:
        try:
            r = client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
            results = data.get('results', [])
        except Exception:
            # some ddg endpoints paginate via 'next' token; ignore for now
            try:
                # sometimes ddg returns a text with "vqd" token; fallback to search page to get token
                r = client.get('https://duckduckgo.com', params={'q': query})
            except Exception:
                return []
    return results


def choose_candidate(results):
    # prefer urls that contain 'poster' or large image sizes
    for it in results:
        img = it.get('image') or it.get('thumbnail') or it.get('url')
        if not img:
            continue
        lower = img.lower()
        if 'poster' in lower or 'movie' in lower:
            return img
    # fallback: first jpg/png
    for it in results:
        img = it.get('image') or it.get('thumbnail') or it.get('url')
        if not img:
            continue
        if img.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            return img
    # fallback: first result
    if results:
        return results[0].get('image') or results[0].get('thumbnail') or results[0].get('url')
    return None


def download_and_save(mid, url):
    headers = {'User-Agent': USER_AGENT}
    with httpx.Client(headers=headers, follow_redirects=True, timeout=20.0) as client:
        try:
            r = client.get(url)
            r.raise_for_status()
            content = r.content
            ct = r.headers.get('content-type', 'image/jpeg')
            if 'png' in ct:
                ext = 'png'
            elif 'webp' in ct:
                ext = 'webp'
            else:
                ext = 'jpg'
            filename = f"{mid}.{ext}"
            full = os.path.join(STATIC_DIR, filename)
            with open(full, 'wb') as fh:
                fh.write(content)
            rel = os.path.join('static', 'posters', filename)
            return rel, content, ct
        except Exception as e:
            return None, None, None


def fetch_all():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT id, title, poster_url, poster_path, poster_mime FROM movies ORDER BY id")
    rows = cur.fetchall()
    updated = []
    for r in rows:
        mid = r['id']
        title = r['title']
        poster_path = r['poster_path'] or ''
        poster_url = r['poster_url'] or ''
        # skip if we already have blob/path
        if poster_path:
            print(f"[{mid}] already has poster_path: {poster_path}")
            continue
        # try queries: 'TITLE official poster', 'TITLE poster'
        queries = [f"{title} official poster", f"{title} poster", f"{title} movie poster"]
        candidate = None
        for q in queries:
            print(f"Searching DDG for: {q}")
            results = duckduckgo_image_search(q)
            candidate = choose_candidate(results)
            if candidate:
                print(f"Found candidate: {candidate}")
                break
            time.sleep(0.5)
        if not candidate and poster_url:
            print(f"Falling back to poster_url from DB: {poster_url}")
            candidate = poster_url
        if not candidate:
            print(f"No candidate found for {title} (id={mid})")
            continue
        rel, blob, mime = download_and_save(mid, candidate)
        if rel and blob:
            print(f"Saved poster for {title} -> {rel}")
            try:
                cur.execute("UPDATE movies SET poster_path=?, poster_blob=?, poster_mime=? WHERE id=?", (rel, blob, mime, mid))
                conn.commit()
                updated.append((mid, title, rel))
            except Exception as e:
                print("DB update failed:", e)
        else:
            print(f"Failed to download candidate for {title}: {candidate}")
    conn.close()
    return updated


if __name__ == '__main__':
    print('Starting no-key poster fetch...')
    updated = fetch_all()
    print('Done. Updated:', len(updated))
    for u in updated:
        print(u)
