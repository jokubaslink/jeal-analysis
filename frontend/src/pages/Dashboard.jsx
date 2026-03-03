import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("demo_authed");
    navigate("/", { replace: true });
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>This route is protected.</p>
      <button onClick={handleLogout}>Log out</button>
    </div>
  );
}