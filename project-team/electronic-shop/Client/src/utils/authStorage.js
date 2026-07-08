const TOKEN_KEY = 'electronic_shop_token'
const USER_KEY = 'electronic_shop_user'

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY)

export const getCurrentUser = () => {
  const rawUser = localStorage.getItem(USER_KEY)
  if (!rawUser) return null

  try {
    return JSON.parse(rawUser)
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export const saveAuth = ({ token, user }) => {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const updateStoredUser = (user) => {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const getUserRole = (user = getCurrentUser()) => {
  return String(user?.role_id?.code || user?.role || user?.role_code || '').toUpperCase()
}

export const getUserId = (user = getCurrentUser()) => user?._id || user?.id || user?.user_id || ''

export const isAuthenticated = () => Boolean(getAccessToken())
