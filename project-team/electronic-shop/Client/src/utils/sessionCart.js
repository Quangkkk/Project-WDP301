const SESSION_CART_KEY = 'electronic_shop_session_id'

export const getSessionId = () => {
  let sessionId = localStorage.getItem(SESSION_CART_KEY)

  if (!sessionId) {
    sessionId = `guest_${Date.now()}_${Math.random().toString(16).slice(2)}`
    localStorage.setItem(SESSION_CART_KEY, sessionId)
  }

  return sessionId
}

export const getCartIdentity = (user) => {
  const userId = user?._id || user?.id || user?.user_id
  if (userId) return { user_id: userId }
  return { session_id: getSessionId() }
}
