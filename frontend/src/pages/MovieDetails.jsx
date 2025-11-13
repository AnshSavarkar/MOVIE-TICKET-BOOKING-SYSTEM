import React, { useEffect, useState } from 'react'
import { api, BASE } from '../api/api'

const HERO_DEMO_IMG = 'https://wallpapers.com/images/high/movie-background-9izlympnd0ovr2b1.webp'

const DEMO_GENRE = 'Drama'
const rating = Math.round(7 + Math.random()*2)
const GENRE_COLORS = {
  SciFi: 'bg-blue-400/80',
  Thriller: 'bg-pink-500/80',
  Comedy: 'bg-yellow-400/80',
  Action: 'bg-purple-700/80',
  Drama: 'bg-rose-500/80',
  Default: 'bg-gray-700/80'
}

function extractGenre(desc) {
  const m = desc?.match(/Genre: (\w+)/)
  return m ? m[1] : DEMO_GENRE
}


export function MovieDetails({ movieId }) {
  const [movie, setMovie] = useState(null)
  const [shows, setShows] = useState([])
  const [selectedTheatre, setSelectedTheatre] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setMovie(null); setShows([]); setSelectedTheatre(''); setLoading(true)
    Promise.all([
      api.movies().then(ms => ms.find(m => m.id === movieId)),
      api.shows(movieId)
    ]).then(([m, shows_]) => { setMovie(m); setShows(shows_); setLoading(false) })
  }, [movieId])
  if (loading || !movie) return (
    <div className="card animate-pulse text-center py-28 text-white/60 text-xl">Loading movie details...</div>
  )
  const genre = extractGenre(movie.description)
  const theatres = Array.from(new Set(shows.map(s => s.theatre)))
  const filtered = selectedTheatre ? shows.filter(s => s.theatre === selectedTheatre) : shows
  const grouped = filtered.reduce((acc, s) => { (acc[s.theatre] ||= []).push(s); return acc }, {})
  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden shadow-xl mb-8 h-80 md:h-[28rem]">        
          <img src={`${BASE}/movies/${movie.id}/poster`} className="w-full h-full object-cover absolute top-0 left-0 opacity-60 scale-105" alt={movie.title} onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src = movie.poster_url || HERO_DEMO_IMG }} />

        <div className="absolute inset-0 bg-gradient-to-br from-red-900/70 via-indigo-700/50 to-pink-700/80" />
        <div className="relative z-10 flex gap-5 items-center h-full px-10 py-7 md:py-14">          
          <img src={movie.poster_url || HERO_DEMO_IMG} alt={movie.title} className="w-40 h-56 md:w-48 md:h-64 object-cover rounded-lg shadow-xl hidden md:block"/>

          <div className="flex flex-col gap-3 pt-2 md:pt-6">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg animate-fadein-up">{movie.title}</h1>
              <span className={`text-sm rounded-full px-4 py-1 font-bold shadow-lg text-white ${GENRE_COLORS[genre] || GENRE_COLORS.Default}`}>{genre}</span>
              <span className="text-sm bg-amber-400/90 text-black rounded-full px-3 py-1 font-bold shadow-lg">⭐ {rating}</span>
            </div>
            <div className="text-md text-gray-100 max-w-xl drop-shadow">{movie.description?.split('[')[0] || 'No description available.'}</div>
          </div>
        </div>
      </div>
      <h2 className="text-2xl font-extrabold mb-2 ml-1 text-pink-200 drop-shadow">Select Cinema</h2>
      <div className="flex flex-wrap gap-2 mb-3">
        <button className={`btn btn-ghost btn-sm rounded-full ${selectedTheatre===''? 'ring-2 ring-pink-400 scale-105 bg-pink-600/30 text-white' : ''}`} onClick={()=>setSelectedTheatre('')}><span role='img' aria-label='All'>🏙️</span> All</button>
        {theatres.map(t => (
          <button key={t} className={`btn btn-ghost btn-sm rounded-full flex items-center gap-2 ${selectedTheatre===t?'ring-2 ring-pink-500 scale-110 bg-pink-600/30 text-white shadow-lg':''}`} onClick={()=>setSelectedTheatre(t)}><span role='img' aria-label='cinema'>🎬</span>{t}</button>
        ))}
      </div>
      <h2 className="text-xl font-semibold mb-2 ml-1 text-blue-100 font-mono">Showtimes</h2>
      <div className="space-y-3">
        {Object.entries(grouped).map(([theatre, items]) => (
          <div key={theatre} className="card bg-indigo-900/40 border-0">
            <div className="font-semibold mb-2 text-white/90 drop-shadow flex items-center gap-2"><span role='img'>📍</span>{theatre}</div>
            <div className="flex flex-wrap gap-3">
              {items.map((s, idx) => (
                <button key={s.id} className="btn btn-primary rounded-full fade-in-up" style={{animationDelay:`${.04*idx}s`}} onClick={() => window.location.hash = `#/seats/${s.id}`}>
                  {new Date(s.show_time).toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

