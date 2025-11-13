import React, { useState } from 'react'

const CITIES = [
  { name: "Bangalore", emoji: "🟣" },
  { name: "Mumbai", emoji: "🔴" },
  { name: "Delhi", emoji: "🟢" },
  { name: "Pune", emoji: "🟠" },
]

export function Navbar() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const logout = () => { localStorage.removeItem('user'); window.location.hash = '#/' }
  const [city, setCity] = useState(localStorage.getItem('city') || 'Bangalore')
  const selected = CITIES.find(c=>c.name===city) || CITIES[0]
  const changeCity = (e) => {
    setCity(e.target.value); localStorage.setItem('city', e.target.value)
  }
  return (
    <div className="bg-white shadow sticky top-0 z-20">
      <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
        <div className="flex gap-3 items-center">
          <div className="text-2xl font-extrabold cursor-pointer text-indigo-700 drop-shadow" onClick={() => window.location.hash = '#/'}>MovieBook</div>
          <select className="bg-pink-100 px-2 py-1 rounded text-indigo-900 font-bold outline-none border-2 border-pink-200 hover:border-indigo-400" value={city} onChange={changeCity}>
            {CITIES.map(c => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
          </select>
        </div>
        <div className="flex gap-3 items-center">
          <a href="#/">Home</a>
          {user?.role === 'admin' && <a href="#/admin">Admin</a>}
          {!user && <a href="#/login" className="btn btn-primary btn-sm">Login</a>}
          {user && <button className="btn btn-danger btn-sm" onClick={logout}>Logout ({user.name})</button>}
        </div>
      </div>
    </div>
  )
}

