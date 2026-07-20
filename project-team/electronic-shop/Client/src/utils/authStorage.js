const TOKEN_KEY = 'electronic_shop_token'
const USER_KEY = 'electronic_shop_user'

export const AUTH_UPDATED_EVENT = 'electronic-shop-auth-updated'

const notifyAuthUpdated = () => {
  window.dispatchEvent(new Event(AUTH_UPDATED_EVENT))
}

const writeUser = (user) => {
  if (!user) return

  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch (error) {
    // Fallback neu anh base64 qua lon lam localStorage vuot quota.
    const safeUser = { ...user }
    if (String(safeUser.img_url || '').startsWith('data:image/')) safeUser.img_url = ''
    if (String(safeUser.avatar || '').startsWith('data:image/')) safeUser.avatar = ''
    if (String(safeUser.avatar_url || '').startsWith('data:image/')) safeUser.avatar_url = ''
    localStorage.setItem(USER_KEY, JSON.stringify(safeUser))
  }

  notifyAuthUpdated()
}

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
  if (user) writeUser(user)
  else notifyAuthUpdated()
}

export const updateStoredUser = (user) => {
  writeUser(user)
}

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  notifyAuthUpdated()
}

export const getUserRole = (user = getCurrentUser()) => {
  return String(user?.role_id?.code || user?.role || user?.role_code || '').toUpperCase()
}

export const getUserId = (user = getCurrentUser()) => {
  return user?._id || user?.id || user?.user_id || ''
}

export const isAuthenticated = () => Boolean(getAccessToken())