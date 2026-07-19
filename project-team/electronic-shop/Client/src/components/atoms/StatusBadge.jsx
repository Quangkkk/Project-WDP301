function normalizeStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

const statusConfig = {
  active: {
    label: 'Còn hàng',
    className: 'bg-emerald-100 text-emerald-700',
  },
  available: {
    label: 'Còn hàng',
    className: 'bg-emerald-100 text-emerald-700',
  },
  'còn hàng': {
    label: 'Còn hàng',
    className: 'bg-emerald-100 text-emerald-700',
  },
  in_stock: {
    label: 'Còn hàng',
    className: 'bg-emerald-100 text-emerald-700',
  },

  out_of_stock: {
    label: 'Hết hàng',
    className: 'bg-red-100 text-red-700',
  },
  unavailable: {
    label: 'Hết hàng',
    className: 'bg-red-100 text-red-700',
  },
  'hết hàng': {
    label: 'Hết hàng',
    className: 'bg-red-100 text-red-700',
  },

  inactive: {
    label: 'Ngừng bán',
    className: 'bg-slate-100 text-slate-600',
  },
  pending: {
    label: 'Đang xử lý',
    className: 'bg-amber-100 text-amber-700',
  },
  completed: {
    label: 'Hoàn thành',
    className: 'bg-emerald-100 text-emerald-700',
  },
  cancelled: {
    label: 'Đã hủy',
    className: 'bg-red-100 text-red-700',
  },
}

function StatusBadge({ value, label, className = '' }) {
  const normalizedValue = normalizeStatus(value)
  const config = statusConfig[normalizedValue] || {
    label: label || value || 'Không xác định',
    className: 'bg-slate-100 text-slate-600',
  }

  return (
    <span
      className={`!rounded-pill px-3 py-2 text-xs font-black uppercase ${config.className} ${className}`}
    >
      {label || config.label}
    </span>
  )
}

export default StatusBadge