// Sube a Google Drive los PDFs de las cotizaciones que aun estan en disco (guarda su id en `pdf_drive_id`) y acomoda
// todos en <proyecto>/<id> - <negocio>/<fecha>. Idempotente y en simulacro por defecto: no toca Drive hasta --aplicar.
//
// Busca cada archivo en QUOTES_DIR y, si esta definida, en LEGACY_QUOTES_DIR (la carpeta data/quotes de la app
// vieja, o una copia del volumen del servidor). Las cotizaciones cuyo archivo no aparece se listan al final.
// Uso:  npm run migrar-pdfs            (simulacro)
//       npm run migrar-pdfs -- --aplicar
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const sequelize = require('../src/config/db');
require('../src/models');
const Cotizacion = require('../src/modules/cotizacion/cotizacion.model');
const { QUOTES_DIR, diaColombia } = require('../src/modules/cotizacion/cotizacion.service');
const googleDrive = require('../src/services/googleDrive');

const APLICAR = process.argv.includes('--aplicar');
const CARPETAS = [QUOTES_DIR, process.env.LEGACY_QUOTES_DIR].filter(Boolean);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Subidas simultaneas a Drive (mas de ~6 suele chocar con el limite de la cuenta de servicio).
const PARALELO = 5;

// Procesa `items` con `PARALELO` trabajadores a la vez.
async function enParalelo(items, tarea) {
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: Math.min(PARALELO, items.length) }, async () => {
      while (siguiente < items.length) await tarea(items[siguiente++]);
    })
  );
}

// Drive responde 403/429 "rate limit" si se sube muy rapido: se reintenta con espera creciente.
async function conReintentos(fn) {
  for (let intento = 1; ; intento++) {
    try {
      return await fn();
    } catch (e) {
      const limite = e.code === 403 || e.code === 429 || e.code >= 500;
      if (!limite || intento >= 6) throw e;
      await esperar(2000 * intento);
    }
  }
}

function buscarArchivo(nombre) {
  for (const carpeta of CARPETAS) {
    const ruta = path.join(carpeta, nombre);
    if (fs.existsSync(ruta)) return ruta;
  }
  return null;
}

// Carpeta de destino de una cotizacion: <proyecto>/<id> - <negocio>/<fecha de la cotizacion>.
const destinoDe = (c) => googleDrive.resolverCarpetaCotizacion({ proyecto: c.project, dealId: c.deal_id, dealName: c.deal_name, fecha: diaColombia(c.created_at) });

async function main() {
  const todas = await Cotizacion.findAll({ where: { pdf_filename: { [Op.ne]: null } }, order: [['id', 'ASC']] });
  const porSubir = todas.filter((c) => !c.pdf_drive_id);
  const enDrive = todas.filter((c) => c.pdf_drive_id);
  console.log(`${APLICAR ? 'APLICANDO' : 'SIMULACRO'} -- con PDF: ${todas.length} (en Drive: ${enDrive.length}, por subir: ${porSubir.length})`);
  console.log(`Carpetas donde se buscan los archivos: ${CARPETAS.join(' | ')}`);

  const faltan = [];
  let subidas = 0;
  let movidas = 0;
  const subibles = [];
  for (const c of porSubir) {
    const ruta = buscarArchivo(c.pdf_filename);
    if (ruta) subibles.push({ c, ruta });
    else faltan.push(c);
  }
  await enParalelo(subibles, async ({ c, ruta }) => {
    if (APLICAR) {
      const carpeta = await conReintentos(() => destinoDe(c));
      const subido = await conReintentos(() => googleDrive.subirArchivo(fs.readFileSync(ruta), c.pdf_filename, 'application/pdf', carpeta));
      await c.update({ pdf_drive_id: subido.id });
    }
    subidas++;
  });
  // Los que ya estaban en Drive se acomodan en su carpeta de negocio y fecha (el id del archivo no cambia).
  await enParalelo(enDrive, async (c) => {
    if (APLICAR) {
      const carpeta = await conReintentos(() => destinoDe(c));
      if (await conReintentos(() => googleDrive.moverArchivo(c.pdf_drive_id, carpeta))) movidas++;
    } else {
      movidas++;
    }
  });

  console.log(`\n${APLICAR ? 'Subidos' : 'Se subirian'}: ${subidas}`);
  console.log(`${APLICAR ? 'Reubicados' : 'Se reubicarian'} (ya estaban en Drive): ${movidas}`);
  console.log(`Sin archivo en disco: ${faltan.length}${faltan.length ? ' (siguen con "no esta en el servidor" hasta traer sus PDFs)' : ''}`);
  if (!APLICAR) console.log('\nSimulacro: no se toco Drive. Para aplicar de verdad, agrega --aplicar.');
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
