// Procesa a mano las separaciones vencidas de Oliv: 15 dias en etapa 5 pasa a etapa 5.5 (ver
// src/modules/cotizacion/separacionVencida.js).
// Sin argumentos: SIMULACRO (no escribe nada). Con --aplicar: mueve, desvincula, marca Disponible y crea la nota.
// Uso:  npm run separaciones-vencidas                       (simulacro)
//       npm run separaciones-vencidas -- --aplicar [--limite=N]
require('dotenv').config();
const sequelize = require('../src/config/db');
require('../src/models');
const { procesarSeparacionesVencidas } = require('../src/modules/cotizacion/separacionVencida');

const aplicar = process.argv.includes('--aplicar');
const limite = Number((process.argv.find((a) => a.startsWith('--limite=')) || '').split('=')[1]) || 0;

procesarSeparacionesVencidas({ simulacro: !aplicar, limite })
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
