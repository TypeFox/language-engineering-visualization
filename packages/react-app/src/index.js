import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

if (typeof ResizeObserver !== 'undefined') {
  ResizeObserver.prototype.disconnect = function() {};
  ResizeObserver.prototype.observe = function() {};
  ResizeObserver.prototype.unobserve = function() {};
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
