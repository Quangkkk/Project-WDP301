import { lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import ProtectedRoute from './components/templates/ProtectedRoute.jsx'

const HomePage = lazy(() => import('./page/customer/home.page.jsx'))
const LoginPage = lazy(() => import('./page/customer/login.page.jsx'))
const RegisterPage = lazy(() => import('./page/customer/register.page.jsx'))
const ForgotPasswordPage = lazy(() => import('./page/customer/forgot-password.page.jsx'))
const ResetPasswordPage = lazy(() => import('./page/customer/reset-password.page.jsx'))
const ProductListPage = lazy(() => import('./page/customer/product-list.page.jsx'))
const ProductDetailPage = lazy(() => import('./page/customer/product-detail.page.jsx'))
const CartPage = lazy(() => import('./page/customer/cart.page.jsx'))
const CheckoutPage = lazy(() => import('./page/customer/checkout.page.jsx'))
const PaymentResultPage = lazy(() => import('./page/customer/payment-result.page.jsx'))
const OrderHistoryPage = lazy(() => import('./page/customer/order-history.page.jsx'))
const OrderDetailPage = lazy(() => import('./page/customer/order-detail.page.jsx'))
const GuestOrderDetailPage = lazy(() =>
  import('./page/customer/guest-order-detail.page.jsx'),
)
const ProfilePage = lazy(() => import('./page/customer/profile.page.jsx'))
const WishlistPage = lazy(() => import('./page/customer/wishlist.page.jsx'))
const SupportPage = lazy(() => import('./page/customer/support.page.jsx'))
const ChatPage = lazy(() => import('./page/customer/chat.page.jsx'))
const ChangePasswordPage = lazy(() =>
  import('./page/customer/change-password.page.jsx'),
)

const AdminDashboardPage = lazy(() =>
  import('./page/admin/admin-dashboard.page.jsx'),
)
const ProductManagementPage = lazy(() =>
  import('./page/admin/product-management.page.jsx'),
)
const CategoryManagementPage = lazy(() =>
  import('./page/admin/category-management.page.jsx'),
)
const BrandManagementPage = lazy(() =>
  import('./page/admin/brand-management.page.jsx'),
)
const CouponManagementPage = lazy(() =>
  import('./page/admin/coupon-management.page.jsx'),
)
const OrderManagementPage = lazy(() =>
  import('./page/admin/order-management.page.jsx'),
)
const ReturnManagementPage = lazy(() =>
  import('./page/admin/return-management.page.jsx'),
)
const UserManagementPage = lazy(() =>
  import('./page/admin/user-management.page.jsx'),
)
const SupportManagementPage = lazy(() =>
  import('./page/admin/support-management.page.jsx'),
)
const ChatManagementPage = lazy(() =>
  import('./page/admin/chat-management.page.jsx'),
)
const RevenueManagementPage = lazy(() =>
  import('./page/admin/revenue-management.page.jsx'),
)
const StaffManagementPage = lazy(() =>
  import('./page/admin/staff-management.page.jsx'),
)

const customerOnly = ['CUSTOMER']
const adminOnly = ['ADMIN']
const managerOnly = ['MANAGER']
const staffOnly = ['STAFF']

function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className='flex min-h-screen items-center justify-center text-sm font-semibold text-slate-500'>
            Đang tải trang...
          </div>
        }
      >
        <Routes>
          {/* PUBLIC */}
          <Route path='/' element={<HomePage />} />
          <Route path='/login' element={<LoginPage />} />
          <Route path='/register' element={<RegisterPage />} />
          <Route path='/forgot-password' element={<ForgotPasswordPage />} />
          <Route path='/reset-password/:token' element={<ResetPasswordPage />} />
          <Route path='/products' element={<ProductListPage />} />
          <Route path='/products/:id' element={<ProductDetailPage />} />
          <Route path='/product' element={<Navigate to='/products' replace />} />
          <Route path='/cart' element={<CartPage />} />
          <Route path='/checkout' element={<CheckoutPage />} />
          <Route
            path='/payment-result/:orderId'
            element={<PaymentResultPage />}
          />
          <Route
            path='/track-order/:orderId'
            element={<GuestOrderDetailPage />}
          />

          {/* CUSTOMER */}
          <Route
            path='/orders'
            element={
              <ProtectedRoute allowedRoles={customerOnly}>
                <OrderHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/orders/:orderId'
            element={
              <ProtectedRoute allowedRoles={customerOnly}>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/wishlist'
            element={
              <ProtectedRoute allowedRoles={customerOnly}>
                <WishlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/profile'
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/profile/change-password'
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/support'
            element={
              <ProtectedRoute allowedRoles={customerOnly}>
                <SupportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/chat'
            element={
              <ProtectedRoute allowedRoles={customerOnly}>
                <ChatPage />
              </ProtectedRoute>
            }
          />

          {/* ADMIN */}
          <Route
            path='/admin'
            element={
              <ProtectedRoute allowedRoles={adminOnly}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/admin/users'
            element={
              <ProtectedRoute allowedRoles={adminOnly}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />

          {/* MANAGER */}
          <Route
            path='/manager'
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/manager/products'
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <ProductManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/manager/categories'
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <CategoryManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/manager/brands'
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <BrandManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/manager/coupons'
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <CouponManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/manager/orders'
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <OrderManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/manager/revenue'
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <RevenueManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/manager/staff'
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <StaffManagementPage />
              </ProtectedRoute>
            }
          />

          {/* STAFF */}
          <Route
            path='/staff'
            element={
              <ProtectedRoute allowedRoles={staffOnly}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/staff/products'
            element={
              <ProtectedRoute allowedRoles={staffOnly}>
                <ProductManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path='/staff/orders'
            element={
              <ProtectedRoute allowedRoles={staffOnly}>
                <OrderManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/staff/returns'
            element={
              <ProtectedRoute allowedRoles={staffOnly}>
                <ReturnManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/staff/support'
            element={
              <ProtectedRoute allowedRoles={staffOnly}>
                <SupportManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/staff/chat'
            element={
              <ProtectedRoute allowedRoles={staffOnly}>
                <ChatManagementPage />
              </ProtectedRoute>
            }
          />

          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App