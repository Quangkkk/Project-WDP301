import {Navigate, useNavigate} from 'react-router-dom'
import React, {useEffect, useState} from 'react'
import {useDispatch} from 'react-redux';
import {getCurrentUser} from '../features/user/userSlice.js';
import {jwtDecode} from 'jwt-decode';

const ProtectedRouteCommon = ( {children} ) => {
  const [user, setUser] = useState();
  const [check, setCheck] = useState( false );
  const dispatch = useDispatch()
  useEffect(
    () => {
      setUser( undefined )
      setCheck( false )
      const fetchData = async () => {
        await dispatch( getCurrentUser() )
          .then(
            ( response ) => {
              if (response.type.includes( 'fulfilled' )) {
                setUser( response.payload )
                setCheck( true )
              }
            },
          )
      }
      fetchData();
    }, [],
  )
  if (check === true) {
    if (!user) {
      return <Navigate to={ '/auth' }/>
    }
    return children
  } else {
    if (localStorage.getItem( 'data_access' ) === null)
      return <Navigate to={ '/auth' }/>
  }
}

export default ProtectedRouteCommon
