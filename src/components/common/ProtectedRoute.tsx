import { useLocation, Navigate } from 'react-router';

import { buildLoginPath } from 'src/utils/authRedirect';
import { useStore } from 'src/state-store';
import { isSignedInUser } from 'src/services/user';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useStore(state => state.user);
  const location = useLocation();

  return (
    isSignedInUser(user)
      ? children
      // `?next=` brings them back here once they've logged in.
      : <Navigate to={buildLoginPath(location.pathname + location.search + location.hash)} replace />
  );
}
