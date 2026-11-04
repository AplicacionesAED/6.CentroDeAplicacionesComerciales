// Acceso a la API de HubSpot en nombre de un usuario: guarda sus tokens (cifrados), los renueva
// antes de que venzan y reenvia peticiones a HubSpot con el token vigente. El navegador nunca ve
// el token. HUBSPOT_API_URL solo se redefine en pruebas.
const ApiError = require('../../utils/ApiError');
const { cifrar, descifrar } = require('../../utils/cifrado');
const HubspotToken = require('./hubspotToken.model');

const API_URL = process.env.HUBSPOT_API_URL || 'https://api.hubapi.com';
const MARGEN_MS = 2 * 60 * 1000;
// Rutas de HubSpot que el proxy deja pasar: solo CRM y archivos, que es lo que usa la app.
const RUTAS_PERMITIDAS = /^\/(crm|files)\//;

// Un solo refresh en vuelo por usuario: peticiones simultaneas esperan el mismo.
const refrescando = new Map();

async function guardarTokens(usuarioId, { access_token, refresh_token, expires_in }) {
  const valores = {
    usuario_id: usuarioId,
    access_token_cifrado: cifrar(access_token),
    refresh_token_cifrado: cifrar(refresh_token),
    expira_en: new Date(Date.now() + Number(expires_in) * 1000),
  };
  const existente = await HubspotToken.findOne({ where: { usuario_id: usuarioId } });
  if (existente) await existente.update(valores);
  else await HubspotToken.create(valores);
}

async function pedirTokens(params) {
  const res = await fetch(`${API_URL}/oauth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.HUBSPOT_CLIENT_ID ?? '',
      client_secret: process.env.HUBSPOT_CLIENT_SECRET ?? '',
      redirect_uri: process.env.HUBSPOT_REDIRECT_URI || 'http://localhost:3001/api/auth/hubspot/callback',
      ...params,
    }),
  });
  if (!res.ok) {
    const err = new Error(`HubSpot token ${res.status}`);
    // 400/401/403: HubSpot rechaza el refresh token (revocado o app desinstalada) y solo reconectando se arregla.
    // Cualquier otro codigo (429, 5xx) es pasajero.
    err.definitivo = [400, 401, 403].includes(res.status);
    throw err;
  }
  return res.json();
}

const INTENTOS_REFRESH = 3;

// Renueva el access token. Un fallo pasajero (red, 429, 5xx) se reintenta; solo uno definitivo pide reconectar.
async function refrescar(registro) {
  let refreshToken;
  try {
    refreshToken = descifrar(registro.refresh_token_cifrado);
  } catch (e) {
    e.definitivo = true; // guardado con otra HUBSPOT_TOKEN_KEY o corrupto
    throw e;
  }
  let ultimo;
  for (let intento = 1; intento <= INTENTOS_REFRESH; intento++) {
    try {
      const tokens = await pedirTokens({ grant_type: 'refresh_token', refresh_token: refreshToken });
      await guardarTokens(registro.usuario_id, tokens);
      return tokens.access_token;
    } catch (e) {
      if (e.definitivo) throw e;
      ultimo = e;
      if (intento < INTENTOS_REFRESH) await new Promise((r) => setTimeout(r, 500 * intento));
    }
  }
  throw ultimo;
}

// Devuelve un access token vigente. 409 si el usuario nunca conecto HubSpot o el refresh fallo.
async function obtenerAccessToken(usuarioId, { forzarRefresh = false } = {}) {
  const registro = await HubspotToken.findOne({ where: { usuario_id: usuarioId } });
  if (!registro) throw new ApiError(409, 'Conecta tu cuenta de HubSpot para continuar.', { codigo: 'HUBSPOT_NO_CONECTADO' });

  if (!forzarRefresh && registro.expira_en.getTime() - Date.now() > MARGEN_MS) {
    try {
      return descifrar(registro.access_token_cifrado);
    } catch {
      // Token guardado con otra HUBSPOT_TOKEN_KEY (o corrupto): no se puede leer, hay que reconectar.
      throw new ApiError(409, 'La conexión con HubSpot venció. Vuelve a conectarla.', { codigo: 'HUBSPOT_NO_CONECTADO' });
    }
  }

  if (!refrescando.has(usuarioId)) {
    refrescando.set(
      usuarioId,
      refrescar(registro)
        .catch((e) => {
          console.error(`[hubspot] no se pudo renovar el token del usuario ${usuarioId}:`, e.message); // eslint-disable-line no-console
          if (e.definitivo) throw new ApiError(409, 'La conexión con HubSpot venció. Vuelve a conectarla.', { codigo: 'HUBSPOT_NO_CONECTADO' });
          throw new ApiError(503, 'No se pudo renovar la conexión con HubSpot. Intenta de nuevo en unos segundos.');
        })
        .finally(() => refrescando.delete(usuarioId))
    );
  }
  return refrescando.get(usuarioId);
}

// Reenvia una peticion a HubSpot como `usuario`. Un 401 de HubSpot fuerza un refresh y un reintento.
async function reenviar(usuarioId, { metodo, ruta, query, cuerpo }) {
  if (!RUTAS_PERMITIDAS.test(ruta)) throw new ApiError(403, 'Ruta de HubSpot no permitida');

  const llamar = async (token) =>
    fetch(`${API_URL}${ruta}${query ? `?${query}` : ''}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${token}`, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });

  let respuesta = await llamar(await obtenerAccessToken(usuarioId));
  if (respuesta.status === 401) respuesta = await llamar(await obtenerAccessToken(usuarioId, { forzarRefresh: true }));
  return respuesta;
}

module.exports = { API_URL, guardarTokens, obtenerAccessToken, reenviar };
