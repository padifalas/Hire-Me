import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
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
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<SignUp />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/employer-profile-setup" element={<EmployerProfileSetup />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/employer-dashboard" element={<EmployerDashboard />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
