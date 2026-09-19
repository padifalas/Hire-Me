import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/authContext";
import ErrorBoundary from "./components/layout/ErrorBoundary.jsx";
import NotFound from "./components/layout/NotFound.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import SignUp from "./components/auth/SignUp.jsx";
import "./components/auth/SignUp.css";
import ProfileSetup from "./components/student/ProfileSetup.jsx";
import "./components/student/ProfileSetup.css";
import EmployerProfileSetup from "./components/employer/EmployerProfileSetup.jsx";
import StudentDashboard from "./components/student/StudentDashboard.jsx";
import "./components/student/StudentDashboard.css";
import EmployerDashboard from "./components/employer/EmployerDashboard.jsx";
import "./components/employer/EmployerDashboard.css";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<SignUp />} />
            <Route path="/signup" element={<SignUp />} />
            <Route
              path="/profile-setup"
              element={
                <ProtectedRoute role="student">
                  <ProfileSetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer-profile-setup"
              element={
                <ProtectedRoute role="employer">
                  <EmployerProfileSetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-dashboard"
              element={
                <ProtectedRoute role="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer-dashboard"
              element={
                <ProtectedRoute role="employer">
                  <EmployerDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
