import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  function handleRegister(e) {
    e.preventDefault();
    // put real registration logic here
    navigate("/login");
  }

  return (
    <div>
      <h1>Register</h1>
      <form onSubmit={handleRegister} style={{ display: "grid", gap: 10, maxWidth: 320 }}>
        <input placeholder="Email" type="email" required />
        <input placeholder="Password" type="password" required />
        <button type="submit">Create account</button>
      </form>
    </div>
  );
}