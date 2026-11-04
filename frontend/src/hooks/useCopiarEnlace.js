import { useCallback, useEffect, useRef, useState } from 'react';

// Copia al portapapeles; si la API no esta disponible o esta bloqueada (permiso denegado, contexto no seguro)
// cae a una tecnica antigua con un textarea.
async function copiar(texto) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // permiso denegado o bloqueado: se sigue con el respaldo
    }
  }
  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus();
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

// Devuelve { copiarEnlace, aviso, cerrarAviso }. `aviso` = { tipo: 'ok' | 'aviso', texto } o null, y se oculta solo.
export function useCopiarEnlace() {
  const [aviso, setAviso] = useState(null);
  const temporizador = useRef(null);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const mostrar = useCallback((nuevo, ms) => {
    clearTimeout(temporizador.current);
    setAviso(nuevo);
    temporizador.current = setTimeout(() => setAviso(null), ms);
  }, []);

  const copiarEnlace = useCallback(
    async (url) => {
      if (!url) {
        mostrar({ tipo: 'aviso', texto: 'Este recurso aún no tiene un enlace configurado.' }, 3000);
        return;
      }
      const copiado = await copiar(url);
      mostrar(copiado ? { tipo: 'ok', texto: 'Enlace copiado al portapapeles.' } : { tipo: 'aviso', texto: `No se pudo copiar automáticamente. Enlace: ${url}` }, copiado ? 3000 : 6000);
    },
    [mostrar]
  );

  const cerrarAviso = useCallback(() => {
    clearTimeout(temporizador.current);
    setAviso(null);
  }, []);

  return { copiarEnlace, aviso, cerrarAviso };
}
