// Cliente de Google Drive -- almacenamiento real de los PDFs de cotizaciones (mismo esquema que RR.HH. y
// Solicitudes: cuenta de servicio, sin OAuth interactivo; el disco local se pierde en cada redeploy de Docker).
//
// Jerarquia (raiz = carpeta "6. CENTRO DE APLICACIONES COMERCIALES", exclusiva de este proyecto, dentro de la
// misma Unidad Compartida que las demas apps):
//   <raiz>/Cotizaciones/<proyecto>/<id del negocio> - <nombre del negocio>/<AAAA-MM-DD>/cotizacion_<negocio>_<marca>.pdf
//
// Credencial (mutuamente sustituibles, se prueba primero la primera):
// - GOOGLE_DRIVE_CREDENTIALS_JSON: contenido COMPLETO del .json como variable de entorno (Docker/Coolify).
// - GOOGLE_DRIVE_KEY_FILE: ruta a un .json en disco (dev local, gitignoreado).
// La cuenta de servicio debe ser miembro/editor de la Unidad Compartida y GOOGLE_DRIVE_ROOT_FOLDER_ID apuntar a la
// carpeta raiz de este proyecto.
const { Readable } = require('stream');
const { google } = require('googleapis');
const ApiError = require('../utils/ApiError');

const FOLDER_MIME = 'application/vnd.google-apps.folder';

let driveClient = null;

// Se resuelve recien en el primer uso real: un servidor sin Drive configurado igual arranca y sirve el resto de la app.
function getDriveClient() {
  const { GOOGLE_DRIVE_CREDENTIALS_JSON, GOOGLE_DRIVE_KEY_FILE, GOOGLE_DRIVE_ROOT_FOLDER_ID } = process.env;
  if ((!GOOGLE_DRIVE_CREDENTIALS_JSON && !GOOGLE_DRIVE_KEY_FILE) || !GOOGLE_DRIVE_ROOT_FOLDER_ID) {
    throw new ApiError(500, 'Google Drive no está configurado en este servidor (falta GOOGLE_DRIVE_CREDENTIALS_JSON o GOOGLE_DRIVE_KEY_FILE, y/o GOOGLE_DRIVE_ROOT_FOLDER_ID).');
  }
  if (!driveClient) {
    const opciones = { scopes: ['https://www.googleapis.com/auth/drive'] };
    if (GOOGLE_DRIVE_CREDENTIALS_JSON) {
      try {
        opciones.credentials = JSON.parse(GOOGLE_DRIVE_CREDENTIALS_JSON);
      } catch {
        throw new ApiError(500, 'GOOGLE_DRIVE_CREDENTIALS_JSON no es un JSON válido: revisar que se haya pegado el archivo completo.');
      }
    } else {
      opciones.keyFile = GOOGLE_DRIVE_KEY_FILE;
    }
    driveClient = google.drive({ version: 'v3', auth: new google.auth.GoogleAuth(opciones) });
  }
  return driveClient;
}

// Drive usa `\'` como escape dentro de un literal de comillas simples.
const escaparParaQuery = (texto) => texto.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// Busca una carpeta con este nombre EXACTO dentro de `carpetaPadreId`; si no existe, la crea. `supportsAllDrives` en
// todas las llamadas: la raiz vive en una Unidad Compartida.
async function buscarOCrearCarpeta(nombre, carpetaPadreId) {
  const drive = getDriveClient();
  const q = `name = '${escaparParaQuery(nombre)}' and mimeType = '${FOLDER_MIME}' and '${carpetaPadreId}' in parents and trashed = false`;
  const { data } = await drive.files.list({ q, fields: 'files(id, name)', supportsAllDrives: true, includeItemsFromAllDrives: true, spaces: 'drive' });
  if (data.files?.length > 0) return data.files[0].id;
  const { data: creada } = await drive.files.create({
    requestBody: { name: nombre, mimeType: FOLDER_MIME, parents: [carpetaPadreId] },
    fields: 'id',
    supportsAllDrives: true,
  });
  return creada.id;
}

// Nombre de carpeta valido: sin separadores ni comillas raras, recortado.
const limpiarNombre = (texto) => String(texto ?? '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);

// <raiz>/Cotizaciones/<proyecto>/<id del negocio> - <nombre>/<AAAA-MM-DD>
// La carpeta del negocio se busca por el prefijo "<id> - " (el id no cambia aunque renombren el negocio en HubSpot) y
// se reutiliza; solo se crea si no existe. `fecha` ya viene como AAAA-MM-DD (dia de la cotizacion, hora de Colombia).
async function resolverCarpetaCotizacion({ proyecto, dealId, dealName, fecha }) {
  const drive = getDriveClient();
  const cotizaciones = await buscarOCrearCarpeta('Cotizaciones', process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
  const carpetaProyecto = await buscarOCrearCarpeta(limpiarNombre(proyecto) || 'Sin proyecto', cotizaciones);

  const prefijo = `${dealId} - `;
  const { data } = await drive.files.list({
    q: `name contains '${escaparParaQuery(prefijo)}' and mimeType = '${FOLDER_MIME}' and '${carpetaProyecto}' in parents and trashed = false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    spaces: 'drive',
  });
  const existente = (data.files ?? []).find((f) => f.name.startsWith(prefijo));
  const carpetaNegocio = existente ? existente.id : await buscarOCrearCarpeta(`${prefijo}${limpiarNombre(dealName) || 'Sin nombre'}`, carpetaProyecto);
  return buscarOCrearCarpeta(fecha, carpetaNegocio);
}

// Mover en Drive solo cambia el padre: el id del archivo no cambia. Devuelve false si ya estaba en esa carpeta.
async function moverArchivo(fileId, carpetaDestinoId) {
  const drive = getDriveClient();
  const { data } = await drive.files.get({ fileId, fields: 'parents', supportsAllDrives: true });
  const padres = data.parents ?? [];
  if (padres.includes(carpetaDestinoId)) return false;
  await drive.files.update({ fileId, addParents: carpetaDestinoId, removeParents: padres.join(','), fields: 'id', supportsAllDrives: true });
  return true;
}

async function subirArchivo(buffer, nombre, mimeType, carpetaId) {
  const { data } = await getDriveClient().files.create({
    requestBody: { name: nombre, parents: [carpetaId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id, name',
    supportsAllDrives: true,
  });
  return data;
}

// Nunca se borra en Drive: el archivo se renombra con este prefijo y queda recuperable a mano.
const PREFIJO_ELIMINADO = '(eliminado) ';

async function marcarArchivoEliminado(fileId) {
  const drive = getDriveClient();
  try {
    const { data } = await drive.files.get({ fileId, fields: 'name', supportsAllDrives: true });
    if (data.name?.startsWith(PREFIJO_ELIMINADO)) return;
    await drive.files.update({ fileId, requestBody: { name: `${PREFIJO_ELIMINADO}${data.name}` }, supportsAllDrives: true });
  } catch (err) {
    if (err.code !== 404) throw err;
  }
}

// Metadata + stream de contenido: el PDF se sirve desde la API (con sesion), nunca con un link directo de Drive.
async function obtenerArchivoStream(fileId) {
  const drive = getDriveClient();
  const [{ data: meta }, { data: stream }] = await Promise.all([
    drive.files.get({ fileId, fields: 'name, mimeType', supportsAllDrives: true }),
    drive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'stream' }),
  ]);
  return { stream, mimeType: meta.mimeType, nombre: meta.name };
}

async function descargarBuffer(fileId) {
  const { stream } = await obtenerArchivoStream(fileId);
  const partes = [];
  for await (const parte of stream) partes.push(Buffer.isBuffer(parte) ? parte : Buffer.from(parte));
  return Buffer.concat(partes);
}

module.exports = { getDriveClient, buscarOCrearCarpeta, resolverCarpetaCotizacion, moverArchivo, subirArchivo, marcarArchivoEliminado, obtenerArchivoStream, descargarBuffer };
