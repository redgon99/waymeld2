import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './lib/i18n';
import App from './App';

registerSW({
  immediate: true,
  onOfflineReady() {
    console.info('[PWA] 오프라인에서도 열 수 있습니다.');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
