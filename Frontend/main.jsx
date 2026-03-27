import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
        },
        success: {
          duration: 3000,
          style: {
            background: '#6BCB77',
            color: '#fff',
          },
        },
        error: {
          duration: 4000,
          style: {
            background: '#FF6B6B',
            color: '#fff',
          },
        },
      }}
    />
  </BrowserRouter>
);
