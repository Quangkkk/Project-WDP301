import Spinner from 'react-bootstrap/Spinner'
import BsButton from 'react-bootstrap/Button'

const variantMap = {
  primary: 'primary',
  secondary: 'outline-dark',
  ghost: 'light',
  danger: 'danger',
  success: 'success',
  warning: 'warning',
  dark: 'dark',
}

function Button({ children, variant = 'primary', className = '', isLoading = false, disabled = false, ...props }) {
  return (
    <BsButton
      variant={variantMap[variant] || variant}
      className={`rounded-pill px-4 py-2 fw-semibold shadow-sm ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className='d-inline-flex align-items-center gap-2'>
          <Spinner animation='border' size='sm' />
          Loading...
        </span>
      ) : children}
    </BsButton>
  )
}

export default Button
