import { createContext, useContext, useState, useCallback } from "react";
import API from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const stored = localStorage.getItem("admin");
    return stored ? JSON.parse(stored) : null;
  });

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

  const isAuthenticated = !!localStorage.getItem("adminToken") && !!admin;

  const hasRole = useCallback(
    (...roles) => roles.includes(admin?.role),
    [admin]
  );

  return (
    <AuthContext.Provider value={{ admin, login, logout, isAuthenticated, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);