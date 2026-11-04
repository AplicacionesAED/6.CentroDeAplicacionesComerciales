import { pdf } from '@react-pdf/renderer';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QuotePDF from '../cotizador/pdf/QuotePDF.jsx';
import AnexoPlanoAcotadoPDF from '../cotizador/pdf/anexos/AnexoPlanoAcotadoPDF.jsx';
import AnexoParqueaderoPDF, { numeroApto } from '../cotizador/pdf/anexos/AnexoParqueaderoPDF.jsx';
import { fetchQuoteById, fetchAccesorioPlano, fetchAnexoEstatico, fetchPlanoSombreado, fetchDirectorProyecto } from '../../api/cotizador.js';
import { PROJECTS as PROYECTOS } from '../../utils/cotizador.js';
/** Nombre apto para un archivo: sin caracteres que Windows/macOS rechacen. */
const nombreSeguro = (t) =>
  t
    .replace(/[\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
// En varios negocios de Oliv, `nombre_contacto` quedó guardado en HubSpot igual que el
// nombre del negocio ("Oliv - Javier Uribe") en vez de solo el nombre de la persona —
// se le quita ese prefijo de proyecto acá, solo para lo que se imprime en la firma.
function soloNombre(valor) {
  for (const p of PROYECTOS) {
    const prefijo = `${p} - `;
    if (valor.startsWith(prefijo)) return valor.slice(prefijo.length).trim();
  }
  return valor.trim();
}
/** Copia todas las páginas de un PDF (Blob o ArrayBuffer) dentro del documento fusionado.
 *  Devuelve las páginas ya copiadas, por si hace falta dibujar algo más sobre alguna. */
async function agregarPaginas(destino, datos) {
  const bytes = datos instanceof Blob ? await datos.arrayBuffer() : datos;
  const origen = await PDFDocument.load(bytes);
  const paginas = await destino.copyPages(origen, origen.getPageIndices());
  paginas.forEach((p) => destino.addPage(p));
  return paginas;
}
const OLIVO = rgb(0x4a / 255, 0x5d / 255, 0x23 / 255);
const TEXTO = rgb(0x1f / 255, 0x29 / 255, 0x37 / 255);
const GRIS = rgb(0x6b / 255, 0x72 / 255, 0x80 / 255);
/**
 * Dibuja el espacio de firma directo sobre la última página de "Especificaciones técnicas"
 * (documento fijo), en el hueco en blanco que quedaba entre la tabla y el pie — en vez de
 * agregarle una página nueva aparte, que empujaba el resto del paquete a una página de más.
 * El nombre real del comprador varía por cotización, así que esto NUNCA se guarda en el PDF
 * fijo: se dibuja en caliente, cada vez que se arma el paquete.
 */
async function firmarEspecificaciones(destino, pagina, nombreComprador, nombreDirector) {
  const [helv, helvBold] = await Promise.all([destino.embedFont(StandardFonts.Helvetica), destino.embedFont(StandardFonts.HelveticaBold)]);
  const alto = pagina.getHeight();
  // Coordenadas medidas sobre el hueco real de esa página (el PDF fijo mide 870x1199).
  const centroIzq = 260.5;
  const centroDer = 609.5;
  const yEtiqueta = alto - 700;
  const yLinea = alto - 742;
  const yFecha = alto - 762;
  const anchoLinea = 165;
  const centrado = (texto, centroX, y, font, size, color = TEXTO) => {
    const ancho = font.widthOfTextAtSize(texto, size);
    pagina.drawText(texto, { x: centroX - ancho / 2, y, size, font, color });
  };
  centrado(nombreDirector || 'Director de proyecto', centroIzq, yEtiqueta, helvBold, 9.5);
  pagina.drawLine({ start: { x: centroIzq - anchoLinea / 2, y: yLinea }, end: { x: centroIzq + anchoLinea / 2, y: yLinea }, thickness: 0.8, color: GRIS });
  centrado('Fecha:', centroIzq, yFecha, helv, 8, GRIS);
  centrado(nombreComprador || 'Comprador', centroDer, yEtiqueta, helvBold, 9.5);
  pagina.drawLine({ start: { x: centroDer - anchoLinea / 2, y: yLinea }, end: { x: centroDer + anchoLinea / 2, y: yLinea }, thickness: 0.8, color: GRIS });
  centrado('Fecha:', centroDer, yFecha, helv, 8, GRIS);
  centrado('CONFORMIDAD Y FIRMA', (centroIzq + centroDer) / 2, alto - 650, helvBold, 11, OLIVO);
}
/**
 * Genera el paquete de anexos de una cotización aceptada, como UN SOLO PDF (fusionado,
 * no un ZIP) listo para imprimir y firmar, en este orden:
 *   1. Cotización (con espacio de firma)        — la misma cotización aceptada
 *   2. Plano acotado del inmueble               — según la unidad cotizada
 *   3. Anexo del parqueadero                    — según el parqueadero cotizado (si tiene plano cargado)
 *   4. Especificaciones técnicas                — fijo
 *   5. Cartilla de Negocios Fiduciarios         — fija
 * Hoy solo existe el set de documentos de Oliv.
 */
export async function generarPaqueteAnexos(quoteId) {
  const detalle = await fetchQuoteById(quoteId);
  if (detalle.status !== 'aceptada') {
    throw new Error('Los anexos solo se generan para cotizaciones aceptadas.');
  }
  const snap = detalle.snapshot;
  if (!snap) {
    throw new Error('Esta cotización es anterior al detalle guardado y no se pueden regenerar sus anexos.');
  }
  const proyecto = detalle.project || snap.deal.proyecto_inmobiliario_cac || snap.unit.proyecto_inmobiliario || '';
  if (proyecto !== 'Oliv') {
    throw new Error(`Los anexos solo están disponibles para Oliv (esta cotización es de ${proyecto || 'un proyecto sin definir'}).`);
  }
  const nombreComprador = snap.deal.nombre_contacto_ ? soloNombre(snap.deal.nombre_contacto_) || undefined : undefined;
  // Director asignado al proyecto en HubSpot; si no tiene (o falla la consulta) queda el rótulo genérico.
  const nombreDirector = (await fetchDirectorProyecto(proyecto).catch(() => null)) || undefined;
  const avisos = [];
  const final = await PDFDocument.create();
  // 1. Cotización con espacio de firma
  const cotizacion = await pdf(
    <QuotePDF
      deal={snap.deal}
      unit={snap.unit}
      calc={snap.calc}
      paymentPlan={snap.paymentPlan}
      quoteType={snap.quoteType}
      quoteNumber={snap.quoteNumber}
      hasCustomQuotas={snap.hasCustomQuotas}
      ownerEmail={snap.ownerEmail}
      financialSummary={snap.financialSummary}
      towerName={snap.towerName}
      parking={snap.parking}
      deposito={snap.deposito}
      cuartoUtil={snap.cuartoUtil}
      bonoAplicado={snap.bonoAplicado}
      descuentoTipo={snap.descuentoTipo}
      descuentoPct={snap.descuentoPct}
      descuentoMonto={snap.descuentoMonto}
      descuentoModo={snap.descuentoModo}
      subsidioNombre={snap.subsidioNombre}
      subsidioMonto={snap.subsidioMonto}
      adicionalesAplicados={snap.adicionalesAplicados}
      conFirmas
      nombreComprador={nombreComprador}
      nombreDirector={nombreDirector}
    />
  ).toBlob();
  await agregarPaginas(final, cotizacion);
  // 2. Plano acotado de la unidad + plano de piso sombreado (en vivo: ver fetchPlanoSombreado,
  //    los snapshots de cotizaciones aceptadas antes de que existiera esta propiedad no la tienen).
  const apto = numeroApto(snap.unit);
  if (snap.unit.floor_plan_link) {
    const planoSombreado = await fetchPlanoSombreado(snap.unit.id).catch(() => null);
    const plano = await pdf(
      <AnexoPlanoAcotadoPDF
        unit={snap.unit}
        planoUrl={snap.unit.floor_plan_link}
        plantaUbicacionUrl={planoSombreado}
        nombreComprador={nombreComprador}
        nombreDirector={nombreDirector}
      />
    ).toBlob();
    await agregarPaginas(final, plano);
  } else {
    avisos.push(`El inmueble ${snap.unit.codigo_unidad} no tiene plano cargado en HubSpot: se omitió el plano acotado ${apto}.`);
  }
  // 3. Anexo del parqueadero (el plano sale del accesorio inmobiliario en HubSpot)
  if (snap.parking?.id) {
    const info = await fetchAccesorioPlano(snap.parking.id);
    if (info.plano) {
      const parq = await pdf(
        <AnexoParqueaderoPDF
          unit={snap.unit}
          towerName={snap.towerName}
          planoUrl={info.plano}
          parqueadero={snap.parking.name}
          nombreComprador={nombreComprador}
          nombreDirector={nombreDirector}
        />
      ).toBlob();
      await agregarPaginas(final, parq);
    } else {
      avisos.push(`El parqueadero ${snap.parking.name} no tiene plano cargado en HubSpot: se omitió su anexo.`);
    }
  } else {
    avisos.push('La cotización no incluye parqueadero: no hay anexo de parqueadero.');
  }
  // 4. Especificaciones técnicas (documento fijo) — la firma se dibuja directo en el hueco
  //    que ya tenía esa página (ver firmarEspecificaciones), no se agrega una página nueva.
  const paginasEspecificaciones = await agregarPaginas(final, await fetchAnexoEstatico('especificaciones-oliv'));
  await firmarEspecificaciones(final, paginasEspecificaciones[paginasEspecificaciones.length - 1], nombreComprador, nombreDirector);
  // 5. Cartilla de Negocios Fiduciarios (documento fijo)
  await agregarPaginas(final, await fetchAnexoEstatico('cartilla-negocios-fiduciarios'));
  const bytes = await final.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  return { blob, nombre: `Anexos ${nombreSeguro(snap.unit.codigo_unidad || `cotizacion ${quoteId}`)}.pdf`, avisos };
}
/** Dispara la descarga de un Blob en el navegador. */
export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
