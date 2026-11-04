import { useState, useEffect, useCallback } from 'react';
import { fetchAvailableUnits } from '../api/cotizador.js';

// Todas las unidades del proyecto con TODOS sus estados (Disponible, Separado, Vendido...), para la cuadricula de
// torre, que tambien muestra las que ya no estan disponibles. No hace nada mientras `project` sea null.
export function useProjectUnits(project) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadUnits = useCallback(
    async (forceRefresh = false) => {
      if (!project) return;
      setLoading(true);
      setError(null);
      try {
        setUnits(await fetchAvailableUnits(project, forceRefresh, true));
      } catch (err) {
        setError(err?.message || 'Error al cargar las unidades del proyecto.');
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
