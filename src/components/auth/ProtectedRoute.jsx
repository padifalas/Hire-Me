import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";

const DASHBOARD_BY_ROLE = {
  student: "/student-dashboard",
  employer: "/employer-dashboard",
};

/**
 * wrap a route element and enforces: the user must be signed in, and (when
 * `role` is given) userProfile.role must match it. Centralizes what used to
 * be a copy-pasted `if (!loading && !user) navigate("/")` inside
 * StudentDashboard, EmployerDashboard and EmployerProfileSetup - and was
 * missing entirely from ProfileSetup, which let an unauthenticated visit
 * to /profile-setup render with nothing guarding it.
 *
 * alsoooo fixes cross-role access: previously a signed-in student could type
 * /employer-dashboard into the URL bar and the dashboard shell would
 * render (RLS stops any real data leaking through, but the UI itself
 * didn't know it was showing the wrong dashboard to the wrong role). noww they're bounced to their own dashboard instead.
 */
export default function ProtectedRoute({ role, children }) {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  const wrongRole = Boolean(role && userProfile && userProfile.role !== role);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/", { replace: true });
      return;
    }

    if (wrongRole) {
      navigate(DASHBOARD_BY_ROLE[userProfile.role] || "/", { replace: true });
    }
  }, [loading, user, wrongRole, userProfile, navigate]);

  if (loading || !user || wrongRole) return null;

  return children;
}
