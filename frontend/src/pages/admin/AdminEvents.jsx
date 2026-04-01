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

export default function AdminEvents() {
  return (
    <div style={card}>
      <h2 style={title}>Events management</h2>
      <p style={text}>
        This section will host create, edit, and scheduling tools for events. The shell and
        navigation are in place; detailed management UI can be added here next.
      </p>
    </div>
  );
}
