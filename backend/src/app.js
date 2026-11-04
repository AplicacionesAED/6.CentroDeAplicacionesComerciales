const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('./models'); // registra todas las asociaciones antes de montar rutas
const routes = require('./routes/index');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFoundHandler');

const app = express();

// `exposedHeaders`: sin esto el navegador no deja leer `Content-Disposition` en un fetch
// cross-origin, y las descargas autenticadas perderian su nombre real.
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true, exposedHeaders: ['Content-Disposition'] }));
app.use(cookieParser());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
// Todo bajo /api: asi una ruta de API nunca choca con una pagina del SPA al servir el build
// del frontend desde este mismo proceso.
app.use('/api', routes);

// En producción (imagen Docker), este mismo proceso sirve también el build
// estático del frontend (Vite `dist/`) -- un solo contenedor, sin
// nginx/servidor estático aparte. En desarrollo el frontend corre suelto con
// `vite dev` y esta carpeta no existe, así que este bloque no hace nada.
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    // Un /api/* que no matcheó ninguna ruta real (arriba) no debe caer acá --
    // seguiría cayendo al 404 normal de Express, nunca al index.html del SPA.
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
