// Detalle de una cotizacion: se arma desde el snapshot guardado al generarla (mismos datos que el PDF). Una
// cotizacion anterior a esa funcion no lo tiene y solo muestra un resumen.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { formatCOP } from '../../utils/format.js';
import { fetchQuoteById, urlPdfCotizacion } from '../../api/cotizador.js';
import { torreCorta } from './cotizaciones.js';
import GenerarAnexosButton from './GenerarAnexosButton.jsx';
import styles from './Seguimiento.module.css';

function Seccion({ titulo, children }) {
  return (
    <section className={styles.seccion}>
      <h3 className={styles.seccionTitulo}>{titulo}</h3>
      {children}
    </section>
  );
}

function Campo({ label, value }) {
  return (
    <div>
      <p className={styles.campoLabel}>{label}</p>
      <p className={styles.campoValor}>{value ?? '—'}</p>
    </div>
  );
}

function Renglon({ label, valor, total = false }) {
  return (
    <div className={`${styles.renglon} ${total ? styles.renglonTotal : ''}`}>
      <span>{label}</span>
      <span>{valor}</span>
    </div>
  );
}

const NOTAS = [
  '1. Esta cotización tiene vigencia de 8 días calendario desde la expedición. No otorga opción de la vivienda y está sujeta a disponibilidad al momento de la separación.',
  '2. El plazo para el pago de la cuota inicial no está ligado a la fecha de entrega del inmueble.',
  '3. Una vez realizada la separación, la firma de documentos y apertura del encargo fiduciario debe realizarse en máximo 8 días hábiles.',
];

export default function QuoteDetailPage() {
  const { quoteId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;
    setData(null);
    setError(null);
    fetchQuoteById(quoteId)
      .then((d) => vivo && setData(d))
      .catch(() => vivo && setError('No se pudo cargar la cotización.'));
    return () => {
      vivo = false;
    };
  }, [quoteId]);

  const cabecera = (
    <>
      <BackLink to="/seguimiento">Volver al seguimiento</BackLink>
      <div className={styles.detalleHead}>
        <h1 className={styles.detalleTitulo}>Cotización #{quoteId}</h1>
        {data && (
          <div className={styles.detalleAcciones}>
            {data.status === 'aceptada' && <GenerarAnexosButton quoteId={data.id} variante="completo" />}
            {data.pdf_filename && <Button onClick={() => window.open(urlPdfCotizacion(quoteId), '_blank')}>Ver PDF</Button>}
          </div>
        )}
      </div>
    </>
  );

  if (error) {
    return (
      <div className={styles.page}>
        {cabecera}
        <p className={styles.error} role="alert">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className={styles.page}>
        {cabecera}
        <p className={styles.estado} role="status">Cargando…</p>
      </div>
    );
  }

  const snap = data.snapshot;

  // Cotizacion vieja sin snapshot: solo el resumen de la fila.
  if (!snap) {
    return (
      <div className={styles.page}>
        {cabecera}
        <p className={styles.aviso}>El detalle completo de esta cotización solo está disponible en el PDF (es una cotización anterior a esta función).</p>
        <Seccion titulo="Resumen">
          <div className={styles.campos}>
            <Campo label="Negocio" value={data.deal_name} />
            <Campo label="Unidad" value={data.unit_code} />
            <Campo label="Torre / Piso" value={`${torreCorta(data.unit_tower) || '—'}${data.unit_floor ? ` · P${data.unit_floor}` : ''}`} />
            <Campo label="Tipo" value={<Badge variant={data.quote_type === 'modelador' ? 'info' : 'neutral'}>{data.quote_type}</Badge>} />
            <Campo label="Precio total" value={formatCOP(data.total_price)} />
            <Campo label="Separación" value={formatCOP(data.separation)} />
            <Campo label="Cuota mensual" value={formatCOP(data.monthly_payment)} />
            <Campo label="# Cuotas" value={data.num_installments || '—'} />
            <Campo label="Saldo final" value={formatCOP(data.balance)} />
            <Campo label="Asesor" value={data.user_email} />
          </div>
        </Seccion>
      </div>
    );
  }

  const { deal, unit, calc, paymentPlan, quoteType, parking, deposito, cuartoUtil, descuentoTipo, descuentoPct, descuentoMonto, descuentoModo, bonoAplicado, subsidioNombre, subsidioMonto, adicionalesAplicados } = snap;
  const separacion = paymentPlan[0];
  const cuotas = paymentPlan.slice(1, paymentPlan.length - 1);
  const torre = snap.towerName ?? (unit.torre ? `Torre ${unit.torre}` : '—');
  const caracteristicas = [
    'Sala-Comedor',
    'Cocina Integral',
    'Zona de Ropas',
    ...(unit.alcobas ? [`${unit.alcobas} Alcoba(s)`] : []),
    ...(unit.banos ? [`${unit.banos} Baño(s)`] : []),
    ...(unit.estudios ? [`${unit.estudios} Estudio(s)`] : []),
    'Balcón',
  ];

  return (
    <div className={styles.page}>
      {cabecera}

      <div className={styles.columnas}>
        <Seccion titulo="Cliente">
          <div className={styles.campos}>
            <Campo label="Nombre" value={deal.nombre_contacto_} />
            {deal.contact_identification && <Campo label="Cédula" value={deal.contact_identification} />}
            {deal.contact_phone && <Campo label="Teléfono" value={deal.contact_phone} />}
            {deal.contact_email && <Campo label="Email" value={deal.contact_email} />}
          </div>
        </Seccion>
        <Seccion titulo="Proyecto">
          <div className={styles.campos}>
            <Campo label="Proyecto" value={deal.proyecto_inmobiliario_cac || 'OLIV Cartagena'} />
            <Campo label="Ubicación" value="Zona Norte, Cartagena de Indias" />
          </div>
        </Seccion>
        <Seccion titulo="Asesor">
          <div className={styles.campos}>
            <Campo label="Nombre" value={deal.owner_name || snap.ownerEmail} />
            {deal.owner_phone && <Campo label="Teléfono" value={deal.owner_phone} />}
            {deal.owner_email && <Campo label="Email" value={deal.owner_email} />}
          </div>
        </Seccion>
      </div>

      <div className={styles.columnas}>
        <Seccion titulo="Información del inmueble">
          <div className={styles.campos}>
            <Campo label="Apartamento" value={`${torre} — ${unit.codigo_unidad || unit.id_unidad || '—'}`} />
            <Campo label="Vista" value={unit.tipo_vista} />
            {unit.private_area_m2 != null && <Campo label="Área privada (m²)" value={unit.private_area_m2} />}
            {unit.terrace_area_m2 != null && <Campo label="Área terraza (m²)" value={unit.terrace_area_m2} />}
            <Campo label="Área total (m²)" value={unit.area_construida} />
            <Campo label="Parqueadero" value={parking?.name ?? '—'} />
            <Campo label="Depósito" value={deposito?.name ?? '—'} />
            <Campo label="Cuarto útil" value={cuartoUtil?.name ?? '—'} />
          </div>
        </Seccion>

        <Seccion titulo="Información financiera">
          <div>
            <Renglon label="Valor apartamento" valor={formatCOP(unit.valor_unidad_comercial)} />
            {descuentoMonto != null && descuentoMonto > 0 && descuentoTipo && (
              <Renglon label={`Desc. ${descuentoTipo}${descuentoModo === 'montoFijo' ? ' (Fijo)' : descuentoPct != null ? ` (${descuentoPct}%)` : ''}`} valor={`− ${formatCOP(descuentoMonto)}`} />
            )}
            {parking && <Renglon label="Valor parqueadero" valor={formatCOP(parking.price)} />}
            {deposito && <Renglon label="Valor depósito" valor={formatCOP(deposito.price)} />}
            {cuartoUtil && <Renglon label="Valor cuarto útil" valor={formatCOP(cuartoUtil.price)} />}
            {bonoAplicado != null && bonoAplicado > 0 && <Renglon label="Bono aplicado" valor={`− ${formatCOP(bonoAplicado)}`} />}
            {adicionalesAplicados?.map((a, i) => <Renglon key={i} label={a.nombre} valor={`+ ${formatCOP(a.monto)}`} />)}
            <Renglon label="Valor total" valor={formatCOP(calc.precio)} total />
          </div>
        </Seccion>
      </div>

      <Seccion titulo={`Plan de pago — ${quoteType === 'estandar' ? 'Estándar' : 'Modelado'} (${calc.cuotas} cuotas)`}>
        <div className={styles.tablaWrap}>
          <table className={styles.tabla} style={{ minWidth: 0 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Concepto</th>
                <th className={styles.derecha}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {separacion && (
                <tr>
                  <td>—</td>
                  <td>Separación · {separacion.fecha_estimada}</td>
                  <td className={styles.derecha}>{formatCOP(separacion.valor)}</td>
                </tr>
              )}
              {cuotas.map((entry, idx) => (
                <tr key={idx} className={entry.esFechaExtraordinaria ? styles.planFilaExtra : undefined}>
                  <td>{idx + 1}</td>
                  <td>
                    {entry.fecha_estimada || 'Cuota'}
                    {entry.esFechaExtraordinaria && <Badge variant="info">+ {entry.conceptoExtraordinario} ({formatCOP(entry.montoExtraordinario || 0)})</Badge>}
                  </td>
                  <td className={styles.derecha}><strong>{formatCOP(entry.valor)}</strong></td>
                </tr>
              ))}
              {subsidioMonto != null && subsidioMonto > 0 && subsidioNombre && (
                <tr>
                  <td />
                  <td>Subsidio {subsidioNombre}</td>
                  <td className={styles.derecha}>− {formatCOP(subsidioMonto)}</td>
                </tr>
              )}
              <tr>
                <td />
                <td><strong>Saldo contra entrega</strong></td>
                <td className={styles.derecha}><strong>{formatCOP(calc.saldo)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion titulo="Características">
        <div className={styles.caracteristicas}>
          {caracteristicas.map((c) => <Badge key={c} variant="neutral">{c}</Badge>)}
        </div>
      </Seccion>

      <div className={styles.notas}>
        {NOTAS.map((n) => <p key={n}>{n}</p>)}
      </div>
    </div>
  );
}
