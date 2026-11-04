import { useState, useEffect, useCallback } from 'react';
import { fetchAvailableUnits } from '../api/cotizador.js';

// Unidades disponibles (unit_status = Disponible) de un proyecto. No hace nada mientras `project` sea null.
export function useAvailableUnits(project) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadUnits = useCallback(
    async (forceRefresh = false) => {
      if (!project) return;
      setLoading(true);
      setError(null);
      try {
        setUnits(await fetchAvailableUnits(project, forceRefresh));
      } catch (err) {
        setError(err?.message || 'Error al cargar unidades disponibles.');
      } finally {
        setLoading(false);
      }
    },
    [project]
  );

  useEffect(() => {
    setUnits([]);
    loadUnits();
  }, [loadUnits]);

  const refresh = useCallback(() => {
    loadUnits(true);
  }, [loadUnits]);

  return { units, loading, error, refresh };
}
