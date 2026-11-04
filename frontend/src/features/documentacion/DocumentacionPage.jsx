// Portal de Ventas: carpetas y enlaces de cada proyecto. Todos navegan y copian enlaces; un administrador, en modo
// "Gestionar", edita el arbol y los enlaces con autoguardado.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { File, FilePlus, Folder, FolderPlus, Search, Settings2 } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Field, TextInput, Select } from '../../components/ui/Field.jsx';
import { useAppConfig } from '../../context/AppConfigContext.jsx';
import { useCopiarEnlace } from '../../hooks/useCopiarEnlace.js';
import { fetchDocumentos, guardarCarpetas, guardarUrls } from '../../api/documentacion.js';
import { PROYECTOS_DOC, TIPOS_ARCHIVO, aplanarCarpetas, buscarNodo, contarArchivos, destinosInvalidos, filtrarArbol, migrarAFsNodes, moverNodo, nuevoId } from './arbol.js';
import NodoCarpeta from './NodoCarpeta.jsx';
import TarjetaArchivo from './TarjetaArchivo.jsx';
import lista from '../../components/ui/Lista.module.css';
import styles from './Documentacion.module.css';

// Escribir (renombrar, editar un enlace) no debe lanzar una peticion por tecla: se espera este tiempo.
const ESPERA_AUTOGUARDADO_MS = 600;

export default function DocumentacionPage() {
  const { role } = useAppConfig();
  const { copiarEnlace, aviso, cerrarAviso } = useCopiarEnlace();
  const esAdmin = role === 'admin';

  const [proyecto, setProyecto] = useState('oliv');
  const [busqueda, setBusqueda] = useState('');
  const [carpetaFiltro, setCarpetaFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [arboles, setArboles] = useState({});
  const [urls, setUrls] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [estadoGuardado, setEstadoGuardado] = useState('idle'); // idle | guardando | guardado | error
  const [moviendoId, setMoviendoId] = useState(null);
  // Fuera de "Gestionar", incluso un admin ve lo mismo que un vendedor.
  const [gestionando, setGestionando] = useState(false);
  const [raizNuevaId, setRaizNuevaId] = useState(null);

  // Copias en refs: el autoguardado envia SIEMPRE el objeto completo de todos los proyectos (el servidor lo reemplaza).
  const arbolesRef = useRef({});
  const urlsRef = useRef({});
  const temporizadores = useRef({ carpetas: null, urls: null });
  const pendientes = useRef({ carpetas: false, urls: false });
  const ocultarGuardado = useRef(null);

  useEffect(() => {
    let vivo = true;
    fetchDocumentos()
      .then(({ docFolders, docUrls }) => {
        if (!vivo) return;
        const migrados = Object.fromEntries(Object.entries(docFolders || {}).map(([k, v]) => [k, migrarAFsNodes(v)]));
        arbolesRef.current = migrados;
        urlsRef.current = docUrls || {};
        setArboles(migrados);
        setUrls(docUrls || {});
      })
      .catch(() => vivo && setError('No se pudo cargar el Portal de Ventas.'))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, []);

  const marcarGuardado = useCallback(() => {
    setEstadoGuardado('guardado');
    clearTimeout(ocultarGuardado.current);
    ocultarGuardado.current = setTimeout(() => setEstadoGuardado('idle'), 2000);
  }, []);

  const enviar = useCallback(
    async (cual) => {
      pendientes.current[cual] = false;
      setEstadoGuardado('guardando');
      try {
        if (cual === 'carpetas') {
          await guardarCarpetas(arbolesRef.current);
        } else {
          // Sin entradas vacias por proyecto, sin tocar el estado de edicion local.
          const limpio = {};
          for (const [p, mapa] of Object.entries(urlsRef.current)) {
            limpio[p] = Object.fromEntries(Object.entries(mapa).filter(([, v]) => v?.trim()).map(([id, v]) => [id, v.trim()]));
          }
          await guardarUrls(limpio);
        }
        marcarGuardado();
      } catch {
        setEstadoGuardado('error');
      }
    },
    [marcarGuardado]
  );

  const programar = useCallback(
    (cual) => {
      pendientes.current[cual] = true;
      clearTimeout(temporizadores.current[cual]);
      temporizadores.current[cual] = setTimeout(() => enviar(cual), ESPERA_AUTOGUARDADO_MS);
    },
    [enviar]
  );

  // Al salir de la pantalla se guarda lo que haya quedado esperando.
  useEffect(
    () => () => {
      for (const cual of ['carpetas', 'urls']) {
        clearTimeout(temporizadores.current[cual]);
        if (pendientes.current[cual]) enviar(cual);
      }
      clearTimeout(ocultarGuardado.current);
    },
    [enviar]
  );

  // Cambios del arbol: `inmediato` para acciones terminadas (mover, reordenar); el resto espera por si se sigue escribiendo.
  const cambiarArbol = useCallback(
    (actualizador, inmediato = false) => {
      const siguiente = { ...arbolesRef.current, [proyecto]: actualizador(arbolesRef.current[proyecto] || []) };
      arbolesRef.current = siguiente;
      setArboles(siguiente);
      if (inmediato) {
        clearTimeout(temporizadores.current.carpetas);
        enviar('carpetas');
      } else {
        programar('carpetas');
      }
    },
    [proyecto, enviar, programar]
  );

  const cambiarUrl = useCallback(
    (id, url) => {
      const siguiente = { ...urlsRef.current, [proyecto]: { ...(urlsRef.current[proyecto] || {}), [id]: url } };
      urlsRef.current = siguiente;
      setUrls(siguiente);
      programar('urls');
    },
    [proyecto, programar]
  );

  const arbolActual = arboles[proyecto] || [];
  const urlsActuales = urls[proyecto] || {};
  const puedeGestionar = esAdmin && gestionando;
  const carpetas = useMemo(() => aplanarCarpetas(arbolActual), [arbolActual]);

  const visible = useMemo(() => {
    const origen = carpetaFiltro ? buscarNodo(arbolActual, carpetaFiltro)?.children || [] : arbolActual;
    return filtrarArbol(origen, { busqueda, tipoArchivo: tipoFiltro, gestionando: puedeGestionar, urls: urlsActuales });
  }, [arbolActual, urlsActuales, busqueda, carpetaFiltro, tipoFiltro, puedeGestionar]);

  const hayFiltros = Boolean(busqueda || carpetaFiltro || tipoFiltro);
  const limpiarFiltros = () => {
    setBusqueda('');
    setCarpetaFiltro('');
    setTipoFiltro('');
  };
  const elegirProyecto = (p) => {
    setProyecto(p);
    limpiarFiltros();
  };

  const agregarEnRaiz = (nuevo) => {
    cambiarArbol((t) => [...t, nuevo]);
    setRaizNuevaId(nuevo.id);
  };

  const moviendo = moviendoId ? buscarNodo(arbolActual, moviendoId) : null;
  const destinos = moviendoId ? carpetas.filter((c) => !destinosInvalidos(arbolActual, moviendoId).has(c.id)) : [];
  const moverA = (destinoId) => {
    const id = moviendoId;
    cambiarArbol((t) => {
      const hijosDestino = destinoId ? buscarNodo(t, destinoId)?.children || [] : t;
      return moverNodo(t, id, destinoId, hijosDestino.length);
    }, true);
    setMoviendoId(null);
  };

  const ctx = {
    urls: urlsActuales,
    gestionando: puedeGestionar,
    proyecto,
    onCambiar: cambiarArbol,
    onMover: (actualizador) => cambiarArbol(actualizador, true),
    onPedirMover: setMoviendoId,
    onCompartir: (id) => copiarEnlace(urlsActuales[id] || null),
    onUrl: cambiarUrl,
  };

  const total = contarArchivos(visible);

  return (
    <div className={styles.page}>
      <header className={lista.header}>
        <div>
          <h1 className={lista.title}>Portal de ventas</h1>
          <p className={lista.subtitle}>Carpetas y enlaces de cada proyecto</p>
        </div>
        {puedeGestionar && estadoGuardado !== 'idle' && (
          <span className={`${styles.guardado} ${estadoGuardado === 'error' ? styles.guardadoError : ''}`} role="status">
            {estadoGuardado === 'guardando' ? 'Guardando…' : estadoGuardado === 'guardado' ? 'Guardado' : 'No se pudo guardar'}
          </span>
        )}
      </header>

      <div className={styles.barra}>
        <Tabs tabs={PROYECTOS_DOC.map((p) => ({ key: p.value, label: p.label }))} value={proyecto} onChange={elegirProyecto} ariaLabel="Proyecto" />
        {esAdmin && (
          <div className={styles.admin}>
            {puedeGestionar && (
              <>
                <Button variant="secondary" onClick={() => agregarEnRaiz({ id: nuevoId(), name: 'Nueva Carpeta', type: 'folder', children: [] })}>
                  <FolderPlus size={16} strokeWidth={1.75} aria-hidden="true" />
                  Carpeta
                </Button>
                <Button variant="secondary" onClick={() => agregarEnRaiz({ id: nuevoId(), name: '', type: 'file', fileType: 'pdf' })}>
                  <FilePlus size={16} strokeWidth={1.75} aria-hidden="true" />
                  Archivo
                </Button>
              </>
            )}
            <Button variant={gestionando ? 'primary' : 'secondary'} aria-pressed={gestionando} onClick={() => setGestionando((v) => !v)}>
              <Settings2 size={16} strokeWidth={1.75} aria-hidden="true" />
              {gestionando ? 'Salir de gestión' : 'Gestionar'}
            </Button>
          </div>
        )}
      </div>

      {cargando && <p className={styles.estado} role="status">Cargando recursos…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {!cargando && !error && (
        <>
          <div className={lista.filtros}>
            <div className={lista.filtroBusqueda}>
              <Field label={<span className={lista.labelConIcono}><Search size={13} />Buscar</span>}>
                {(p) => <TextInput {...p} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre del recurso…" />}
              </Field>
            </div>
            <Field label={<span className={lista.labelConIcono}><Folder size={13} />Carpeta</span>}>
              {(p) => (
                <Select value={carpetaFiltro} onChange={(e) => setCarpetaFiltro(e.target.value)} {...p}>
                  <option value="">Todas las carpetas</option>
                  {carpetas.map((c) => <option key={c.id} value={c.id}>{'  '.repeat(c.depth)}{c.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label={<span className={lista.labelConIcono}><File size={13} />Tipo</span>}>
              {(p) => (
                <Select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} {...p}>
                  <option value="">Todos los tipos</option>
                  {TIPOS_ARCHIVO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              )}
            </Field>
            {hayFiltros && (
              <button type="button" className={lista.limpiar} onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            )}
          </div>

          {hayFiltros && <p className={styles.conteo}>{total} {total === 1 ? 'recurso encontrado' : 'recursos encontrados'}</p>}

          {visible.length > 0 ? (
            <div className={styles.arbol}>
              {visible.map((nodo) =>
                nodo.type === 'folder' ? (
                  <NodoCarpeta key={nodo.id} nodo={nodo} ctx={ctx} autoFoco={nodo.id === raizNuevaId} />
                ) : (
                  <TarjetaArchivo key={nodo.id} archivo={nodo} url={urlsActuales[nodo.id] || null} gestionando={puedeGestionar} proyecto={proyecto} autoFoco={nodo.id === raizNuevaId} onCambiar={ctx.onCambiar} onMover={ctx.onMover} onPedirMover={ctx.onPedirMover} onCompartir={ctx.onCompartir} onUrl={ctx.onUrl} />
                )
              )}
            </div>
          ) : (
            <div className={styles.estado}>
              <p>{hayFiltros ? 'No se encontraron recursos con los filtros seleccionados.' : 'Todavía no hay recursos publicados en este proyecto.'}</p>
              {hayFiltros && <Button variant="secondary" onClick={limpiarFiltros}>Limpiar filtros</Button>}
            </div>
          )}
        </>
      )}

      {aviso && (
        <div role="status" className={`${styles.toast} ${aviso.tipo === 'ok' ? styles.toastOk : styles.toastAviso}`}>
          <span>{aviso.texto}</span>
          <button type="button" className={styles.toastCerrar} onClick={cerrarAviso} aria-label="Cerrar">✕</button>
        </div>
      )}

      <Modal open={moviendoId !== null && moviendo !== null} onClose={() => setMoviendoId(null)} title={`Mover "${moviendo?.name || 'Sin nombre'}"`}>
        {moviendo && (
          <div className={styles.destinos}>
            <button type="button" className={styles.destino} onClick={() => moverA(null)}>Raíz (nivel superior)</button>
            {destinos.map((d) => (
              <button key={d.id} type="button" className={styles.destino} style={{ paddingLeft: `${12 + d.depth * 20}px` }} onClick={() => moverA(d.id)}>
                {d.name || 'Sin nombre'}
              </button>
            ))}
            {destinos.length === 0 && <p className={styles.vacio}>No hay otras carpetas disponibles.</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
