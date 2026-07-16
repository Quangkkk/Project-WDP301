import BrandLogo from '../atoms/BrandLogo'

function Footer() {
  return (
    <footer id="contact" className="border-t border-slate-800 bg-slate-900 py-12 text-slate-300">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5">
            <BrandLogo dark={true} />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              Online Technology Sale System sử dụng React, Tailwind CSS và NodeJS để quản lý mua hàng công nghệ, giỏ hàng, đơn hàng và hỗ trợ khách hàng theo mô hình tối giản hiện đại.
            </p>
          </div>
          
          <div className="md:col-span-2">
            <h6 className="mb-4 font-bold text-white uppercase tracking-wider text-xs">Cửa Hàng</h6>
            <ul className="space-y-2">
              <li><a href="/products" className="text-sm hover:text-white transition-colors">Sản Phẩm</a></li>
              <li><a href="/products" className="text-sm hover:text-white transition-colors">Danh Mục</a></li>
            </ul>
          </div>
          
          <div className="md:col-span-2">
            <h6 className="mb-4 font-bold text-white uppercase tracking-wider text-xs">Hỗ Trợ</h6>
            <ul className="space-y-2">
              <li><a href="/support" className="text-sm hover:text-white transition-colors">Gửi Ticket</a></li>
              <li><span className="text-sm cursor-pointer hover:text-white transition-colors">Tra cứu đơn</span></li>
            </ul>
          </div>
          
          <div className="md:col-span-3">
            <h6 className="mb-4 font-bold text-white uppercase tracking-wider text-xs">Tài Khoản Demo</h6>
            <ul className="space-y-2">
              <li className="text-sm text-slate-400">customer@example.com</li>
              <li className="text-sm text-slate-400">admin@example.com</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-800 text-center">
          <p className="text-sm text-slate-500">&copy; 2026 Online Tech Sale. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
