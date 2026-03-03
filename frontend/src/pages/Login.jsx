import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/dashboard";

  function handleSubmit(e) {
    e.preventDefault();
    login();
    navigate(from, { replace: true });
  }

  return (
    <div style={styles.container}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={{ margin: 0, color: "black" }}>Login</h2>

        <input style={styles.input} placeholder="Email" required />
        <input style={styles.input} placeholder="Password" type="password" required />

        <button style={styles.button} type="submit">Login</button>
      </form>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", height: "70vh" },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "30px",
    width: "320px",
    background: "white",
    borderRadius: "8px",
    border: "1px solid #ddd",
  },
  input: { padding: "10px", borderRadius: "6px", border: "1px solid #ccc" },
  button: {
    padding: "10px",
    borderRadius: "6px",
    border: "none",
    background: "#111",
    color: "white",
    cursor: "pointer",
  },
};