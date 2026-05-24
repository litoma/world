import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error logger for debugging deployment issues
window.onerror = function (message, source, lineno, colno, error) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.bottom = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.backgroundColor = '#ef5350';
  errorDiv.style.color = '#ffffff';
  errorDiv.style.padding = '15px';
  errorDiv.style.zIndex = '999999';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.style.fontSize = '12px';
  errorDiv.style.boxSizing = 'border-box';
  errorDiv.innerHTML = `<strong>Global Error Detected:</strong> ${message}<br/><em>Source:</em> ${source}:${lineno}:${colno}`;
  document.body.appendChild(errorDiv);
  return false;
};

// Also catch unhandled promise rejections
window.onunhandledrejection = function (event) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.bottom = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.backgroundColor = '#ef5350';
  errorDiv.style.color = '#ffffff';
  errorDiv.style.padding = '15px';
  errorDiv.style.zIndex = '999999';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.style.fontSize = '12px';
  errorDiv.style.boxSizing = 'border-box';
  errorDiv.innerHTML = `<strong>Unhandled Rejection:</strong> ${event.reason}`;
  document.body.appendChild(errorDiv);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
