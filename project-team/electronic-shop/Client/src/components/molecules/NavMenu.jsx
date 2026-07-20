import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Trang chủ', path: '/' },
  { label: 'Sản phẩm', path: '/products' },
  { label: 'Giỏ hàng', path: '/cart' },
  { label: 'Đơn hàng', path: '/orders' },
  { label: 'Hỗ trợ', path: '/support' },
]

function NavMenu() {
  return (
    <nav className='d-flex flex-column flex-lg-row align-items-lg-center gap-3 gap-lg-4'>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `text-sm font-bold no-underline transition ${isActive ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default NavMenu
