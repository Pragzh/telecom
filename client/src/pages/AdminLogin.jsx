import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleLogin}>
        <h2 style={{ marginBottom: "20px" }}>Admin Login</h2>

        {error && (
          <div style={styles.error}>{error}</div>
        )}

        <input
          style={styles.input}
          placeholder="Admin email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          style={styles.input}
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "360px",
    background: "white",
    padding: "28px",
    borderRadius: "16px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "14px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "10px",
    background: "#185FA5",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    opacity: 1,
  },
  error: {
    background: "#fef2f2",
    color: "#dc2626",
    padding: "10px 12px",
    borderRadius: "8px",
    marginBottom: "14px",
    fontSize: "14px",
  },
};