import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Layout() {
  const { isAuthed, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const linkStyle = ({ isActive }) => ({
    textDecoration: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: 500,
    color: "black",
    background: isActive ? "#e5e7eb" : "transparent",
  });

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.navContainer}>
          <h2 style={styles.logo}>JEAL</h2>

          <nav style={styles.nav}>
            <NavLink to="/" style={linkStyle}>Home</NavLink>

            {!isAuthed && (
              <>
                <NavLink to="/login" style={linkStyle}>Login</NavLink>
                <NavLink to="/register" style={linkStyle}>Register</NavLink>
              </>
            )}

            {isAuthed && (
              <>
                <NavLink to="/dashboard" style={linkStyle}>Dashboard</NavLink>
                <button type="button" onClick={handleLogout} style={styles.logoutButton}>
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  page: { width: "100%", minHeight: "100vh" },
  header: { width: "100%", background: "#fff", borderBottom: "1px solid #ddd" },
  navContainer: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 40px",
    boxSizing: "border-box",
  },
  logo: { margin: 0, color: "black" },
  nav: { display: "flex", gap: "14px" },
  main: { width: "100%", padding: "40px", boxSizing: "border-box" },
  logoutButton: {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    background: "#f9fafb",
    color: "black",
    fontWeight: 500,
    cursor: "pointer",
  },
};