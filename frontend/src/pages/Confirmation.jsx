import React, { useEffect, useState } from 'react'
import { api } from '../api/api'
import SnackIcon from '../components/SnackIcon'

const SNACKS = [
  { name: 'Popcorn' },
  { name: 'Coke' },
  { name: 'Nachos' },
  { name: 'Samosa' },
]

function getSnackInfo(snackHash='') {
  if(!snackHash) return null
  try {
    if(snackHash.startsWith('ok?snacks='))
      snackHash = snackHash.replace('ok?snacks=','')
    return JSON.parse(decodeURIComponent(snackHash))
  } catch { return null }
}

export function Confirmation() {
  const snackQuery = window.location.hash.split('/confirmation/')[1] || ''
  const snacks = getSnackInfo(snackQuery)
  const orderedSnacks = snacks && Object.entries(snacks).filter(([n,c])=>c>0)
  // bookingGroup will hold {group_id, total, qr_base64}
  const [bookingGroup, setBookingGroup] = useState(null)
  useEffect(() => {
    let mounted = true
    // first try localStorage
    try {
      const bg = JSON.parse(localStorage.getItem('last_booking_group') || 'null')
      if (bg && mounted) setBookingGroup(bg)
      // if we don't have qr_base64 but we have a group_id, try fetching from backend
      if ((!bg || !bg.qr_base64) && bg && bg.group_id) {
        api.getBookingGroup(bg.group_id).then(res => {
          if (mounted && res) {
            setBookingGroup(res)
            try { localStorage.setItem('last_booking_group', JSON.stringify(res)) } catch(_) {}
          }
        }).catch(_=>{})
      }
    } catch(e) {
      // ignore parse errors
    }
    return () => { mounted = false }
  }, [])

  return (
    <div className="card text-center bg-gradient-to-br from-pink-600/60 to-indigo-700/80 animate-fadein-up backdrop-blur-xl max-w-lg mx-auto shadow-2xl mt-16">
      <div className="text-5xl mb-2 animate-bounce">🎉</div>
      <div className="text-3xl font-extrabold mt-2 text-white">Booking Confirmed!</div>
      <div className="text-lg p-2 text-yellow-100 font-semibold">Thank you for booking with MovieBook 🎬</div>
      <div className="text-gray-200 mt-1 mb-8">Enjoy your movie. Show your QR/ID at entrance.</div>

      {bookingGroup && bookingGroup.qr_base64 && (
        <div className="mt-4 mb-4">
          <div className="font-bold text-pink-200 mb-1">Your Ticket QR</div>
          <div className="qr-ring mx-auto w-fit p-2">
            <img src={`data:image/png;base64,${bookingGroup.qr_base64}`} alt="ticket-qr" className="qr-image w-52 h-52 object-contain" />
          </div>
          <div className="mt-3 text-white/90 text-lg font-semibold">Total: <span className="text-yellow-300">₹{bookingGroup.total}</span></div>
          <div className="mt-3">
            <button className="btn btn-warning mt-2" onClick={() => {
              // download the QR as PNG
              const link = document.createElement('a')
              link.href = `data:image/png;base64,${bookingGroup.qr_base64}`
              link.download = `booking_${bookingGroup.group_id}.png`
              document.body.appendChild(link)
              link.click()
              link.remove()
            }}>Download QR</button>
          </div>
          <div className="mt-4 text-sm text-white/70">Show this QR at the theatre entrance along with a photo ID.</div>
        </div>
      )}

      {orderedSnacks && orderedSnacks.length>0 && (
        <div className="mt-5 mb-3 text-left max-w-xs mx-auto">
          <div className="font-bold text-pink-200 mb-1">Snacks Ordered:</div>
          <div className="flex gap-2 flex-wrap items-center justify-center">
            {orderedSnacks.map(([name,count])=>{
              const snackObj = SNACKS.find(s=>s.name===name)
              return <div key={name} className="flex flex-col items-center px-2">
                <div className="w-12 h-12 rounded shadow border-2 border-pink-200 bg-white/10 mb-1 flex items-center justify-center">
                  <SnackIcon name={snackObj?.name || name} size={40} />
                </div>
                <span className="text-white font-bold">{count} x {name}</span>
              </div>
            })}
          </div>
        </div>)
      }
      <button className="btn btn-secondary mt-6" onClick={() => window.location.hash = '#/'}>Back to Home</button>
    </div>
  )
}

