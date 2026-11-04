import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import headerBanner from '../../../assets/header-banner.png';
import logoOliv from '../../../assets/logo-oliv.png';
import logoFiduciaria from '../../../assets/logo-fiduciaria.png';
import logoAed from '../../../assets/logo-aed.png';
import logoJs from '../../../assets/logo-js.png';
import iconSala from '../../../assets/Sala-2.png';
import iconCocina from '../../../assets/Cocina-2.png';
import iconRopas from '../../../assets/icon-ropa-2.png';
import iconAlcoba from '../../../assets/Alcoba-2.png';
import iconBano from '../../../assets/Baño-2.png';
import iconBalcon from '../../../assets/Balcon-2.png';
import iconHome from '../../../assets/home-2.png';
import iconTerraza from '../../../assets/Proyecto-2.png';
import iconAuto from '../../../assets/Auto-2.png';
import interRegular from '../../../assets/fonts/Inter-Regular.ttf';
import interBold from '../../../assets/fonts/Inter-Bold.ttf';
import { formatCOP } from '../../../utils/format.js';
import { FirmasCaja } from './anexos/anexosShared.jsx';
// ─── Font registration ────────────────────────────────────────────────────
Font.register({
  family: 'Inter',
  fonts: [
    { src: interRegular, fontWeight: 400 },
    { src: interBold, fontWeight: 700 },
  ],
});
// ─── Brand colours ────────────────────────────────────────────────────────
const OLV = '#64713F'; // main olive green
const OLV_DK = '#4D5730'; // darker olive — headers, highlighted rows
const TEAL = '#4EA0A1'; // teal — payment plan section
const TEAL_DK = '#3B8485'; // darker teal — payment plan header/saldo bar
const OLV2 = '#7A8C50'; // medium olive — borders / accents
const PALE = '#F2F5EB'; // light olive tint
const WHT = '#FFFFFF';
const DRK = '#1A1A1A';
const GRY = '#4A4A4A';
const MUT = '#8A8A8A';
// ─── Styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 8,
    backgroundColor: WHT,
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 8,
    color: DRK,
  },
  // ── Header ──────────────────────────────────────────────────────────
  header: {
    height: 56,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  headerBg: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: OLV_DK,
    opacity: 0.6,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 16,
    color: WHT,
    letterSpacing: 0,
  },
  headerSub: { fontFamily: 'Inter', fontWeight: 400, fontSize: 7, color: '#C8DDA0', marginTop: 3 },
  // ── Content padding wrapper ──────────────────────────────────────────
  pad: { paddingHorizontal: 22 },
  // ── Info strip — no separators ───────────────────────────────────────
  infoStrip: {
    flexDirection: 'row',
    marginTop: 3,
    marginBottom: 3,
  },
  infoColL: { flex: 1, paddingVertical: 3, paddingRight: 8 },
  infoColC: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  infoColR: { flex: 1, paddingVertical: 3, paddingLeft: 8 },
  infoSectionLabel: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 5.5,
    color: OLV,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  infoName: { fontFamily: 'Inter', fontWeight: 700, fontSize: 8, color: DRK, marginBottom: 1 },
  infoLine: { fontFamily: 'Inter', fontWeight: 400, fontSize: 7, color: GRY, marginBottom: 0.5 },
  infoCenterTitle: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 8.5,
    color: OLV,
    marginBottom: 2,
    textAlign: 'center',
  },
  infoCenterLine: { fontFamily: 'Inter', fontWeight: 400, fontSize: 7, color: GRY, textAlign: 'center', marginBottom: 0.5 },
  // ── Unit title ───────────────────────────────────────────────────────
  unitTitle: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 7.5,
    color: GRY,
    textAlign: 'center',
    marginBottom: 2,
  },
  // ── Two-column body ──────────────────────────────────────────────────
  body: { flexDirection: 'row', gap: 7 },
  leftCol: { flex: 57 },
  rightCol: { flex: 43 },
  // ── Generic section block ────────────────────────────────────────────
  block: { marginBottom: 3, borderWidth: 0.5, borderColor: OLV2, overflow: 'hidden' },
  secHead: {
    backgroundColor: OLV,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
  },
  secHeadText: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 5.5,
    color: WHT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  // normal data row — white background
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 7,
    backgroundColor: WHT,
  },
  rowBullet: {
    width: 4,
    height: 4,
    borderWidth: 0.5,
    borderColor: OLV2,
    marginRight: 5,
    flexShrink: 0,
  },
  rowLabel: { flex: 1, fontFamily: 'Inter', fontWeight: 400, fontSize: 7, color: GRY },
  rowLabelBold: { flex: 1, fontFamily: 'Inter', fontWeight: 700, fontSize: 7, color: DRK },
  rowValue: { fontFamily: 'Inter', fontWeight: 700, fontSize: 7, color: DRK, textAlign: 'right' },
  rowValueTeal: { fontFamily: 'Inter', fontWeight: 700, fontSize: 7, color: TEAL, textAlign: 'right' },
  // gray-highlighted row (ÁREA TOTAL, VALOR TOTAL, SALDO CONTRA ENTREGA)
  rowGray: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2.2,
    paddingHorizontal: 7,
    backgroundColor: '#EBEBEB',
  },
  rowGrayLabel: { flex: 1, fontFamily: 'Inter', fontWeight: 700, fontSize: 7, color: DRK },
  rowGrayValue: { fontFamily: 'Inter', fontWeight: 700, fontSize: 7, color: DRK, textAlign: 'right' },
  rowGrayValueTeal: { fontFamily: 'Inter', fontWeight: 700, fontSize: 7, color: TEAL, textAlign: 'right' },
  // saldo hero row — gray bg, big teal value
  saldoHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 7,
    backgroundColor: '#EBEBEB',
  },
  saldoHeroLabel: { fontFamily: 'Inter', fontWeight: 700, fontSize: 7.5, color: DRK },
  saldoHeroValue: { fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: TEAL },
  saldoHeroValueSm: { fontFamily: 'Inter', fontWeight: 700, fontSize: 8, color: TEAL },
  // cuotas normal row (inside PAGO section, not highlighted)
  cuotasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 7,
    backgroundColor: WHT,
  },
  cuotasLabel: { flex: 1, fontFamily: 'Inter', fontWeight: 400, fontSize: 7, color: GRY },
  cuotasValue: { fontFamily: 'Inter', fontWeight: 700, fontSize: 7, color: TEAL, textAlign: 'right' },
  cuotasValueSm: { fontFamily: 'Inter', fontWeight: 700, fontSize: 7, color: TEAL, textAlign: 'right' },
  // ── Payment table (TEAL colour scheme) ──────────────────────────────
  payTable: { borderWidth: 0.5, borderColor: TEAL, overflow: 'hidden' },
  payHead: { backgroundColor: TEAL_DK, paddingVertical: 2.5, paddingHorizontal: 6 },
  payHeadText: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 5.5,
    color: WHT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  payColHead: {
    flexDirection: 'row',
    backgroundColor: '#E6F4F4',
    paddingVertical: 1.5,
    paddingHorizontal: 4,
  },
  payColHeadTxt: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 5.5,
    color: TEAL_DK,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  payRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 1, paddingHorizontal: 4 },
  payRowAlt: { backgroundColor: '#F2FAFA' },
  pCN: { width: 13, fontFamily: 'Inter', fontWeight: 400, fontSize: 6, color: MUT, textAlign: 'center' },
  pCC: { flex: 1, fontFamily: 'Inter', fontWeight: 400, fontSize: 6, color: GRY },
  pCV: { width: 62, fontFamily: 'Inter', fontWeight: 700, fontSize: 6, color: DRK, textAlign: 'right' },
  paySaldo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: TEAL_DK,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  paySaldoLbl: { fontFamily: 'Inter', fontWeight: 700, fontSize: 6, color: '#B8E8E8', textTransform: 'uppercase', letterSpacing: 0.4 },
  paySaldoVal: { fontFamily: 'Inter', fontWeight: 700, fontSize: 9, color: WHT },
  // ── Floor plan — stretches to fill remaining left-column height ──────
  floorPlanBlock: {
    // `flex:1` (para que el plano estire hasta igualar la altura de la columna derecha)
    // se cambió a una altura fija: con una imagen remota, react-pdf calculaba una altura
    // real distinta a la que terminaba pintando — mandaba toda la cotización a una 2ª
    // página aunque sobrara espacio en blanco de sobra en la primera. Confirmado quitando
    // la imagen (1 sola página) y con una copia local en data URI (seguía en 2 páginas) —
    // no era de red lenta, es el combo Image+flex:1 el que confunde su paginación.
    height: 260,
    marginTop: 3,
    borderWidth: 0.5,
    borderColor: OLV2,
    overflow: 'hidden',
  },
  floorPlanBody: {
    flex: 1,
    backgroundColor: PALE,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  torrePlaceholderTxt: { fontFamily: 'Inter', fontWeight: 400, fontSize: 7.5, color: MUT },
  // ── Bottom section ───────────────────────────────────────────────────
  bottom: { flexDirection: 'row', gap: 7, marginTop: 5 },
  bottomLeft: { flex: 50 },
  bottomRight: { flex: 50 },
  // detalles items
  detItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 7,
    gap: 5,
  },
  detItemAlt: { backgroundColor: PALE },
  detIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: OLV2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detIconTxt: { fontSize: 5.5, color: WHT, fontFamily: 'Inter', fontWeight: 700 },
  detLabel: { flex: 1, fontFamily: 'Inter', fontWeight: 400, fontSize: 7, color: GRY },
  detValue: { fontFamily: 'Inter', fontWeight: 700, fontSize: 7, color: DRK },
  // características — same row format as other tables
  caracRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 7,
    backgroundColor: WHT,
    gap: 6,
  },
  caracTxt: { fontFamily: 'Inter', fontWeight: 400, fontSize: 7, color: GRY },
  // ── Footer ────────────────────────────────────────────────────────────
  footerContact: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 3,
    borderTopWidth: 0.5,
    borderTopColor: OLV2,
    marginTop: 5,
  },
  fcItem: { alignItems: 'center' },
  fcLabel: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 5,
    color: OLV,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 0.5,
  },
  fcValue: { fontFamily: 'Inter', fontWeight: 400, fontSize: 5.5, color: GRY },
  footerLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 2,
    borderTopWidth: 0.5,
    borderTopColor: '#DDDDDD',
  },
  flGroup: { flex: 1, alignItems: 'center' },
  flLabel: {
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 5,
    color: MUT,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
    textAlign: 'center',
  },
  flDivider: { width: 0.5, alignSelf: 'stretch', backgroundColor: '#E0E0E0', marginHorizontal: 6 },
  legalWrap: { paddingHorizontal: 22, marginTop: 1 },
  legalTxt: { fontFamily: 'Inter', fontWeight: 400, fontSize: 4.2, color: MUT, lineHeight: 1.35, marginBottom: 0.5 },
});
// ─── Helpers ──────────────────────────────────────────────────────────────
function SecHead({ label }) {
  return (
    <View style={s.secHead}>
      <Text style={s.secHeadText}>{label}</Text>
    </View>
  );
}
// white bg row
function Row({ label, value, bold = false, teal = false, bullet = false, icon, valueColor }) {
  return (
    <View style={s.row}>
      {icon ? <Image src={icon} style={{ width: 10, height: 10, marginRight: 5, flexShrink: 0 }} /> : bullet ? <View style={s.rowBullet} /> : null}
      <Text style={bold ? s.rowLabelBold : s.rowLabel}>{label}</Text>
      <Text style={[teal ? s.rowValueTeal : s.rowValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}
// gray-bg highlighted row (ÁREA TOTAL, VALOR TOTAL, SALDO CONTRA ENTREGA)
function RowGray({ label, value, teal = false, bullet = false, icon }) {
  return (
    <View style={s.rowGray}>
      {icon ? <Image src={icon} style={{ width: 10, height: 10, marginRight: 5, flexShrink: 0 }} /> : bullet ? <View style={s.rowBullet} /> : null}
      <Text style={s.rowGrayLabel}>{label}</Text>
      <Text style={teal ? s.rowGrayValueTeal : s.rowGrayValue}>{value}</Text>
    </View>
  );
}
// ─── Main ─────────────────────────────────────────────────────────────────
export default function QuotePDF({
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
  conFirmas,
  nombreComprador,
  nombreDirector,
}) {
  // `quoteNumber` es el timestamp de creación de la cotización: al regenerar el PDF más tarde
  // (paquete de anexos) la fecha impresa sigue siendo la de emisión, no la de hoy.
  const emision = quoteNumber > 1e12 ? new Date(quoteNumber) : new Date();
  const today = emision.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const separacionEntry = paymentPlan[0];
  const cuotaEntries = paymentPlan.slice(1, paymentPlan.length - 1);
  // Sin saldo contraentrega (modo "Pagar 100% en cuotas") el recargo/descuento financiero se
  // cobra dentro de las cuotas: la "cuota fija" de calc ya no es la que se paga de verdad, así
  // que se muestra la cuota real del plan (la primera) con el tipo de ajuste en la etiqueta.
  const ajusteEnCuotas =
    quoteType === 'modelador' && calc.saldo <= 0 && !!financialSummary && financialSummary.saldoFinancieroFinal !== 0 && cuotaEntries.length > 0;
  const ajusteCuotasLabel = financialSummary && financialSummary.saldoFinancieroFinal > 0 ? 'Recargo' : 'Descuento';
  const planLabel = quoteType === 'estandar' ? 'Pago Estándar — Financiamiento' : 'Plan Modelado — Financiamiento';
  const alcobas = unit.alcobas ? String(unit.alcobas) : null;
  const banos = unit.banos ? String(unit.banos) : null;
  const caracteristicas = [
    { src: iconSala, label: 'Sala-Comedor' },
    { src: iconCocina, label: 'Cocina Integral' },
    { src: iconRopas, label: 'Zona de Ropas' },
    ...(alcobas ? [{ src: iconAlcoba, label: `${alcobas} Alcoba${Number(alcobas) !== 1 ? 's' : ''}` }] : []),
    ...(banos ? [{ src: iconBano, label: `${banos} Baño${Number(banos) !== 1 ? 's' : ''}` }] : []),
    { src: iconBalcon, label: 'Balcón' },
  ];
  const torreLabel = towerName ?? (unit.torre ? `Torre ${unit.torre}` : null);
  const unitLine = [unit.tipo_vista, torreLabel, unit.codigo_unidad ? `Apto ${unit.codigo_unidad}` : null].filter(Boolean).join('  —  ');
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── HEADER ── */}
        <View style={s.header}>
          <Image src={headerBanner} style={s.headerBg} />
          <View style={s.headerOverlay} />
          <View>
            <Text style={s.headerTitle}>COTIZACIÓN</Text>
            <Text style={s.headerSub}>
              {today}
              {'   |   N° '}
              {String(quoteNumber).slice(-6)}
            </Text>
          </View>
          <Image src={logoOliv} style={{ width: 88, height: 42, objectFit: 'contain' }} />
        </View>

        <View style={s.pad}>
          {/* ── INFO STRIP ── */}
          <View style={s.infoStrip}>
            <View style={s.infoColL}>
              <Text style={s.infoSectionLabel}>Cliente</Text>
              <Text style={s.infoName}>{deal.nombre_contacto_ || '—'}</Text>
              {deal.contact_identification ? <Text style={s.infoLine}>CC: {deal.contact_identification}</Text> : null}
              {deal.contact_phone ? <Text style={s.infoLine}>Tel: {deal.contact_phone}</Text> : null}
              {deal.contact_email ? <Text style={s.infoLine}>{deal.contact_email}</Text> : null}
            </View>
            <View style={s.infoColC}>
              <Text style={s.infoSectionLabel}>Proyecto</Text>
              <Text style={s.infoCenterTitle}>{deal.proyecto_inmobiliario_cac || 'OLIV Cartagena'}</Text>
              <Text style={s.infoCenterLine}>Zona Norte</Text>
              <Text style={s.infoCenterLine}>Cartagena de Indias</Text>
            </View>
            <View style={s.infoColR}>
              <Text style={s.infoSectionLabel}>Asesor</Text>
              <Text style={s.infoName}>{deal.owner_name || ownerEmail || '—'}</Text>
              {deal.owner_phone ? <Text style={s.infoLine}>Tel: {deal.owner_phone}</Text> : null}
              {deal.owner_email ? <Text style={s.infoLine}>{deal.owner_email}</Text> : null}
            </View>
          </View>

          {/* ── UNIT TITLE ── */}
          {unitLine ? <Text style={s.unitTitle}>{unitLine}</Text> : null}

          {/* ── TWO-COLUMN BODY ── */}
          <View style={s.body}>
            {/* LEFT COLUMN */}
            <View style={s.leftCol}>
              {/* INFORMACIÓN DEL INMUEBLE */}
              <View style={s.block}>
                <SecHead label="Información del Inmueble" />
                <Row label={`Apartamento ${torreLabel ?? '—'} — Apto ${unit.codigo_unidad || unit.id_unidad || '—'}`} value="" bold icon={iconHome} />
                {unit.private_area_m2 ? <Row label="Área Privada (m²)" value={`${unit.private_area_m2}`} icon={iconHome} /> : null}
                {unit.terrace_area_m2 ? <Row label="Área Terraza (m²)" value={`${unit.terrace_area_m2}`} icon={iconTerraza} /> : null}
                <RowGray label="Área Total (m²)" value={`${unit.area_construida}`} icon={iconHome} />
                <Row label="Parqueadero" value={parking?.name ?? '—'} icon={iconAuto} />
                <Row label="Depósito" value={deposito?.name ?? '—'} icon={iconAuto} />
                <Row label="Cuarto Útil" value={cuartoUtil?.name ?? '—'} icon={iconAuto} />
              </View>

              {/* INFORMACIÓN FINANCIERA */}
              <View style={s.block}>
                <SecHead label="Información Financiera — Plan Fundadores" />
                <Row label="Valor Apartamento" value={formatCOP(unit.valor_unidad_comercial)} teal />
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
                <RowGray label="Valor Total" value={formatCOP(calc.precio)} teal />
              </View>

              {/* PAGO ESTÁNDAR / MODELADO */}
              <View style={s.block}>
                <SecHead label={planLabel} />
                <Row label="Separación" value={formatCOP(calc.separacion)} teal />
                <Row label="Saldo Cuotas Iniciales" value={formatCOP(calc.montoCuotasIniciales)} teal />
                <View style={s.cuotasRow}>
                  {hasCustomQuotas ? (
                    <>
                      <Text style={s.cuotasLabel}>{calc.cuotas} Cuotas Variables</Text>
                      <Text style={s.cuotasValueSm}>Ver plan de pagos</Text>
                    </>
                  ) : ajusteEnCuotas ? (
                    <>
                      <Text style={s.cuotasLabel}>
                        Cuotas con {ajusteCuotasLabel} {calc.cuotas}
                      </Text>
                      <Text style={s.cuotasValue}>{formatCOP(cuotaEntries[0].valor)}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={s.cuotasLabel}>Cuotas Fijas {calc.cuotas}</Text>
                      <Text style={s.cuotasValue}>{formatCOP(calc.valorCuotaMensual)}</Text>
                    </>
                  )}
                </View>
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
                {quoteType === 'modelador' && financialSummary && calc.saldo > 0 && financialSummary.saldoFinancieroFinal !== 0 ? (
                  <>
                    <RowGray label="Saldo Contraentrega Propuesta Cliente" value={formatCOP(calc.saldo + financialSummary.saldoFinancieroFinal)} teal />
                    <RowGray label="Saldo Contraentrega" value={formatCOP(calc.saldo)} teal />
                  </>
                ) : (
                  <RowGray
                    label={`Saldo Contra Entrega (${calc.precio > 0 ? Math.round((calc.saldo / calc.precio) * 100) : 0}%)`}
                    value={formatCOP(calc.saldo)}
                    teal
                  />
                )}
              </View>

              {/* PLANO DE PLANTA — fills remaining left column height */}
              <View style={s.floorPlanBlock}>
                <SecHead label={`${torreLabel ?? '—'} — Plano de planta`} />
                <View style={s.floorPlanBody}>
                  {unit.floor_plan_link ? (
                    <Image src={unit.floor_plan_link} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Text style={s.torrePlaceholderTxt}>Plano de planta no disponible</Text>
                  )}
                </View>
              </View>
            </View>

            {/* RIGHT COLUMN — FORMA DE PAGO + DETALLES + CARACTERÍSTICAS */}
            <View style={s.rightCol}>
              {/* FORMA DE PAGO */}
              <View style={s.payTable}>
                <View style={s.payHead}>
                  <Text style={s.payHeadText}>Forma de Pago — {calc.cuotas} Cuotas</Text>
                </View>
                <View style={s.payColHead}>
                  <Text style={[s.payColHeadTxt, { width: 13, textAlign: 'center' }]}>#</Text>
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

                {/* Más de 42 cuotas ya no cabe una página en una sola columna (medido
            directamente: 42 cabe, 44 no) — a partir de ahí se parten en 2
            columnas lado a lado, numeradas de corrido, para seguir en 1 página. */}
                {cuotaEntries.length > 42 ? (
                  <View style={{ flexDirection: 'row' }}>
                    {[0, 1].map((col) => {
                      const porColumna = Math.ceil(cuotaEntries.length / 2);
                      const inicio = col * porColumna;
                      return (
                        <View key={col} style={{ flex: 1, borderLeftWidth: col === 1 ? 0.5 : 0, borderLeftColor: TEAL }}>
                          {cuotaEntries.slice(inicio, inicio + porColumna).map((entry, i) => {
                            const idx = inicio + i;
                            return (
                              <View key={idx} style={[s.payRow, idx % 2 === 0 ? s.payRowAlt : {}]}>
                                <Text style={[s.pCN, { width: 11, fontSize: 5.5 }]}>{idx + 1}</Text>
                                <Text
                                  style={[
                                    s.pCC,
                                    { fontSize: 5.5 },
                                    entry.ajusteAlmar ? { color: entry.ajusteAlmar.tipo === 'Recargo' ? '#DC2626' : '#16A34A' } : {},
                                  ]}
                                >
                                  {entry.fecha_estimada || 'Cuota'}
                                </Text>
                                <Text
                                  style={[
                                    s.pCV,
                                    { width: 50, fontSize: 5.5 },
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
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  cuotaEntries.map((entry, idx) => (
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
                  ))
                )}

                {quoteType === 'modelador' && financialSummary && calc.saldo > 0 && financialSummary.saldoFinancieroFinal !== 0 ? (
                  <>
                    <View style={s.paySaldo}>
                      <Text style={s.paySaldoLbl}>Saldo Contraentrega Propuesta Cliente</Text>
                      <Text style={s.paySaldoVal}>{formatCOP(calc.saldo + financialSummary.saldoFinancieroFinal)}</Text>
                    </View>
                    <View style={[s.paySaldo, { backgroundColor: OLV2 }]}>
                      <Text style={s.paySaldoLbl}>Saldo Contraentrega</Text>
                      <Text style={s.paySaldoVal}>{formatCOP(calc.saldo)}</Text>
                    </View>
                  </>
                ) : (
                  <View style={s.paySaldo}>
                    <Text style={s.paySaldoLbl}>Saldo Contra Entrega</Text>
                    <Text style={s.paySaldoVal}>{formatCOP(calc.saldo)}</Text>
                  </View>
                )}

                {quoteType === 'modelador' && financialSummary && financialSummary.saldoFinancieroFinal !== 0 && (
                  <View style={[s.paySaldo, { backgroundColor: '#0F172A' }]}>
                    <Text style={[s.paySaldoLbl, { color: WHT }]}>Total a pagar con {financialSummary.saldoFinancieroFinal > 0 ? 'Recargo' : 'Descuento'}</Text>
                    <Text style={s.paySaldoVal}>{formatCOP(calc.precio + financialSummary.saldoFinancieroFinal)}</Text>
                  </View>
                )}
              </View>

              {/* CARACTERÍSTICAS */}
              <View style={[s.block, { marginTop: 3 }]}>
                <SecHead label="Características" />
                {caracteristicas.map((c, i) => (
                  <View key={i} style={s.caracRow}>
                    <Image src={c.src} style={{ width: 14, height: 14, objectFit: 'contain' }} />
                    <Text style={s.caracTxt}>{c.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Firmas + footer + legal van en un solo bloque con wrap={false}: sin esto,
            react-pdf a veces parte la fila de logos a la mitad entre dos páginas (un
            logo en cada una) aunque sobre espacio en blanco debajo en la primera — un
            bug real de su paginación, no un problema de que falte espacio. Con
            wrap={false} el bloque entero se mueve de página como una sola pieza. */}
        <View wrap={false}>
          {conFirmas && (
            <View style={{ marginHorizontal: 22, marginTop: 3 }}>
              <FirmasCaja compacto nombreComprador={nombreComprador} nombreDirector={nombreDirector} />
            </View>
          )}

          {/* ── FOOTER ── */}
          <View style={s.footerLogos}>
            <View style={s.flGroup}>
              <Image src={logoFiduciaria} style={{ width: 72, height: 26, objectFit: 'contain' }} />
            </View>
            <View style={s.flDivider} />
            <View style={s.flGroup}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Image src={logoAed} style={{ width: 56, height: 24, objectFit: 'contain' }} />
                <Image src={logoJs} style={{ width: 44, height: 44, objectFit: 'contain' }} />
              </View>
            </View>
          </View>

          <View style={s.legalWrap}>
            <Text style={s.legalTxt}>
              1. Esta cotización tiene vigencia de 8 días calendario desde la expedición. No otorga opción de la vivienda y está sujeta a disponibilidad al
              momento de la separación. La formalización debe realizarse dentro de los 8 días hábiles siguientes al pago de la separación; de lo contrario, no
              se garantiza la ubicación ni el valor del inmueble.
            </Text>
            <Text style={s.legalTxt}>2. El plazo para el pago de la cuota inicial no está ligado a la fecha de entrega del inmueble.</Text>
            <Text style={s.legalTxt}>
              3. Una vez realizada la separación, la firma de documentos y apertura del encargo fiduciario debe realizarse en máximo 8 días hábiles; de lo
              contrario, no se considerará una reserva efectiva. La cuota inicial se abona en el encargo fiduciario que el cliente debe constituir al legalizar
              la venta.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
