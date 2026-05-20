import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { cn } from "../lib/cn.js";

export default function Layout() {
  const { isAuthed, isAdmin, authReady, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentYear = new Date().getFullYear();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const navClass = ({ isActive }) =>
    cn("jeal-nav-link", isActive ? "jeal-nav-link--active" : "jeal-nav-link--inactive");

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.navContainer}>
          <button
            type="button"
            onClick={() => navigate(isAuthed ? "/dashboard" : "/")}
            className="jeal-logo-hit"
            style={styles.logoButton}
            aria-label={isAuthed ? "Go to dashboard" : "Go to home page"}
          >
            <h2 style={styles.logo}>JEAL</h2>
          </button>

          <nav style={styles.nav} aria-label="Main navigation">
            <NavLink to="/" className={navClass}>
              Home
            </NavLink>

            {!isAuthed && (
              <>
                <NavLink to="/login" className={navClass}>
                  Login
                </NavLink>
                <NavLink to="/register" className={navClass}>
                  Register
                </NavLink>
              </>
            )}

            {isAuthed && (
              <>
                <NavLink to="/clubs" className={navClass}>
                  Clubs
                </NavLink>
                <NavLink to="/events" className={navClass}>
                  Events
                </NavLink>
                <NavLink to="/results" className={navClass}>
                  Results
                </NavLink>
                <NavLink to="/dashboard" className={navClass}>
                  Dashboard
                </NavLink>
                {authReady && isAdmin ? (
                  <NavLink to="/admin" className={navClass}>
                    Admin
                  </NavLink>
                ) : null}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="jeal-btn-header"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.mainContainer}>
          <div key={location.pathname} className="jeal-route-shell">
            <Outlet />
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerContainer}>
          <p style={styles.footerText}>JEAL © {currentYear}</p>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background:
      "radial-gradient(circle at top left, rgba(190, 242, 100, 0.2), transparent 35%), linear-gradient(180deg, #f8fafc 0%, #f0fdf4 100%)",
  },
  header: {
    width: "100%",
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0) 100%)",
    borderBottom: "1px solid rgba(17, 24, 39, 0.08)",
    backdropFilter: "blur(6px)",
  },
  navContainer: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 40px",
    boxSizing: "border-box",
  },
  logo: { margin: 0, color: "black" },
  logoButton: {
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
  },
  nav: { display: "flex", gap: "10px", flexWrap: "wrap" },
  main: { width: "100%", padding: "40px", boxSizing: "border-box", flex: 1 },
  mainContainer: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  footer: {
    width: "100%",
    borderTop: "1px solid rgba(17, 24, 39, 0.08)",
    background: "white",
  },
  footerContainer: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "16px 40px",
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "13px",
  },
};
