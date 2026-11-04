import { useEffect, useState } from 'react';
import { FileDown, Loader } from 'lucide-react';
import iconos from '../../components/ui/RowIconButtons.module.css';
import styles from './Seguimiento.module.css';

// Genera y descarga el paquete de anexos (un solo PDF fusionado, listo para firmar) de una cotizacion aceptada.
// El modulo de generacion (react-pdf + pdf-lib) se carga solo al hacer clic, no con la pagina.
// Boton de icono para las filas de la tabla de Tramites.
export default function GenerarAnexosButton({ quoteId }) {
  const [generando, setGenerando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error', textos: string[] }

  // Los mensajes de exito se ocultan solos; los de error se quedan hasta que se cierren.
  useEffect(() => {
    if (aviso?.tipo !== 'ok') return undefined;
    const t = setTimeout(() => setAviso(null), 9000);
    return () => clearTimeout(t);
  }, [aviso]);

  const generar = async (e) => {
    e.stopPropagation();
    if (generando) return;
    setGenerando(true);
    setAviso(null);
    try {
      const { generarPaqueteAnexos, descargarBlob } = await import('./anexos.jsx');
      const paquete = await generarPaqueteAnexos(quoteId);
      descargarBlob(paquete.blob, paquete.nombre);
      setAviso({ tipo: 'ok', textos: paquete.avisos.length ? ['Anexos descargados, con estas salvedades:', ...paquete.avisos] : ['Anexos descargados.'] });
    } catch (err) {
      console.error('[anexos] Error generando el paquete:', err);
      setAviso({ tipo: 'error', textos: [err instanceof Error ? err.message : 'No se pudieron generar los anexos.'] });
    } finally {
      setGenerando(false);
    }
  };

  const icono = generando ? <Loader size={16} strokeWidth={1.75} className={styles.girar} aria-hidden="true" /> : <FileDown size={16} strokeWidth={1.75} aria-hidden="true" />;

  return (
    <>
      <button type="button" className={`${iconos.iconButton} ${iconos.iconButtonPrimary}`} onClick={generar} disabled={generando} title="Generar anexos (un solo PDF para firmar)" aria-label="Generar anexos">
        {icono}
      </button>

      {aviso && (
        <div role="status" className={`${styles.toast} ${aviso.tipo === 'ok' ? styles.toastOk : styles.toastError}`} onClick={(e) => e.stopPropagation()}>
          <div className={styles.toastTextos}>
            {aviso.textos.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
          <button type="button" className={styles.toastCerrar} onClick={() => setAviso(null)} aria-label="Cerrar">
            ✕
          </button>
        </div>
      )}
    </>
  );
}
