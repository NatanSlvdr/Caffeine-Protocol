import { createRoot } from 'react-dom/client';
import App from './App';
import { registerOfflineCafe } from './app/offlineUpdate';
import './styles/index.css';
createRoot(document.getElementById('root')!).render(<App />);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void registerOfflineCafe(navigator.serviceWorker, `${import.meta.env.BASE_URL}sw.js`);
  });
}
