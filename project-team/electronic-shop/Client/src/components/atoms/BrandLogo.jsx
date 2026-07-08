import { Link } from 'react-router-dom'

function BrandLogo() {
  return (
    <Link to='/' className='d-flex align-items-center gap-2 text-decoration-none'>
      <span className='flex h-11 w-11 items-center justify-center rounded-4 bg-blue-600 text-xl text-white shadow-sm'>⚡</span>
      <span className='text-xl font-black tracking-tight text-slate-950'>TechSale</span>
    </Link>
  )
}

export default BrandLogo
