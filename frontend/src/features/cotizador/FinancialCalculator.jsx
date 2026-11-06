import { useState, useEffect, useRef } from 'react';
import { useAppConfig } from '../../context/AppConfigContext.jsx';
import { useCurrency } from '../../context/CurrencyContext.jsx';
import { getSeparacionMinima } from '../../utils/planFinanciero.js';
import { CalendarDays, CircleAlert, ChevronDown, Tag, TriangleAlert } from 'lucide-react';
import { Badge } from '../../components/ui/Badge.jsx';
import styles from './FinancialCalculator.module.css';
export default function FinancialCalculator({
  precio,
  bonoMax,
  bonoAplicado,
  onBonoChange,
  cuotas,
  separacion,
  onSeparacionChange,
  onCuotasChange,
  calc,
  quoteType,
  hasCustomQuotas = false,
  descuentoTipo,
  descuentoPct = 0,
  descuentoMonto = 0,
  descuentoModo = 'porcentaje',
  descuentoIncluyeParqueadero = false,
  abonoActivo,
  abonoSaldo = 0,
  onAbonoActivoChange,
  modo100,
  onModo100Change,
  subsidioId,
  onSubsidioChange,
  subsidiosElegibles,
  contactIngresosMensuales,
  contactSmlvMultiple,
  adicionalesIds,
  onAdicionalesChange,
  cuotaInicialPctOverride,
  onCuotaInicialPctOverrideChange,
  onQuoteTypeChange,
  precioDetalle,
  saldoDetalle,
  cuotasDetalle,
  separacionFecha,
  onSeparacionFechaChange,
  separacionFechaMin,
  separacionFechaMax,
}) {
  const { minMonthlyQuota, config, role } = useAppConfig();
  const { formatPrice, isUSD, exchangeRate } = useCurrency();
  const isEstandar = quoteType === 'estandar';
  const cuotaBelowMin = calc.valorCuotaMensual > 0 && calc.valorCuotaMensual < (minMonthlyQuota || 0);
  const hasBono = bonoMax > 0;
  const adicionalesSeleccionados = config.adicionalesEnabled ? config.adicionales.filter((a) => adicionalesIds.includes(a.id)) : [];
  const adicionalesTotal = adicionalesSeleccionados.reduce((s, a) => s + a.monto, 0);
  const toggleAdicional = (id) => {
    onAdicionalesChange(adicionalesIds.includes(id) ? adicionalesIds.filter((x) => x !== id) : [...adicionalesIds, id]);
  };
  // precio efectivo después del bono y los adicionales
  const precioTotal = precio - bonoAplicado + adicionalesTotal;
  // Cuota inicial total: calc.saldo ya refleja el % configurado por proyecto
  // (o 0 en modo 100%, cubriendo el precio completo) — se deriva de ahí en vez
  // de repetir el porcentaje, para no desincronizarse del valor real.
  const cuotaInicialTotal = calc.precio - calc.saldo;
  const cuotaInicialPctDisplay = calc.precio > 0 ? Math.round((cuotaInicialTotal / calc.precio) * 100) : 0;
  // ── USD-aware helpers — all internal state in COP ──────────────────────
  const toDisplay = (cop) => (isUSD && exchangeRate ? Math.round(cop / exchangeRate) : cop);
  const toCOP = (display) => (isUSD && exchangeRate ? Math.round(display * exchangeRate) : display);
  const separacionDisplay = toDisplay(separacion);
  const separacionMinima = getSeparacionMinima(calc.precio, config); // mínimo configurable (% o monto fijo)
  const separacionMinimaDisplay = toDisplay(separacionMinima);
  const separacionMinimaDetalle = config.separacionModo === 'fijo' ? 'monto fijo configurado' : `${config.separacionPct}% del precio total`;
  const bonoDisplay = toDisplay(bonoAplicado);
  const fmtNum = (n) => new Intl.NumberFormat('es-CO').format(n);
  const bonoFocused = useRef(false);
  const sepFocused = useRef(false);
  const cuotaPctFocused = useRef(false);
  const [showAutoCorrectMsg, setShowAutoCorrectMsg] = useState(false);
  const [showBonoMaxMsg, setShowBonoMaxMsg] = useState(false);
  // Local string states — allow empty intermediate values while typing
  const [bonoStr, setBonoStr] = useState(fmtNum(bonoDisplay));
  const [sepStr, setSepStr] = useState(fmtNum(separacionDisplay));
  const [cuotasStr, setCuotasStr] = useState(String(cuotas));
  const [cuotaPctStr, setCuotaPctStr] = useState(String(cuotaInicialPctOverride ?? config.cuotaInicialPct ?? 30));
  // Sync when external value changes (unit reset, currency toggle)
  useEffect(() => {
    if (!bonoFocused.current) setBonoStr(fmtNum(bonoDisplay));
  }, [bonoDisplay]);
  useEffect(() => {
    if (!sepFocused.current) setSepStr(fmtNum(separacionDisplay));
  }, [separacionDisplay]);
  useEffect(() => {
    setCuotasStr(String(cuotas));
  }, [cuotas]);
  useEffect(() => {
    if (!cuotaPctFocused.current) setCuotaPctStr(String(cuotaInicialPctOverride ?? config.cuotaInicialPct ?? 30));
  }, [cuotaInicialPctOverride, config.cuotaInicialPct]);
  const handleCuotaPctChange = (e) => {
    const raw = e.target.value;
    setCuotaPctStr(raw);
    if (raw === '') return;
    const num = Number(raw);
    if (!Number.isNaN(num)) onCuotaInicialPctOverrideChange?.(num);
  };
  const handleCuotaPctBlur = () => {
    cuotaPctFocused.current = false;
    if (cuotaPctStr === '' || Number.isNaN(Number(cuotaPctStr))) {
      setCuotaPctStr(String(config.cuotaInicialPct ?? 30));
      onCuotaInicialPctOverrideChange?.(null);
      return;
    }
    const clamped = Math.min(99, Math.max(1, Number(cuotaPctStr)));
    setCuotaPctStr(String(clamped));
    onCuotaInicialPctOverrideChange?.(clamped);
  };
  const handleBonoChange = (e) => {
    const digits = e.target.value.replace(/[^\d]/g, '');
    setBonoStr(digits === '' ? '' : fmtNum(Number(digits)));
    if (digits === '') return;
    const val = toCOP(Number(digits));
    if (val > bonoMax) {
      onBonoChange(bonoMax);
      setShowBonoMaxMsg(true);
      setTimeout(() => setShowBonoMaxMsg(false), 5000);
    } else {
      onBonoChange(Math.max(0, val));
      setShowBonoMaxMsg(false);
    }
  };
  const handleBonoBlur = () => {
    bonoFocused.current = false;
    if (bonoStr === '') {
      onBonoChange(0);
      setBonoStr('0');
    }
  };
  const handleSeparacionInputChange = (e) => {
    const digits = e.target.value.replace(/[^\d]/g, '');
    setSepStr(digits === '' ? '' : fmtNum(Number(digits)));
    if (digits !== '') onSeparacionChange(toCOP(Number(digits)));
  };
  const handleBlurSeparation = () => {
    sepFocused.current = false;
    if (sepStr === '') {
      onSeparacionChange(0);
      setSepStr('0');
      return;
    }
    if (!isEstandar && role !== 'admin' && separacion < separacionMinima) {
      onSeparacionChange(separacionMinima);
      setSepStr(fmtNum(separacionMinimaDisplay));
      setShowAutoCorrectMsg(true);
      setTimeout(() => setShowAutoCorrectMsg(false), 4000);
    }
  };
  // ── Opciones avanzadas (subsidio, adicionales, fechas extraordinarias, modo 100%,
  // abono) — módulos que no todas las cotizaciones usan, así que van colapsados por
  // defecto para no obligar a scrollear entre ellos para llegar a lo que sí se toca
  // siempre (precio y condiciones de pago). Si la cotización YA trae alguno activo
  // (por ejemplo se está editando un negocio que ya tenía un subsidio aplicado),
  // arranca abierto — nunca se vuelve a cerrar solo después de eso, para no pelear
  // con un toggle manual del asesor.
  const [opcionesOpen, setOpcionesOpen] = useState(() => !!subsidioId || adicionalesIds.length > 0 || modo100 || abonoActivo);
  const hasSubsidioModule = config.subsidiosEnabled && config.subsidios.length > 0;
  const hasAdicionalesModule = config.adicionalesEnabled && config.adicionales.length > 0;
  const hasAdvancedOptions = hasSubsidioModule || hasAdicionalesModule || config.fechasExtraordinariasEnabled || !isEstandar;
  const advancedActiveCount = [!!subsidioId, adicionalesIds.length > 0, modo100, abonoActivo].filter(Boolean).length;
  return (
    <div className={styles.root}>
      {/* ── Resumen — fijo arriba mientras se scrollea el resto de la columna: Precio total / Cuota inicial / Saldo /
            Valor cuota son los numeros que de verdad importan para cerrar la venta, con su detalle debajo. ── */}
      <dl className={styles.resumen}>
        <div className={styles.kpi}>
          <dt>Precio total</dt>
          <dd className={styles.kpiPrimario} title={formatPrice(precioTotal)}>
            {formatPrice(precioTotal)}
          </dd>
          {precioDetalle && <span className={styles.kpiSub}>{precioDetalle}</span>}
        </div>
        <div className={styles.kpi}>
          <dt>Cuota inicial ({modo100 ? 100 : cuotaInicialPctDisplay}%)</dt>
          <dd title={formatPrice(cuotaInicialTotal)}>{formatPrice(cuotaInicialTotal)}</dd>
          <span className={styles.kpiSub}>Separación {formatPrice(separacion)} incluida</span>
        </div>
        <div className={styles.kpi}>
          <dt>Saldo ({100 - (modo100 ? 100 : cuotaInicialPctDisplay)}%)</dt>
          <dd title={formatPrice(calc.saldo)}>{formatPrice(calc.saldo)}</dd>
          {abonoSaldo > 0 ? (
            <span className={styles.kpiSub} title={`Abono ${formatPrice(abonoSaldo)} · a pagar ${formatPrice(calc.saldo - abonoSaldo)}`}>
              Abono −{formatPrice(abonoSaldo)} · a pagar {formatPrice(calc.saldo - abonoSaldo)}
            </span>
          ) : (
            saldoDetalle && <span className={styles.kpiSub}>{saldoDetalle}</span>
          )}
        </div>
        <div className={`${styles.kpi} ${styles.kpiDestacado}`}>
          <dt>{hasCustomQuotas ? 'Cuota mensual' : 'Valor cuota'}</dt>
          <dd>{hasCustomQuotas ? 'Variable' : formatPrice(calc.valorCuotaMensual)}</dd>
          {cuotasDetalle && <span className={styles.kpiSub}>{cuotasDetalle}</span>}
        </div>
      </dl>

      {/* ── Condiciones: tipo de cotizacion + campos en una sola fila. Lo que no es editable se ve como texto plano. ── */}
      <section className={styles.tarjeta}>
        <div className={styles.cuerpo}>
          <div className={styles.tipoFila}>
            <span className={styles.label}>Tipo de cotización</span>
            <div className={styles.segmentado} role="radiogroup" aria-label="Tipo de cotización">
              {[
                ['estandar', 'Estándar'],
                ['modelador', 'Modelador'],
              ].map(([id, nombre]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={quoteType === id}
                  onClick={() => onQuoteTypeChange(id)}
                  className={`${styles.segmento} ${quoteType === id ? styles.segmentoActivo : ''}`}
                >
                  {nombre}
                </button>
              ))}
            </div>
            <span className={styles.ayuda}>{isEstandar ? 'Cuotas fijas según entrega. Solo el bono es editable.' : 'Puedes editar separación, plazo y cada cuota.'}</span>
          </div>

          <div className={styles.camposFila}>
            {hasBono && (
              <div className={styles.campo}>
                <label className={styles.label} htmlFor="cot-bono">
                  Bono
                </label>
                <div className={styles.moneda}>
                  <span className={styles.prefijo} aria-hidden="true">
                    $
                  </span>
                  <input
                    id="cot-bono"
                    type="text"
                    inputMode="decimal"
                    value={bonoStr}
                    onChange={handleBonoChange}
                    onBlur={handleBonoBlur}
                    onFocus={(e) => {
                      bonoFocused.current = true;
                      e.target.select();
                    }}
                    className={`${styles.control} ${styles.conPrefijo}`}
                  />
                </div>
                <span className={styles.labelNota}>
                  Máx {formatPrice(bonoMax)} ·{' '}
                  <button type="button" className={styles.enlaceMini} onClick={() => onBonoChange(bonoMax)}>
                    Usar máximo
                  </button>
                </span>
              </div>
            )}

            <div className={styles.campo}>
              <label className={styles.label} htmlFor="cot-separacion">
                Separación
              </label>
              {isEstandar ? (
                <span className={styles.valor}>{formatPrice(separacion)}</span>
              ) : (
                <div className={styles.moneda}>
                  <span className={styles.prefijo} aria-hidden="true">
                    $
                  </span>
                  <input
                    id="cot-separacion"
                    type="text"
                    inputMode="decimal"
                    value={sepStr}
                    onChange={handleSeparacionInputChange}
                    onBlur={handleBlurSeparation}
                    onFocus={(e) => {
                      sepFocused.current = true;
                      e.target.select();
                    }}
                    className={`${styles.control} ${styles.conPrefijo}`}
                  />
                </div>
              )}
              {!isEstandar && <span className={styles.labelNota}>{role === 'admin' ? 'Sin mínimo' : `Mín ${formatPrice(separacionMinima)}`}</span>}
            </div>

            <div className={styles.campo}>
              <label className={styles.label} htmlFor="cot-fecha-separacion">
                Fecha de separación
              </label>
              {onSeparacionFechaChange ? (
                <input
                  id="cot-fecha-separacion"
                  type="date"
                  value={separacionFecha}
                  min={separacionFechaMin}
                  max={separacionFechaMax}
                  onChange={(e) => onSeparacionFechaChange(e.target.value)}
                  className={styles.control}
                />
              ) : null}
              {!isEstandar && <span className={styles.labelNota}>Este mes</span>}
            </div>

            <div className={styles.campo}>
              <label className={styles.label} htmlFor="cot-plazo">
                Plazo (meses)
              </label>
              {isEstandar ? (
                <span className={styles.valor}>{cuotas} meses</span>
              ) : (
                <input
                  id="cot-plazo"
                  type="text"
                  inputMode="numeric"
                  value={cuotasStr}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, '');
                    if (raw === '') {
                      setCuotasStr('');
                      return;
                    }
                    const value = role === 'admin' ? Number(raw) : Math.min(config.cuotasEstandar, Number(raw));
                    setCuotasStr(String(value));
                    onCuotasChange(value);
                  }}
                  onBlur={() => {
                    if (cuotasStr === '' || Number(cuotasStr) < 1) {
                      onCuotasChange(1);
                      setCuotasStr('1');
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  className={styles.control}
                />
              )}
              {!isEstandar && <span className={styles.labelNota}>{role === 'admin' ? 'Sin límite' : `Máx ${config.cuotasEstandar}`}</span>}
            </div>

            <div className={styles.campo}>
              <span className={styles.label}>{modo100 ? 'Total a financiar' : 'Cuota inicial'}</span>
              {modo100 ? (
                <span className={styles.valor}>100 %</span>
              ) : onCuotaInicialPctOverrideChange ? (
                <span className={styles.pctGrupo}>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    step="0.01"
                    value={cuotaPctStr}
                    onChange={handleCuotaPctChange}
                    onFocus={(e) => {
                      cuotaPctFocused.current = true;
                      e.target.select();
                    }}
                    onBlur={handleCuotaPctBlur}
                    aria-label="Porcentaje de cuota inicial"
                    className={`${styles.control} ${styles.pctInput}`}
                  />
                  <span className={styles.pctSigno}>%</span>
                  {cuotaInicialPctOverride != null && (
                    <button
                      type="button"
                      className={styles.reset}
                      onClick={() => onCuotaInicialPctOverrideChange(null)}
                      title={`Volver al ${config.cuotaInicialPct ?? 30}% configurado`}
                    >
                      Restablecer
                    </button>
                  )}
                </span>
              ) : (
                <span className={styles.valor}>{cuotaInicialPctDisplay} %</span>
              )}
              <span className={styles.labelNota}>{formatPrice(cuotaInicialTotal)}</span>
            </div>
          </div>

          {/* ── Descuento Especial (read-only) ── */}
          {descuentoMonto > 0 && descuentoTipo && (
            <div className={`${styles.aviso} ${styles.avisoInfo} ${styles.avisoEntre}`}>
              <span
                className={styles.avisoTexto}
                title={
                  descuentoIncluyeParqueadero
                    ? 'Aplicado al valor base del inmueble, parqueadero, depósito y cuarto útil'
                    : 'Aplicado al valor base del inmueble'
                }
              >
                <Tag size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>
                  Desc. {descuentoTipo.charAt(0).toUpperCase() + descuentoTipo.slice(1)} {descuentoModo === 'montoFijo' ? '(Fijo)' : `(${descuentoPct}%)`}
                  {descuentoIncluyeParqueadero && <span className={styles.avisoSub}> · incl. parq/dep/cuarto útil</span>}
                </span>
              </span>
              <strong>− {formatPrice(descuentoMonto)}</strong>
            </div>
          )}

          {/* ── Mensajes de validación ── */}
          {showBonoMaxMsg && (
            <div className={`${styles.aviso} ${styles.avisoAdvertencia}`} role="status">
              <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>Se ha llegado al tope máximo de bono asignado a este inmueble.</span>
            </div>
          )}

          {showAutoCorrectMsg && (
            <div className={`${styles.aviso} ${styles.avisoAdvertencia}`} role="status">
              <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>
                Se ajustó la separación al mínimo permitido de {formatPrice(separacionMinima)} ({separacionMinimaDetalle}).
              </span>
            </div>
          )}

          {cuotaBelowMin && (
            <div className={`${styles.aviso} ${styles.avisoError}`} role="alert">
              <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <p className={styles.avisoTitulo}>Cuota mensual inferior al mínimo permitido</p>
                <p>No puede ser menor a {formatPrice(minMonthlyQuota)}. Disminuye la separación o reduce el número de cuotas.</p>
              </div>
            </div>
          )}

          {/* ── Precio Total (con desglose, cuando hay bono/descuento/adicionales) ── */}
          {(hasBono || descuentoMonto > 0 || adicionalesTotal > 0) && (
            <p className={styles.nota}>
              Precio total: <strong className={styles.notaPrimaria}>{formatPrice(precioTotal)}</strong> (
              {[
                descuentoMonto > 0 && 'descuento especial',
                bonoAplicado > 0 && `bono −${formatPrice(bonoAplicado)}`,
                adicionalesTotal > 0 && `adicionales +${formatPrice(adicionalesTotal)}`,
              ]
                .filter(Boolean)
                .join(', ')}
              )
            </p>
          )}
        </div>
      </section>

      {/* ── Opciones avanzadas (colapsable) — subsidio, adicionales, fechas
            extraordinarias, modo 100% y abono: módulos que no toda cotización usa. ── */}
      {hasAdvancedOptions && (
        <section className={styles.tarjeta}>
          <button type="button" onClick={() => setOpcionesOpen((o) => !o)} aria-expanded={opcionesOpen} className={styles.avanzadasHead}>
            <span className={styles.avanzadasTitulo}>
              <span className={styles.tarjetaTitulo}>Opciones avanzadas</span>
              {advancedActiveCount > 0 && (
                <Badge variant="info">
                  {advancedActiveCount} activa{advancedActiveCount > 1 ? 's' : ''}
                </Badge>
              )}
            </span>
            <ChevronDown className={opcionesOpen ? styles.chevronAbierto : ''} size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>

          {opcionesOpen && (
            <div className={`${styles.cuerpo} ${styles.avanzadasCuerpo}`}>
              {/* ── Subsidio (módulo apagado por defecto, activable por proyecto) ── */}
              {hasSubsidioModule && (
                <div className={styles.campo}>
                  <label className={styles.label} htmlFor="cot-subsidio">
                    Subsidio
                  </label>

                  {!contactIngresosMensuales && (
                    <div className={`${styles.aviso} ${styles.avisoAdvertencia}`}>
                      <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
                      <span>Este contacto no tiene ingresos mensuales registrados en HubSpot — agrégalos al contacto para poder calcular el subsidio.</span>
                    </div>
                  )}

                  {/* El asesor solo puede elegir entre los subsidios ELEGIBLES según ingresos
                        (o quitarlo, para comparar cotizaciones con/sin subsidio) — no puede
                        elegir uno que el contacto no califique. */}
                  <select
                    id="cot-subsidio"
                    value={subsidioId}
                    onChange={(e) => onSubsidioChange(e.target.value)}
                    disabled={subsidiosElegibles.length === 0}
                    className={`${styles.control} ${styles.select}`}
                  >
                    <option value="">Ninguno</option>
                    {subsidiosElegibles.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre || 'Sin nombre'} — {formatPrice(s.monto)} ({s.aplicaA === 'saldo' ? 'Saldo Contraentrega' : 'Cuota Inicial'})
                      </option>
                    ))}
                  </select>

                  {subsidiosElegibles.length === 0 && contactIngresosMensuales ? (
                    <p className={styles.ayuda}>Según los ingresos de este contacto, no aplica ningún subsidio configurado.</p>
                  ) : subsidiosElegibles.length === 1 && !subsidioId ? (
                    <p className={styles.ayuda}>Subsidio quitado manualmente — vuelve a seleccionarlo en el desplegable para aplicarlo.</p>
                  ) : subsidiosElegibles.length > 1 ? (
                    <p className={`${styles.ayuda} ${styles.ayudaAdvertencia}`}>
                      Este contacto califica para {subsidiosElegibles.length} subsidios a la vez — elige cuál aplicar.
                    </p>
                  ) : null}

                  {(() => {
                    const subsidioActivo = config.subsidios.find((s) => s.id === subsidioId);
                    if (!subsidioActivo) return null;
                    return (
                      <div className={`${styles.aviso} ${styles.avisoExito} ${styles.avisoEntre}`}>
                        <div className={styles.avisoBloque}>
                          <strong>Subsidio {subsidioActivo.nombre || 'Sin nombre'}</strong>
                          <span className={styles.avisoSub}>
                            {subsidioActivo.aplicaA === 'saldo' ? 'Saldo Contraentrega' : 'Cuota Inicial'}
                            {contactSmlvMultiple != null ? ` — ${contactSmlvMultiple.toFixed(1)} SMLV` : ''}
                          </span>
                        </div>
                        <strong>− {formatPrice(subsidioActivo.monto)}</strong>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── Adicionales (módulo apagado por defecto, activable por proyecto) ── */}
              {hasAdicionalesModule && (
                <div className={styles.campo}>
                  <span className={styles.label}>Adicionales</span>
                  <div className={styles.lista}>
                    {config.adicionales.map((a) => {
                      const checked = adicionalesIds.includes(a.id);
                      return (
                        <label key={a.id} className={`${styles.opcion} ${checked ? styles.opcionActiva : ''}`}>
                          <span className={styles.opcionNombre}>
                            <input type="checkbox" checked={checked} onChange={() => toggleAdicional(a.id)} />
                            {a.nombre || 'Sin nombre'}
                          </span>
                          <strong>+ {formatPrice(a.monto)}</strong>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Fechas Extraordinarias (módulo apagado por defecto, activable por proyecto) ── */}
              {config.fechasExtraordinariasEnabled &&
                (contactIngresosMensuales ? (
                  <div className={`${styles.aviso} ${styles.avisoInfo}`}>
                    <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
                    <span>
                      Fechas extraordinarias activas: en la tabla de pagos, las cuotas de marzo/junio/diciembre pueden recibir el abono de cesantías/prima
                      calculado sobre el ingreso del contacto.
                    </span>
                  </div>
                ) : (
                  <div className={`${styles.aviso} ${styles.avisoAdvertencia}`}>
                    <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
                    <span>
                      Este contacto no tiene ingresos mensuales registrados en HubSpot — agrégalos para calcular los abonos de fechas extraordinarias.
                    </span>
                  </div>
                ))}

              {/* ── Pagar 100% en cuotas (solo Modelador) ── */}
              {!isEstandar && (
                <div className={styles.opcion}>
                  <span className={styles.opcionTexto}>
                    <span className={styles.opcionTitulo}>Pagar 100% en cuotas</span>
                    <span className={styles.ayuda}>
                      Junta el {config.cuotaInicialPct ?? 30}% y el {100 - (config.cuotaInicialPct ?? 30)}% (saldo $0).
                    </span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={modo100}
                    aria-label="Pagar 100% en cuotas"
                    onClick={() => onModo100Change(!modo100)}
                    className={`${styles.switch} ${modo100 ? styles.switchOn : ''}`}
                  >
                    <span className={styles.switchPerilla} />
                  </button>
                </div>
              )}

              {/* ── Abono adicional (solo Modelador, no en modo 100%) ── */}
              {!isEstandar && !modo100 && (
                <label className={styles.opcion}>
                  <span className={styles.opcionNombre}>
                    <input type="checkbox" checked={abonoActivo} onChange={(e) => onAbonoActivoChange(e.target.checked)} />
                    <span className={styles.opcionTexto}>
                      <span className={styles.opcionTitulo}>Abonar adicionalmente al saldo</span>
                      <span className={styles.ayuda}>
                        Lo que una cuota pague por encima de su parte de la cuota inicial ({cuotaInicialPctDisplay}%) se abona al saldo ({100 - cuotaInicialPctDisplay}%).
                      </span>
                    </span>
                  </span>
                </label>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
