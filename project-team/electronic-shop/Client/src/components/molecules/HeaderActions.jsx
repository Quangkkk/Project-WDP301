import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, Receipt, LogOut } from 'lucide-react'

function getRoleLabel(role) {
  const value = String(role || '').toUpperCase()

  if (value === 'ADMIN') return 'Admin'
  if (value === 'MANAGER') return 'Manager'
  if (value === 'STAFF') return 'Staff'
  if (value === 'CUSTOMER') return 'Customer'

  return value || 'User'
}

function getUserName(user) {
  return (
    user?.name ||
    user?.full_name ||
    user?.fullName ||
    user?.username ||
    user?.email ||
    'Tài khoản'
  )
}

function getUserEmail(user) {
  return user?.email || ''
}

function getUserAvatar(user) {
  return user?.img_url || user?.avatar || user?.avatar_url || ''
}

function getInitial(user) {
  const name = getUserName(user)
  return String(name).trim().charAt(0).toUpperCase() || 'U'
}

function HeaderActions({ loggedIn, user, role, onLogout }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Dong menu khi click ra ngoai
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!loggedIn) {
    return (
      <div className='flex items-center gap-4'>
        <Link
          to='/register'
          className='font-bold text-orange-600 hover:text-orange-700 transition-colors'
        >
          Đăng ký
        </Link>

        <Link
          to='/login'
          className='rounded-md bg-orange-600 px-5 py-2 font-bold text-white shadow-sm hover:bg-orange-700 transition-colors'
        >
          Đăng nhập
        </Link>
      </div>
    )
  }

  const name = getUserName(user)
  const email = getUserEmail(user)
  const avatar = getUserAvatar(user)
  const roleLabel = getRoleLabel(role || user?.role || user?.role_code)

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 p-1 pr-3 shadow-sm hover:bg-slate-100 transition-colors'
      >
        <span className='flex items-center justify-center rounded-full bg-orange-600 font-black text-white w-9 h-9 overflow-hidden'>
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className='h-full w-full object-cover'
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            getInitial(user)
          )}
        </span>

        <span className='hidden xl:flex flex-col items-start leading-tight'>
          <span className='text-sm font-bold text-slate-900'>
            {name}
          </span>
          <span className='text-[10px] font-black uppercase text-orange-600'>
            {roleLabel}
          </span>
        </span>
      </button>

      {isOpen && (
        <div className='absolute right-0 mt-2 w-64 rounded-xl bg-white border border-slate-100 shadow-xl z-50 overflow-hidden py-2'>
          <div className='px-4 py-3 border-b border-slate-100'>
            <div className='flex items-center gap-3'>
              <span className='flex items-center justify-center rounded-full bg-orange-600 font-black text-white w-10 h-10 overflow-hidden shrink-0'>
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className='h-full w-full object-cover'
                    onError={(event) => {
                      event.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  getInitial(user)
                )}
              </span>

              <div className='min-w-0'>
                <div className='text-sm font-bold text-slate-900 truncate'>
                  {name}
                </div>
                {email && (
                  <div className='text-xs text-slate-500 truncate'>
                    {email}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className='py-1'>
            <Link
              to='/profile'
              onClick={() => setIsOpen(false)}
              className='flex items-center px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600'
            >
              <User className='w-4 h-4 mr-3 text-slate-400' />
              Hồ sơ của tôi
            </Link>

            <Link
              to='/orders'
              onClick={() => setIsOpen(false)}
              className='flex items-center px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600'
            >
              <Receipt className='w-4 h-4 mr-3 text-slate-400' />
              Đơn mua
            </Link>
          </div>

          <div className='border-t border-slate-100 py-1'>
            <button
              onClick={() => {
                setIsOpen(false)
                onLogout()
              }}
              className='flex w-full items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50'
            >
              <LogOut className='w-4 h-4 mr-3' />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default HeaderActions