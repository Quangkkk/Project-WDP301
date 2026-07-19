function QuantityControl({ value = 1, min = 1, max = 99, onChange }) {
  const setValue = (nextValue) => {
    const number = Math.max(min, Math.min(max, Number(nextValue) || min))
    onChange?.(number)
  }

  return (
    <div className='d-inline-flex align-items-center !rounded-pill border border-slate-200 bg-white p-1 shadow-sm'>
      <button type='button' className='flex h-9 w-9 items-center justify-center !rounded-full border-0 bg-slate-100 font-black text-slate-700' onClick={() => setValue(value - 1)}>-</button>
      <input className='h-9 w-14 border-0 bg-transparent text-center font-bold outline-none' value={value} onChange={(e) => setValue(e.target.value)} />
      <button type='button' className='flex h-9 w-9 items-center justify-center !rounded-full border-0 bg-blue-600 font-black text-white' onClick={() => setValue(value + 1)}>+</button>
    </div>
  )
}

export default QuantityControl
