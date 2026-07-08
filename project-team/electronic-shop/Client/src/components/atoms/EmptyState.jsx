import Button from './Button'

function EmptyState({ icon = '📦', title = 'Không có dữ liệu', description = 'Chưa có nội dung để hiển thị.', actionLabel, onAction }) {
  return (
    <div className='soft-panel p-5 text-center'>
      <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-5 bg-blue-50 text-3xl'>{icon}</div>
      <h3 className='mb-2 text-2xl font-black text-slate-950'>{title}</h3>
      <p className='mx-auto mb-4 max-w-xl text-slate-500'>{description}</p>
      {actionLabel && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  )
}

export default EmptyState
