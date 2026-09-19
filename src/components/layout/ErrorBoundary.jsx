import { Component } from "react";

/**
 * ctahces render errors anywhere below it in the tree. Before this, one
 * uncaught error in any component white-screened the whole app with
 * nothing shown to the user - React unmounts everything below the nearest
 * error boundary, and there wasn't one anywhere in HireMe.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
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
          <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#64748b", margin: 0, maxWidth: 360 }}>
            HireMe hit an unexpected error. Try reloading the page - if it keeps
            happening, let us know what you were doing.
          </p>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            style={{
              marginTop: 8,
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "#1E3A5F",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Back to HireMe
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
