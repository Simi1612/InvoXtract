import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })

function getToken() {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (!key) return null
    const data = JSON.parse(localStorage.getItem(key))
    return data?.access_token || null
  } catch {
    return null
  }
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
