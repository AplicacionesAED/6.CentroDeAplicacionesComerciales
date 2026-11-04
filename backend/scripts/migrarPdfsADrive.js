// Sube a Google Drive los PDFs de las cotizaciones que aun estan en disco y guarda su id en `pdf_drive_id`.
// Idempotente (salta las que ya tienen id) y en simulacro por defecto: no sube nada hasta pasar --aplicar.
//
// Busca cada archivo en QUOTES_DIR y, si esta definida, en LEGACY_QUOTES_DIR (la carpeta data/quotes de la app
// vieja, o una copia del volumen del servidor). Las cotizaciones cuyo archivo no aparece se listan al final.
// Uso:  npm run migrar-pdfs            (simulacro)
//       npm run migrar-pdfs -- --aplicar
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sequelize = require('../src/config/db');
require('../src/models');
const Cotizacion = require('../src/modules/cotizacion/cotizacion.model');
const { QUOTES_DIR } = require('../src/modules/cotizacion/cotizacion.service');
const googleDrive = require('../src/services/googleDrive');

const APLICAR = process.argv.includes('--aplicar');
const CARPETAS = [QUOTES_DIR, process.env.LEGACY_QUOTES_DIR].filter(Boolean);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function main() {
  const pendientes = await Cotizacion.findAll({ where: { pdf_drive_id: null }, order: [['id', 'ASC']] });
  const conNombre = pendientes.filter((c) => c.pdf_filename);
  console.log(`${APLICAR ? 'APLICANDO' : 'SIMULACRO'} -- cotizaciones sin PDF en Drive: ${conNombre.length}`);
  console.log(`Carpetas donde se buscan los archivos: ${CARPETAS.join(' | ')}`);

  const faltan = [];
  let subidas = 0;
  for (const c of conNombre) {
    const ruta = buscarArchivo(c.pdf_filename);
    if (!ruta) {
      faltan.push(c);
      continue;
    }
    if (APLICAR) {
      const carpeta = await conReintentos(() => googleDrive.resolverCarpetaCotizaciones(c.project));
      const subido = await conReintentos(() => googleDrive.subirArchivo(fs.readFileSync(ruta), c.pdf_filename, 'application/pdf', carpeta));
      await c.update({ pdf_drive_id: subido.id });
      await esperar(300);
    }
    subidas++;
  }

  console.log(`\n${APLICAR ? 'Subidos' : 'Se subirian'}: ${subidas}`);
  console.log(`Sin archivo en disco: ${faltan.length}${faltan.length ? ' (siguen con "no esta en el servidor" hasta traer sus PDFs)' : ''}`);
  if (!APLICAR) console.log('\nSimulacro: no se subio nada. Para subir de verdad, agrega --aplicar.');
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
