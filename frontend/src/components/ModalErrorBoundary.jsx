import React from 'react';
class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("Modal Error Boundary caught an error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '80%', maxHeight: '80%', overflow: 'auto' }}>
            <h2 style={{ color: 'red' }}>Modal Crash Detected</h2>
            <pre style={{ color: 'black', background: '#f5f5f5', padding: '10px' }}>{this.state.error && this.state.error.toString()}</pre>
            <pre style={{ color: 'gray', background: '#f5f5f5', padding: '10px', fontSize: '12px' }}>{this.state.info && this.state.info.componentStack}</pre>
            <button onClick={this.props.onClose} style={{ padding: '8px 16px', background: 'black', color: 'white', borderRadius: '4px', marginTop: '10px' }}>Close</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
export default ModalErrorBoundary;
