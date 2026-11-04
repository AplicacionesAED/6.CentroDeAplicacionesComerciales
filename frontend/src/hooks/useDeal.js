import { useState, useEffect } from 'react';
import { fetchDeal } from '../api/cotizador.js';

export function useDeal(dealId) {
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dealId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDeal(dealId)
      .then((data) => {
        if (!cancelled) setDeal(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  return { deal, loading, error };
}
