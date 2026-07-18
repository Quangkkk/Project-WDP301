import Header from '../organisms/Header'
import Footer from '../organisms/Footer'
import ChatWidget from '../organisms/ChatWidget'

function MainLayout({ children }) {
  return (
    <div className='flex flex-col min-h-screen bg-slate-50'>
      <Header />
      <main className='flex-grow w-full'>{children}</main>
      <Footer />
      <ChatWidget />
    </div>
  )
}

export default MainLayout
