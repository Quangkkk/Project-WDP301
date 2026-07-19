import { Zap } from 'lucide-react'

function AuthPanel({ title, subtitle, children }) {
  return (
    <div className='bg-white !rounded-2xl shadow-xl border border-slate-100 overflow-hidden'>
      <div className='p-8 md:p-12'>
        <div className='mb-8 text-center'>
          <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center !rounded-xl bg-blue-600 text-white shadow-md'>
            <Zap className='w-8 h-8 fill-current' />
          </div>
          <h1 className='mb-3 text-3xl font-black text-slate-900 tracking-tight'>
            {title}
          </h1>
          {subtitle && (
            <p className='text-slate-500'>
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export default AuthPanel
