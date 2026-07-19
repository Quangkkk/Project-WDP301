function UserChip({ user, role }) {
  const name = user?.name || user?.email || 'User'
  const first = String(name).charAt(0).toUpperCase()

  return (
    <div className='d-inline-flex align-items-center gap-2 !rounded-pill bg-slate-100 px-3 py-2'>
      <span className='flex h-8 w-8 items-center justify-center !rounded-full bg-blue-600 text-sm font-black text-white'>{first}</span>
      <span className='text-sm font-bold text-slate-700'>{name}</span>
      {role && <span className='!rounded-pill bg-white px-2 py-1 text-[11px] font-black uppercase text-blue-600'>{role}</span>}
    </div>
  )
}

export default UserChip
