import { useMemo } from 'react';
import { generarPlanPagos } from '../utils/planFinanciero.js';

export function usePaymentPlan(calc, separacionDate) {
  return useMemo(() => generarPlanPagos(calc, separacionDate), [calc, separacionDate]);
}
