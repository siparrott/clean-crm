import React from 'react';
import { Navigate } from 'react-router-dom';
import { useNeonAuth } from '../../context/NeonAuthContext';

interface NeonProtectedRouteProps {
  children: React.ReactNode;
}

const NeonProtectedRoute: React.FC<NeonProtectedRouteProps> = ({ children }) => {
  const { user, isAdmin, loading } = useNeonAuth();
  const [shouldRedirect, setShouldRedirect] = React.useState(false);

  React.useEffect(() => {
    // Only redirect after a reasonable delay to avoid flash redirects
    if (!loading && (!user || !isAdmin)) {
      const timer = setTimeout(() => {
        setShouldRedirect(true);
      }, 1000); // Give 1 second for auth to resolve
      
      return () => clearTimeout(timer);
    }
  }, [loading, user, isAdmin]);

  // Show loading for initial load or quick transitions
  if (loading || (!user && !shouldRedirect)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (shouldRedirect || (!user || !isAdmin)) {
    console.log('Auth failed - redirecting to login. User:', !!user, 'IsAdmin:', isAdmin);
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default NeonProtectedRoute;