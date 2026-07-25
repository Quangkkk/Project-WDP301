import {
  BadgeCheck,
  CreditCard,
  PackageCheck,
  ShoppingBag,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const DEFAULT_BENEFITS = [
  {
    icon: BadgeCheck,
    title: 'Sản phẩm chính hãng',
    text: 'Thông tin sản phẩm rõ ràng và minh bạch.',
  },
  {
    icon: CreditCard,
    title: 'Thanh toán linh hoạt',
    text: 'Hỗ trợ COD, VietQR và ZaloPay.',
  },
  {
    icon: PackageCheck,
    title: 'Theo dõi đơn hàng',
    text: 'Kiểm tra trạng thái mua hàng thuận tiện.',
  },
]

function AuthPanel({
  title,
  subtitle,
  eyebrow = 'Tài khoản TechSale',
  children,
  formPosition = 'left',
  asideTitle = 'Chào mừng bạn đến với TechSale!',
  asideDescription = 'Đăng nhập hoặc tạo tài khoản để mua sắm nhanh hơn và quản lý đơn hàng dễ dàng hơn.',
  asideActionLabel,
  asideActionTo,
  benefits = DEFAULT_BENEFITS,
  formClassName = '',
}) {
  const formOnRight = formPosition === 'right'

  return (
    <div className='grid w-full max-w-[1180px] items-stretch overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_30px_80px_rgba(124,45,18,0.18)] lg:min-h-[600px] lg:grid-cols-2'>
      <aside
        className={`relative order-1 flex min-h-[260px] flex-col justify-center overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-rose-600 p-7 text-white sm:p-9 lg:min-h-full lg:p-12 ${
          formOnRight ? 'lg:order-1' : 'lg:order-2'
        }`}
      >
        <div className='pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/20 bg-white/10' />
        <div className='pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full border border-white/15 bg-amber-300/10' />
        <div className='pointer-events-none absolute right-10 top-16 h-16 w-16 rotate-12 rounded-2xl border border-white/20 bg-white/10' />

        <div className='relative z-10 mx-auto w-full max-w-md text-center lg:text-left'>
          <div className='mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-lg backdrop-blur lg:mx-0'>
            <ShoppingBag className='h-7 w-7' />
          </div>

          <p className='mb-3 text-xs font-black uppercase tracking-[0.24em] text-orange-100'>
            TechSale Member
          </p>

          <h2 className='text-3xl font-black leading-tight sm:text-4xl'>
            {asideTitle}
          </h2>

          <p className='mx-auto mt-4 max-w-sm text-sm leading-6 text-orange-50/90 lg:mx-0'>
            {asideDescription}
          </p>

          {benefits?.length > 0 && (
            <div className='mt-7 hidden space-y-4 lg:block'>
              {benefits.map(({ icon: Icon, title: benefitTitle, text }) => (
                <div key={benefitTitle} className='flex items-start gap-3 text-left'>
                  <div className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15'>
                    <Icon className='h-4 w-4' />
                  </div>
                  <div>
                    <p className='text-sm font-extrabold'>{benefitTitle}</p>
                    <p className='mt-0.5 text-xs leading-5 text-orange-50/80'>
                      {text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {asideActionLabel && asideActionTo && (
            <Link
              to={asideActionTo}
              className='mt-7 inline-flex min-w-40 items-center justify-center rounded-full border-2 border-white px-6 py-2.5 text-sm font-black text-white transition hover:bg-white hover:!text-orange-600'
            >
              {asideActionLabel}
            </Link>
          )}
        </div>
      </aside>

      <section
        className={`order-2 flex items-center bg-white px-6 py-9 sm:px-10 sm:py-11 lg:px-14 lg:py-12 ${
          formOnRight ? 'lg:order-2' : 'lg:order-1'
        } ${formClassName}`}
      >
        <div className='mx-auto w-full max-w-[500px]'>
          <div className='mb-7 text-center lg:text-left'>
            <p className='mb-2 text-xs font-black uppercase tracking-[0.2em] text-orange-600'>
              {eyebrow}
            </p>
            <h1 className='text-3xl font-black tracking-tight text-slate-900 sm:text-4xl'>
              {title}
            </h1>
            {subtitle && (
              <p className='mt-3 text-sm leading-6 text-slate-500 sm:text-base'>
                {subtitle}
              </p>
            )}
          </div>

          {children}
        </div>
      </section>
    </div>
  )
}

export default AuthPanel