import { useState, useEffect } from 'react';

const CACHE_KEY = 'cop_usd_exchange_rate';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

// 1 USD = `rate` COP. Para pasar un valor en COP a USD se divide entre `rate`.
export function useExchangeRate() {
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
          setRate(cached.rate);
          return;
        }
      }
    } catch {
      // ignorar errores de lectura del cache
    }

    setLoading(true);
    setError(null);

    fetch('https://open.er-api.com/v6/latest/USD')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const copRate = data?.rates?.COP;
        if (!copRate || typeof copRate !== 'number') throw new Error('Respuesta inválida de la API de tasas');
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ rate: copRate, timestamp: Date.now() }));
        } catch {
          // ignorar errores de escritura del cache
        }
        setRate(copRate);
      })
      .catch((err) => {
        console.warn('[useExchangeRate]', err);
        setError('No se pudo obtener la tasa de cambio COP/USD');
      })
      .finally(() => setLoading(false));
  }, []);

  return { rate, loading, error };
}
