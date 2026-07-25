import MainLayout from './MainLayout'
import AdminSidebar from '../molecules/AdminSidebar'
import StaffNotificationWidget from '../organisms/StaffNotificationWidget'

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
              
              <div className='bg-white !rounded-xl shadow-sm border border-slate-200 p-6'>
                {children}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Widget thông báo cho Staff/Admin - chỉ hiển thị khi có role phù hợp */}
      <StaffNotificationWidget />
    </MainLayout>
  )
}

export default DashboardLayout
