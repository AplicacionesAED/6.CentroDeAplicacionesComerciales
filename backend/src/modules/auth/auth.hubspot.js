// Login con HubSpot (OAuth2, authorization code) hecho en el servidor: el navegador solo navega a
// /auth/hubspot/login y vuelve con la sesion ya puesta en cookies httpOnly, igual que el SSO de
// Microsoft. HubSpot solo IDENTIFICA a la persona aqui: el usuario tiene que existir ya en
// `usuarios` (lo crea un administrador). Los tokens de HubSpot se guardan cifrados en `hubspot_tokens`
// (ver modules/hubspot) para poder llamar a HubSpot en nombre del usuario.
const crypto = require('crypto');
const asyncHandler = require('../../utils/asyncHandler');
const {
  ACCESS_TOKEN_EXPIRE_HOURS,
  REFRESH_TOKEN_EXPIRE_DAYS,
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  HUBSPOT_STATE_COOKIE_NAME,
  createAccessToken,
  createRefreshToken,
} = require('../../utils/security');
const Usuario = require('../usuario/usuario.model');
const usuarioService = require('../usuario/usuario.service');
const hubspotService = require('../hubspot/hubspot.service');

const { API_URL } = hubspotService;

// `secure` solo si la app se sirve por HTTPS (FRONTEND_URL): con una URL http de pruebas el navegador descartaria la cookie.
const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production' && String(process.env.FRONTEND_URL || '').startsWith('https'),
};
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI || 'http://localhost:3001/api/auth/hubspot/callback';
// Mismos scopes que la app vieja: HubSpot rechaza pedir scopes que la app registrada no tenga.
const SCOPES = 'crm.objects.contacts.read crm.objects.custom.read crm.objects.owners.read crm.objects.deals.read crm.objects.deals.write files';

function irAlLogin(res, codigo) {
  res.clearCookie(HUBSPOT_STATE_COOKIE_NAME);
  return res.redirect(`${FRONTEND_URL}/login?error=${codigo}`);
}

// GET /auth/hubspot/login -- navegacion de nivel superior del navegador.
const iniciarLogin = asyncHandler(async (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(HUBSPOT_STATE_COOKIE_NAME, state, { ...COOKIE_BASE, maxAge: 10 * 60 * 1000 });
  const params = new URLSearchParams({
    client_id: process.env.HUBSPOT_CLIENT_ID ?? '',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
  });
  res.redirect(`https://app.hubspot.com/oauth/authorize?${params}`);
});

async function intercambiarCodigo(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.HUBSPOT_CLIENT_ID ?? '',
    client_secret: process.env.HUBSPOT_CLIENT_SECRET ?? '',
    redirect_uri: REDIRECT_URI,
    code,
  });
  const res = await fetch(`${API_URL}/oauth/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`HubSpot token ${res.status}`);
  return res.json();
}

// Devuelve { email, userId } de quien autorizo el token.
async function leerIdentidad(accessToken) {
  const res = await fetch(`${API_URL}/oauth/v1/access-tokens/${encodeURIComponent(accessToken)}`);
  if (!res.ok) throw new Error(`HubSpot access-tokens ${res.status}`);
  const info = await res.json();
  return { email: String(info.user ?? '').toLowerCase(), userId: info.user_id != null ? String(info.user_id) : null };
}

// GET /auth/hubspot/callback -- HubSpot redirige aca con ?code=...&state=...
const callback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;
  const stateEsperado = req.cookies?.[HUBSPOT_STATE_COOKIE_NAME];
  if (error || !code || !state || !stateEsperado || state !== stateEsperado) return irAlLogin(res, 'HubSpotError');

  let identidad;
  let tokens;
  try {
    tokens = await intercambiarCodigo(code);
    identidad = await leerIdentidad(tokens.access_token);
  } catch (err) {
    console.error('[hubspot] login fallido:', err.message);
    return irAlLogin(res, 'HubSpotError');
  }
  if (!identidad.userId || !identidad.email) return irAlLogin(res, 'HubSpotError');

  // Primero por el id de HubSpot ya vinculado; si es la primera vez, por el correo (HubSpot ya
  // verifico que esa persona es duena de ese correo) y se deja vinculado.
  let usuario = await Usuario.findOne({ where: { hubspot_user_id: identidad.userId } });
  if (!usuario) {
    usuario = await Usuario.findOne({ where: { email: identidad.email } });
    if (!usuario) return irAlLogin(res, 'HubSpotAccountNotFound');
    if (usuario.hubspot_user_id && usuario.hubspot_user_id !== identidad.userId) return irAlLogin(res, 'HubSpotError');
  }
  if (!usuario.activo) return irAlLogin(res, 'HubSpotAccountInactive');

  // Entrar por HubSpot no usa la contrasena del sistema, asi que nunca se pide cambiarla.
  await usuario.update({ hubspot_user_id: identidad.userId, hubspot_email: identidad.email, debe_cambiar_password: false });
  // Los tokens se guardan cifrados: el Cotizador los usa despues, via /api/hubspot, para llamar a HubSpot como este usuario.
  try {
    await hubspotService.guardarTokens(usuario.id, tokens);
  } catch (err) {
    console.error('[hubspot] no se pudieron guardar los tokens:', err.message);
    return irAlLogin(res, 'HubSpotError');
  }
  await usuarioService.registrarConexion(usuario);

  res.clearCookie(HUBSPOT_STATE_COOKIE_NAME);
  res.cookie(ACCESS_COOKIE_NAME, createAccessToken(usuario.email, usuario.roles), { ...COOKIE_BASE, maxAge: ACCESS_TOKEN_EXPIRE_HOURS * 3600 * 1000 });
  res.cookie(REFRESH_COOKIE_NAME, createRefreshToken(usuario.email), { ...COOKIE_BASE, maxAge: REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600 * 1000 });
  res.redirect(FRONTEND_URL);
});

module.exports = { iniciarLogin, callback };
