import { useMemo } from 'react';
import { calcularFinanciero } from '../utils/planFinanciero.js';

// `config` es la configuracion del proyecto activo (antes salia del contexto AppConfig).
export function useFinancialCalc(precio, cuotas, config, cuotaInicialPctOverride) {
  return useMemo(() => calcularFinanciero(precio, cuotas, config, cuotaInicialPctOverride), [precio, cuotas, config, cuotaInicialPctOverride]);
}
