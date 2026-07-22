import {
  Navigate,
} from 'react-router-dom'

function ResetPasswordPage() {
  return (
    <Navigate
      to='/forgot-password'
      replace
    />
  )
}

export default ResetPasswordPage