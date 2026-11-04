import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import { PendientePage } from './features/PendientePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/cotizador" replace />} />
          <Route path="cotizador" element={<PendientePage titulo="Cotizador" />} />
          <Route path="cotizador/:dealId" element={<PendientePage titulo="Cotizador" />} />
          <Route path="seguimiento" element={<PendientePage titulo="Seguimiento" />} />
          <Route path="tramites" element={<PendientePage titulo="Trámites" />} />
          <Route path="documentacion" element={<PendientePage titulo="Documentación" />} />
          <Route element={<ProtectedRoute soloAdmin />}>
            <Route path="inventario" element={<PendientePage titulo="Inventario" />} />
          </Route>
          <Route path="*" element={<Navigate to="/cotizador" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
