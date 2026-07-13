import Spinner from 'react-bootstrap/Spinner'

function LoadingText({ children = 'Đang tải dữ liệu...' }) {
  return (
    <div className='flex items-center gap-3 rounded-4 bg-white p-4 text-slate-600 shadow-sm'>
      <Spinner animation='border' size='sm' />
      <span>{children}</span>
    </div>
  )
}

export default LoadingText
