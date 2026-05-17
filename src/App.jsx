import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import SignUp from "./components/auth/SignUp.jsx";
import "./components/auth/SignUp.css";
import StudentDashboard from "./components/student/StudentDashboard.jsx";
import "./components/student/StudentDashboard.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignUp />} />
        <Route path="/signup" element={<SignUp />} />

        {/* <Route path="/" element={<StudentDashboard />} />
        <Route path="/StudentDashboard" element={<StudentDashboard />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
