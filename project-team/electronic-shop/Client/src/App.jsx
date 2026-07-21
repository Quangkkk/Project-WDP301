import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

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
const ChangePasswordPage = lazy(() => import('./page/customer/change-password.page.jsx'))

const AdminDashboardPage = lazy(() => import('./page/admin/admin-dashboard.page.jsx'))
const ProductManagementPage = lazy(() => import('./page/admin/product-management.page.jsx'))
const CategoryManagementPage = lazy(() => import('./page/admin/category-management.page.jsx'))
const BrandManagementPage = lazy(() => import('./page/admin/brand-management.page.jsx'))
const CouponManagementPage = lazy(() => import('./page/admin/coupon-management.page.jsx'))
const OrderManagementPage = lazy(() => import('./page/admin/order-management.page.jsx'))
const UserManagementPage = lazy(() => import('./page/admin/user-management.page.jsx'))
const SupportManagementPage = lazy(() => import('./page/admin/support-management.page.jsx'))
const ChatManagementPage = lazy(() => import('./page/admin/chat-management.page.jsx'))
const RevenueManagementPage = lazy(() => import('./page/admin/revenue-management.page.jsx'))
const StaffManagementPage = lazy(() => import('./page/admin/staff-management.page.jsx'))

const customerOnly = ['CUSTOMER']
const backOfficeRoles = ['ADMIN', 'MANAGER', 'STAFF']
const productManagementRoles = ['ADMIN', 'MANAGER']
const adminOnly = ['ADMIN']
const managerOnly = ['MANAGER']

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
          <Route path='/' element={<HomePage />} />
          <Route path='/login' element={<LoginPage />} />
          <Route path='/register' element={<RegisterPage />} />
          <Route path='/forgot-password' element={<ForgotPasswordPage />} />
          <Route path='/reset-password/:token' element={<ResetPasswordPage />} />
          <Route path='/products' element={<ProductListPage />} />
          <Route path='/products/:id' element={<ProductDetailPage />} />
          <Route path='/product' element={<Navigate to='/products' replace />} />
          <Route
            path='/cart' element={<CartPage />}
          />

          <Route
            path='/checkout'
            element={
              <CheckoutPage />
            }
          />

          <Route
            path='/payment-result/:orderId'
            element={
              <PaymentResultPage />
            }
          />

          <Route
            path='/track-order/:orderId'
            element={<GuestOrderDetailPage />}
          />

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

          <Route
            path='/admin'
            element={
              <ProtectedRoute allowedRoles={backOfficeRoles}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path='/admin/products'
            element={
              <ProtectedRoute allowedRoles={productManagementRoles}>
                <ProductManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path='/admin/categories'
            element={
              <ProtectedRoute allowedRoles={productManagementRoles}>
                <CategoryManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path='/admin/brands'
            element={
              <ProtectedRoute allowedRoles={productManagementRoles}>
                <BrandManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path='/admin/coupons'
            element={
              <ProtectedRoute allowedRoles={productManagementRoles}>
                <CouponManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path='/admin/orders'
            element={
              <ProtectedRoute allowedRoles={backOfficeRoles}>
                <OrderManagementPage />
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

          <Route
            path='/admin/support'
            element={
              <ProtectedRoute allowedRoles={backOfficeRoles}>
                <SupportManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path='/admin/chat'
            element={
              <ProtectedRoute allowedRoles={backOfficeRoles}>
                <ChatManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path='/admin/revenue'
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <RevenueManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path='/admin/staff'
            element={
              <ProtectedRoute allowedRoles={managerOnly}>
                <StaffManagementPage />
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