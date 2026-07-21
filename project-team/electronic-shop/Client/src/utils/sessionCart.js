const SESSION_CART_KEY = 'electronic_shop_session_id'
const GUEST_ORDER_TOKEN_PREFIX = 'electronic_shop_guest_order_token_'

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

  if (userId) {
    return { user_id: userId }
  }

  return { session_id: getSessionId() }
}

export const saveGuestOrderToken = (orderId, token) => {
  if (!orderId || !token) return
  sessionStorage.setItem(`${GUEST_ORDER_TOKEN_PREFIX}${orderId}`, token)
}

export const getGuestOrderToken = (orderId) => {
  if (!orderId) return ''
  return sessionStorage.getItem(`${GUEST_ORDER_TOKEN_PREFIX}${orderId}`) || ''
}

export const removeGuestOrderToken = (orderId) => {
  if (!orderId) return
  sessionStorage.removeItem(`${GUEST_ORDER_TOKEN_PREFIX}${orderId}`)
}
