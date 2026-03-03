export default function Register() {
  return (
    <div style={styles.container}>
      <form style={styles.card}>
        <h2>Register</h2>

        <input style={styles.input} placeholder="Email" required />
        <input style={styles.input} placeholder="Password" type="password" required />

        <button style={styles.button}>Create Account</button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "70vh",
  },

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

  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },

  button: {
    padding: "10px",
    borderRadius: "6px",
    border: "none",
    background: "#111",
    color: "white",
    cursor: "pointer",
  },
};