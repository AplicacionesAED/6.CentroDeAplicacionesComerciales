// Procesa a mano los vencimientos de cotizaciones de Oliv (ver src/modules/cotizacion/vencimiento.js).
// Sin argumentos: SIMULACRO (no escribe nada). Con --aplicar: desvincula y marca Disponible.
// Uso:  npm run vencimientos                       (simulacro)
//       npm run vencimientos -- --aplicar [--limite=N]
require('dotenv').config();
const sequelize = require('../src/config/db');
require('../src/models');
const { procesarVencimientos } = require('../src/modules/cotizacion/vencimiento');

const aplicar = process.argv.includes('--aplicar');
const limite = Number((process.argv.find((a) => a.startsWith('--limite=')) || '').split('=')[1]) || 0;

procesarVencimientos({ simulacro: !aplicar, limite })
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
