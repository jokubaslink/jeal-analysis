import { NavLink, Outlet, useNavigate } from "react-router-dom";

const linkStyle = ({ isActive }) => ({
  textDecoration: "none",
  padding: "10px 16px",
  borderRadius: "12px",
  fontWeight: 600,
  fontSize: "14px",
  color: "#111827",
  background: isActive ? "rgba(17, 24, 39, 0.08)" : "transparent",
  border: isActive ? "1px solid rgba(17, 24, 39, 0.12)" : "1px solid transparent",
  display: "block",
  transition: "background 0.15s ease, border-color 0.15s ease",
});

export default function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div style={styles.wrapper}>
      <aside style={styles.sidebar} aria-label="Admin navigation">
        <div style={styles.sidebarHeader}>
          <p style={styles.eyebrow}>Administration</p>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Manage clubs, events, and related content.</p>
        </div>
        <nav style={styles.nav}>
          <NavLink to="/admin" end style={linkStyle}>
            Overview
          </NavLink>
          <NavLink to="/admin/clubs" style={linkStyle}>
            Clubs
          </NavLink>
          <NavLink to="/admin/events" style={linkStyle}>
            Events
          </NavLink>
        </nav>
        <button
          type="button"
          style={styles.backButton}
          onClick={() => navigate("/dashboard")}
        >
          ← Back to app
        </button>
      </aside>
      <div style={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 260px) 1fr",
    gap: "28px",
    width: "100%",
    alignItems: "start",
  },
  sidebar: {
    padding: "22px 18px",
    borderRadius: "20px",
    border: "1px solid rgba(17, 24, 39, 0.08)",
    background: "white",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
    position: "sticky",
    top: "24px",
  },
  sidebarHeader: {
    marginBottom: "18px",
  },
  eyebrow: {
    margin: 0,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#3f6212",
  },
  title: {
    margin: "6px 0 0 0",
    fontSize: "22px",
    fontWeight: 700,
    color: "#111827",
  },
  subtitle: {
    margin: "8px 0 0 0",
    fontSize: "13px",
    lineHeight: 1.45,
    color: "#4b5563",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  backButton: {
    marginTop: "22px",
    width: "100%",
    padding: "10px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(17, 24, 39, 0.14)",
    background: "rgba(249, 250, 251, 0.9)",
    color: "#111827",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  content: {
    minWidth: 0,
  },
};
