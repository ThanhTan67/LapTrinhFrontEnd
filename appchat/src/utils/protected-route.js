// src/utils/protected-route.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { isThisTabActive } from './single-tab-auth';

const ProtectedRoute = () => {
  const loginStatus = useSelector(state => state.login?.status);
  const hasRelogin = localStorage.getItem('reLogin');

  const allow =
      (loginStatus === 'success' && isThisTabActive()) ||
      (hasRelogin && isThisTabActive());

  return allow ? <Outlet /> : <Navigate to="/Login" replace />;
};

export default ProtectedRoute;
