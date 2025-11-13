import React from 'react'

function SeatIcon({ state, type }) {
  // state: available | booked | selected
  // type: regular | premium | recliner
  let baseColor = '#10b981' // regular green (emerald)
  if (type === 'premium') baseColor = '#f59e0b' // amber/gold
  if (type === 'recliner') baseColor = '#ec4899' // pink/magenta
  let color = state === 'booked' ? '#6b7280' : state === 'selected' ? '#3b82f6' : baseColor
  let opacity = state === 'booked' ? 0.5 : 1
  let strokeColor = state === 'selected' ? '#60a5fa' : state === 'booked' ? '#9ca3af' : color
  
  // More compact, square-ish seat icon
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" style={{opacity}} aria-label={state+" seat"}>
      <rect x="2" y="6" width="20" height="12" rx="3" fill={color} stroke={strokeColor} strokeWidth="1.2"/>
      <rect x="4" y="16" width="16" height="3" rx="1.5" fill={color} stroke={strokeColor} strokeWidth="1"/>
    </svg>
  )
}

// seatType layout: derive type based on row index: last 2 rows = recliner, two before = premium
export function SeatGrid({ rows, cols, booked, selected, onToggle }) {
  // Build a 2D array of seats by row so we can render row labels and aisles
  const rowsArr = []
  for (let r = 0; r < rows; r++) {
    const rowChar = String.fromCharCode(65 + r)
    const rowSeats = []
    for (let c = 0; c < cols; c++) {
      let type = 'regular'
      if (r >= Math.max(0, rows - 2)) type = 'recliner'
      else if (r >= Math.max(0, rows - 4)) type = 'premium'
      // Use unique, unambiguous type code prefixes: S=Standard(regular), P=Premium, R=Recliner
      const typeCode = type === 'recliner' ? 'R' : (type === 'premium' ? 'P' : 'S')
      const id = `${typeCode}${rowChar}${c + 1}`
      rowSeats.push({ id, row: rowChar, col: c + 1, type })
    }
    rowsArr.push({ row: rowChar, seats: rowSeats })
  }

  // helper to compute price for tooltip
  const priceOf = (t) => t === 'recliner' ? 500 : t === 'premium' ? 350 : 200

  // render a curved screen indicator and compact grid
  return (
    <div className="w-full">
      <div className="mx-auto max-w-4xl px-4">
        {/* Curved screen */}
        <div className="relative mb-8">
          <div className="curved-screen mx-auto"></div>
          <div className="text-center text-xs text-gray-300 font-semibold tracking-widest mt-2">SCREEN</div>
        </div>
        
        {/* Seat grid with compact spacing */}
        <div className="flex flex-col gap-1.5">
          {rowsArr.map((rObj, rIdx) => {
            const isReclinerRow = rObj.seats[0]?.type === 'recliner'
            const isPremiumRow = rObj.seats[0]?.type === 'premium'
            
            return (
              <div key={rObj.row} className="flex items-center gap-2 justify-center">
                {/* row label on left */}
                <div className="w-8 text-xs text-white/80 font-bold text-right pr-2">{rObj.row}</div>
                
                <div className="flex items-center gap-1">
                  {rObj.seats.map((s, idx) => {
                    // insert aisle gap after half the columns (approx.) for theater feel
                    const half = Math.floor(cols / 2)
                    const isAisle = idx === half
                    const isBooked = (booked || []).includes(s.id) || (booked || []).includes(`${s.row}${s.col}`)
                    const isSel = (selected || []).includes(s.id) || (selected || []).includes(`${s.row}${s.col}`)
                    const state = isBooked ? 'booked' : isSel ? 'selected' : 'available'
                    
                    return (
                      <React.Fragment key={s.id}>
                        <button
                          className={`seat-btn rounded relative z-30 ${isBooked? 'seat-booked' : isSel ? 'seat-selected' : 'seat-available'} ${isReclinerRow ? 'seat-recliner' : isPremiumRow ? 'seat-premium' : 'seat-regular'}`}
                          disabled={isBooked}
                          aria-label={s.id + (isBooked? ' (Booked)' : isSel? ' (Selected)':' (Available)')}
                          title={`${s.type.toUpperCase()} • ₹${priceOf(s.type)} • ${s.row}${s.col} ${isBooked? '(Booked)': ''}`}
                          onClick={() => onToggle(s.id)}
                          style={{ pointerEvents: isBooked ? 'none' : 'auto' }}>
                          <SeatIcon state={state} type={s.type} />
                        </button>
                        {isAisle && <div className="w-6" />}
                      </React.Fragment>
                    )
                  })}
                </div>
                
                {/* row label on right for theatre feel */}
                <div className="w-8 text-xs text-white/80 font-bold text-left pl-2">{rObj.row}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-8 text-xs items-center justify-center text-white/90 flex-wrap">
        <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg">
          <SeatIcon state="available" type="regular"/> <span>Available</span>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg">
          <SeatIcon state="selected" type="regular"/> <span>Selected</span>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg">
          <SeatIcon state="booked" type="regular"/> <span>Booked</span>
        </div>
      </div>
      <div className="flex gap-4 mt-3 text-xs items-center justify-center text-white/80">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500"></div> Regular ₹200
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500"></div> Premium ₹350
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-pink-500"></div> Recliner ₹500
        </div>
      </div>
    </div>
  )
}

