import { Navigate, Routes, Route } from 'react-router';

import ProtectedRoute from 'src/components/common/ProtectedRoute';
import DefaultLayout from 'src/components/layouts/DefaultLayout';
import ProjectList from 'src/components/pages/projects/ProjectList';
import ProjectDetail from 'src/components/pages/projects/ProjectDetail';
import UserProfile from 'src/components/pages/UserProfile';
import Login from 'src/components/pages/auth/Login';
import Register from 'src/components/pages/auth/Register';
import ForgotPassword from 'src/components/pages/auth/ForgotPassword';
import ResetPassword from 'src/components/pages/auth/ResetPassword';
import PrivacyPolicy from 'src/components/pages/PrivacyPolicy';
import CookiePolicy from 'src/components/pages/CookiePolicy';
import Pricing from 'src/components/pages/Pricing';
import { PATHS } from 'src/utils/constants';
import ShowCase from 'src/components/pages/ShowCase';
import Landing from 'src/components/pages/landing/Landing';
import { useStore } from 'src/state-store';
import { isSignedInUser } from 'src/services/user';
import { useTrackPageViews } from 'src/utils/hooks';

// Use ProtectedRoute for routes that are for logged in users only.
// Unauthorized users going there will be redirected to the login page.

// `/` is the public landing page; signed-in users skip it and go straight to their projects
// (so the logo, Home and post-login redirects to "/" still land them in the app).
function HomeRoute() {
  const user = useStore(state => state.user);
  return isSignedInUser(user) ? <Navigate to={PATHS.projects} replace /> : <Landing />;
}

// Page views are tracked here rather than in a layout, so routes that don't use
// DefaultLayout (/, /login) are counted too.
function AppRoutes() {
  useTrackPageViews();

  return (
    <Routes>
      <Route path='/' element={<HomeRoute />} />
      <Route element={<DefaultLayout />}>
        <Route path={PATHS.projects} element={<ProtectedRoute><ProjectList /></ProtectedRoute>} />
        {/* The same list, with the new-project form open over it. */}
        <Route path={PATHS.newProject} element={<ProtectedRoute><ProjectList /></ProtectedRoute>} />
        <Route path={PATHS.userProfile} element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path={PATHS.privacyPolicy} element={<PrivacyPolicy />} />
        <Route path={PATHS.cookiePolicy} element={<CookiePolicy />} />
        <Route path={PATHS.pricing} element={<Pricing />} />
        <Route path='/showcase' element={<ShowCase />} />
      </Route>
      <Route element={<DefaultLayout isWorkspace />}>
        <Route path={`${PATHS.projects}/:projectId`} element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
      </Route>
      <Route path={PATHS.login} element={<Login />} />
      <Route path={PATHS.register} element={<Register />} />
      <Route path={PATHS.forgotPassword} element={<ForgotPassword />} />
      <Route path={PATHS.resetPassword} element={<ResetPassword />} />
    </Routes>
  );
}

const routes = <AppRoutes />;

export default routes;
