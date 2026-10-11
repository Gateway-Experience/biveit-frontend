import { useLocation, Navigate } from 'react-router';

import { USER_TYPES } from 'src/utils/constants';
import { buildLoginPath } from 'src/utils/authRedirect';
import { useStore } from 'src/state-store';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useStore(state => state.user);
  const location = useLocation();

  return (
    (user && user.user_type !== USER_TYPES.GUEST)
      ? children
      // `?next=` brings them back here once they've logged in.
      : <Navigate to={buildLoginPath(location.pathname + location.search + location.hash)} replace />
  );
}
