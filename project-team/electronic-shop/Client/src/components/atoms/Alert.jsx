import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'

const typeMap = {
  error: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: AlertCircle,
    iconColor: 'text-red-500'
  },
  danger: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: AlertCircle,
    iconColor: 'text-red-500'
  },
  success: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    icon: CheckCircle2,
    iconColor: 'text-green-500'
  },
  warning: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: AlertTriangle,
    iconColor: 'text-yellow-500'
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: Info,
    iconColor: 'text-blue-500'
  }
}

function Alert({ type = 'info', children, className = '' }) {
  if (!children) return null

  const style = typeMap[type] || typeMap.info
  const Icon = style.icon

  return (
    <div className={`flex items-start gap-3 p-4 !rounded-lg border ${style.bg} ${style.border} ${style.text} ${className}`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`} />
      <div className="text-sm font-medium leading-relaxed">
        {children}
      </div>
    </div>
  )
}

export default Alert
