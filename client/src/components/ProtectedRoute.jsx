import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Usage:
// <ProtectedRoute>                          → any logged-in admin
// <ProtectedRoute roles={["super"]} />      → super only
// <ProtectedRoute roles={["super","billing"]} />

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, hasRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/admin-login" replace />;
  }

  if (roles && !hasRole(...roles)) {
    return (
      <div style={{ padding: "40px", fontFamily: "Arial" }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  return children;
}