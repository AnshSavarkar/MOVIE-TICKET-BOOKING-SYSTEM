import axios from 'axios'

export const BASE = 'http://127.0.0.1:8000'

export const api = {
  async movies() { return (await axios.get(`${BASE}/movies`)).data },
  async shows(movieId) { return (await axios.get(`${BASE}/shows/${movieId}`)).data },
  async seats(showId) { return (await axios.get(`${BASE}/seats/${showId}`)).data },
  async book(payload) { return (await axios.post(`${BASE}/book`, payload)).data },
  async bookGroup(payload) { return (await axios.post(`${BASE}/book_group`, payload)).data },
  async getBookingGroup(id) { return (await axios.get(`${BASE}/booking_group/${id}`)).data },
  async bookings(userId) { return (await axios.get(`${BASE}/bookings/${userId}`)).data },
  async addMovie(payload) { return (await axios.post(`${BASE}/admin/movies`, payload)).data },
  async addShow(payload) { return (await axios.post(`${BASE}/admin/shows`, payload)).data },
  async lbMetrics() { return (await axios.get(`${BASE}/lb/metrics`)).data },
  async electionStart(algorithm) { return (await axios.post(`${BASE}/election/start?algorithm=${algorithm}`)).data },
  wsSeats(showId) { return new WebSocket(`ws://127.0.0.1:8000/ws/seats/${showId}`) },
}

