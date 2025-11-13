import React, { useEffect, useMemo, useState } from 'react'
import { api, BASE } from '../api/api'
import { MovieCard } from '../components/MovieCard'

const HERO_DEMO_IMG = 'https://wallpapers.com/images/high/movie-background-9izlympnd0ovr2b1.webp'

function extractGenre(desc) {
  const m = desc.match(/Genre: (\w+)/)
  return m ? m[1] : ''
}

const GENRE_OPTIONS = [
  'All','SciFi','Thriller','Comedy','Action','Drama'
]

const COMING_SOON = [
  {
    title: 'Kung Fu Panda 4',
    poster_url: 'https://image.tmdb.org/t/p/w500/aTvePCU7exLepwg5hWySjwxojQK.jpg',
    genre: 'Comedy',
  },
  {
    title: 'Joker: Folie à Deux',
    poster_url: 'https://image.tmdb.org/t/p/w500/xwSihFuwpX6vFQcmC81G1O2y1l7.jpg',
    genre: 'Drama',
  },
  {
    title: 'Spider-Man: Beyond the Spider-Verse',
    poster_url: 'https://image.tmdb.org/t/p/w500/hw10nY6Ktq5XYJIaW1SNwMfb8ux.jpg',
    genre: 'Action',
  },
  {
    title: 'Deadpool & Wolverine',
    poster_url: 'https://image.tmdb.org/t/p/w500/dxE5J1zWv9w1wToF2tSP1EjK2py.jpg',
    genre: 'Action',
  },
]

export function Home() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [genre, setGenre] = useState('All')
  const [search, setSearch] = useState('')
  const [active, setActive] = useState(0)
  useEffect(() => {
    api.movies().then(ms => { setMovies(ms.slice(0, 5)); setLoading(false) })
  }, [])
  // rotate hero every ~5.5s
  useEffect(() => {
    if (loading) return
    const list = movies.slice(0, 3)
    if (list.length <= 1) return
    const id = setInterval(() => {
      setActive(prev => (prev + 1) % list.length)
    }, 5500)
    return () => clearInterval(id)
  }, [loading, movies])
  const filtered = movies.filter(m =>
    (genre === 'All' || (extractGenre(m.description) === genre)) &&
    (m.title.toLowerCase().includes(search.trim().toLowerCase())
     || extractGenre(m.description).toLowerCase().includes(search.trim().toLowerCase()))
  )
  const featuredList = useMemo(() => movies.slice(0, 3), [movies])

  return (
    <div className="relative min-h-screen">
      {/* Simple Static Purple Background - No Animations */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Deep Royal Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900" />
        
        {/* Subtle Vignette */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-purple-950/40" />
      </div>

      {/* Hero carousel (manual for now) */}
      <div className="mb-4 relative">
        <div className="relative h-72 md:h-[23rem] rounded-2xl overflow-hidden flex items-center group shadow-2xl border-2 border-white/10">
          {featuredList.map((movie, idx) => (
            <div key={movie.id}
                 className={`absolute top-0 left-0 w-full h-full transition-all duration-700 ${idx===active?'z-20 opacity-100 scale-100':'z-10 opacity-0 scale-105'} group-hover:opacity-60`}
                 style={{transitionDelay:`${idx*100}ms`}}>
              <img src={`${BASE}/movies/${movie.id}/poster`} onError={(e)=>{e.currentTarget.onerror=null; e.currentTarget.src = movie.poster_url || HERO_DEMO_IMG}} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform" alt={movie.title} />
              {/* Elegant overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          ))}
          <div className="relative z-30 px-8 py-7 md:py-12">
            <h2 className="hero-title flex items-center gap-5 text-shadow-elegant">
              <span role="img" className="text-5xl animate-float-subtle">🍿</span> {featuredList[active]? featuredList[active].title : 'Featured Movie'}
            </h2>
            <div className="py-2 px-7 font-semibold inline-block text-amber-100 rounded-full shadow-xl mb-2 uppercase tracking-widest fade-in-up bg-gradient-to-r from-purple-900/80 to-indigo-900/80 backdrop-blur-sm border border-amber-500/30">Premium Experience</div>
            <div className="hero-caption">Theatres. Snacks. Offers. Magic. It's all here.<br />Experience movies the way they're meant to be seen!</div>
              {featuredList[active] && <button className="btn btn-primary mt-3 shadow-xl" onClick={()=>window.location.hash=`#/movie/${featuredList[active].id}`}>Book Now</button>}
          </div>
          {/* dots */}
          <div className="absolute bottom-3 right-4 z-30 flex gap-2">
            {featuredList.map((_, i) => (
              <span key={i} className={`${i===active ? 'bg-white' : 'bg-white/50'} inline-block w-2 h-2 rounded-full`} />
            ))}
          </div>
        </div>
      </div>
      
      {/* Search and Genre filter */}
      <div className="flex flex-wrap gap-4 mb-8 items-center justify-between px-1">
        <div className="relative flex-1 max-w-lg group">
          {/* Elegant glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/30 via-purple-500/30 to-indigo-500/30 rounded-full blur opacity-0 group-focus-within:opacity-40 transition duration-500" />
          <input value={search} onChange={e=>setSearch(e.target.value)}
            className="relative w-full px-6 py-3 rounded-full bg-slate-900/60 text-white text-lg placeholder-gray-400 shadow-xl outline-none focus:ring-2 focus:ring-amber-500/50 transition-all duration-300 border-2 border-white/10 backdrop-blur-md hover:border-amber-500/30"
            placeholder="🔍 Search movies, genre…" spellCheck="false" />
        </div>
        <div className="flex gap-2 overflow-auto no-scrollbar md:max-w-xl">
          {GENRE_OPTIONS.map(g => (
            <button key={g}
              className={`btn btn-ghost btn-sm rounded-full relative overflow-hidden transition-all duration-300 ${g===genre ? 'ring-2 ring-amber-400/60 bg-gradient-to-r from-purple-900/70 to-indigo-900/70 text-amber-100 scale-105 shadow-xl' : 'hover:bg-white/5'}`}
              onClick={()=>setGenre(g)}>
              <span className="relative z-10">{g}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Now Showing Title with Royal Effect */}
      <div className="relative mb-6 ml-1">
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-10 bg-gradient-to-b from-amber-400 to-purple-400" />
        <h1 className="text-3xl font-extrabold text-white drop-shadow-2xl flex items-center gap-3 relative">
          <span className="relative">
            Now Showing
            <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-purple-400 to-transparent" />
          </span>
          <span role="img" className="text-4xl animate-float-subtle">🎬</span>
        </h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-8 mb-12">
        {loading ? Array.from({length: 5}).map((_,i) => (
          <div key={i} className="card min-h-80 shimmer" />
        )) :
          filtered.length === 0 ? <div className="col-span-full text-center text-2xl text-white/70 font-semibold p-20">No movies matching that search or genre.</div>
            : filtered.map((m, idx) => <div key={m.id} className="fade-in-up" style={{animationDelay: `${0.04*idx}s`}}><MovieCard movie={m} genre={extractGenre(m.description)} /></div>)
        }
      </div>
      {/* Coming Soon cards, horizontal scroll */}
      <div className="my-10">
        <div className="flex items-center mb-3 text-xl font-bold text-white/90 gap-2"><span role="img">🚀</span>Coming Soon</div>
        <div className="flex gap-7 overflow-x-auto no-scrollbar pb-4 snap-x">
          {COMING_SOON.map((m,idx) => (
            <div key={m.title} className="bg-gradient-to-br from-gray-800 to-indigo-900 text-white rounded-xl shadow-2xl min-w-[260px] snap-center hover:scale-105 transition p-0 mb-2">
              <img src={m.poster_url} className="w-full h-40 md:h-56 object-cover rounded-t-xl" alt={m.title} />
              <div className="px-4 py-2">
                <div className="font-bold text-lg mb-1 mt-1">{m.title}</div>
                <div className="inline-block bg-pink-600/80 text-xs px-3 py-0.5 rounded-full uppercase shadow-lg mb-2">{m.genre}</div>
                <button className="btn btn-warning w-full mt-2">Notify Me</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

