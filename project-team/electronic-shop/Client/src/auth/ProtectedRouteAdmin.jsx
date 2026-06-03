import {Outlet, useNavigate} from 'react-router-dom'
import React, {useEffect, useState} from 'react'

import {jwtDecode} from 'jwt-decode';

const ProtectedRouteAdmin = ( props ) => {
  const token = localStorage.getItem('data_access')
  const navigate = useNavigate();
  function presentPage(){
    navigate(-1)
  }
  // if (!token)
  //   return <Navigate to={'/'} />
  useEffect( () => {
    if(token && jwtDecode(token).role !== 'ADMIN'){
      presentPage()
    }
  }, [token && jwtDecode(token).role !== 'ADMIN'] );
  const decodeData = jwtDecode(token)
  if (decodeData.role === 'ADMIN'){
    return <Outlet {...props} />
  }
  else if (decodeData.role !== 'ADMIN'){
    presentPage()
  }
}

export default ProtectedRouteAdmin
