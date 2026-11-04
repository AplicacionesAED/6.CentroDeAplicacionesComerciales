// Un archivo del Portal de Ventas: se abre o se copia su enlace; en modo "Gestionar" ademas se renombra, se cambia
// de tipo, se reordena, se mueve, se elimina y se configura su enlace (o se sube un Word).
import { useState } from 'react';
import { ArrowDown, ArrowUp, Copy, ExternalLink, FileText, FileType, FolderInput, Image, Link2, Trash2, Video } from 'lucide-react';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { TextInput, Select } from '../../components/ui/Field.jsx';
import { subirWord } from '../../api/documentacion.js';
import { actualizarNodo, moverHermano, quitarNodo, etiquetaTipo, TIPOS_ARCHIVO } from './arbol.js';
import styles from './Documentacion.module.css';

const ICONOS = { pdf: FileText, word: FileType, image: Image, video: Video, url: Link2 };

function IconoTipo({ tipo }) {
  const Icono = ICONOS[tipo] ?? FileText;
  return <Icono size={20} strokeWidth={1.5} aria-hidden="true" />;
}

export default function TarjetaArchivo({ archivo, url, gestionando, proyecto, autoFoco = false, onCambiar, onMover, onPedirMover, onCompartir, onUrl }) {
  const tipo = archivo.fileType || 'pdf';
  const tieneUrl = Boolean(url);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState(null);
  const [editandoEnlace, setEditandoEnlace] = useState(autoFoco);

  const abrir = () => {
    if (!tieneUrl) return;
    if (tipo === 'word') {
      // Abre la app de Word instalada via el protocolo de Office (Windows con Office).
      const a = document.createElement('a');
      a.href = `ms-word:ofe|u|${encodeURIComponent(url)}`;
      a.click();
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renombrar = (name) => onCambiar((t) => actualizarNodo(t, archivo.id, { name }));
  const cambiarTipo = (fileType) => onCambiar((t) => actualizarNodo(t, archivo.id, { fileType }));
  const eliminar = () => {
    if (window.confirm('¿Eliminar este archivo?')) onCambiar((t) => quitarNodo(t, archivo.id).arbol);
  };
  const reordenar = (direccion) => onMover((t) => moverHermano(t, archivo.id, direccion));

  async function alSubirWord(e) {
    const elegido = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!elegido) return;
    if (!/\.docx?$/i.test(elegido.name)) {
      setErrorSubida('Solo se permiten archivos .doc o .docx');
      return;
    }
    setSubiendo(true);
    setErrorSubida(null);
    try {
      const { url: nueva } = await subirWord(elegido, proyecto);
      onUrl(archivo.id, nueva);
      if (!archivo.name) renombrar(elegido.name.replace(/\.docx?$/i, ''));
    } catch (err) {
      setErrorSubida(err instanceof Error ? err.message : 'Error al subir el archivo');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className={styles.archivoWrap}>
      <div className={`${styles.archivo} ${tieneUrl ? styles.archivoActivo : ''}`} onClick={abrir} role={tieneUrl ? 'button' : undefined} tabIndex={tieneUrl ? 0 : undefined} onKeyDown={(e) => e.key === 'Enter' && abrir()}>
        <span className={`${styles.icono} ${styles[`tipo_${tipo}`]}`}>
          <IconoTipo tipo={tipo} />
        </span>

        <div className={styles.archivoTexto} onClick={(e) => gestionando && e.stopPropagation()}>
          {gestionando ? (
            <TextInput className={styles.compacto} autoFocus={autoFoco} value={archivo.name} placeholder="Nombre del recurso" onChange={(e) => renombrar(e.target.value)} onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && e.currentTarget.blur()} />
          ) : (
            <strong className={styles.archivoNombre} title={archivo.name}>{archivo.name}</strong>
          )}
          <div className={styles.archivoMeta}>
            {gestionando ? (
              <Select className={styles.compacto} value={tipo} onChange={(e) => cambiarTipo(e.target.value)} aria-label="Tipo de archivo">
                {TIPOS_ARCHIVO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            ) : (
              <span className={styles.muted}>{etiquetaTipo(tipo)}</span>
            )}
            {!tieneUrl && <Badge variant="warning">Falta enlace</Badge>}
          </div>
        </div>

        <div className={styles.acciones} onClick={(e) => e.stopPropagation()}>
          {gestionando && (
            <>
              <button type="button" className={styles.accion} onClick={() => reordenar('up')} title="Subir" aria-label="Subir"><ArrowUp size={16} strokeWidth={1.75} aria-hidden="true" /></button>
              <button type="button" className={styles.accion} onClick={() => reordenar('down')} title="Bajar" aria-label="Bajar"><ArrowDown size={16} strokeWidth={1.75} aria-hidden="true" /></button>
            </>
          )}
          <button type="button" className={styles.accion} onClick={abrir} disabled={!tieneUrl} title={tieneUrl ? (tipo === 'word' ? 'Abrir en Word' : 'Abrir recurso') : 'Sin enlace configurado'} aria-label="Abrir recurso">
            <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button type="button" className={styles.accion} onClick={() => onCompartir(archivo.id)} disabled={!tieneUrl} title={tieneUrl ? 'Copiar enlace' : 'Sin enlace configurado'} aria-label="Copiar enlace">
            <Copy size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
          {gestionando && (
            <>
              <button type="button" className={styles.accion} onClick={() => onPedirMover(archivo.id)} title="Mover a…" aria-label="Mover a…"><FolderInput size={16} strokeWidth={1.75} aria-hidden="true" /></button>
              <button type="button" className={`${styles.accion} ${styles.accionPeligro}`} onClick={eliminar} title="Eliminar" aria-label="Eliminar"><Trash2 size={16} strokeWidth={1.75} aria-hidden="true" /></button>
            </>
          )}
        </div>
      </div>

      {/* Enlace: plegado por defecto para no recargar cada fila; el admin lo abre cuando lo necesita. */}
      {gestionando && (
        <div className={styles.enlace}>
          {!editandoEnlace ? (
            <button type="button" className={styles.enlaceBoton} onClick={() => setEditandoEnlace(true)}>
              {tieneUrl ? 'Editar enlace' : 'Agregar enlace'}
            </button>
          ) : (
            <div className={styles.enlaceEditor}>
              {tipo === 'word' && (
                <label className={`${styles.subir} ${subiendo ? styles.subiendo : ''}`}>
                  <span>{subiendo ? 'Subiendo…' : tieneUrl ? 'Reemplazar archivo subido' : 'Subir archivo Word (.doc/.docx)'}</span>
                  <input type="file" className={styles.ocultoInput} accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={alSubirWord} disabled={subiendo} />
                </label>
              )}
              <TextInput className={styles.compacto} type="url" placeholder={tipo === 'word' ? 'o pega un enlace (SharePoint, Drive, etc.)' : 'https://…enlace'} value={url || ''} title={url || undefined} onChange={(e) => onUrl(archivo.id, e.target.value)} aria-label="Enlace del recurso" />
              {errorSubida && <p className={styles.error} role="alert">{errorSubida}</p>}
              <Button variant="ghost" onClick={() => setEditandoEnlace(false)}>Listo</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
