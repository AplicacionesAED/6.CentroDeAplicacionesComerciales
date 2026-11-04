import { useState, useEffect, useCallback } from 'react';
import { fetchUserDeals } from '../api/cotizador.js';

// Negocios del usuario autenticado (el servidor los cachea 5 min; `refresh` fuerza una nueva lectura de HubSpot).
export function useUserDeals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadDeals = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      setDeals(await fetchUserDeals(forceRefresh));
    } catch (err) {
      setError(err?.message || 'Error al cargar negocios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const refresh = useCallback(() => {
    loadDeals(true);
  }, [loadDeals]);

  return { deals, loading, error, refresh };
}
