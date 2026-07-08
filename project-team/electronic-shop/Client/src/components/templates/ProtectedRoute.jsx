import { Navigate, useLocation } from 'react-router-dom'
import { getCurrentUser, getUserRole, isAuthenticated } from '../../utils/authStorage'

function ProtectedRoute({ children, allowedRoles = [], redirectTo = '/login' }) {
  const location = useLocation()
  const user = getCurrentUser()
  const loggedIn = isAuthenticated() && Boolean(user)

  if (!loggedIn) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (allowedRoles.length > 0) {
    const role = getUserRole(user)
    const normalizedAllowedRoles = allowedRoles.map((item) => String(item).toUpperCase())

    if (!normalizedAllowedRoles.includes(role)) {
      return <Navigate to='/' replace />
    }
  }

  return children
}

export default ProtectedRoute