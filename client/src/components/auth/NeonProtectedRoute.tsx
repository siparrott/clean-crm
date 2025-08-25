import React from 'react';
import { Navigate } from 'react-router-dom';
import { useNeonAuth } from '../../context/NeonAuthContext';

interface NeonProtectedRouteProps {
  children: React.ReactNode;
}

const NeonProtectedRoute: React.FC<NeonProtectedRouteProps> = ({ children }) => {
  const { user, isAdmin, loading } = useNeonAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default NeonProtectedRoute;