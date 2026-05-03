import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { Toaster } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import { flush } from './services/offlineQueue.js';
import './i18n/index.js';
import './index.css';

// Register PWA service worker — exposes updateSW function for manual prompt
window.__pwaUpdate = registerSW({
  onNeedRefresh() {
    // Dispatch custom event so UpdatePrompt component can show toast
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  },
  onOfflineReady() {
    console.log('PWA: offline ready');
  },
});

// Auto-flush offline queue when connectivity is restored
window.addEventListener('online', () => flush());
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && navigator.onLine) flush();
});
// Flush on app start if online
if (navigator.onLine) flush();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
          <Toaster position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
