import { useState, useMemo, useCallback } from 'react';
import { modelarPlan } from '../utils/planFinanciero.js';

// Envuelve modelarPlan (utils/planFinanciero.js) con el estado de las cuotas fijadas por el asesor.
// `config` es la configuracion del proyecto activo (antes salia del contexto AppConfig).
export function useModeledPlan(standardCalc, modeledCalc, config, activeCuotas, abonoActivo, separacionDate, recargoOverride, ignorarRecargo) {
  const [fixedQuotas, setFixedQuotas] = useState({});

  const setFixedQuota = useCallback((numero, valor) => {
    setFixedQuotas((prev) => {
      const next = { ...prev };
      if (valor === null) delete next[numero];
      else next[numero] = valor;
      return next;
    });
  }, []);

  const resultado = useMemo(
    () => modelarPlan({ standardCalc, modeledCalc, config, activeCuotas, abonoActivo, separacionDate, fixedQuotas, recargoOverride, ignorarRecargo }),
    [standardCalc, modeledCalc, config, activeCuotas, abonoActivo, separacionDate, fixedQuotas, recargoOverride, ignorarRecargo]
  );

  return { ...resultado, fixedQuotas, setFixedQuota };
}
