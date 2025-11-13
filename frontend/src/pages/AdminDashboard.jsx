import React, { useEffect, useState } from 'react'
import { api } from '../api/api'
import { MetricsCard } from '../components/MetricsCard'

export function AdminDashboard() {
  const [metrics, setMetrics] = useState({ requests_served: {}, avg_response_ms: {}, conn_counts: {} })
  const [title, setTitle] = useState('')
  const [theatre, setTheatre] = useState('')
  const [movieId, setMovieId] = useState('1')
  const [showTime, setShowTime] = useState('2025-11-01T18:00:00')
  const [rows, setRows] = useState(8)
  const [cols, setCols] = useState(12)
  const [movies, setMovies] = useState([])
  const [shows, setShows] = useState([])
  const [clockSync, setClockSync] = useState(null)
  const [lamportClock, setLamportClock] = useState(null)
  const [consistencyResult, setConsistencyResult] = useState(null)
  const [electionResult, setElectionResult] = useState(null)
  const [replicationStatus, setReplicationStatus] = useState(null)

  useEffect(() => {
    const t = setInterval(() => api.lbMetrics().then(setMetrics).catch(() => {}), 1000)
    api.movies().then(setMovies)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    api.shows(parseInt(movieId)).then(setShows).catch(()=>setShows([]))
  }, [movieId])

  const addMovie = async () => {
    await api.addMovie({ title })
    alert('Movie added')
    setTitle('')
    setMovies(await api.movies())
  }
  const addShow = async () => {
    await api.addShow({ movie_id: parseInt(movieId), theatre, show_time: showTime, rows: parseInt(rows), cols: parseInt(cols) })
    alert('Show added')
    setTheatre('')
    setShows(await api.shows(parseInt(movieId)))
  }
  const deleteMovie = async (id) => { await fetch(`http://127.0.0.1:8000/admin/movies/${id}`, { method: 'DELETE' }); setMovies(await api.movies()); setShows([]) }
  const deleteShow = async (id) => { await fetch(`http://127.0.0.1:8000/admin/shows/${id}`, { method: 'DELETE' }); setShows(await api.shows(parseInt(movieId))) }
  const runElection = async (algo) => {
    const res = await api.electionStart(algo)
    setElectionResult(res)
    alert(`Leader: ${res.leader} (algo: ${res.algorithm})`)
  }

  const testClockSync = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/clock/cristian').then(r => r.json())
      console.log('Cristian response:', res)
      const syncData = {
        server_time: new Date(res.server_time * 1000).toLocaleString(),
        client_time: new Date().toLocaleString(),
        offset_ms: Math.abs(res.server_time * 1000 - Date.now())
      }
      console.log('Setting clock sync:', syncData)
      setClockSync(syncData)
      alert('Clock synchronized! Check the results below.')
    } catch (err) {
      console.error('Clock sync error:', err)
      alert('Error: ' + err.message)
    }
  }

  const getLamportClock = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/clock/lamport').then(r => r.json())
      console.log('Lamport response:', res)
      setLamportClock(res)
      alert(`Lamport Clock: ${res.lamport}`)
    } catch (err) {
      console.error('Lamport clock error:', err)
      alert('Error: ' + err.message)
    }
  }

  const testConsistency = async (model) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/consistency/test?model=${model}`).then(r => r.json())
      console.log('Consistency test response:', res)
      setConsistencyResult({ model, ...res })
      alert(`${model.charAt(0).toUpperCase() + model.slice(1)} consistency test completed! Check results below.`)
    } catch (err) {
      console.error('Consistency test error:', err)
      alert('Error: ' + err.message)
    }
  }

  const getReplicationStatus = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/replication/status').then(r => r.json())
      console.log('Replication status:', res)
      setReplicationStatus(res)
      alert(`Replication Status: ${res.healthy_servers}/${res.total_servers} servers healthy`)
    } catch (err) {
      console.error('Replication status error:', err)
      alert('Error: ' + err.message)
    }
  }

  const simulateFailure = async (serverId) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/replication/simulate-failure?server_id=${serverId}`, {
        method: 'POST'
      }).then(r => r.json())
      console.log('Failure simulation:', res)
      alert(`Server ${serverId} failed! System ${res.system_operational ? 'still operational' : 'DOWN'}. Redirecting to: ${res.redirecting_to.join(', ')}`)
      // Refresh status
      await getReplicationStatus()
    } catch (err) {
      console.error('Failure simulation error:', err)
      alert('Error: ' + err.message)
    }
  }

  const recoverServer = async (serverId) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/replication/recover?server_id=${serverId}`, {
        method: 'POST'
      }).then(r => r.json())
      console.log('Server recovery:', res)
      alert(`Server ${serverId} recovered! Status: ${res.status}`)
      // Refresh status
      await getReplicationStatus()
    } catch (err) {
      console.error('Server recovery error:', err)
      alert('Error: ' + err.message)
    }
  }

  const [showAdvanced, setShowAdvanced] = useState(false)
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-semibold mb-2">Add Movie</div>
          <input className="border p-2 rounded w-full mb-2" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <button className="btn btn-primary" onClick={addMovie}>Add Movie</button>
          <div className="mt-3 text-sm text-gray-600">Existing Movies</div>
          <ul className="mt-1 space-y-1">
            {movies.map(m => (
              <li key={m.id} className="flex justify-between items-center">
                <span>#{m.id} {m.title}</span>
                <button className="btn btn-danger" onClick={()=>deleteMovie(m.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="font-semibold mb-2">Add Show</div>
          <div className="grid grid-cols-2 gap-2">
            <input className="border p-2 rounded" placeholder="Movie ID" value={movieId} onChange={e => setMovieId(e.target.value)} />
            <input className="border p-2 rounded" placeholder="Theatre" value={theatre} onChange={e => setTheatre(e.target.value)} />
            <input className="border p-2 rounded col-span-2" placeholder="Show Time" value={showTime} onChange={e => setShowTime(e.target.value)} />
            <input className="border p-2 rounded" placeholder="Rows" value={rows} onChange={e => setRows(e.target.value)} />
            <input className="border p-2 rounded" placeholder="Cols" value={cols} onChange={e => setCols(e.target.value)} />
          </div>
          <button className="btn btn-primary mt-2" onClick={addShow}>Add Show</button>
          <div className="mt-3 text-sm text-gray-600">Shows for Movie #{movieId}</div>
          <ul className="mt-1 space-y-1">
            {shows.map(s => (
              <li key={s.id} className="flex justify-between items-center">
                <span>#{s.id} {s.theatre} - {new Date(s.show_time).toLocaleString()}</span>
                <button className="btn btn-danger" onClick={()=>deleteShow(s.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Advanced - Distributed Systems Tests</div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAdvanced(v => !v)}>{showAdvanced ? 'Hide' : 'Show'}</button>
        </div>
        {showAdvanced && (
          <div className="mt-4 space-y-6">
            {/* Load Balancer Metrics */}
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="font-semibold text-lg mb-3">📊 Load Balancer Metrics</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Requests Served</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {Object.entries(metrics.requests_served || {}).map(([k, v]) => (
                      <div key={k} className="text-sm">Server {k}: {v}</div>
                    ))}
                    {Object.keys(metrics.requests_served || {}).length === 0 && <div className="text-sm text-gray-400">No data</div>}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Avg Response Time (ms)</div>
                  <div className="text-2xl font-bold text-green-700">
                    {Object.entries(metrics.avg_response_ms || {}).map(([k, v]) => (
                      <div key={k} className="text-sm">Server {k}: {v.toFixed(1)}ms</div>
                    ))}
                    {Object.keys(metrics.avg_response_ms || {}).length === 0 && <div className="text-sm text-gray-400">No data</div>}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Active Connections</div>
                  <div className="text-2xl font-bold text-purple-700">
                    {Object.entries(metrics.conn_counts || {}).map(([k, v]) => (
                      <div key={k} className="text-sm">Server {k}: {v}</div>
                    ))}
                    {Object.keys(metrics.conn_counts || {}).length === 0 && <div className="text-sm text-gray-400">No data</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Leader Election */}
            <div className="border-l-4 border-amber-500 pl-4">
              <div className="font-semibold text-lg mb-3">👑 Leader Election Algorithms</div>
              <div className="flex gap-2 mb-3">
                <button className="btn btn-primary" onClick={() => runElection('bully')}>Run Bully Election</button>
                <button className="btn btn-primary" onClick={() => runElection('ring')}>Run Ring Election</button>
              </div>
              {electionResult && (
                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-700">
                    <div><strong>Algorithm:</strong> {electionResult.algorithm}</div>
                    <div><strong>Elected Leader:</strong> Node {electionResult.leader}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Clock Synchronization */}
            <div className="border-l-4 border-indigo-500 pl-4">
              <div className="font-semibold text-lg mb-3 text-gray-800">🕐 Clock Synchronization</div>
              <div className="flex gap-2 mb-3">
                <button className="btn btn-secondary" onClick={testClockSync}>Test Cristian's Algorithm</button>
                <button className="btn btn-secondary" onClick={getLamportClock}>Get Lamport Clock</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clockSync && (
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <div className="font-medium mb-2 text-indigo-900">Cristian's Algorithm Result</div>
                    <div className="text-sm space-y-1 text-gray-800">
                      <div><strong className="text-indigo-700">Server Time:</strong> {clockSync.server_time}</div>
                      <div><strong className="text-indigo-700">Client Time:</strong> {clockSync.client_time}</div>
                      <div><strong className="text-indigo-700">Offset:</strong> {clockSync.offset_ms.toFixed(0)}ms</div>
                    </div>
                  </div>
                )}
                {lamportClock && (
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <div className="font-medium mb-2 text-indigo-900">Lamport Logical Clock</div>
                    <div className="text-sm text-gray-800">
                      <div><strong className="text-indigo-700">Current Value:</strong> {lamportClock.lamport}</div>
                      <div className="text-xs text-gray-600 mt-1">Increments with each request to maintain causality</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Consistency Models */}
            <div className="border-l-4 border-rose-500 pl-4">
              <div className="font-semibold text-lg mb-3 text-gray-800">🔄 Consistency Model Testing</div>
              <div className="flex gap-2 mb-3 flex-wrap">
                <button className="btn btn-ghost" onClick={() => testConsistency('eventual')}>Test Eventual</button>
                <button className="btn btn-ghost" onClick={() => testConsistency('strong')}>Test Strong</button>
                <button className="btn btn-ghost" onClick={() => testConsistency('causal')}>Test Causal</button>
                <button className="btn btn-ghost" onClick={() => testConsistency('sequential')}>Test Sequential</button>
              </div>
              {consistencyResult && (
                <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
                  <div className="font-medium mb-3 text-rose-900">
                    Consistency Test Result: <span className="text-rose-700">{consistencyResult.model.toUpperCase()}</span>
                  </div>
                  <div className="text-sm space-y-2 text-gray-800">
                    <div><strong className="text-rose-700">Status:</strong> {consistencyResult.status}</div>
                    {consistencyResult.description && (
                      <div><strong className="text-rose-700">Description:</strong> {consistencyResult.description}</div>
                    )}
                    {consistencyResult.replicas_tested && (
                      <div><strong className="text-rose-700">Replicas Tested:</strong> {consistencyResult.replicas_tested}</div>
                    )}
                    {consistencyResult.test_duration_ms && (
                      <div><strong className="text-rose-700">Test Duration:</strong> {consistencyResult.test_duration_ms.toFixed(2)} ms</div>
                    )}
                    {consistencyResult.convergence_time_ms && (
                      <div><strong className="text-rose-700">Convergence Time:</strong> {consistencyResult.convergence_time_ms.toFixed(2)} ms</div>
                    )}
                    {consistencyResult.sync_latency_ms && (
                      <div><strong className="text-rose-700">Sync Latency:</strong> {consistencyResult.sync_latency_ms.toFixed(2)} ms</div>
                    )}
                    {consistencyResult.causal_dependencies && (
                      <div><strong className="text-rose-700">Causal Dependencies:</strong> {consistencyResult.causal_dependencies}</div>
                    )}
                    {consistencyResult.total_order_maintained !== undefined && (
                      <div><strong className="text-rose-700">Total Order Maintained:</strong> {consistencyResult.total_order_maintained ? 'Yes' : 'No'}</div>
                    )}
                    {consistencyResult.consistency_level && (
                      <div><strong className="text-rose-700">Consistency Level:</strong> {consistencyResult.consistency_level}</div>
                    )}
                    <div className="mt-3 pt-3 border-t border-rose-200">
                      <details className="cursor-pointer">
                        <summary className="text-xs text-gray-600 hover:text-gray-800">Show Raw JSON</summary>
                        <pre className="bg-white p-2 rounded border mt-2 overflow-auto max-h-40 text-xs">
                          {JSON.stringify(consistencyResult, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Replication & Failover */}
            <div className="border-l-4 border-green-500 pl-4">
              <div className="font-semibold text-lg mb-3 text-gray-800">🔄 Replication & Failover Testing</div>
              <div className="mb-3">
                <button className="btn btn-primary" onClick={getReplicationStatus}>Check Server Status</button>
              </div>
              
              {replicationStatus && (
                <div className="space-y-4">
                  {/* Overall Status */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="font-medium mb-3 text-green-900">System Health Overview</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-800">
                      <div className="bg-white p-3 rounded border">
                        <div className="text-xs text-gray-600">Total Servers</div>
                        <div className="text-2xl font-bold text-green-700">{replicationStatus.total_servers}</div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-xs text-gray-600">Healthy</div>
                        <div className="text-2xl font-bold text-green-600">{replicationStatus.healthy_servers}</div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-xs text-gray-600">Failed</div>
                        <div className="text-2xl font-bold text-red-600">{replicationStatus.failed_servers}</div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-xs text-gray-600">Can Handle Failure</div>
                        <div className={`text-2xl font-bold ${replicationStatus.can_handle_failure ? 'text-green-600' : 'text-red-600'}`}>
                          {replicationStatus.can_handle_failure ? '✓' : '✗'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Servers */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="font-medium mb-3 text-green-900">Server Details</div>
                    <div className="space-y-2">
                      {Object.entries(replicationStatus.servers).map(([serverId, info]) => (
                        <div key={serverId} className={`p-3 rounded-lg border ${info.status === 'healthy' ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xl ${info.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                                {info.status === 'healthy' ? '●' : '○'}
                              </span>
                              <span className="font-medium text-gray-800">Server {serverId}</span>
                              <span className={`text-xs px-2 py-1 rounded ${info.status === 'healthy' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                {info.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              {info.status === 'healthy' ? (
                                <button 
                                  className="btn btn-danger btn-sm" 
                                  onClick={() => simulateFailure(serverId)}
                                >
                                  Simulate Failure
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-success btn-sm" 
                                  onClick={() => recoverServer(serverId)}
                                >
                                  Recover Server
                                </button>
                              )}
                            </div>
                          </div>
                          {info.status === 'healthy' && (
                            <div className="text-xs text-gray-700 space-y-1 ml-7">
                              <div><strong>Replica Lag:</strong> {info.replica_lag_ms} ms</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="font-medium mb-2 text-blue-900">💡 How to Demonstrate Failover</div>
                    <div className="text-sm text-gray-700 space-y-1">
                      <div>1. Click "Simulate Failure" on any server to mark it as failed</div>
                      <div>2. Notice the system remains operational if at least 1 server is healthy</div>
                      <div>3. The load balancer automatically redirects traffic to healthy servers</div>
                      <div>4. Click "Recover Server" to bring the failed server back online</div>
                      <div>5. The system will resynchronize data with the recovered server</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

