import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrarAFsNodes, buscarNodo, quitarNodo, insertarNodo, actualizarNodo, moverNodo, destinosInvalidos, moverHermano, aplanarCarpetas, contarArchivos, filtrarArbol, etiquetaTipo } from './arbol.js';

const arbol = () => [
  { id: 'a', name: 'A', type: 'folder', children: [{ id: 'a1', name: 'Brochure', type: 'file', fileType: 'pdf' }, { id: 'sub', name: 'Sub', type: 'folder', children: [{ id: 's1', name: 'Plano', type: 'file', fileType: 'image' }] }] },
  { id: 'b', name: 'B', type: 'folder', children: [] },
  { id: 'f', name: 'Suelto', type: 'file', fileType: 'word' },
];

test('migrarAFsNodes convierte el formato viejo y respeta el nuevo', () => {
  const viejo = [{ id: 'x', name: 'Carpeta', resources: [{ id: 'r', name: 'Doc' }] }];
  assert.deepEqual(migrarAFsNodes(viejo), [{ id: 'x', name: 'Carpeta', type: 'folder', children: [{ id: 'r', name: 'Doc', type: 'file', fileType: 'pdf' }] }]);
  assert.deepEqual(migrarAFsNodes(arbol()), arbol());
  assert.deepEqual(migrarAFsNodes(null), []);
});

test('buscar, quitar y actualizar no mutan el original', () => {
  const t = arbol();
  assert.equal(buscarNodo(t, 's1').name, 'Plano');
  const { arbol: sin, quitado } = quitarNodo(t, 's1');
  assert.equal(quitado.id, 's1');
  assert.equal(buscarNodo(sin, 's1'), null);
  assert.equal(buscarNodo(t, 's1').id, 's1');
  assert.equal(buscarNodo(actualizarNodo(t, 'a1', { name: 'Nuevo' }), 'a1').name, 'Nuevo');
  assert.equal(buscarNodo(t, 'a1').name, 'Brochure');
});

test('insertar al final de una carpeta o en la raiz', () => {
  const t = arbol();
  const conNuevo = insertarNodo(t, 'b', { id: 'n', name: 'N', type: 'file' });
  assert.deepEqual(buscarNodo(conNuevo, 'b').children.map((c) => c.id), ['n']);
  assert.equal(insertarNodo(t, null, { id: 'z', name: 'Z', type: 'file' }).at(-1).id, 'z');
});

test('mover un nodo a otra carpeta', () => {
  const movido = moverNodo(arbol(), 'a1', 'b', 0);
  assert.deepEqual(buscarNodo(movido, 'b').children.map((c) => c.id), ['a1']);
  assert.equal(buscarNodo(buscarNodo(movido, 'a').children, 'a1'), null);
});

test('una carpeta no puede moverse a si misma ni a sus subcarpetas', () => {
  assert.deepEqual([...destinosInvalidos(arbol(), 'a')].sort(), ['a', 'sub']);
  assert.deepEqual([...destinosInvalidos(arbol(), 'f')], ['f']);
});

test('moverHermano intercambia y respeta los bordes', () => {
  const t = arbol();
  assert.deepEqual(moverHermano(t, 'b', 'up').map((n) => n.id), ['b', 'a', 'f']);
  assert.deepEqual(moverHermano(t, 'a', 'up').map((n) => n.id), ['a', 'b', 'f']);
  assert.deepEqual(buscarNodo(moverHermano(t, 'sub', 'up'), 'a').children.map((n) => n.id), ['sub', 'a1']);
});

test('aplanarCarpetas con profundidad y contarArchivos', () => {
  assert.deepEqual(aplanarCarpetas(arbol()).map((c) => `${c.id}:${c.depth}`), ['a:0', 'sub:1', 'b:0']);
  assert.equal(contarArchivos(arbol()), 3);
});

test('filtrarArbol: sin gestionar solo se ven archivos con enlace; carpeta vacia siempre', () => {
  const urls = { a1: 'https://x', f: ' ' };
  const visible = filtrarArbol(arbol(), { urls });
  assert.deepEqual(visible.map((n) => n.id), ['a', 'b']);
  assert.deepEqual(buscarNodo(visible, 'a').children.map((n) => n.id), ['a1']);
});

test('filtrarArbol gestionando muestra todo y filtra por nombre y tipo', () => {
  const todo = filtrarArbol(arbol(), { gestionando: true });
  assert.equal(contarArchivos(todo), 3);
  assert.deepEqual(filtrarArbol(arbol(), { gestionando: true, busqueda: 'plano' }).map((n) => n.id), ['a', 'b']); // la carpeta vacia B siempre se muestra
  assert.deepEqual(filtrarArbol(arbol(), { gestionando: true, tipoArchivo: 'word' }).map((n) => n.id), ['b', 'f']);
});

test('etiquetaTipo', () => {
  assert.equal(etiquetaTipo('word'), 'Word');
  assert.equal(etiquetaTipo(undefined), 'PDF');
});
