import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import logoFiduciaria from '../../../assets/logo-fiduciaria.png';
import logoAed from '../../../assets/logo-aed.png';
import iconSala from '../../../assets/Plantilla_Alegra/icons-alegra/Sala-2.png';
import iconCocina from '../../../assets/Plantilla_Alegra/icons-alegra/Cocina-2.png';
import iconRopas from '../../../assets/Plantilla_Alegra/icons-alegra/icon-ropa-2.png';
import iconAlcoba from '../../../assets/Plantilla_Alegra/icons-alegra/Alcoba-2.png';
import iconBano from '../../../assets/Plantilla_Alegra/icons-alegra/Baño-2.png';
import iconBalcon from '../../../assets/Plantilla_Alegra/icons-alegra/Balcon-2.png';
import iconHome from '../../../assets/Plantilla_Alegra/icons-alegra/home-2.png';
import iconTerraza from '../../../assets/Plantilla_Alegra/icons-alegra/Proyecto-2.png';
import iconAuto from '../../../assets/Plantilla_Alegra/icons-alegra/Auto-2.png';
import AlegraLogo from './AlegraLogo.jsx';
import interRegular from '../../../assets/fonts/Inter-Regular.ttf';
import interBold from '../../../assets/fonts/Inter-Bold.ttf';
import { formatCOP } from '../../../utils/format.js';
// ─── Font registration (safe to call again — @react-pdf dedupes by family) ──
Font.register({
  family: 'Inter',
  fonts: [
    { src: interRegular, fontWeight: 400 },
    { src: interBold, fontWeight: 700 },
  ],
});
// ─── Brand colours — de la paleta del logo de Alegra ───────────────────────
const DARK = '#00157D'; // azul marino del wordmark — section headers, unit band, saldo footer
const ACCENT = '#00C4B3'; // teal de la marca — financial-info header, accent labels, iconos
const CREAM = '#E8F7F5'; // tinte pálido del teal — highlighted rows, floor plan bg
const PAGE_BG = '#ECEDEF'; // fondo gris claro detrás de la tarjeta
const WHT = '#FFFFFF';
const TXT = '#2A2A2A';
const MUT = '#6B6B6B';
const s = StyleSheet.create({
  page: {
    padding: 14,
    backgroundColor: PAGE_BG,
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 8,
    color: TXT,
  },
  card: {
    flex: 1,
    backgroundColor: WHT,
    borderRadius: 6,
    overflow: 'hidden',
  },
  // ── Header (sin foto — no hay asset de fondo para Alegra) ──────────────
  header: {
    height: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: CREAM,
  },
  headerTitle: { fontFamily: 'Inter', fontWeight: 700, fontSize: 17, color: DARK, letterSpacing: 1 },
  headerSub: { fontFamily: 'Inter', fontWeight: 400, fontSize: 7, color: MUT, marginTop: 3, letterSpacing: 0.5, textTransform: 'uppercase' },
  pad: { paddingHorizontal: 20 },
  // ── Info strip ────────────────────────────────────────────────────────
  infoStrip: { flexDirection: 'row', marginTop: 8, marginBottom: 6 },
  infoCol: { flex: 1, paddingHorizontal: 4 },
  infoColC: { flex: 1, paddingHorizontal: 4, alignItems: 'center' },
  infoLabel: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 5.5,
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  infoName: { fontFamily: 'Inter', fontWeight: 700, fontSize: 8, color: TXT, marginBottom: 1 },
  infoLine: { fontFamily: 'Inter', fontWeight: 400, fontSize: 6.5, color: MUT, marginBottom: 0.5 },
  infoCenterTitle: { fontFamily: 'Inter', fontWeight: 700, fontSize: 8, color: TXT, marginBottom: 1, textAlign: 'center' },
  infoCenterLine: { fontFamily: 'Inter', fontWeight: 400, fontSize: 6.5, color: MUT, textAlign: 'center' },
  // ── Unit band ─────────────────────────────────────────────────────────
  unitBand: { backgroundColor: DARK, paddingVertical: 4, paddingHorizontal: 20 },
  unitBandTxt: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 6.5,
    color: WHT,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  // ── Two-column body ──────────────────────────────────────────────────
  body: { flexDirection: 'row', gap: 10, marginTop: 8 },
  leftCol: { flex: 52 },
  rightCol: { flex: 48 },
  block: { marginBottom: 3, borderWidth: 0.5, borderColor: '#D7ECEA', overflow: 'hidden' },
  secHeadDark: { backgroundColor: DARK, paddingVertical: 3, paddingHorizontal: 8 },
  secHeadAccent: { backgroundColor: ACCENT, paddingVertical: 3, paddingHorizontal: 8 },
  secHeadTxt: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 5.5,
    color: WHT,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1.4,
    paddingHorizontal: 8,
    backgroundColor: WHT,
  },
  rowLabel: { flex: 1, fontFamily: 'Inter', fontWeight: 400, fontSize: 7, color: MUT },
  rowLabelBold: { flex: 1, fontFamily: 'Inter', fontWeight: 700, fontSize: 7, color: TXT },
  rowValue: { fontFamily: 'Inter', fontWeight: 700, fontSize: 7, color: TXT, textAlign: 'right' },
  rowHi: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1.6,
    paddingHorizontal: 8,
    backgroundColor: CREAM,
  },
  rowHiLabel: { flex: 1, fontFamily: 'Inter', fontWeight: 700, fontSize: 7, color: TXT },
  rowHiValue: { fontFamily: 'Inter', fontWeight: 700, fontSize: 7.5, color: TXT, textAlign: 'right' },
  // ── Floor plan ───────────────────────────────────────────────────────
  torreLabel: { fontFamily: 'Inter', fontWeight: 700, fontSize: 6.5, color: TXT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  floorPlanBlock: { height: 230, backgroundColor: CREAM, borderWidth: 0.5, borderColor: '#D7ECEA', justifyContent: 'center', alignItems: 'center' },
  floorPlanTxt: { fontFamily: 'Inter', fontWeight: 400, fontSize: 7, color: MUT },
  // ── Payment table ────────────────────────────────────────────────────
  payColHead: { flexDirection: 'row', backgroundColor: CREAM, paddingVertical: 2, paddingHorizontal: 8 },
  payColHeadTxt: { fontFamily: 'Inter', fontWeight: 700, fontSize: 5.5, color: '#0D8577', textTransform: 'uppercase', letterSpacing: 0.5 },
  payRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 0.3, paddingHorizontal: 8 },
  payRowAlt: { backgroundColor: '#F3FBFA' },
  pCN: { width: 16, fontFamily: 'Inter', fontWeight: 400, fontSize: 6, color: MUT, textAlign: 'center' },
  pCC: { flex: 1, fontFamily: 'Inter', fontWeight: 400, fontSize: 6.5, color: MUT },
  pCV: { width: 62, fontFamily: 'Inter', fontWeight: 700, fontSize: 6.5, color: TXT, textAlign: 'right' },
  paySaldo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DARK,
    paddingVertical: 3.5,
    paddingHorizontal: 8,
  },
  paySaldoLbl: { flex: 1, marginRight: 6, fontFamily: 'Inter', fontWeight: 700, fontSize: 6, color: '#9FB3E8', textTransform: 'uppercase', letterSpacing: 0.5 },
  paySaldoVal: { flexShrink: 0, fontFamily: 'Inter', fontWeight: 700, fontSize: 9, color: WHT },
  // ── Características ──────────────────────────────────────────────────
  listLabel: { fontFamily: 'Inter', fontWeight: 700, fontSize: 6.5, color: TXT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  caracRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 1.4, paddingHorizontal: 8, gap: 5, backgroundColor: WHT },
  caracCheck: { fontFamily: 'Inter', fontWeight: 700, fontSize: 7, color: ACCENT },
  caracTxt: { fontFamily: 'Inter', fontWeight: 400, fontSize: 7, color: MUT },
  // ── Footer ────────────────────────────────────────────────────────────
  footerLogos: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 6, gap: 20, borderTopWidth: 0.5, borderTopColor: '#D7ECEA', marginTop: 4 },
  flGroup: { flex: 1, alignItems: 'center' },
  flLabel: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 5,
    color: MUT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
    textAlign: 'center',
  },
  legalWrap: { paddingHorizontal: 20, paddingBottom: 3 },
  legalTxt: { fontFamily: 'Inter', fontWeight: 400, fontSize: 4.3, color: MUT, lineHeight: 1.25 },
});
function Row({ label, value, bold = false, valueColor, icon }) {
  return (
    <View style={s.row}>
      {icon ? <Image src={icon} style={{ width: 10, height: 10, marginRight: 5, flexShrink: 0 }} /> : null}
      <Text style={bold ? s.rowLabelBold : s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}
function RowHi({ label, value, icon }) {
  return (
    <View style={s.rowHi}>
      {icon ? <Image src={icon} style={{ width: 10, height: 10, marginRight: 5, flexShrink: 0 }} /> : null}
      <Text style={s.rowHiLabel}>{label}</Text>
      <Text style={s.rowHiValue}>{value}</Text>
    </View>
  );
}
export default function QuotePDFAlegra({
  deal,
  unit,
  calc,
  paymentPlan,
  quoteType,
  quoteNumber,
  hasCustomQuotas = false,
  ownerEmail,
  towerName,
  parking,
  deposito,
  cuartoUtil,
  bonoAplicado,
  descuentoTipo,
  descuentoMonto = 0,
  descuentoModo = 'porcentaje',
  subsidioNombre,
  subsidioMonto = 0,
  adicionalesAplicados = [],
  financialSummary,
  abonoSaldo = 0,
}) {
  const today = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  const separacionEntry = paymentPlan[0];
  const cuotaEntries = paymentPlan.slice(1, paymentPlan.length - 1);
  // Sin saldo contraentrega (modo "Pagar 100% en cuotas") el recargo/descuento financiero se
  // cobra dentro de las cuotas: la "cuota fija" de calc ya no es la que se paga de verdad, así
  // que se muestra la cuota real del plan (la primera) con el tipo de ajuste en la etiqueta.
  const ajusteEnCuotas =
    quoteType === 'modelador' && calc.saldo <= 0 && !!financialSummary && financialSummary.saldoFinancieroFinal !== 0 && cuotaEntries.length > 0;
  const ajusteCuotasLabel = financialSummary && financialSummary.saldoFinancieroFinal > 0 ? 'Recargo' : 'Descuento';
  const planLabel = quoteType === 'estandar' ? 'Pago Estándar · Financiamiento' : 'Plan Modelado · Financiamiento';
  const torreLabel = towerName ?? (unit.torre ? `Torre ${unit.torre}` : null);
  const unitLine = [unit.tipo_vista, torreLabel, unit.codigo_unidad ? `Apto ${unit.codigo_unidad}` : null].filter(Boolean).join(' · ');
  const saldoContraEntrega =
    quoteType === 'modelador' && calc.saldo > 0 && financialSummary?.saldoFinancieroFinal ? calc.saldo + financialSummary.saldoFinancieroFinal : calc.saldo;
  const saldoPct = calc.precio > 0 ? Math.round((calc.saldo / calc.precio) * 100) : 0;
  const cuotaInicialPctDisplay = 100 - saldoPct;
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.card}>
          {/* ── HEADER ── */}
          <View style={s.header}>
            <View>
              <Text style={s.headerTitle}>COTIZACIÓN</Text>
              <Text style={s.headerSub}>
                {today} · NP: {String(quoteNumber).slice(-6)}
              </Text>
            </View>
            <AlegraLogo width={190} height={52} />
          </View>

          <View style={s.pad}>
            {/* ── INFO STRIP ── */}
            <View style={s.infoStrip}>
              <View style={s.infoCol}>
                <Text style={s.infoLabel}>Cliente</Text>
                <Text style={s.infoName}>{deal.nombre_contacto_ || '—'}</Text>
                {deal.contact_identification ? <Text style={s.infoLine}>CC: {deal.contact_identification}</Text> : null}
                {deal.contact_phone ? <Text style={s.infoLine}>Cel {deal.contact_phone}</Text> : null}
                {deal.contact_email ? <Text style={s.infoLine}>{deal.contact_email}</Text> : null}
              </View>
              <View style={s.infoColC}>
                <Text style={s.infoLabel}>Alegra</Text>
                <Text style={s.infoCenterTitle}>Apartamento</Text>
              </View>
              <View style={s.infoCol}>
                <Text style={s.infoLabel}>Asesor</Text>
                <Text style={s.infoName}>{deal.owner_name || ownerEmail || '—'}</Text>
                {deal.owner_phone ? <Text style={s.infoLine}>Cel {deal.owner_phone}</Text> : null}
                {deal.owner_email ? <Text style={s.infoLine}>{deal.owner_email}</Text> : null}
              </View>
            </View>
          </View>

          {/* ── UNIT BAND ── */}
          {unitLine ? (
            <View style={s.unitBand}>
              <Text style={s.unitBandTxt}>{unitLine}</Text>
            </View>
          ) : null}

          <View style={[s.pad, { marginTop: 8 }]}>
            <View style={s.body}>
              {/* LEFT COLUMN */}
              <View style={s.leftCol}>
                <View style={s.block}>
                  <View style={s.secHeadDark}>
                    <Text style={s.secHeadTxt}>Información del Inmueble</Text>
                  </View>
                  <Row label={`Apartamento ${torreLabel ?? '—'} · Apto ${unit.codigo_unidad || unit.id_unidad || '—'}`} value="" bold icon={iconHome} />
                  {unit.private_area_m2 ? <Row label="Área Privada (m²)" value={`${unit.private_area_m2}`} icon={iconHome} /> : null}
                  {unit.terrace_area_m2 ? <Row label="Área Terraza (m²)" value={`${unit.terrace_area_m2}`} icon={iconTerraza} /> : null}
                  <RowHi label="Área Total (m²)" value={`${unit.area_construida}`} icon={iconHome} />
                  <Row label="Parqueadero" value={parking?.name ?? '—'} icon={iconAuto} />
                  <Row label="Depósito" value={deposito?.name ?? '—'} icon={iconAuto} />
                  <Row label="Cuarto Útil" value={cuartoUtil?.name ?? '—'} icon={iconAuto} />
                </View>

                <View style={s.block}>
                  <View style={s.secHeadAccent}>
                    <Text style={s.secHeadTxt}>Información Financiera</Text>
                  </View>
                  <Row label="Valor Apartamento" value={formatCOP(unit.valor_unidad_comercial)} />
                  {descuentoMonto > 0 && descuentoTipo ? (
                    <Row
                      label={`${descuentoTipo.charAt(0).toUpperCase() + descuentoTipo.slice(1)}${descuentoModo === 'montoFijo' ? ' (Fijo)' : ''}`}
                      value={`− ${formatCOP(descuentoMonto)}`}
                    />
                  ) : null}
                  {parking && <Row label="Valor Parqueadero" value={formatCOP(parking.price)} />}
                  {deposito && <Row label="Valor Depósito" value={formatCOP(deposito.price)} />}
                  {cuartoUtil && <Row label="Valor Cuarto Útil" value={formatCOP(cuartoUtil.price)} />}
                  {bonoAplicado && bonoAplicado > 0 ? <Row label="Bono Aplicado Inmueble" value={`− ${formatCOP(bonoAplicado)}`} /> : null}
                  {adicionalesAplicados.map((a, i) => (
                    <Row key={i} label={a.nombre} value={`+ ${formatCOP(a.monto)}`} valueColor="#DC2626" />
                  ))}
                  <RowHi label="Valor Total" value={formatCOP(calc.precio)} />
                </View>

                <View style={s.block}>
                  <View style={s.secHeadDark}>
                    <Text style={s.secHeadTxt}>{planLabel}</Text>
                  </View>
                  <Row label={`Cuota Inicial ${cuotaInicialPctDisplay}%`} value={formatCOP(calc.precio - calc.saldo)} />
                  <Row label="Separación" value={formatCOP(calc.separacion)} />
                  <Row label="Saldo Cuotas Iniciales" value={formatCOP(calc.montoCuotasIniciales)} />
                  <Row
                    label={
                      hasCustomQuotas
                        ? `${calc.cuotas} Cuotas Variables`
                        : ajusteEnCuotas
                          ? `Cuotas con ${ajusteCuotasLabel} ${calc.cuotas}`
                          : `Cuotas Fijas ${calc.cuotas}`
                    }
                    value={hasCustomQuotas ? 'Ver plan de pagos' : formatCOP(ajusteEnCuotas ? cuotaEntries[0].valor : calc.valorCuotaMensual)}
                  />
                  {subsidioMonto > 0 && subsidioNombre && (
                    <Row label={`Subsidio ${subsidioNombre}`} value={`− ${formatCOP(subsidioMonto)}`} valueColor="#16A34A" />
                  )}
                  {quoteType === 'modelador' && financialSummary && financialSummary.saldoFinancieroFinal !== 0 && (
                    <Row
                      label={financialSummary.saldoFinancieroFinal > 0 ? 'Recargo Financiero' : 'Descuento Financiero'}
                      value={`${financialSummary.saldoFinancieroFinal > 0 ? '+ ' : '− '}${formatCOP(Math.abs(financialSummary.saldoFinancieroFinal))}`}
                      valueColor={financialSummary.saldoFinancieroFinal > 0 ? '#DC2626' : '#16A34A'}
                    />
                  )}
                  {abonoSaldo > 0 && (
                    <Row label="Incluye abono adicional" value={`+ ${formatCOP(abonoSaldo)}`} valueColor="#16A34A" />
                  )}
                  {quoteType === 'modelador' && financialSummary && calc.saldo > 0 && financialSummary.saldoFinancieroFinal !== 0 ? (
                    <>
                      <RowHi label="Saldo Contraentrega Propuesta Cliente" value={formatCOP(saldoContraEntrega)} />
                      <RowHi label="Saldo Contraentrega" value={formatCOP(calc.saldo)} />
                    </>
                  ) : (
                    <RowHi label={`Saldo Contraentrega ${saldoPct}%`} value={formatCOP(calc.saldo)} />
                  )}
                </View>

                <Text style={s.torreLabel}>{torreLabel ?? 'Torre'} · Plano de Planta</Text>
                <View style={s.floorPlanBlock} wrap={false}>
                  {unit.floor_plan_link ? (
                    <Image src={unit.floor_plan_link} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Text style={s.floorPlanTxt}>Plano de planta no disponible</Text>
                  )}
                </View>
              </View>

              {/* RIGHT COLUMN */}
              <View style={s.rightCol}>
                <View style={s.block}>
                  <View style={s.secHeadDark}>
                    <Text style={s.secHeadTxt}>Forma de Pago · {calc.cuotas} Cuotas</Text>
                  </View>
                  <View style={s.payColHead}>
                    <Text style={[s.payColHeadTxt, { width: 16, textAlign: 'center' }]}>#</Text>
                    <Text style={[s.payColHeadTxt, { flex: 1 }]}>Concepto</Text>
                    <Text style={[s.payColHeadTxt, { width: 62, textAlign: 'right' }]}>Valor</Text>
                  </View>
                  {separacionEntry && (
                    <View style={s.payRow}>
                      <Text style={s.pCN}>—</Text>
                      <Text style={s.pCC}>Separación · {separacionEntry.fecha_estimada}</Text>
                      <Text style={s.pCV}>{formatCOP(separacionEntry.valor)}</Text>
                    </View>
                  )}
                  {cuotaEntries.map((entry, idx) => (
                    <View key={idx} style={[s.payRow, idx % 2 === 0 ? s.payRowAlt : {}]}>
                      <Text style={s.pCN}>{idx + 1}</Text>
                      <Text style={[s.pCC, entry.ajusteAlmar ? { color: entry.ajusteAlmar.tipo === 'Recargo' ? '#DC2626' : '#16A34A' } : {}]}>
                        {entry.fecha_estimada || 'Cuota'}
                        {entry.esFechaExtraordinaria && (
                          <Text style={{ color: '#2563EB', fontFamily: 'Inter', fontWeight: 700 }}>
                            {' '}
                            · + {entry.conceptoExtraordinario} ({formatCOP(entry.montoExtraordinario || 0)})
                          </Text>
                        )}
                        {entry.abonoParte ? (
                          <Text style={{ color: '#16A34A', fontFamily: 'Inter', fontWeight: 700 }}> · incluye abono al saldo {formatCOP(entry.abonoParte)}</Text>
                        ) : null}
                      </Text>
                      <Text
                        style={[
                          s.pCV,
                          entry.esFechaExtraordinaria
                            ? { color: '#2563EB' }
                            : entry.ajusteAlmar
                              ? { color: entry.ajusteAlmar.tipo === 'Recargo' ? '#DC2626' : '#16A34A' }
                              : {},
                        ]}
                      >
                        {formatCOP(entry.valor)}
                      </Text>
                    </View>
                  ))}
                  {abonoSaldo > 0 && (
                    <View style={[s.paySaldo, { backgroundColor: '#16A34A' }]}>
                      <Text style={[s.paySaldoLbl, { color: WHT }]}>Incluye abono adicional a la cuota inicial</Text>
                      <Text style={s.paySaldoVal}>+ {formatCOP(abonoSaldo)}</Text>
                    </View>
                  )}
                  {quoteType === 'modelador' && financialSummary && calc.saldo > 0 && financialSummary.saldoFinancieroFinal !== 0 ? (
                    <>
                      <View style={s.paySaldo}>
                        <Text style={s.paySaldoLbl}>Saldo Contraentrega Propuesta Cliente</Text>
                        <Text style={s.paySaldoVal}>{formatCOP(saldoContraEntrega)}</Text>
                      </View>
                      <View style={[s.paySaldo, { backgroundColor: ACCENT }]}>
                        <Text style={s.paySaldoLbl}>Saldo Contraentrega</Text>
                        <Text style={s.paySaldoVal}>{formatCOP(calc.saldo)}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={s.paySaldo}>
                      <Text style={s.paySaldoLbl}>Saldo Crédito</Text>
                      <Text style={s.paySaldoVal}>{formatCOP(calc.saldo)}</Text>
                    </View>
                  )}

                  {quoteType === 'modelador' && financialSummary && financialSummary.saldoFinancieroFinal !== 0 && (
                    <View style={[s.paySaldo, { backgroundColor: '#0F172A' }]}>
                      <Text style={[s.paySaldoLbl, { color: WHT }]}>
                        Total a pagar con {financialSummary.saldoFinancieroFinal > 0 ? 'Recargo' : 'Descuento'}
                      </Text>
                      <Text style={s.paySaldoVal}>{formatCOP(calc.precio + financialSummary.saldoFinancieroFinal)}</Text>
                    </View>
                  )}
                </View>

                <Text style={[s.listLabel, { marginTop: 5 }]}>Características</Text>
                <View style={s.block}>
                  <View style={s.caracRow}>
                    <Text style={s.caracCheck}>✓</Text>
                    <Image src={iconSala} style={{ width: 12, height: 12 }} />
                    <Text style={s.caracTxt}>Sala · Comedor</Text>
                  </View>
                  <View style={s.caracRow}>
                    <Text style={s.caracCheck}>✓</Text>
                    <Image src={iconCocina} style={{ width: 12, height: 12 }} />
                    <Text style={s.caracTxt}>Cocina Integral</Text>
                  </View>
                  <View style={s.caracRow}>
                    <Text style={s.caracCheck}>✓</Text>
                    <Image src={iconRopas} style={{ width: 12, height: 12 }} />
                    <Text style={s.caracTxt}>Zona de Ropas</Text>
                  </View>
                  {unit.alcobas ? (
                    <View style={s.caracRow}>
                      <Text style={s.caracCheck}>✓</Text>
                      <Image src={iconAlcoba} style={{ width: 12, height: 12 }} />
                      <Text style={s.caracTxt}>
                        {unit.alcobas} Alcoba{Number(unit.alcobas) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  ) : null}
                  {unit.banos ? (
                    <View style={s.caracRow}>
                      <Text style={s.caracCheck}>✓</Text>
                      <Image src={iconBano} style={{ width: 12, height: 12 }} />
                      <Text style={s.caracTxt}>
                        {unit.banos} Baño{Number(unit.banos) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  ) : null}
                  <View style={s.caracRow}>
                    <Text style={s.caracCheck}>✓</Text>
                    <Image src={iconBalcon} style={{ width: 12, height: 12 }} />
                    <Text style={s.caracTxt}>Balcón</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ── FOOTER ── */}
          <View style={s.footerLogos}>
            <View style={s.flGroup}>
              <Text style={s.flLabel}>Gerencia y Construcción</Text>
              <Image src={logoAed} style={{ width: 52, height: 22, objectFit: 'contain' }} />
            </View>
            <View style={s.flGroup}>
              <Text style={s.flLabel}>Fiduciaria</Text>
              <Image src={logoFiduciaria} style={{ width: 66, height: 24, objectFit: 'contain' }} />
            </View>
          </View>

          <View style={s.legalWrap}>
            <Text style={s.legalTxt}>
              Los valores aquí consignados pueden variar según la negociación final. Esta cotización tiene validez de 15 días calendario a partir de su emisión.
              Todos los valores incluyen IVA cuando aplica. Las áreas son aproximadas y pueden variar según planos definitivos.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
