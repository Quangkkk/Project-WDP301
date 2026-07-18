import MainLayout from './MainLayout'
import AdminSidebar from '../molecules/AdminSidebar'

function DashboardLayout({ title, description, children }) {
  return (
    <MainLayout>
      <section className='py-8 bg-slate-50 min-h-screen'>
        <div className='container mx-auto px-4'>
          <div className='flex flex-col lg:flex-row gap-8'>
            {/* Sidebar cot trai */}
            <div className='w-full lg:w-1/4 xl:w-1/5'>
              <AdminSidebar />
            </div>
            
            {/* Noi dung chinh cot phai */}
            <div className='w-full lg:w-3/4 xl:w-4/5'>
              <div className='mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200'>
                <p className='mb-2 text-xs font-black uppercase tracking-[0.25em] text-blue-600'>
                  Bảng Điều Khiển
                </p>
                <h1 className='text-3xl font-black text-slate-900'>
                  {title}
                </h1>
                {description && (
                  <p className='mt-2 text-slate-500'>
                    {description}
                  </p>
                )}
              </div>
              
              <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-6'>
                {children}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}

export default DashboardLayout
