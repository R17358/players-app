import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sv_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sv_token');
      localStorage.removeItem('sv_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  logout:   ()     => api.post('/auth/logout'),
  getMe:    ()     => api.get('/auth/me'),
  updateProfile:  (data) => api.put('/auth/updateprofile', data),
  updatePassword: (data) => api.put('/auth/updatepassword', data),
  updateAvatar:   (form) => api.put('/auth/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  forgotPassword: (data) => api.post('/auth/forgotpassword', data),
  resetPassword:  (token, data) => api.put(`/auth/resetpassword/${token}`, data),
};

// ── Users ─────────────────────────────────────────────────────────
export const userAPI = {
  getProfile:   (username) => api.get(`/users/${username}`),
  toggleFollow: (id)       => api.post(`/users/${id}/follow`),
  getFollowers: (id)       => api.get(`/users/${id}/followers`),
  getFollowing: (id)       => api.get(`/users/${id}/following`),
  search:       (params)   => api.get('/users/search', { params }),
  getLeaderboard: (params) => api.get('/users/leaderboard', { params }),
  getNotifications: ()     => api.get('/users/me/notifications'),
  markNotificationsRead: () => api.put('/users/me/notifications/read'),
  getWallet:    ()         => api.get('/users/me/wallet'),
  getSuggestions: ()       => api.get('/users/me/suggestions'),
  getUserTournaments: (id) => api.get(`/users/${id}/tournaments`),
};

// ── Tournaments ───────────────────────────────────────────────────
export const tournamentAPI = {
  getAll:      (params)   => api.get('/tournaments', { params }),
  getUpcoming: (params)   => api.get('/tournaments/upcoming', { params }),
  getOne:      (slugOrId) => api.get(`/tournaments/${slugOrId}`),
  create:      (data)     => api.post('/tournaments', data),
  update:      (id, data) => api.put(`/tournaments/${id}`, data),
  delete:      (id)       => api.delete(`/tournaments/${id}`),
  publish:     (id)       => api.put(`/tournaments/${id}/publish`),
  cancel:      (id, data) => api.put(`/tournaments/${id}/cancel`, data),
  uploadBanner:(id, form) => api.put(`/tournaments/${id}/banner`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  toggleBookmark:(id)     => api.post(`/tournaments/${id}/bookmark`),
  getRegistrations: (id, params) => api.get(`/tournaments/${id}/registrations`, { params }),
  generateBracket:  (id)  => api.post(`/tournaments/${id}/generate-bracket`),
  updateMatch: (id, idx, data) => api.put(`/tournaments/${id}/matches/${idx}`, data),
  declareResults: (id, data) => api.put(`/tournaments/${id}/results`, data),
  getMyTournaments: (params) => api.get('/tournaments/my', { params }),
};

// ── Registrations ─────────────────────────────────────────────────
export const registrationAPI = {
  initiate:      (data) => api.post('/registrations/initiate', data),
  verifyPayment: (data) => api.post('/registrations/verify-payment', data),
  getMy:         (params) => api.get('/registrations/my', { params }),
  getOne:        (id)   => api.get(`/registrations/${id}`),
  cancel:        (id)   => api.put(`/registrations/${id}/cancel`),
};

// ── Posts ─────────────────────────────────────────────────────────
export const postAPI = {
  getFeed:    (params) => api.get('/posts/feed', { params }),
  getExplore: (params) => api.get('/posts/explore', { params }),
  getUserPosts: (userId, params) => api.get(`/posts/user/${userId}`, { params }),
  create:     (data)   => api.post('/posts', data),
  like:       (id)     => api.post(`/posts/${id}/like`),
  comment:    (id, data) => api.post(`/posts/${id}/comment`, data),
  delete:     (id)     => api.delete(`/posts/${id}`),
};

// ── Reviews ───────────────────────────────────────────────────────
export const reviewAPI = {
  create:           (data) => api.post('/reviews', data),
  getForOrganiser:  (id)   => api.get(`/reviews/organiser/${id}`),
  getForTournament: (id)   => api.get(`/reviews/tournament/${id}`),
};

// ── Teams ─────────────────────────────────────────────────────────
export const teamAPI = {
  create:      (data) => api.post('/teams', data),
  getOne:      (id)   => api.get(`/teams/${id}`),
  getMy:       ()     => api.get('/teams/me/my'),
  invite:      (id, data) => api.post(`/teams/${id}/invite`, data),
  accept:      (id)   => api.put(`/teams/${id}/accept`),
  leave:       (id)   => api.delete(`/teams/${id}/leave`),
};

// ── Admin ─────────────────────────────────────────────────────────
export const adminAPI = {
  getStats:       () => api.get('/admin/stats'),
  getPending:     () => api.get('/admin/tournaments/pending'),
  approveTournament: (id, data) => api.put(`/admin/tournaments/${id}/approve`, data),
  rejectTournament:  (id, data) => api.put(`/admin/tournaments/${id}/reject`, data),
  featureTournament: (id) => api.put(`/admin/tournaments/${id}/feature`),
  getAllUsers:   (params) => api.get('/admin/users', { params }),
  updateUser:   (id, data) => api.put(`/admin/users/${id}`, data),
  verifyOrganiser: (id)    => api.put(`/admin/users/${id}/verify-organiser`),
  deleteUser:   (id)       => api.delete(`/admin/users/${id}`),
  announce:     (data)     => api.post('/admin/announce', data),
};

export default api;
