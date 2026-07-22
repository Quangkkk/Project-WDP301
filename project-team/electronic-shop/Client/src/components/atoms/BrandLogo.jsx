import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { getCurrentUser, getUserRole } from '../../utils/authStorage'

function BrandLogo({ dark = false }) {
  // Thay doi mau chu tuy theo background
  const textColorClass = dark ? 'text-white' : 'text-slate-900'

  // Nếu là Staff/Admin/Manager thì link về trang quản trị
  const user = getCurrentUser()
  const role = getUserRole(user)
  const isBackOffice = ['ADMIN', 'MANAGER', 'STAFF'].includes(role)
  const homeTo = role === 'STAFF' ? '/staff' : role === 'MANAGER' ? '/manager' : role === 'ADMIN' ? '/admin' : '/'

  return (
    <Link to={homeTo} className='flex items-center gap-3 group'>
      <div className='flex h-10 w-10 items-center justify-center !rounded-lg bg-blue-600 text-white shadow-md group-hover:bg-blue-700 transition-colors'>
        <Zap className='w-5 h-5 fill-current' />
      </div>
      <span className={`text-xl font-black tracking-tight ${textColorClass}`}>
        TechSale
      </span>
    </Link>
  )
}

export default BrandLogo
