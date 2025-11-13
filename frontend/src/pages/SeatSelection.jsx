import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api/api'
import SnackIcon from '../components/SnackIcon'
import { SeatGrid } from '../components/SeatGrid'

const SNACKS = [
  { name: 'Popcorn', price: 180 },
  { name: 'Coke', price: 80 },
  { name: 'Nachos', price: 140 },
  { name: 'Samosa', price: 70 },
]

function Toast({msg, type, onClose}) {
  return (
    <div className={"toast " + (type||'')}>
      {msg}
      <button onClick={onClose} className="btn btn-ghost btn-sm ml-3">✕</button>
    </div>
  )
}

// Local inline SVG icons so images always render
function SnackImg({ alt }) {
  return <div className="w-20 h-20 mb-2 rounded shadow bg-white/10 flex items-center justify-center">
    <SnackIcon name={alt} size={70} />
  </div>
}

export function SeatSelection({ showId }) {
  const [step, setStep] = useState(0) // 0-seats, 1-snacks
  const [seats, setSeats] = useState({ rows: 0, cols: 0, booked: [] })
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [snacks, setSnacks] = useState({})
  const [bookingResult, setBookingResult] = useState(null)
  const wsRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    api.seats(showId).then(s => { setSeats(s); setLoading(false) })
    const ws = api.wsSeats(showId)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if(msg.type === 'seat_update') setSeats(msg.seats)
    }
    return () => ws.close()
  }, [showId])

  const toggle = (seat) => {
    setSelected(prev => prev.includes(seat) ? prev.filter(s => s !== seat) : [...prev, seat])
  }

  // compute seat subtotal locally so user sees price before confirming snacks
  const seatPrice = (seatLabel) => {
    if (!seatLabel) return 0
    const p = seatLabel[0]?.toUpperCase()
    // S=Standard(regular), P=Premium, R=Recliner
    if (p === 'R') return 500
    if (p === 'P') return 350
    return 200 // includes 'S' and any legacy/no-prefix labels
  }
  const seatSubtotal = selected.reduce((acc, s) => acc + seatPrice(s), 0)

  const book = async () => {
    setStep(1)
  }

  const snackAdd = (name) => setSnacks(s => ({...s, [name]: (s[name]||0)+1}))
  const snackRemove = (name) => setSnacks(s => { const n = {...s}; n[name]=Math.max(0,(n[name]||0)-1); return n })

  const confirmBooking = async () => {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    const userId = user?.user_id || 1
    try {
      // Use grouped booking so snacks + total + QR can be returned
      const payload = { user_id: userId, show_id: showId, seats: selected, snacks }
      const resp = await api.bookGroup(payload)
      setBookingResult(true); setToast({msg:'Booking Confirmed!', type:'bg-lime-600'})
      setSelected([])
      // store booking group result so Confirmation page can display QR
      try { localStorage.setItem('last_booking_group', JSON.stringify(resp)) } catch(_) {}
      setTimeout(()=> window.location.hash = `#/confirmation/ok?snacks="${encodeURIComponent(JSON.stringify(snacks))}"`, 1200)
    } catch(e) {
      setToast({msg:'Seat already taken', type:'bg-red-600'})
    }
  }

  // Step 0: pick seats
  if(step===0) return (
    <div className="relative z-10">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center text-white/90 drop-shadow">Select Seats</h1>
      <div className="card bg-gradient-to-br from-gray-800/90 to-indigo-800/80 max-w-3xl mx-auto relative z-20">
        {loading ? <div className="w-full h-44 shimmer rounded-xl" /> :
          <SeatGrid rows={seats.rows} cols={seats.cols} booked={seats.booked} selected={selected} onToggle={toggle} />}
        <div className="mt-6 flex gap-4 justify-center items-center flex-wrap">
          <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-700/60 to-pink-700/50 text-white/90 font-semibold shadow-md">Seats: <span className="font-extrabold">{selected.length}</span> • Subtotal: <span className="text-yellow-300 font-extrabold">₹{seatSubtotal}</span></div>
          <button onClick={book} disabled={selected.length===0} className="btn btn-warning w-44 disabled:opacity-40">Book {selected.length>0? selected.length + ' seat(s)': ''} &amp; Continue</button>
          <button className="btn btn-secondary" onClick={() => setSelected([])}>Clear</button>
        </div>
      </div>
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}
    </div>
  )
  // Step 1: snacks
  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center text-white/90 drop-shadow">Snacks &amp; Drinks</h1>
      <div className="max-w-3xl mx-auto card bg-gradient-to-br from-pink-700/80 to-indigo-700/70 flex flex-col md:flex-row gap-6 md:items-start mb-5">
        <div className="flex-1 grid grid-cols-2 md:grid-cols-2 gap-6">
          {SNACKS.map(snack => (
            <div key={snack.name} className="flex flex-col items-center p-3 rounded-lg bg-white/8 shadow-md hover:scale-105 transition-transform duration-150 hover:shadow-2xl">
              <SnackImg alt={snack.name} />
              <span className="font-bold text-lg text-white drop-shadow">{snack.name}</span>
              <span className="font-mono text-yellow-200">₹{snack.price}</span>
              <div className="flex gap-2 mt-2 items-center">
                <button className="btn btn-secondary btn-sm" onClick={()=>snackRemove(snack.name)}>-</button>
                <span className="bg-white/80 text-pink-900 font-bold px-3 py-1 rounded shadow">{snacks[snack.name]||0}</span>
                <button className="btn btn-secondary btn-sm" onClick={()=>snackAdd(snack.name)}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-4 pt-2 items-center">
          <div className="font-bold text-yellow-200 text-lg pb-1">Order Summary</div>
          <ul className="space-y-1 w-full">
            {Object.entries(snacks).filter(([_,count])=>count>0).length === 0 && <li className="text-pink-100">No snacks added!</li>}
            {Object.entries(snacks).filter(([_,count])=>count>0).map(([name, count])=>(
              <li key={name} className="flex justify-between gap-2 text-white font-semibold">
                <span>{name}</span> <span>{count}</span> <span>₹{SNACKS.find(s=>s.name===name).price * count}</span>
              </li>
            ))}
          </ul>
          <div className="text-white/80 text-xl font-extrabold pt-3 pb-1">Total ₹{Object.entries(snacks).reduce((acc,[n,c])=>(acc+(SNACKS.find(s=>s.name===n).price*c)),0)}</div>
          <button className="btn btn-success btn-lg w-full mt-1" onClick={confirmBooking} disabled={bookingResult===true}>Confirm &amp; Pay</button>
        </div>
      </div>
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}
    </div>
  )
}

