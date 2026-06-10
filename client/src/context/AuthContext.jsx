import { createContext, useContext, useState, useCallback, useEffect } from "react";
import API from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verify token with server on every page load
  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await API.get("/admin/me");
        setAdmin(res.data);
        localStorage.setItem("admin", JSON.stringify(res.data));
      } catch {
        // Token invalid or expired — clear everything
        localStorage.removeItem("adminToken");
        localStorage.removeItem("admin");
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await API.post("/admin/login", { email, password });
    localStorage.setItem("adminToken", res.data.token);
    localStorage.setItem("admin", JSON.stringify(res.data.admin));
    setAdmin(res.data.admin);
    return res.data.admin;
  }, []);

  const logout = useCallback(async () => {
    try {
      await API.post("/admin/logout");
    } catch (_) {}
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    setAdmin(null);
  }, []);

  const isAuthenticated = !!admin;

  const hasRole = useCallback(
    (...roles) => roles.includes(admin?.role),
    [admin]
  );

  // Show nothing while verifying — prevents flash of admin page
  if (loading) return null;

  return (
    <AuthContext.Provider value={{ admin, login, logout, isAuthenticated, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);