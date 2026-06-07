import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' 

const favicon = document.querySelector('link[rel="icon"]');
if (favicon) {
  favicon.href = '/logo.png';
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Failed to find the root element.");
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
