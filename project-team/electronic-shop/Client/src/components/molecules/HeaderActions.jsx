import Dropdown from 'react-bootstrap/Dropdown'
import { Link } from 'react-router-dom'

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
  if (!loggedIn) {
    return (
      <div className='d-flex align-items-center gap-3'>
        <Link
          to='/register'
          className='font-bold text-orange-600 text-decoration-none'
        >
          Đăng ký
        </Link>

        <Link
          to='/login'
          className='rounded-pill bg-orange-500 px-4 py-2 font-bold text-white shadow-sm text-decoration-none hover:bg-orange-600'
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
    <Dropdown align='end'>
      <Dropdown.Toggle
        variant='light'
        className='d-flex align-items-center gap-2 rounded-pill border-0 bg-slate-100 px-2 py-2 shadow-sm'
      >
        <span
          className='d-flex align-items-center justify-content-center rounded-circle bg-orange-500 font-black text-white'
          style={{
            width: 36,
            height: 36,
            overflow: 'hidden',
          }}
        >
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className='h-100 w-100 object-cover'
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            getInitial(user)
          )}
        </span>

        <span className='d-none d-xl-flex flex-column align-items-start lh-sm'>
          <span className='font-black text-slate-900'>{name}</span>

          <span className='text-xs font-bold uppercase text-orange-600'>
            {roleLabel}
          </span>
        </span>
      </Dropdown.Toggle>

      <Dropdown.Menu className='mt-2 rounded-4 border-0 p-2 shadow-lg'>
        <div className='px-3 py-3'>
          <div className='d-flex align-items-center gap-3'>
            <span
              className='d-flex align-items-center justify-content-center rounded-circle bg-orange-500 font-black text-white'
              style={{
                width: 44,
                height: 44,
                overflow: 'hidden',
              }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className='h-100 w-100 object-cover'
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                getInitial(user)
              )}
            </span>

            <div>
              <div className='font-black text-slate-900'>{name}</div>

              {email && <div className='text-sm text-slate-500'>{email}</div>}
            </div>
          </div>
        </div>

        <Dropdown.Divider />

        <Dropdown.Item
          as={Link}
          to='/profile'
          className='rounded-3 px-3 py-2 font-bold text-slate-700'
        >
          <i className='bi bi-person-circle me-2 text-orange-500' />
          Hồ sơ
        </Dropdown.Item>

        <Dropdown.Item
          as={Link}
          to='/orders'
          className='rounded-3 px-3 py-2 font-bold text-slate-700'
        >
          <i className='bi bi-bag-check me-2 text-orange-500' />
          Đơn hàng
        </Dropdown.Item>

        <Dropdown.Item
          as={Link}
          to='/wishlist'
          className='rounded-3 px-3 py-2 font-bold text-slate-700'
        >
          <i className='bi bi-heart me-2 text-red-500' />
          Yêu thích
        </Dropdown.Item>

        <Dropdown.Item
          as={Link}
          to='/chat'
          className='rounded-3 px-3 py-2 font-bold text-slate-700'
        >
          <i className='bi bi-chat-dots me-2 text-orange-500' />
          Nhắn tin
        </Dropdown.Item>

        <Dropdown.Item
          as={Link}
          to='/support'
          className='rounded-3 px-3 py-2 font-bold text-slate-700'
        >
          <i className='bi bi-headset me-2 text-orange-500' />
          Hỗ trợ
        </Dropdown.Item>

        <Dropdown.Divider />

        <Dropdown.Item
          onClick={onLogout}
          className='rounded-3 px-3 py-2 font-bold text-red-600'
        >
          <i className='bi bi-box-arrow-right me-2' />
          Đăng xuất
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  )
}

export default HeaderActions