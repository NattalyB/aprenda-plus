import axios from 'axios';

const api = axios.create({
  baseURL: 'https://aprenda-plus-backend.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});
export default api;