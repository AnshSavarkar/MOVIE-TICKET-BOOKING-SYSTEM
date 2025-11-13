import React, { useState, useEffect } from 'react'
import axios from 'axios'

const BASE = 'http://127.0.0.1:8000'

// Replace with your actual Google Client ID
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'

function Toast({ msg, type, onClose }) {
  return (
    <div className={"toast " + (type || '')}>{msg}<button onClick={onClose} className="btn btn-ghost btn-sm ml-3">✕</button></div>
  )
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoaded, setGoogleLoaded] = useState(false)

  useEffect(() => {
    // Initialize Google Sign-In with a delay to ensure script is loaded
    const initializeGoogleSignIn = () => {
      if (window.google && window.google.accounts) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse
          })
          
          const buttonDiv = document.getElementById('googleSignInButton')
          if (buttonDiv) {
            window.google.accounts.id.renderButton(
              buttonDiv,
              { 
                theme: 'outline', 
                size: 'large',
                width: buttonDiv.offsetWidth || 350,
                text: 'continue_with',
                shape: 'rectangular',
                logo_alignment: 'left'
              }
            )
            setGoogleLoaded(true)
          }
        } catch (error) {
          console.error('Google Sign-In initialization error:', error)
        }
      } else {
        // Retry after a short delay if Google script not loaded yet
        console.log('Google script not loaded yet, retrying...')
        setTimeout(initializeGoogleSignIn, 500)
      }
    }
    
    // Start initialization after a small delay
    const timer = setTimeout(initializeGoogleSignIn, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleGoogleResponse = async (response) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.post(`${BASE}/auth/google`, {
        token: response.credential
      })
      localStorage.setItem('user', JSON.stringify(data))
      window.location.hash = '#/'
    } catch (err) {
      setError('Google authentication failed! Please try again.')
      setTimeout(() => setError(''), 2500)
    } finally {
      setLoading(false)
    }
  }

  const handleManualGoogleLogin = () => {
    if (window.google && window.google.accounts) {
      // Trigger Google One Tap
      window.google.accounts.id.prompt()
    } else {
      setError('Google Sign-In is not available. Please refresh the page.')
      setTimeout(() => setError(''), 2500)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await axios.post(`${BASE}/auth/login`, { email, password })
      localStorage.setItem('user', JSON.stringify(data))
      window.location.hash = '#/'
    } catch (err) {
      setError('Invalid credentials! Try again.')
      setTimeout(() => setError(''), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex overflow-hidden">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 items-center justify-center p-12">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <div className="relative z-10 text-center space-y-8 max-w-md">
          <div className="flex justify-center">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <span className="text-8xl">🎬</span>
            </div>
          </div>
          <h1 className="text-5xl font-black text-white drop-shadow-2xl">
            MovieBook
          </h1>
          <p className="text-xl text-white/90 font-medium">
            Your Gateway to Cinematic Experiences
          </p>
          <div className="flex items-center justify-center gap-4 text-white/70">
            <span className="text-2xl">🎟️</span>
            <span className="text-2xl">🍿</span>
            <span className="text-2xl">🎭</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-6xl">🎬</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-4">MovieBook</h2>
          </div>

          {/* Form Header */}
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-gray-600">Sign in to your account to continue</p>
          </div>

          {/* Login Form */}
          <form onSubmit={submit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-sm font-medium text-purple-600 hover:text-purple-500">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base transition-all duration-200"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign in
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Google Sign-In Button Container */}
          <div className="w-full">
            <div id="googleSignInButton" className="w-full flex justify-center"></div>
            
            {/* Loading placeholder while Google button loads */}
            {!googleLoaded && (
              <button
                type="button"
                onClick={handleManualGoogleLogin}
                className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 text-gray-700 font-medium transition-all duration-200 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="#/register" className="font-semibold text-purple-600 hover:text-purple-500">
              Sign up
            </a>
          </p>
        </div>
      </div>

      {error && <Toast msg={error} type='bg-red-600' onClose={()=>setError('')} />}
    </div>
  )
}
