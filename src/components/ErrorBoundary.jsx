import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("APP_ERROR:", error?.message, "\nCOMPONENT_STACK:", info?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 40, textAlign: "center" }}>
          <div>
            <h2 style={{ fontFamily: "var(--primary)", marginBottom: 10 }}>Something went wrong</h2>
            <p style={{ color: "var(--muted)", marginBottom: 20 }}>Please reload the page.</p>
            <button className="btn btn--solid" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
