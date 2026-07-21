import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  MonitorSmartphone, 
  Layers, 
  Tags, 
  TicketPercent, 
  PackageSearch, 
  Users, 
  Headset, 
  MessageSquareText,
  BarChart3,
  Users2
} from 'lucide-react'
import { getCurrentUser, getUserRole } from '../../utils/authStorage'

const links = [
  { path: '/admin', label: 'Tổng quan', icon: LayoutDashboard, allowedRoles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/admin/products', label: 'Sản phẩm', icon: MonitorSmartphone, allowedRoles: ['MANAGER'] },
  { path: '/admin/categories', label: 'Danh mục', icon: Layers, allowedRoles: ['MANAGER'] },
  { path: '/admin/brands', label: 'Thương hiệu', icon: Tags, allowedRoles: ['MANAGER'] },
  { path: '/admin/coupons', label: 'Mã giảm giá', icon: TicketPercent, allowedRoles: ['MANAGER'] },
  { path: '/admin/revenue', label: 'Doanh thu', icon: BarChart3, allowedRoles: ['MANAGER'] },
  { path: '/admin/staff', label: 'Quản lý nhân viên', icon: Users2, allowedRoles: ['MANAGER'] },
  { path: '/admin/orders', label: 'Đơn hàng', icon: PackageSearch, allowedRoles: ['MANAGER', 'STAFF'] },
  { path: '/admin/users', label: 'Người dùng', icon: Users, allowedRoles: ['ADMIN'] },
  { path: '/admin/support', label: 'Yêu cầu hỗ trợ', icon: Headset, allowedRoles: ['STAFF'] },
  { path: '/admin/chat', label: 'Trò chuyện trực tuyến', icon: MessageSquareText, allowedRoles: ['STAFF'] },
]

function AdminSidebar() {
  const user = getCurrentUser()
  const role = getUserRole(user)
  // Tu dong an hien link dua tren quyen
  const visibleLinks = links.filter((link) => link.allowedRoles.includes(role))

  return (
    <aside className='sticky top-24 w-full !rounded-xl bg-white p-4 shadow-sm border border-slate-200'>
      <p className='px-3 pt-2 pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400'>
        Khu quản trị
      </p>
      <nav className='flex flex-col gap-1'>
        {visibleLinks.map((link) => {
          const Icon = link.icon
          const prefix = role === 'STAFF' ? '/staff' : role === 'MANAGER' ? '/manager' : '/admin'
          const actualPath = link.path.replace('/admin', prefix)
          return (
            <NavLink 
              key={actualPath} 
              to={actualPath} 
              end={actualPath === '/admin' || actualPath === '/staff' || actualPath === '/manager'} 
              className={({ isActive }) => 
                `flex items-center gap-3 !rounded-lg px-3 py-3 text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}

export default AdminSidebar
