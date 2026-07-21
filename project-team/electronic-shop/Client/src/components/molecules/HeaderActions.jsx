import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Headphones,
  Heart,
  LogOut,
  MessageCircle,
  Receipt,
  User,
} from 'lucide-react'

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

function getUserAvatar(user) {
  return user?.img_url || user?.avatar || user?.avatar_url || ''
}

function HeaderActions({ loggedIn, user, role, onLogout }) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (!loggedIn) {
    const currentPath = `${location.pathname}${location.search}${location.hash}`

    return (
      <div className='flex items-center gap-4'>
        <Link
          to='/register'
          className='font-bold text-orange-600 transition-colors hover:text-orange-700'
        >
          Đăng ký
        </Link>

        <Link
          to='/login'
          state={{ from: currentPath }}
          className='!rounded-md bg-orange-600 px-5 py-2 font-bold text-white shadow-sm transition-colors hover:bg-orange-700'
        >
          Đăng nhập
        </Link>
      </div>
    )
  }

  const name = getUserName(user)
  const email = user?.email || ''
  const avatar = getUserAvatar(user)
  const initial = String(name).trim().charAt(0).toUpperCase() || 'U'
  const roleLabel = getRoleLabel(role || user?.role || user?.role_code)
  const closeMenu = () => setIsOpen(false)

  const menuItems = [
    { to: '/profile', label: 'Hồ sơ của tôi', icon: User },
    { to: '/orders', label: 'Đơn mua', icon: Receipt },
    { to: '/wishlist', label: 'Yêu thích', icon: Heart },
    { to: '/chat', label: 'Nhắn tin', icon: MessageCircle },
    { to: '/support', label: 'Hỗ trợ', icon: Headphones },
  ]

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        type='button'
        onClick={() => setIsOpen((prev) => !prev)}
        className='flex items-center gap-3 !rounded-full border border-slate-200 bg-slate-50 p-1 pr-3 shadow-sm transition-colors hover:bg-slate-100'
        aria-expanded={isOpen}
        aria-label='Mở menu tài khoản'
      >
        <span className='flex h-9 w-9 items-center justify-center overflow-hidden !rounded-full bg-orange-600 font-black text-white'>
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
            initial
          )}
        </span>

        <span className='hidden flex-col items-start leading-tight xl:flex'>
          <span className='text-sm font-bold text-slate-900'>{name}</span>
          <span className='text-xs font-semibold text-slate-500'>{roleLabel}</span>
        </span>
      </button>

      {isOpen && (
        <div className='absolute right-0 z-50 mt-2 w-64 overflow-hidden !rounded-xl border border-slate-100 bg-white py-2 shadow-xl'>
          <div className='border-b border-slate-100 px-4 py-3'>
            <div className='flex items-center gap-3'>
              <span className='flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden !rounded-full bg-orange-600 font-black text-white'>
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
                  initial
                )}
              </span>

              <div className='min-w-0'>
                <div className='truncate text-sm font-bold text-slate-900'>{name}</div>
                {email && <div className='truncate text-xs text-slate-500'>{email}</div>}
                <div className='mt-1 text-xs font-semibold text-orange-600'>{roleLabel}</div>
              </div>
            </div>
          </div>

          <div className='py-1'>
            {menuItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={closeMenu}
                className='flex items-center px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-orange-600'
              >
                <Icon className='mr-3 h-4 w-4 text-slate-400' />
                {label}
              </Link>
            ))}
          </div>

          <div className='border-t border-slate-100 py-1'>
            <button
              type='button'
              onClick={() => {
                closeMenu()
                onLogout()
              }}
              className='flex w-full items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50'
            >
              <LogOut className='mr-3 h-4 w-4' />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default HeaderActions