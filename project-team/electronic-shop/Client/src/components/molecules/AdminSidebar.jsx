import { NavLink } from 'react-router-dom'
import { getCurrentUser, getUserRole } from '../../utils/authStorage'

const links = [
  { path: '/admin', label: 'Overview', icon: '📊', allowedRoles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/admin/products', label: 'Products', icon: '💻', allowedRoles: ['MANAGER'] },
  { path: '/admin/categories', label: 'Categories', icon: '🧩', allowedRoles: ['MANAGER'] },
  { path: '/admin/brands', label: 'Brands', icon: '🏷️', allowedRoles: ['MANAGER'] },
  { path: '/admin/coupons', label: 'Coupons', icon: '🎟️', allowedRoles: ['MANAGER'] },
  { path: '/admin/orders', label: 'Orders', icon: '📦', allowedRoles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/admin/users', label: 'Users', icon: '👤', allowedRoles: ['ADMIN'] },
  { path: '/admin/support', label: 'Tickets', icon: '🎧', allowedRoles: ['ADMIN', 'MANAGER', 'STAFF'] },
]

function AdminSidebar() {
  const user = getCurrentUser()
  const role = getUserRole(user)
  const visibleLinks = links.filter((link) => link.allowedRoles.includes(role))

  return (
    <aside className='soft-panel p-3 sticky-top' style={{ top: 92 }}>
      <p className='px-3 pt-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400'>Backoffice</p>
      <div className='d-flex flex-column gap-1'>
        {visibleLinks.map((link) => (
          <NavLink key={link.path} to={link.path} end={link.path === '/admin'} className={({ isActive }) => `admin-sidebar-link rounded-4 px-3 py-3 text-sm font-bold text-slate-600 no-underline transition ${isActive ? 'active' : ''}`}>
            <span className='me-2'>{link.icon}</span>{link.label}
          </NavLink>
        ))}
      </div>
    </aside>
  )
}

export default AdminSidebar
