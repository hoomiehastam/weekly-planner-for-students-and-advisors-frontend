import React from 'react';

// Error Boundary مدرن ۲۰۲۶ — محافظت از سقوط کل اپ و نمایش خطا با کارت شیشه‌ای
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
        <div className="error-screen-wrap" role="alert">
          <div className="error-ambient-glow error-glow-danger" />
          <div className="error-card">
            <div className="error-icon-circle">
              <i className="ti ti-alert-triangle" />
            </div>
            <h1 className="error-card-title">مشکلی در اجرای برنامه رخ داد</h1>
            <p className="error-card-desc">
              یک خطای پیش‌بینی‌نشده در این بخش اتفاق افتاده است. داده‌های شما محفوظ هستند و می‌توانید با بارگذاری مجدد به کار خود ادامه دهید.
            </p>
            <div className="error-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => window.location.reload()}
              >
                <i className="ti ti-refresh" />
                <span>بارگذاری مجدد صفحه</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={this.handleReset}
              >
                <i className="ti ti-home" />
                <span>بازگشت به خانه</span>
              </button>
            </div>
            {this.state.error && (
              <details className="error-details-box">
                <summary>
                  <i className="ti ti-code" />
                  <span>جزئیات فنی خطا (برای پشتیبانی)</span>
                </summary>
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
