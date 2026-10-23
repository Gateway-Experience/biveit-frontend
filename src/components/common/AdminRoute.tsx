import { useLocation, Navigate } from 'react-router';

import { buildLoginPath } from 'src/utils/authRedirect';
import { useStore } from 'src/state-store';
import { isAdminUser, isSignedInUser } from 'src/services/user';

// Like ProtectedRoute, for the admin pages: logged out -> the login page (and back here after); logged in
// but not an admin -> home. Only what the FE shows: the admin endpoints check the role themselves.
export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useStore(state => state.user);
  const location = useLocation();

  if (!isSignedInUser(user)) {
    return <Navigate to={buildLoginPath(location.pathname + location.search + location.hash)} replace />;
  }
  return isAdminUser(user) ? children : <Navigate to='/' replace />;
}
