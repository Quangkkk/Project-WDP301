function AuthTextField({
  label,
  id,
  error,
  helperText,
  icon: Icon,
  endAdornment,
  className = '',
  inputClassName = '',
  labelClassName = '',
  style,
  ...props
}) {
  const describedBy = error
    ? `${id}-error`
    : helperText
      ? `${id}-helper`
      : undefined

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className={`
            mb-2 block text-sm font-bold text-slate-700
            ${labelClassName}
          `}
        >
          {label}
        </label>
      )}

      <div className='relative'>
        {Icon && (
          <span
            className={`
              pointer-events-none absolute inset-y-0 left-0 z-10
              flex w-14 items-center justify-center
            `}
          >
            <Icon
              aria-hidden='true'
              className='h-5 w-5 shrink-0 text-slate-400'
            />
          </span>
        )}

        <input
          {...props}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`
            w-full !rounded-xl border bg-slate-50 py-3.5
            text-sm text-slate-900 shadow-sm outline-none
            transition placeholder:text-slate-400
            focus:bg-white focus:ring-4

            ${Icon ? '!pl-14' : '!pl-4'}
            ${endAdornment ? '!pr-14' : '!pr-4'}

            ${
              error
                ? `
                  border-red-300
                  focus:border-red-500
                  focus:ring-red-100
                `
                : `
                  border-slate-300
                  focus:border-orange-500
                  focus:ring-orange-100
                `
            }

            ${inputClassName}
          `}
          style={style}
        />

        {endAdornment && (
          <div
            className={`
              absolute inset-y-0 right-0 z-10
              flex w-14 items-center justify-center
            `}
          >
            {endAdornment}
          </div>
        )}
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          className='mt-1.5 text-xs font-medium text-red-600'
        >
          {error}
        </p>
      ) : helperText ? (
        <p
          id={`${id}-helper`}
          className='mt-1.5 text-xs text-slate-500'
        >
          {helperText}
        </p>
      ) : null}
    </div>
  )
}

export default AuthTextField