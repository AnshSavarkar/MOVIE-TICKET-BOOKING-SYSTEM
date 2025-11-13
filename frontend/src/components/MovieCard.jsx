import React from 'react'
import { BASE } from '../api/api'

const DEMO_POSTER = 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/zzWGRw277MNoCs3zhyG3YmYQsXv.jpg'
const rating = Math.round(7 + Math.random()*2)

const GENRE_COLORS = {
  SciFi: 'bg-blue-400/80',
  Thriller: 'bg-pink-500/80',
  Comedy: 'bg-yellow-400/80',
  Action: 'bg-purple-700/80',
  Drama: 'bg-rose-500/80',
  Default: 'bg-gray-700/80'
}

export function MovieCard({ movie, genre }) {
  const badge = genre || (movie.description?.match(/Genre: (\w+)/) || [])[1] || 'Default'
  return (
    <div className={"card relative group cursor-pointer p-0 min-h-80 border-2 border-transparent hover:border-indigo-400 hover:shadow-2xl transition-all bg-gradient-to-b from-[#342438]/70 to-[#170a2f]/90"}>
  <div className="relative w-full h-64 overflow-hidden rounded-t-2xl">
  <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 rounded-t-2xl" src={`${BASE}/movies/${movie.id}/poster`} alt={movie.title} loading="lazy" onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src = movie.poster_url || DEMO_POSTER }} />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
    <div className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-bold uppercase shadow text-white ${GENRE_COLORS[badge] || GENRE_COLORS.Default}`}>{badge}</div>
    <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-300/90 text-xs flex items-center gap-1 text-black"><span>⭐</span>{rating}</div>
  </div>
      <div className="px-5 py-3 flex flex-col items-center">
        <span className="text-xl font-bold text-white uppercase mb-2 truncate w-full drop-shadow-lg text-center">{movie.title}</span>
        <span className="text-indigo-200 text-xs font-mono mb-2">{movie.description?.split('[')[0]}</span>
        <button className="btn btn-primary btn-lg w-full" onClick={() => window.location.hash = `#/movie/${movie.id}`}>View Shows</button>
      </div>
    </div>
  )
}

