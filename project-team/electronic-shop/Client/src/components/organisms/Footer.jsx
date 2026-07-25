import { Link } from 'react-router-dom'

import BrandLogo from '../atoms/BrandLogo'

const shopLinks = [
  {
    label: 'Tất cả sản phẩm',
    to: '/products',
  },
  {
    label: 'Danh mục sản phẩm',
    to: '/products',
  },
]

const supportLinks = [
  {
    label: 'Gửi yêu cầu hỗ trợ',
    to: '/support',
  },
  {
    label: 'Tra cứu đơn hàng',
    to: '/orders',
  },
  {
    label: 'Đăng nhập',
    to: '/login',
  },
]

function FooterLink({
  to,
  children,
}) {
  return (
    <Link
      to={to}
      className={`
        text-sm text-slate-400 no-underline
        transition-colors duration-200
        hover:!text-orange-400
      `}
    >
      {children}
    </Link>
  )
}

function Footer() {
  return (
    <footer
      id='contact'
      className='border-t border-slate-800 bg-slate-950 text-slate-300'
    >
      <div className='container mx-auto px-4 py-10'>
        <div className='grid grid-cols-1 gap-10 md:grid-cols-12'>
          {/* Thông tin cửa hàng */}
          <div className='md:col-span-6'>
            <BrandLogo dark />

            <p
              className={`
                mt-4 max-w-md text-sm leading-7
                text-slate-400
              `}
            >
              TechSale là hệ thống bán hàng công nghệ trực tuyến,
              hỗ trợ mua sắm, thanh toán và theo dõi đơn hàng
              thuận tiện.
            </p>

            <p className='mb-0 mt-3 text-sm text-slate-500'>
              Hỗ trợ thanh toán COD, VietQR và ZaloPay.
            </p>
          </div>

          {/* Cửa hàng */}
          <div className='md:col-span-3'>
            <h3
              className={`
                mb-4 text-xs font-black uppercase
                tracking-[0.16em] text-white
              `}
            >
              Cửa hàng
            </h3>

            <ul className='m-0 space-y-3 p-0'>
              {shopLinks.map((link) => (
                <li
                  key={link.label}
                  className='list-none'
                >
                  <FooterLink to={link.to}>
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Hỗ trợ */}
          <div className='md:col-span-3'>
            <h3
              className={`
                mb-4 text-xs font-black uppercase
                tracking-[0.16em] text-white
              `}
            >
              Hỗ trợ
            </h3>

            <ul className='m-0 space-y-3 p-0'>
              {supportLinks.map((link) => (
                <li
                  key={link.label}
                  className='list-none'
                >
                  <FooterLink to={link.to}>
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className={`
            mt-10 flex flex-col gap-2
            border-t border-slate-800 pt-6
            text-center sm:flex-row
            sm:items-center sm:justify-between
            sm:text-left
          `}
        >
          <p className='mb-0 text-xs text-slate-500'>
            © 2026 TechSale. Hệ thống bán hàng công nghệ trực tuyến.
          </p>

          <p className='mb-0 text-xs text-slate-600'>
            Sản phẩm chính hãng · Thanh toán linh hoạt
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer