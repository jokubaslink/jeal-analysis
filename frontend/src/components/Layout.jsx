import { NavLink, Outlet } from "react-router-dom";

const linkStyle = ({ isActive }) => ({
  textDecoration: "none",
  padding: "8px 10px",
  borderRadius: 8,
  background: isActive ? "rgba(0,0,0,0.08)" : "transparent",
});

export default function Layout() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <NavLink to="/" style={linkStyle}>
          Main
        </NavLink>
        <NavLink to="/login" style={linkStyle}>
          Login
        </NavLink>
        <NavLink to="/register" style={linkStyle}>
          Register
        </NavLink>
        <NavLink to="/dashboard" style={linkStyle}>
          Dashboard
        </NavLink>
      </header>

      <main style={{ paddingTop: 18 }}>
        <Outlet />
      </main>
    </div>
  );
}