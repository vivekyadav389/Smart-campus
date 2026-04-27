import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <AuthProvider>
            <App />
        </AuthProvider>
    </StrictMode>,
)

// Register Service Worker for Background Running
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('[SW] Registered:', reg.scope))
            .catch(err => console.error('[SW] Registration failed:', err));
    });
}
