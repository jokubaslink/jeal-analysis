import { useLocation, useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/dashboard";

  function handleLogin() {
    // demo auth flag
    localStorage.setItem("demo_authed", "true");
    navigate(from, { replace: true });
  }

  return (
    <div>
      <h1>Login</h1>
      <p>Demo login: click the button to “authenticate”.</p>
      <button onClick={handleLogin}>Log in</button>
    </div>
  );
}