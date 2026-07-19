function TextField({ label, id, error, className = '', ...props }) {
  // Thay the Form.Group va Form.Control cua react-bootstrap bang the div/input thuan Tailwind
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block mb-2 text-sm font-bold text-slate-700">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full !rounded-md border px-4 py-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 ${
          error 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50' 
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
        }`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
      )}
    </div>
  )
}

export default TextField
