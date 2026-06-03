import { BrowserRouter, Route, Routes } from 'react-router-dom'

import HomePage from './page/common/home.page.jsx'
import ForgotPasswordPage from './page/common/forgot-password.page.jsx'
import LoginPage from './page/common/login.page.jsx'
import ProfilePage from './page/common/profile.page.jsx'
import RegisterPage from './page/common/register.page.jsx'
import AdminPage from './page/manager/admin.page.jsx'
import CartPage from './page/payment/cart.page.jsx'
import CheckoutPage from './page/payment/checkout.page.jsx'
import ProductDetailPage from './page/product/product-detail.page.jsx'
import ProductPage from './page/product/product.page.jsx'

// import React from 'react'
// import Layout from './layout/Layout.jsx';
// import { Blank, Dashboard, Password, Profile } from './screens/common/index.js';
// import { UserManager } from './screens/user/index.js';
// import { SubjectManager } from './screens/subject/index.js';
// import { ProjectDetail, ProjectList, ProjectModify } from './screens/project/index.js';
// import { AssignmentList, NewAssignment } from './screens/assignment/index.js';
// import {
//   NewSystemSetting,
//   SystemSettingDetail,
//   SystemSettingEdit,
//   SystemSettingManager,
// } from './screens/system-setting/index.js';
// import Auth from './screens/common/Auth.jsx';
// import { ClassManager } from './screens/class/index.js';
// import ProtectedRouteCommon from './security/ProtectedRouteCommon.jsx';
// import ProtectedRouteAdmin from './security/ProtectedRouteAdmin.jsx';
// import ProtectedRouteSubjectManager from './security/ProtectedRouteSubjectManager.jsx';

function App() {
  return (
    <BrowserRouter>
      {/* <Routes>
          <Route path={'/'} element={<ProjectModify />} />

        <Route path='/' element={
          <ProtectedRouteCommon>
            <Layout />
          </ProtectedRouteCommon>
        }>
          <Route index element={<Dashboard />} />
          <Route element={<ProtectedRouteAdmin />}>
            <Route path={'/user-manager'} element={<UserManager />} />
            <Route path={'/subject-manager'} element={<SubjectManager />} />
            <Route path={'/setting-manager'} element={<SystemSettingManager />} />
            <Route path={'/setting-detail/:id'} element={<SystemSettingDetail />} />
            <Route path={'/setting-edit/:id'} element={<SystemSettingEdit />} />
          </Route>

          <Route path={'/class-manager'} element={<ClassManager />} />
          <Route path={ '/class-detail' } element={ <ClassDetail/> }/>

          <Route path={'/project-modify'} element={<ProjectModify />} />
          <Route path={'/project-detail/:id'} element={<ProjectDetail />} />
          <Route path={'/project'} element={<ProjectList />} />
          <Route path={'/profile'} element={<Profile />} />

          <Route path={'/assignments'} element={<AssignmentList />} />
          <Route path={'/new-assignment'} element={<NewAssignment />} />

          <Route path={'/blank'} element={<Blank />} />

          <Route path={'/new-setting'} element={<NewSystemSetting />} />

        </Route>
        <Route path='auth' element={<Auth />} />
        <Route path='auth/:id/:token' element={<Password />} />
      </Routes> */}
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/product' element={<ProductPage />} />
        <Route path='/product-detail' element={<ProductDetailPage />} />
        <Route path='/cart' element={<CartPage />} />
        <Route path='/checkout' element={<CheckoutPage />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />} />
        <Route path='/forgot-password' element={<ForgotPasswordPage />} />
        <Route path='/profile' element={<ProfilePage />} />
        <Route path='/admin' element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
































// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import heroImg from './assets/hero.png'
// import './css/App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <section id="center">
//         <div className="hero">
//           <img src={heroImg} className="base" width="170" height="179" alt="" />
//           <img src={reactLogo} className="framework" alt="React logo" />
//           <img src={viteLogo} className="vite" alt="Vite logo" />
//         </div>
//         <div>
//           <h1>Get started</h1>
//           <p>
//             Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
//           </p>
//         </div>
//         <button
//           type="button"
//           className="counter"
//           onClick={() => setCount((count) => count + 1)}
//         >
//           Count is {count}
//         </button>
//       </section>

//       <div className="ticks"></div>

//       <section id="next-steps">
//         <div id="docs">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#documentation-icon"></use>
//           </svg>
//           <h2>Documentation</h2>
//           <p>Your questions, answered</p>
//           <ul>
//             <li>
//               <a href="https://vite.dev/" target="_blank">
//                 <img className="logo" src={viteLogo} alt="" />
//                 Explore Vite
//               </a>
//             </li>
//             <li>
//               <a href="https://react.dev/" target="_blank">
//                 <img className="button-icon" src={reactLogo} alt="" />
//                 Learn more
//               </a>
//             </li>
//           </ul>
//         </div>
//         <div id="social">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#social-icon"></use>
//           </svg>
//           <h2>Connect with us</h2>
//           <p>Join the Vite community</p>
//           <ul>
//             <li>
//               <a href="https://github.com/vitejs/vite" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#github-icon"></use>
//                 </svg>
//                 GitHub
//               </a>
//             </li>
//             <li>
//               <a href="https://chat.vite.dev/" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#discord-icon"></use>
//                 </svg>
//                 Discord
//               </a>
//             </li>
//             <li>
//               <a href="https://x.com/vite_js" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#x-icon"></use>
//                 </svg>
//                 X.com
//               </a>
//             </li>
//             <li>
//               <a href="https://bsky.app/profile/vite.dev" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#bluesky-icon"></use>
//                 </svg>
//                 Bluesky
//               </a>
//             </li>
//           </ul>
//         </div>
//       </section>

//       <div className="ticks"></div>
//       <section id="spacer"></section>
//     </>
//   )
// }

// export default App
