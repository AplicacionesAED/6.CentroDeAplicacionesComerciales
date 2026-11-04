import { useState, useEffect } from 'react';
import { fetchUnits } from '../api/cotizador.js';

// Unidades asociadas a un negocio de HubSpot, con sus estados de carga y error.
export function useUnits(dealId) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dealId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchUnits(dealId)
      .then((data) => {
        if (!cancelled) setUnits(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 409) setError('Conecta tu cuenta de HubSpot para ver las unidades.');
        else if (err.status === 404) setError('Negocio no encontrado en HubSpot.');
        else setError(err.message || 'Error al cargar unidades.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  return { units, loading, error };
}
