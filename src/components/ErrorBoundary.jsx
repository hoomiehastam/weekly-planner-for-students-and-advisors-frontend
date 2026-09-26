import React from 'react';

// Error Boundary — خطاهای رندر React را می‌گیرد و کل اپ را از خرابی نجات می‌دهد
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <div className="error-emoji">😵</div>
            <h2>اوه! مشکلی پیش اومد</h2>
            <p>صفحه دچار خطا شد. می‌تونی دوباره صفحه رو بارگذاری کنی یا به صفحه‌ی اصلی برگردی.</p>
            <div className="error-actions">
              <button className="btn-primary" onClick={this.handleReset}>
                🏠 بازگشت به خانه
              </button>
              <button
                className="btn-secondary"
                onClick={() => window.location.reload()}
              >
                🔄 بارگذاری مجدد
              </button>
            </div>
            {this.state.error && (
              <details className="error-details">
                <summary>جزئیات خطا</summary>
                <pre>{String(this.state.error.message || this.state.error)}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
