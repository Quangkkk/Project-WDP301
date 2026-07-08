import { NavLink } from 'react-router-dom'

const links = [
  { path: '/admin', label: 'Overview', icon: '📊' },
  { path: '/admin/products', label: 'Products', icon: '💻' },
  { path: '/admin/categories', label: 'Categories', icon: '🧩' },
  { path: '/admin/brands', label: 'Brands', icon: '🏷️' },
  { path: '/admin/coupons', label: 'Coupons', icon: '🎟️' },
  { path: '/admin/orders', label: 'Orders', icon: '📦' },
  { path: '/admin/users', label: 'Users', icon: '👤' },
  { path: '/admin/support', label: 'Tickets', icon: '🎧' },
]

function AdminSidebar() {
  return (
    <aside className='soft-panel p-3 sticky-top' style={{ top: 92 }}>
      <p className='px-3 pt-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400'>Backoffice</p>
      <div className='d-flex flex-column gap-1'>
        {links.map((link) => (
          <NavLink key={link.path} to={link.path} end={link.path === '/admin'} className={({ isActive }) => `admin-sidebar-link rounded-4 px-3 py-3 text-sm font-bold text-slate-600 no-underline transition ${isActive ? 'active' : ''}`}>
            <span className='me-2'>{link.icon}</span>{link.label}
          </NavLink>
        ))}
      </div>
    </aside>
  )
}

export default AdminSidebar
