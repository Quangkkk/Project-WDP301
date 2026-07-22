import { Loader2 } from 'lucide-react'

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

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
}

function Button({
  as: Component = 'button',
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) {
  if (variant === 'light') variant = 'ghost'

  const isDisabled = disabled || isLoading
  const baseStyles =
    'inline-flex items-center justify-center font-semibold !rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const combinedClasses = `${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size] || sizeStyles.md} ${className}`

  const handleClick = (event) => {
    if (isDisabled) {
      event.preventDefault()
      return
    }

    onClick?.(event)
  }

  const componentProps =
    Component === 'button'
      ? { type, disabled: isDisabled }
      : { 'aria-disabled': isDisabled || undefined }

  return (
    <Component
      className={combinedClasses}
      onClick={handleClick}
      {...componentProps}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          <span>Vui lòng đợi...</span>
        </>
      ) : (
        children
      )}
    </Component>
  )
}

export default Button