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
