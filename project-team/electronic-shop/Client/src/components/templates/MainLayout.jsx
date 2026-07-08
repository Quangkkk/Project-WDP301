import Header from '../organisms/Header'
import Footer from '../organisms/Footer'

function MainLayout({ children }) {
  return (
    <div className='app-shell'>
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  )
}

export default MainLayout
