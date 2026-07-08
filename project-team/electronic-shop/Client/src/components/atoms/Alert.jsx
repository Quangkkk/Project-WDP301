import BsAlert from 'react-bootstrap/Alert'

const variantMap = { error: 'danger', danger: 'danger', success: 'success', warning: 'warning', info: 'info' }

function Alert({ type = 'info', children, className = '' }) {
  if (!children) return null
  return <BsAlert variant={variantMap[type] || type} className={`rounded-4 border-0 shadow-sm ${className}`}>{children}</BsAlert>
}

export default Alert
