// Arbol de carpetas y archivos del Portal de Ventas, como funciones puras (nunca mutan el arbol recibido).
// Un nodo es { id, name, type: 'folder' | 'file', fileType?, children? }.

export const PROYECTOS_DOC = [
  { value: 'oliv', label: 'Oliv Cartagena' },
  { value: 'almar', label: 'Almar' },
];

export const TIPOS_ARCHIVO = [
  { value: 'pdf', label: 'PDF' },
  { value: 'word', label: 'Word' },
  { value: 'image', label: 'Imagen' },
  { value: 'video', label: 'Video' },
  { value: 'url', label: 'Enlace' },
];

export const etiquetaTipo = (tipo) => TIPOS_ARCHIVO.find((t) => t.value === tipo)?.label ?? 'PDF';

let contador = Date.now();
export const nuevoId = () => `id-${contador++}`;

// Formato viejo { id, name, resources: [...] } -> nodos nuevos. Si ya vienen como nodos, se devuelven tal cual.
export function migrarAFsNodes(data) {
  if (!Array.isArray(data)) return [];
  if (data.length > 0 && data[0].type) return data;
  return data.map((carpeta) => ({
    id: carpeta.id,
    name: carpeta.name,
    type: 'folder',
    children: (carpeta.resources || []).map((r) => ({ id: r.id, name: r.name, type: 'file', fileType: r.fileType || 'pdf' })),
  }));
}

export function buscarNodo(nodos, id) {
  for (const n of nodos) {
    if (n.id === id) return n;
    if (n.type === 'folder' && n.children) {
      const hallado = buscarNodo(n.children, id);
      if (hallado) return hallado;
    }
  }
  return null;
}

// Quita un nodo por id y devuelve { arbol, quitado }.
export function quitarNodo(nodos, id) {
  for (let i = 0; i < nodos.length; i++) {
    if (nodos[i].id === id) return { arbol: [...nodos.slice(0, i), ...nodos.slice(i + 1)], quitado: nodos[i] };
    if (nodos[i].type === 'folder' && nodos[i].children) {
      const r = quitarNodo(nodos[i].children, id);
      if (r.quitado) return { arbol: [...nodos.slice(0, i), { ...nodos[i], children: r.arbol }, ...nodos.slice(i + 1)], quitado: r.quitado };
    }
  }
  return { arbol: nodos, quitado: null };
}

// Inserta en los hijos de la carpeta `padreId` (o en la raiz si es null), al final o en `indice`.
export function insertarNodo(nodos, padreId, nodo, indice) {
  if (padreId === null) {
    const i = indice !== undefined ? indice : nodos.length;
    return [...nodos.slice(0, i), nodo, ...nodos.slice(i)];
  }
  return nodos.map((n) => {
    if (n.id === padreId && n.type === 'folder') {
      const hijos = n.children || [];
      const i = indice !== undefined ? indice : hijos.length;
      return { ...n, children: [...hijos.slice(0, i), nodo, ...hijos.slice(i)] };
    }
    if (n.type === 'folder' && n.children) return { ...n, children: insertarNodo(n.children, padreId, nodo, indice) };
    return n;
  });
}

export function actualizarNodo(nodos, id, cambios) {
  return nodos.map((n) => {
    if (n.id === id) return { ...n, ...cambios };
    if (n.type === 'folder' && n.children) return { ...n, children: actualizarNodo(n.children, id, cambios) };
    return n;
  });
}

export function moverNodo(nodos, id, nuevoPadreId, indice) {
  const { arbol, quitado } = quitarNodo(nodos, id);
  if (!quitado) return nodos;
  return insertarNodo(arbol, nuevoPadreId, quitado, indice);
}

// Carpetas a las que NO se puede mover un nodo: el mismo y, si es carpeta, todas sus subcarpetas (moverla ahi la
// dejaria huerfana).
export function destinosInvalidos(nodos, id) {
  const invalidos = new Set([id]);
  const nodo = buscarNodo(nodos, id);
  if (nodo?.type === 'folder') {
    const recorrer = (n) => {
      for (const hijo of n.children || []) {
        if (hijo.type === 'folder') {
          invalidos.add(hijo.id);
          recorrer(hijo);
        }
      }
    };
    recorrer(nodo);
  }
  return invalidos;
}

// Intercambia un nodo con su vecino (carpeta o archivo) dentro de su misma lista. En el borde no hace nada.
export function moverHermano(nodos, id, direccion) {
  function reordenar(lista) {
    const i = lista.findIndex((n) => n.id === id);
    if (i !== -1) {
      const j = direccion === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= lista.length) return lista;
      const copia = [...lista];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    }
    for (let k = 0; k < lista.length; k++) {
      const n = lista[k];
      if (n.type === 'folder' && n.children) {
        const r = reordenar(n.children);
        if (r) {
          const copia = [...lista];
          copia[k] = { ...n, children: r };
          return copia;
        }
      }
    }
    return null;
  }
  return reordenar(nodos) ?? nodos;
}

// Lista plana de carpetas con su profundidad (para los desplegables).
export function aplanarCarpetas(nodos, profundidad = 0) {
  const lista = [];
  for (const n of nodos) {
    if (n.type === 'folder') {
      lista.push({ id: n.id, name: n.name, depth: profundidad });
      if (n.children) lista.push(...aplanarCarpetas(n.children, profundidad + 1));
    }
  }
  return lista;
}

export function contarArchivos(nodos) {
  let total = 0;
  for (const n of nodos) {
    if (n.type === 'file') total++;
    if (n.type === 'folder' && n.children) total += contarArchivos(n.children);
  }
  return total;
}

// Arbol visible. Fuera de "Gestionar" solo se ven los archivos con enlace (lo mismo que ve un vendedor); gestionando
// se ven todos, incluidos los recien creados, para poder completar su enlace. Una carpeta realmente vacia siempre se
// muestra; una con contenido solo si algun hijo sobrevive al filtro.
export function filtrarArbol(nodos, { busqueda = '', tipoArchivo = '', gestionando = false, urls = {} }) {
  const t = busqueda.toLowerCase();
  const filtrar = (lista) =>
    lista
      .map((n) => {
        if (n.type === 'folder') {
          const hijos = n.children || [];
          if (hijos.length === 0) return n;
          const filtrados = filtrar(hijos);
          return filtrados.length > 0 ? { ...n, children: filtrados } : null;
        }
        if (!gestionando && !urls[n.id]?.trim()) return null;
        const coincideNombre = !t || n.name.toLowerCase().includes(t);
        const coincideTipo = !tipoArchivo || n.fileType === tipoArchivo;
        return coincideNombre && coincideTipo ? n : null;
      })
      .filter(Boolean);
  return filtrar(nodos);
}
