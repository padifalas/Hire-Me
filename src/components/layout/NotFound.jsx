import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        textAlign: "center",
        fontFamily: "'Manrope', sans-serif",
        color: "#1e293b",
      }}
    >
      <h1 style={{ fontSize: 20, margin: 0 }}>Page not found</h1>
      <p style={{ color: "#64748b", margin: 0 }}>
        That page doesn't exist, or you don't have access to it.
      </p>
      <Link
        to="/"
        style={{
          marginTop: 8,
          padding: "10px 20px",
          borderRadius: 8,
          background: "#1E3A5F",
          color: "#fff",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Back to HireMe
      </Link>
    </div>
  );
}
