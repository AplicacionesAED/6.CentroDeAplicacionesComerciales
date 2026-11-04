import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { CambiarPasswordPage } from './features/auth/CambiarPasswordPage.jsx';
import CotizadorPage from './features/cotizador/CotizadorPage.jsx';
import ConfiguracionPage from './features/configuracion/ConfiguracionPage.jsx';
import SeguimientoPage from './features/seguimiento/SeguimientoPage.jsx';
import QuoteDetailPage from './features/seguimiento/QuoteDetailPage.jsx';
import { PendientePage } from './features/PendientePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="cambiar-password" element={<CambiarPasswordPage />} />
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/cotizador" replace />} />
          <Route path="cotizador" element={<CotizadorPage />} />
          <Route path="cotizador/:dealId" element={<CotizadorPage />} />
          <Route path="seguimiento" element={<SeguimientoPage />} />
          <Route path="seguimiento/:quoteId" element={<QuoteDetailPage />} />
          <Route path="tramites" element={<PendientePage titulo="Trámites" />} />
          <Route path="documentacion" element={<PendientePage titulo="Documentación" />} />
          <Route element={<ProtectedRoute soloAdmin />}>
            <Route path="inventario" element={<PendientePage titulo="Inventario" />} />
            <Route path="configuracion" element={<ConfiguracionPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/cotizador" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
