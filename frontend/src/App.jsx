import React, { useEffect, useState } from 'react'
import { Home } from './pages/Home.jsx'
import { MovieDetails } from './pages/MovieDetails.jsx'
import { SeatSelection } from './pages/SeatSelection.jsx'
import { Confirmation } from './pages/Confirmation.jsx'
import { AdminDashboard } from './pages/AdminDashboard.jsx'
import { Navbar } from './components/Navbar.jsx'
import { Login } from './pages/Login.jsx'
import { Register } from './pages/Register.jsx'

export default function App() {
  const [route, setRoute] = useState(window.location.hash || '#/')
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const renderRoute = () => {
    if (route.startsWith('#/login')) {
      return <Login />
    }
    if (route.startsWith('#/register')) {
      return <Register />
    }
    if (route.startsWith('#/movie/')) {
      const movieId = parseInt(route.split('/')[2])
      return <MovieDetails movieId={movieId} />
    }
    if (route.startsWith('#/seats/')) {
      const showId = parseInt(route.split('/')[2])
      return <SeatSelection showId={showId} />
    }
    if (route.startsWith('#/confirmation/')) {
      return <Confirmation />
    }
    if (route.startsWith('#/admin')) {
      const user = JSON.parse(localStorage.getItem('user') || 'null')
      if (!user || user.role !== 'admin') return <Login />
      return <AdminDashboard />
    }
    return <Home />
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto p-4">
        {renderRoute()}
      </div>
    </div>
  )
}

