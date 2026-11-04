import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { AppConfigProvider } from './context/AppConfigContext.jsx';
import App from './App.jsx';
// Inter alojada en el proyecto (sin Google Fonts): variable, eje de peso 100-900.
import '@fontsource-variable/inter';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <AppConfigProvider>
          <App />
        </AppConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
