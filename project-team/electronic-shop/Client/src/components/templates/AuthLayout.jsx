import Footer from '../organisms/Footer'
import Header from '../organisms/Header'

function AuthLayout({ children }) {
  return (
    <div className='flex min-h-screen flex-col bg-[#fffaf5]'>
      <Header />

      <main className='relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12'>
        <div className='pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-orange-200/45 blur-3xl' />
        <div className='pointer-events-none absolute -bottom-32 -right-20 -z-10 h-96 w-96 rounded-full bg-rose-200/40 blur-3xl' />
        <div className='pointer-events-none absolute left-1/2 top-1/3 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-100/50 blur-3xl' />

        {children}
      </main>

      <Footer />
    </div>
  )
}

export default AuthLayout