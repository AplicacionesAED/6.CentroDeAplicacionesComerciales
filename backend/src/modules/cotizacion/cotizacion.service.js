// Cotizaciones: se guardan aqui (fila + PDF en disco) y se reflejan en el negocio de HubSpot (nota con el
// PDF, etapa del pipeline). Un no-admin solo ve las cotizaciones de los negocios de los que es dueno.
// Aceptar una cotizacion vive en aceptacion.service.js.
const fs = require('fs');
const path = require('path');
const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { ETAPAS_POR_PROYECTO, sanitizarNombreArchivo, emailComercial } = require('../../utils/comercial');
const { clienteDeUsuario, armarSubidaArchivo, borrarNotasPorTexto } = require('../hubspot/hubspotApi');
const Cotizacion = require('./cotizacion.model');

// Los PDFs viven en el sistema de archivos (en Docker, montar este directorio como volumen persistente).
const QUOTES_DIR = process.env.QUOTES_DIR || path.join(__dirname, '..', '..', '..', 'data', 'quotes');

// null para un admin (ve todo); el correo del usuario para los demas.
const filtroDueno = (usuario) => (usuario.esAdmin ? null : emailComercial(usuario));

const fechaColombia = () =>
  new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

async function cargarVisible(usuario, id) {
  const cotizacion = await Cotizacion.findByPk(id);
  const dueno = filtroDueno(usuario);
  if (!cotizacion || (dueno && (cotizacion.user_email || '').toLowerCase() !== dueno)) throw new ApiError(404, 'Cotización no encontrada');
  return cotizacion;
}

// Refleja la cotizacion en el negocio: borra la nota anterior, sube el PDF, crea la nota y avanza la etapa.
// Mejor esfuerzo: la cotizacion ya esta guardada, un fallo de HubSpot solo se registra.
async function reflejarEnHubspot(usuario, cotizacion, archivo, { skipDealStage }) {
  const hs = clienteDeUsuario(usuario.id);
  try {
    const nombrePdf = `COTIZACION-${sanitizarNombreArchivo(cotizacion.deal_name)}-${sanitizarNombreArchivo(cotizacion.unit_code)}-${new Date().toISOString().slice(0, 10)}.pdf`;
    await borrarNotasPorTexto(hs, cotizacion.deal_id, 'Cotización generada');

    const subida = await hs.subir('/files/v3/files', armarSubidaArchivo(archivo.buffer, nombrePdf));
    const urlPublica = subida.url || subida.defaultHostingUrl || '';

    await hs.post('/crm/v3/objects/notes', {
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_note_body: `Cotización generada - ${cotizacion.unit_code || 'N/A'} - ${cotizacion.quote_type}`,
        hs_attachment_ids: String(subida.id),
      },
      associations: [{ to: { id: cotizacion.deal_id }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }] }],
    });

    const etapas = ETAPAS_POR_PROYECTO[cotizacion.project];
    if (!etapas) console.warn(`[cotizaciones] Proyecto "${cotizacion.project}" no reconocido: no se avanza la etapa`);
    const propiedades = {
      ...(!skipDealStage && etapas && { dealstage: etapas.enviada }),
      fecha_ultima_cotizacion_enviada: fechaColombia(),
      numero_de_cotizaciones_enviadas: String(await Cotizacion.count({ where: { deal_id: cotizacion.deal_id } })),
    };
    if (urlPublica) propiedades.url_ultima_cotizacion = urlPublica;
    await hs.patch(`/crm/v3/objects/deals/${cotizacion.deal_id}`, { properties: propiedades });
  } catch (e) {
    console.warn('[cotizaciones] No se pudo adjuntar el PDF ni actualizar la etapa:', e.details ?? e.message);
  }
}

async function crear(usuario, data, archivo) {
  let pdfFilename = null;
  if (archivo) {
    fs.mkdirSync(QUOTES_DIR, { recursive: true });
    pdfFilename = `cotizacion_${data.dealId}_${Date.now()}.pdf`;
    fs.writeFileSync(path.join(QUOTES_DIR, pdfFilename), archivo.buffer);
  }

  const cotizacion = await Cotizacion.create({
    deal_id: data.dealId,
    deal_name: data.dealName ?? null,
    unit_id: data.unitId,
    unit_code: data.unitCode ?? null,
    unit_tower: data.unitTower || '',
    unit_floor: data.unitFloor || 0,
    user_email: data.userEmail ? data.userEmail.toLowerCase() : null,
    // Quien genera de verdad lo decide la sesion, no el cliente.
    generated_by_email: emailComercial(usuario),
    quote_type: data.quoteType ?? null,
    total_price: data.totalPrice ?? null,
    separation: data.separation ?? null,
    monthly_payment: data.monthlyPayment ?? null,
    num_installments: data.numInstallments ?? null,
    balance: data.balance ?? null,
    pdf_filename: pdfFilename,
    status: 'pendiente',
    snapshot_json: data.snapshot ?? null,
    parking_id: data.parkingId ?? null,
    parking_name: data.parkingName ?? null,
    deposito_id: data.depositoId ?? null,
    deposito_name: data.depositoName ?? null,
    cuarto_util_id: data.cuartoUtilId ?? null,
    cuarto_util_name: data.cuartoUtilName ?? null,
    project: data.project ?? null,
  });

  if (archivo) await reflejarEnHubspot(usuario, cotizacion, archivo, { skipDealStage: data.skipDealStage === true && usuario.esAdmin });

  return { success: true, quoteId: cotizacion.id };
}

// Negocios que tienen cotizaciones, agrupados.
async function negociosConCotizaciones(usuario) {
  const dueno = filtroDueno(usuario);
  const deals = await sequelize.query(
    `SELECT deal_id, MAX(deal_name) AS deal_name, COUNT(*)::int AS quote_count, MAX(created_at) AS last_quote_date,
            MAX(CASE WHEN status = 'aceptada' THEN 1 ELSE 0 END)::int AS has_accepted
       FROM cotizaciones ${dueno ? 'WHERE user_email = :dueno' : ''}
      GROUP BY deal_id ORDER BY last_quote_date DESC`,
    { replacements: { dueno }, type: QueryTypes.SELECT }
  );
  return { deals };
}

async function listarTodas(usuario, { status, type, search }) {
  const dueno = filtroDueno(usuario);
  const where = {};
  if (status) where.status = status;
  if (type) where.quote_type = type;
  if (dueno) where.user_email = dueno;
  if (search) {
    const like = { [Op.iLike]: `%${search}%` };
    where[Op.or] = [{ deal_name: like }, { unit_code: like }, { user_email: like }];
  }
  return { quotes: await Cotizacion.findAll({ where, order: [['created_at', 'DESC']] }) };
}

async function porNegocio(usuario, dealId) {
  const dueno = filtroDueno(usuario);
  const quotes = await Cotizacion.findAll({ where: { deal_id: dealId, ...(dueno ? { user_email: dueno } : {}) }, order: [['created_at', 'DESC']] });
  return { quotes };
}

async function obtener(usuario, id) {
  const { snapshot_json: snapshot, ...resto } = (await cargarVisible(usuario, id)).toJSON();
  return { ...resto, snapshot_json: snapshot, snapshot };
}

// Volcado completo (solo admin) para alimentar una herramienta externa de IA.
async function exportarPlanesDePago() {
  const cotizaciones = await Cotizacion.findAll({ order: [['created_at', 'DESC']] });
  const quotes = cotizaciones.map((q) => ({
    quote_id: q.id,
    deal_id: q.deal_id,
    deal_name: q.deal_name,
    project: q.project,
    unit_code: q.unit_code,
    user_email: q.user_email,
    quote_type: q.quote_type,
    status: q.status,
    created_at: q.created_at,
    total_price: q.total_price,
    separation: q.separation,
    monthly_payment: q.monthly_payment,
    num_installments: q.num_installments,
    balance: q.balance,
    paymentPlan: q.snapshot_json?.paymentPlan || null,
    financialSummary: q.snapshot_json?.financialSummary || null,
  }));
  return { count: quotes.length, quotes };
}

async function eliminar(id) {
  const cotizacion = await Cotizacion.findByPk(id);
  if (!cotizacion) throw new ApiError(404, 'Cotización no encontrada');
  const pdf = cotizacion.pdf_filename;
  await cotizacion.destroy();
  if (pdf) {
    try {
      fs.unlinkSync(path.join(QUOTES_DIR, pdf));
    } catch (e) {
      console.warn('[cotizaciones] No se pudo borrar el PDF:', e.message);
    }
  }
  return { success: true };
}

// Ruta absoluta del PDF de una cotizacion visible para el usuario.
async function rutaPdf(usuario, id) {
  const cotizacion = await Cotizacion.findByPk(id);
  const dueno = filtroDueno(usuario);
  if (!cotizacion?.pdf_filename || (dueno && (cotizacion.user_email || '').toLowerCase() !== dueno)) throw new ApiError(404, 'PDF no encontrado');
  const ruta = path.join(QUOTES_DIR, cotizacion.pdf_filename);
  if (!fs.existsSync(ruta)) throw new ApiError(404, 'El archivo PDF no está en el servidor');
  return { ruta, nombre: cotizacion.pdf_filename };
}

// Resumen por negocio para la lista de negocios: { dealId: { quoteCount, lastQuoteDate, hasAccepted } }.
async function actividadPorNegocio() {
  const filas = await sequelize.query(
    `SELECT deal_id, COUNT(*)::int AS quote_count, MAX(created_at) AS last_quote_date,
            MAX(CASE WHEN status = 'aceptada' THEN 1 ELSE 0 END)::int AS has_accepted
       FROM cotizaciones GROUP BY deal_id`,
    { type: QueryTypes.SELECT }
  );
  return Object.fromEntries(filas.map((f) => [f.deal_id, { quoteCount: f.quote_count, lastQuoteDate: f.last_quote_date, hasAccepted: f.has_accepted === 1 }]));
}

// La cotizacion que mejor representa a cada negocio: la aceptada si la hay, si no la mas reciente.
async function ultimaPorNegocio() {
  const filas = await sequelize.query(
    `SELECT DISTINCT ON (deal_id) deal_id, id AS quote_id, unit_code, total_price, status, quote_type, project, created_at
       FROM cotizaciones ORDER BY deal_id, (status = 'aceptada') DESC, created_at DESC`,
    { type: QueryTypes.SELECT }
  );
  return Object.fromEntries(filas.map((f) => [f.deal_id, f]));
}

module.exports = {
  QUOTES_DIR,
  filtroDueno,
  cargarVisible,
  crear,
  negociosConCotizaciones,
  listarTodas,
  porNegocio,
  obtener,
  exportarPlanesDePago,
  eliminar,
  rutaPdf,
  actividadPorNegocio,
  ultimaPorNegocio,
};
