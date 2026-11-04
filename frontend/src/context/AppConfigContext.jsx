import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { fetchProjectConfigs, saveProjectConfig } from '../api/cotizador.js';
import { PROJECTS } from '../utils/cotizador.js';

const AppConfigContext = createContext(null);

export function useAppConfig() {
  const ctx = useContext(AppConfigContext);
  if (!ctx) throw new Error('useAppConfig debe usarse dentro de <AppConfigProvider>');
  return ctx;
}

const DEFAULT_CONFIG = {
  fechaEntrega: '2026-12-01',
  cuotaInicialPct: 30,
  cuotasEstandar: 36,
  minMonthlyQuota: 1500000,
  minSeparation: 5000000,
  separacionModo: 'porcentaje',
  separacionPct: 1,
  tasaMV: 1.5,
  tasaAnual: 18,
  descuentosPorTipo: {},
  subsidiosEnabled: false,
  subsidios: [],
  smlv: 0,
  adicionalesEnabled: false,
  adicionales: [],
  fechasExtraordinariasEnabled: false,
};

// Un descuento guardado como numero suelto (formato viejo) pasa a { porcentaje, incluyeParqueadero, modo }.
function normalizarDescuentos(descuentos) {
  return Object.fromEntries(
    Object.entries(descuentos || {}).map(([k, v]) => [
      k,
      typeof v === 'number' ? { porcentaje: v, incluyeParqueadero: false, modo: 'porcentaje' } : { ...v, modo: v.modo || 'porcentaje' },
    ])
  );
}

// Configuracion financiera por proyecto. El servidor es la unica fuente de verdad (sin cache en el navegador).
// `role` sale de la sesion: 'admin' si el usuario tiene el rol administrador, si no 'vendedor'.
export function AppConfigProvider({ children }) {
  const { usuario } = useAuth();
  const [configs, setConfigs] = useState(Object.fromEntries(PROJECTS.map((p) => [p, DEFAULT_CONFIG])));
  // Proyecto "activo" en este momento: lo fija el modulo que lo conoce (el Cotizador, segun el negocio abierto).
  const [activeProject, setActiveProject] = useState('Oliv');
  const role = usuario?.esAdmin ? 'admin' : 'vendedor';

  useEffect(() => {
    if (!usuario) return;
    fetchProjectConfigs()
      .then((cargadas) => {
        setConfigs((prev) => {
          const next = { ...prev };
          for (const project of PROJECTS) {
            const loaded = cargadas[project];
            if (loaded) next[project] = { ...DEFAULT_CONFIG, ...loaded, descuentosPorTipo: normalizarDescuentos(loaded.descuentosPorTipo) };
          }
          return next;
        });
      })
      .catch(() => {});
  }, [usuario]);

  // Actualiza la configuracion del proyecto ACTIVO, en memoria y en el servidor.
  const updateConfig = (newConfig) => {
    const updated = { ...configs[activeProject], ...newConfig };
    setConfigs((prev) => ({ ...prev, [activeProject]: updated }));
    saveProjectConfig(activeProject, updated).catch((err) => console.error('No se pudo guardar la configuración del proyecto', err));
  };

  const activeConfig = configs[activeProject] ?? DEFAULT_CONFIG;

  return (
    <AppConfigContext.Provider
      value={{
        config: activeConfig,
        configs,
        activeProject,
        setActiveProject,
        role,
        updateConfig,
        minMonthlyQuota: activeConfig.minMonthlyQuota || 1500000,
        minSeparation: activeConfig.minSeparation || 5000000,
        tasaMV: activeConfig.tasaMV || 1.5,
      }}
    >
      {children}
    </AppConfigContext.Provider>
  );
}
