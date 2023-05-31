import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// import reportWebVitals from './reportWebVitals';

if (typeof ResizeObserver !== 'undefined') {
  ResizeObserver.prototype.disconnect = function() {};
  ResizeObserver.prototype.observe = function() {};
  ResizeObserver.prototype.unobserve = function() {};
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>, causes duplicate render, bleh
    <App />
  // </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
