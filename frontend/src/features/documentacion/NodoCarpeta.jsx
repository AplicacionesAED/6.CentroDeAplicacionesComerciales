// Una carpeta del Portal de Ventas (acordeon recursivo). En modo "Gestionar" se renombra y se le agregan
// archivos y subcarpetas, o se reordena, mueve y elimina.
import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, FilePlus, Folder, FolderInput, FolderPlus, Trash2 } from 'lucide-react';
import { TextInput } from '../../components/ui/Field.jsx';
import { actualizarNodo, insertarNodo, moverHermano, nuevoId, quitarNodo } from './arbol.js';
import TarjetaArchivo from './TarjetaArchivo.jsx';
import styles from './Documentacion.module.css';

// `ctx` lleva lo comun a todo el arbol: { urls, gestionando, proyecto, onCambiar, onMover, onPedirMover, onCompartir, onUrl }.
export default function NodoCarpeta({ nodo, ctx, autoFoco = false }) {
  const [abierta, setAbierta] = useState(false);
  // Hijo recien creado, para enfocar su nombre; solo esta carpeta sabe cuales son sus hijos nuevos.
  const [recienCreado, setRecienCreado] = useState(null);

  const hijos = nodo.children || [];
  const { gestionando, onCambiar, onMover, onPedirMover } = ctx;

  const agregar = (e, nuevo) => {
    e.stopPropagation();
    onCambiar((t) => insertarNodo(t, nodo.id, nuevo));
    setRecienCreado(nuevo.id);
    setAbierta(true);
  };
  const agregarSubcarpeta = (e) => agregar(e, { id: nuevoId(), name: 'Nueva Carpeta', type: 'folder', children: [] });
  const agregarArchivo = (e) => agregar(e, { id: nuevoId(), name: '', type: 'file', fileType: 'pdf' });

  const eliminar = (e) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar esta carpeta y todo su contenido?')) onCambiar((t) => quitarNodo(t, nodo.id).arbol);
  };
  const reordenar = (e, direccion) => {
    e.stopPropagation();
    onMover((t) => moverHermano(t, nodo.id, direccion));
  };
  const pedirMover = (e) => {
    e.stopPropagation();
    onPedirMover(nodo.id);
  };

  const accion = (fn, titulo, Icono, peligro = false) => (
    <button type="button" className={`${styles.accion} ${peligro ? styles.accionPeligro : ''}`} onClick={fn} title={titulo} aria-label={titulo}>
      <Icono size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );

  return (
    <div className={styles.carpeta}>
      {/* La cabecera es un div (no un button) porque lleva controles interactivos dentro (nombre, acciones). */}
      <div
        className={styles.carpetaCab}
        role="button"
        tabIndex={0}
        aria-expanded={abierta}
        onClick={() => setAbierta(!abierta)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setAbierta(!abierta);
          }
        }}
      >
        <ChevronRight size={18} strokeWidth={1.75} className={`${styles.chevron} ${abierta ? styles.chevronAbierto : ''}`} aria-hidden="true" />
        <span className={styles.iconoCarpeta}><Folder size={20} strokeWidth={1.5} aria-hidden="true" /></span>
        <div className={styles.carpetaTexto}>
          {gestionando ? (
            <TextInput
              className={styles.compacto}
              autoFocus={autoFoco}
              value={nodo.name}
              placeholder="Nombre de la carpeta"
              onChange={(e) => onCambiar((t) => actualizarNodo(t, nodo.id, { name: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
              }}
            />
          ) : (
            <strong>{nodo.name}</strong>
          )}
          <span className={styles.muted}>
            {hijos.length} {hijos.length === 1 ? 'elemento' : 'elementos'}
          </span>
        </div>

        {gestionando && (
          <div className={styles.acciones}>
            {accion((e) => reordenar(e, 'up'), 'Subir', ArrowUp)}
            {accion((e) => reordenar(e, 'down'), 'Bajar', ArrowDown)}
            {accion(agregarArchivo, 'Agregar archivo', FilePlus)}
            {accion(agregarSubcarpeta, 'Agregar subcarpeta', FolderPlus)}
            {accion(pedirMover, 'Mover a…', FolderInput)}
            {accion(eliminar, 'Eliminar carpeta', Trash2, true)}
          </div>
        )}
      </div>

      {abierta && (
        <div className={styles.carpetaCuerpo}>
          {hijos.map((hijo) =>
            hijo.type === 'folder' ? (
              <NodoCarpeta key={hijo.id} nodo={hijo} ctx={ctx} autoFoco={hijo.id === recienCreado} />
            ) : (
              <TarjetaArchivo key={hijo.id} archivo={hijo} url={ctx.urls[hijo.id] || null} gestionando={gestionando} proyecto={ctx.proyecto} autoFoco={hijo.id === recienCreado} onCambiar={onCambiar} onMover={onMover} onPedirMover={onPedirMover} onCompartir={ctx.onCompartir} onUrl={ctx.onUrl} />
            )
          )}
          {hijos.length === 0 && <p className={styles.vacio}>Carpeta vacía</p>}
        </div>
      )}
    </div>
  );
}
