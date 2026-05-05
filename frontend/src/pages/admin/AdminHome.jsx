import { Link } from "react-router-dom";

const card = {
  padding: "24px",
  borderRadius: "20px",
  border: "1px solid rgba(17, 24, 39, 0.08)",
  background: "white",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
};

const title = {
  margin: 0,
  color: "#111827",
  fontSize: "22px",
  fontWeight: 700,
};

const text = {
  margin: "12px 0 0 0",
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: 1.55,
};

const linkRow = {
  marginTop: "20px",
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
};

const linkButton = {
  display: "inline-flex",
  alignItems: "center",
  padding: "10px 18px",
  borderRadius: "999px",
  border: "none",
  background: "#111827",
  color: "white",
  fontWeight: 600,
  fontSize: "14px",
  textDecoration: "none",
};

export default function AdminHome() {
  return (
    <div style={card}>
      <h2 style={title}>Welcome</h2>
      <p style={text}>
        Use the sidebar to open content management areas. Club and event tools will live on their
        respective pages.
      </p>
      <div style={linkRow}>
        <Link to="/admin/clubs" style={linkButton}>
          Manage clubs
        </Link>
        <Link to="/admin/clubs/new" style={linkButton}>
          Create club
        </Link>
        <Link to="/admin/events" style={linkButton}>
          Manage events
        </Link>
        <Link to="/admin/events/new" style={linkButton}>
          Create event
        </Link>
        <Link to="/admin/feedback" style={linkButton}>
          Review feedback
        </Link>
      </div>
    </div>
  );
}
