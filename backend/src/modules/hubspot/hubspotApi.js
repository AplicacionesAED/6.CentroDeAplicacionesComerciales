// Cliente de la API de HubSpot para los servicios del backend. Dos formas:
//  - clienteDeUsuario(usuarioId): con el token OAuth del usuario (se renueva solo, un 401 se reintenta una vez).
//  - clienteDeServicio(): con HUBSPOT_SERVICE_TOKEN (app privada). Solo para escribir propiedades de objetos
//    personalizados, que el consentimiento OAuth de la app no cubre. Devuelve null si no esta configurado.
// Un error de HubSpot se lanza como ApiError con `hubspotStatus` para que quien llama pueda ignorar, p. ej., un 404.
const ApiError = require('../../utils/ApiError');
const { API_URL, obtenerAccessToken } = require('./hubspot.service');

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// HubSpot limita las llamadas por segundo (la busqueda, 5/s por token) y responde 429 "secondly limit". Se reintenta esperando lo que
// indique `Retry-After` (o 1 s, 2 s, ...) en vez de fallar: asi una lista grande o dos pantallas cargando a la vez no se caen.
const REINTENTOS_429 = 6;

async function enviar(token, metodo, ruta, { query, cuerpo, binario } = {}) {
  const url = new URL(`${API_URL}${ruta}`);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  const headers = { Authorization: `Bearer ${token}` };
  let body;
  if (binario) {
    headers['Content-Type'] = binario.contentType;
    body = binario.body;
  } else if (cuerpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(cuerpo);
  }
  return fetch(url, { method: metodo, headers, body });
}

async function leer(res) {
  const texto = await res.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

function crearCliente(obtenerToken) {
  async function llamar(metodo, ruta, opciones) {
    let res = await enviar(await obtenerToken(false), metodo, ruta, opciones);
    if (res.status === 401) res = await enviar(await obtenerToken(true), metodo, ruta, opciones);
    for (let intento = 1; res.status === 429 && intento <= REINTENTOS_429; intento++) {
      const indicada = Number(res.headers.get('retry-after')) * 1000;
      await esperar(Math.min(indicada > 0 ? indicada : 1000 * intento, 10000) + Math.random() * 250);
      res = await enviar(await obtenerToken(false), metodo, ruta, opciones);
    }
    const data = await leer(res);
    if (!res.ok) {
      const noConectado = res.status === 401;
      const err = new ApiError(noConectado ? 409 : 502, noConectado ? 'Vuelve a conectar tu cuenta de HubSpot.' : 'HubSpot rechazó la solicitud.', {
        ...(noConectado ? { codigo: 'HUBSPOT_NO_CONECTADO' } : {}),
        hubspotStatus: res.status,
        hubspot: data,
      });
      err.hubspotStatus = res.status;
      throw err;
    }
    return data;
  }

  return {
    get: (ruta, query) => llamar('GET', ruta, { query }),
    post: (ruta, cuerpo, query) => llamar('POST', ruta, { cuerpo, query }),
    put: (ruta, cuerpo) => llamar('PUT', ruta, { cuerpo }),
    patch: (ruta, cuerpo) => llamar('PATCH', ruta, { cuerpo }),
    delete: (ruta) => llamar('DELETE', ruta),
    // Cuerpo ya armado (multipart de la API de archivos): { body: Buffer, contentType }.
    subir: (ruta, binario) => llamar('POST', ruta, { binario }),
  };
}

const clienteDeUsuario = (usuarioId) => crearCliente((forzar) => obtenerAccessToken(usuarioId, { forzarRefresh: forzar }));

function clienteDeServicio() {
  const token = process.env.HUBSPOT_SERVICE_TOKEN;
  return token ? crearCliente(async () => token) : null;
}

// Pagina una busqueda de HubSpot (POST .../search) y junta todos los resultados.
async function buscarTodos(hs, ruta, cuerpo) {
  let resultados = [];
  let after;
  do {
    const r = await hs.post(ruta, { ...cuerpo, limit: 100, ...(after ? { after } : {}) });
    resultados = resultados.concat(r.results || []);
    after = r.paging?.next?.after;
    // Una pausa entre paginas mantiene la busqueda por debajo del limite de 5 llamadas por segundo.
    if (after) await esperar(250);
  } while (after);
  return resultados;
}

// Multipart a mano para la API de archivos: ni `form-data` ni FormData nativo funcionan con HubSpot
// ("Invalid JSON for options input"). Solo los accesos PRIVATE y PUBLIC_INDEXABLE sirven.
function armarSubidaArchivo(buffer, nombre, mimeType = 'application/pdf', carpeta = '/cotizaciones') {
  const limite = `----FormBoundary${Date.now()}`;
  const opciones = JSON.stringify({ access: 'PUBLIC_INDEXABLE' });
  const body = Buffer.concat([
    Buffer.from(`--${limite}\r\nContent-Disposition: form-data; name="options"\r\n\r\n${opciones}\r\n`),
    Buffer.from(`--${limite}\r\nContent-Disposition: form-data; name="folderPath"\r\n\r\n${carpeta}\r\n`),
    Buffer.from(`--${limite}\r\nContent-Disposition: form-data; name="file"; filename="${nombre}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${limite}--\r\n`),
  ]);
  return { body, contentType: `multipart/form-data; boundary=${limite}` };
}

// Borra las notas de un negocio cuyo cuerpo contiene `texto`. Mejor esfuerzo: nunca lanza.
async function borrarNotasPorTexto(hs, dealId, texto) {
  try {
    const asoc = await hs.get(`/crm/v4/objects/deals/${dealId}/associations/notes`);
    const ids = (asoc.results || []).map((r) => String(r.toObjectId || r.id));
    if (!ids.length) return;
    const lote = await hs.post('/crm/v3/objects/notes/batch/read', { inputs: ids.map((id) => ({ id })), properties: ['hs_note_body'] });
    for (const nota of lote.results || []) {
      if ((nota.properties?.hs_note_body || '').includes(texto)) await hs.delete(`/crm/v3/objects/notes/${nota.id}`);
    }
  } catch (e) {
    console.warn(`[notas] No se pudieron borrar las notas con "${texto}":`, e.message);
  }
}

module.exports = { clienteDeUsuario, clienteDeServicio, buscarTodos, armarSubidaArchivo, borrarNotasPorTexto };
