require('dotenv').config();

// Sin conexion a la BD configurada todo falla con errores confusos (el frontend muestra "No se pudo conectar
// con el servidor"): mejor cortar aqui diciendo que falta.
if (!process.env.DATABASE_URL && !process.env.PGDATABASE) {
  console.error('Falta configurar la base de datos: copia backend/.env.example a backend/.env y completa DATABASE_URL (o las variables PG*).');
  process.exit(1);
}

const app = require('./app');

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Backend Centro de Aplicaciones Comerciales escuchando en http://localhost:${PORT}`);
});

// Tareas automaticas de Oliv, apagadas por defecto: escriben en HubSpot (desvinculan inmuebles y accesorios, cambian
// estados y etapas). Cada una se enciende con su variable en "on" y corre poco despues de arrancar y luego cada 6 horas.
const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;
function programar(nombre, tarea, esperaInicialMs) {
  const correr = () => tarea({ simulacro: false }).catch((err) => console.error(`[${nombre}] Error:`, err.message));
  setTimeout(correr, esperaInicialMs).unref();
  setInterval(correr, SEIS_HORAS_MS).unref();
}
// Vencimiento de cotizaciones (8 dias): ver modules/cotizacion/vencimiento.js.
if (process.env.EXPIRAR_COTIZACIONES === 'on') programar('vencimiento', require('./modules/cotizacion/vencimiento').procesarVencimientos, 60 * 1000);
// Separacion vencida (15 dias en etapa 5 pasa a etapa 5.5): ver modules/cotizacion/separacionVencida.js.
if (process.env.EXPIRAR_SEPARACIONES === 'on') {
  programar('separaciones', require('./modules/cotizacion/separacionVencida').procesarSeparacionesVencidas, 90 * 1000);
}

// Sin esto, un puerto ocupado revienta con un stack trace confuso -- ver el
// gotcha de nodemon+SIGKILL en ARQUITECTURA-BACKEND.md (Windows puede tardar
// unos segundos en liberar el puerto incluso tras un SIGKILL limpio).
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya está en uso. Espera unos segundos o cierra el proceso que lo tiene y vuelve a intentar.`);
    process.exit(1);
  }
  throw err;
});
