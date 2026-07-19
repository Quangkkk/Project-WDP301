import { Loader2 } from 'lucide-react'

// Map cac bien the (variant) sang class cua Tailwind
const variantStyles = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border border-transparent',
  secondary: 'bg-slate-800 text-white hover:bg-slate-900 focus:ring-slate-500 border border-transparent',
  outline: 'bg-transparent text-slate-700 hover:bg-slate-50 border border-slate-300 focus:ring-slate-500',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-500 border border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-transparent',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 border border-transparent',
  warning: 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500 border border-transparent',
  dark: 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900 border border-transparent',
}

// Map kich thuoc (size) sang class
const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
}

function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '', 
  isLoading = false, 
  disabled = false, 
  type = 'button',
  ...props 
}) {
  // Xu ly fallback cho nhung variant cu dang dung (react-bootstrap mapping)
  if (variant === 'light') variant = 'ghost'

  const baseStyles = 'inline-flex items-center justify-center font-semibold !rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const combinedClasses = `${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size] || sizeStyles.md} ${className}`

  return (
    <button
      type={type}
      className={combinedClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          <span>Vui lòng đợi...</span>
        </>
      ) : children}
    </button>
  )
}

export default Button
