import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Headset,
  Layers,
  LayoutDashboard,
  MessageSquareText,
  MonitorSmartphone,
  PackageSearch,
  RotateCcw,
  Tags,
  TicketPercent,
  Users,
  Users2,
} from 'lucide-react'

import {
  getCurrentUser,
  getUserRole,
} from '../../utils/authStorage'

const links = [
  // ADMIN
  {
    path: '/admin',
    label: 'Tổng quan',
    icon: LayoutDashboard,
    allowedRoles: ['ADMIN'],
    end: true,
  },
  {
    path: '/admin/users',
    label: 'Người dùng',
    icon: Users,
    allowedRoles: ['ADMIN'],
  },

  // MANAGER
  {
    path: '/manager',
    label: 'Tổng quan',
    icon: LayoutDashboard,
    allowedRoles: ['MANAGER'],
    end: true,
  },
  {
    path: '/manager/products',
    label: 'Sản phẩm',
    icon: MonitorSmartphone,
    allowedRoles: ['MANAGER'],
  },
  {
    path: '/manager/categories',
    label: 'Danh mục',
    icon: Layers,
    allowedRoles: ['MANAGER'],
  },
  {
    path: '/manager/brands',
    label: 'Thương hiệu',
    icon: Tags,
    allowedRoles: ['MANAGER'],
  },
  {
    path: '/manager/coupons',
    label: 'Mã giảm giá',
    icon: TicketPercent,
    allowedRoles: ['MANAGER'],
  },
  {
    path: '/manager/orders',
    label: 'Đơn hàng',
    icon: PackageSearch,
    allowedRoles: ['MANAGER'],
  },
  {
    path: '/manager/revenue',
    label: 'Doanh thu',
    icon: BarChart3,
    allowedRoles: ['MANAGER'],
  },
  {
    path: '/manager/staff',
    label: 'Quản lý nhân viên',
    icon: Users2,
    allowedRoles: ['MANAGER'],
  },

  // STAFF
  {
    path: '/staff',
    label: 'Tổng quan',
    icon: LayoutDashboard,
    allowedRoles: ['STAFF'],
    end: true,
  },
  {
    path: '/staff/products',
    label: 'Sản phẩm',
    icon: MonitorSmartphone,
    allowedRoles: ['STAFF'],
  },
  {
    path: '/staff/orders',
    label: 'Đơn hàng',
    icon: PackageSearch,
    allowedRoles: ['STAFF'],
  },
  {
    path: '/staff/returns',
    label: 'Duyệt trả hàng',
    icon: RotateCcw,
    allowedRoles: ['STAFF'],
  },
  {
    path: '/staff/support',
    label: 'Yêu cầu hỗ trợ',
    icon: Headset,
    allowedRoles: ['STAFF'],
  },
  {
    path: '/staff/chat',
    label: 'Trò chuyện trực tuyến',
    icon: MessageSquareText,
    allowedRoles: ['STAFF'],
  },
]

function AdminSidebar() {
  const user = getCurrentUser()
  const role = getUserRole(user)

  const visibleLinks = links.filter((link) =>
    link.allowedRoles.includes(role),
  )

  return (
    <aside className='sticky top-24 w-full !rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
      <p className='px-3 pb-4 pt-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400'>
        Khu quản trị
      </p>

      <nav className='flex flex-col gap-1'>
        {visibleLinks.map((link) => {
          const Icon = link.icon

          return (
            <NavLink
              key={link.path}
              to={link.path}
              end={Boolean(link.end)}
              className={({ isActive }) =>
                `flex items-center gap-3 !rounded-lg px-3 py-3 text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className='h-5 w-5' />
              <span>{link.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}

export default AdminSidebar