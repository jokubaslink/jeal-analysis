import { Routes, Route, Navigate } from "react-router-dom";
import OnboardingQuiz from "./pages/OnboardingQuiz.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Interests from "./pages/Interests.jsx";
import Results from "./pages/Results.jsx";
import Layout from "./components/Layout.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminHome from "./pages/admin/AdminHome.jsx";
import AdminClubs from "./pages/admin/AdminClubs.jsx";
import AdminClubForm from "./pages/admin/AdminClubForm.jsx";
import AdminEvents from "./pages/admin/AdminEvents.jsx";
import AdminEventForm from "./pages/admin/AdminEventForm.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<OnboardingQuiz />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/results"
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/interests"
          element={
            <ProtectedRoute>
              <Interests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminHome />} />
          <Route path="clubs" element={<AdminClubs />} />
          <Route path="clubs/new" element={<AdminClubForm />} />
          <Route path="clubs/:clubId/edit" element={<AdminClubForm />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="events/new" element={<AdminEventForm />} />
          <Route path="events/:eventId/edit" element={<AdminEventForm />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
