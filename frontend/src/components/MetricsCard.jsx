import React from 'react'

export function MetricsCard({ title, data }) {
  return (
    <div className="card !text-white">
      <div className="font-semibold mb-2">{title}</div>
      <div className="text-sm text-gray-700 space-y-1">
        {Object.entries(data || {}).map(([k, v]) => (
          <div key={k} className="flex justify-between"><span>{k}</span><span>{typeof v === 'number' ? v.toFixed ? v.toFixed(1) : v : String(v)}</span></div>
        ))}
      </div>
    </div>
  )
}

