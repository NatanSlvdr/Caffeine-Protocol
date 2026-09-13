import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './playful.css';
createRoot(document.getElementById('root')!).render(<App/>);
if(import.meta.env.PROD && 'serviceWorker' in navigator){window.addEventListener('load',()=>{void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(()=>{/* The loaded game still works when offline storage is unavailable. */});});}
