import Badge from 'react-bootstrap/Badge'

const variants = {
  active: 'success',
  visible: 'success',
  published: 'success',
  completed: 'success',
  delivered: 'success',
  paid: 'success',
  inactive: 'secondary',
  draft: 'secondary',
  pending: 'warning',
  processing: 'info',
  confirmed: 'info',
  shipping: 'primary',
  open: 'primary',
  unpaid: 'secondary',
  unverified: 'warning',
  blocked: 'danger',
  cancelled: 'danger',
  failed: 'danger',
  closed: 'dark',
}

function StatusBadge({ value, className = '' }) {
  const normalized = String(value || 'unknown').toLowerCase()
  return <Badge bg={variants[normalized] || 'secondary'} className={`rounded-pill px-3 py-2 text-uppercase ${className}`}>{normalized}</Badge>
}

export default StatusBadge
