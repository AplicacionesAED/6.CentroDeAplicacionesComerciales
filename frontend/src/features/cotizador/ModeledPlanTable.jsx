import { useState, useEffect, useRef, Fragment } from 'react';
import { useCurrency } from '../../context/CurrencyContext.jsx';
import { Plus, TriangleAlert, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import table from './PlanTable.module.css';
import styles from './ModeledPlanTable.module.css';
export default function ModeledPlanTable({
  standardCalc,
  modeledCalc,
  modeledPlanData,
  standardPlan,
  subsidioCuotaNumero,
  subsidioNombre,
  onToggleFechaExtra,
  recargoOverride,
  onRecargoOverrideChange,
  ignorarRecargo = false,
  onIgnorarRecargoChange,
  separacionFecha,
  onSeparacionFechaChange,
  separacionFechaMin,
  separacionFechaMax,
  onRestablecer,
}) {
  const { formatPrice, isUSD, exchangeRate } = useCurrency();
  const { modeledPlan, fixedQuotas, setFixedQuota, warning, financialSummary } = modeledPlanData;
  // Cuota inicial total derivada del calc real (ya refleja el % configurado por proyecto)
  const saldoPct = standardCalc.precio > 0 ? Math.round((standardCalc.saldo / standardCalc.precio) * 100) : 0;
  // Convert COP ↔ display currency for editable cells
  const displayToCOP = (display) => (isUSD && exchangeRate ? Math.round(display * exchangeRate) : display);
  const formatQuotaDisplay = (cop) =>
    isUSD && exchangeRate ? new Intl.NumberFormat('en-US').format(Math.round(cop / exchangeRate)) : new Intl.NumberFormat('es-CO').format(cop);
  // Local string state — allows empty intermediate values while typing
  const [localQuotaStr, setLocalQuotaStr] = useState({});
  const handleQuotaChange = (numero, value) => {
    const digits = value.replace(/[^\d]/g, '');
    const formatted =
      digits === ''
        ? ''
        : isUSD && exchangeRate
          ? new Intl.NumberFormat('en-US').format(Number(digits))
          : new Intl.NumberFormat('es-CO').format(Number(digits));
    setLocalQuotaStr((prev) => ({ ...prev, [numero]: formatted }));
    // Aplicar el cambio en vivo para que toda la tabla se recalcule al instante
    setFixedQuota(numero, digits === '' ? 0 : displayToCOP(Number(digits)));
  };
  const handleQuotaBlur = (numero) => {
    const str = localQuotaStr[numero];
    if (str === undefined) return;
    if (str === '') {
      setFixedQuota(numero, 0);
    } else {
      const displayValue = Number(str.replace(/\D/g, ''));
      setFixedQuota(numero, displayToCOP(displayValue));
    }
    setLocalQuotaStr((prev) => {
      const n = { ...prev };
      delete n[numero];
      return n;
    });
  };
  const isRecargo = financialSummary.saldoFinancieroFinal > 0;
  const isDescuento = financialSummary.saldoFinancieroFinal < 0;
  const firstAbonoIdx = modeledPlan.findIndex((e) => e.isAbono);
  // Recargo/descuento editable manualmente (admin) — magnitud digitada, el signo
  // se conserva según lo que haya calculado el motor (recargo positivo, descuento negativo).
  // Con "ignorar recargo/descuento" activo no existe ningún ajuste, aunque haya quedado un
  // valor manual puesto de antes (mismo criterio que el motor).
  const effectiveRecargo = ignorarRecargo ? 0 : (recargoOverride ?? financialSummary.saldoFinancieroFinal);
  const isOverridden =
    !ignorarRecargo && recargoOverride !== null && recargoOverride !== undefined && recargoOverride !== financialSummary.saldoFinancieroFinal;
  // Monto de recargo(+)/descuento(−) que de verdad se cobra en el Saldo Final.
  const ajusteAplicado = effectiveRecargo;
  // ─── Edición masiva ───
  // Una fila es "editable" (tiene el input de $ y puede seleccionarse) con el MISMO
  // criterio que ya decide si se pinta el input más abajo — factorizado acá para que
  // los checkboxes y la selección por rango nunca puedan seleccionar una fila que en
  // realidad no se puede editar (Separación, Saldo Final o Subsidio).
  const isEditableRow = (idx, entry) => {
    const isFirst = idx === 0;
    const isLast = idx === modeledPlan.length - 1;
    const isSubsidyRow = !!subsidioNombre && entry.numero === subsidioCuotaNumero;
    return !isFirst && !isLast && !isSubsidyRow;
  };
  const editableNumeros = modeledPlan.map((entry, idx) => (isEditableRow(idx, entry) ? entry.numero : null)).filter((n) => n !== null);
  const [selectedQuotas, setSelectedQuotas] = useState(new Set());
  const [rangoAbierto, setRangoAbierto] = useState(false);
  const [verTodas, setVerTodas] = useState(false);
  const [rangoDesde, setRangoDesde] = useState('');
  const [rangoHasta, setRangoHasta] = useState('');
  const [bulkValorStr, setBulkValorStr] = useState('');
  const toggleSelected = (numero) => {
    setSelectedQuotas((prev) => {
      const next = new Set(prev);
      if (next.has(numero)) next.delete(numero);
      else next.add(numero);
      return next;
    });
  };
  const allEligibleSelected = editableNumeros.length > 0 && editableNumeros.every((n) => selectedQuotas.has(n));
  const toggleSelectAll = () => {
    setSelectedQuotas(allEligibleSelected ? new Set() : new Set(editableNumeros));
  };
  const selectRange = () => {
    const from = Number(rangoDesde);
    const to = Number(rangoHasta);
    if (!from || !to || from > to) return;
    setSelectedQuotas((prev) => {
      const next = new Set(prev);
      editableNumeros.filter((n) => n >= from && n <= to).forEach((n) => next.add(n));
      return next;
    });
  };
  const handleBulkValorChange = (e) => {
    const digits = e.target.value.replace(/[^\d]/g, '');
    setBulkValorStr(
      digits === '' ? '' : isUSD && exchangeRate ? new Intl.NumberFormat('en-US').format(Number(digits)) : new Intl.NumberFormat('es-CO').format(Number(digits))
    );
  };
  const applyBulkValue = () => {
    const digits = bulkValorStr.replace(/\D/g, '');
    if (digits === '' || selectedQuotas.size === 0) return;
    const cop = displayToCOP(Number(digits));
    selectedQuotas.forEach((numero) => setFixedQuota(numero, cop));
  };
  const releaseSelected = () => {
    selectedQuotas.forEach((numero) => setFixedQuota(numero, null));
  };
  const liberarTodas = () => editableNumeros.forEach((numero) => setFixedQuota(numero, null));
  // Cronograma compacto: solo las primeras cuotas y el saldo final; las del medio se abren con "Ver las N cuotas restantes".
  // Una cuota fija, abono, subsidio, con fecha extraordinaria o seleccionada siempre se ve.
  const esColapsable = (idx, entry) =>
    idx > 8 &&
    idx !== modeledPlan.length - 1 &&
    !entry.isFixed &&
    !entry.isAbono &&
    !entry.esFechaExtraordinaria &&
    !(subsidioNombre && entry.numero === subsidioCuotaNumero) &&
    !selectedQuotas.has(entry.numero);
  const idxColapsables = modeledPlan.map((entry, idx) => (esColapsable(idx, entry) ? idx : -1)).filter((idx) => idx >= 0);
  const ocultas = verTodas ? 0 : idxColapsables.length;
  const primeraOculta = idxColapsables[0];
  const fmtNum = (n) => new Intl.NumberFormat('es-CO').format(n);
  const recargoFocused = useRef(false);
  const [recargoStr, setRecargoStr] = useState(fmtNum(Math.abs(effectiveRecargo)));
  useEffect(() => {
    if (!recargoFocused.current) setRecargoStr(fmtNum(Math.abs(effectiveRecargo)));
  }, [effectiveRecargo]);
  const handleRecargoChange = (e) => {
    const digits = e.target.value.replace(/[^\d]/g, '');
    setRecargoStr(digits === '' ? '' : fmtNum(Number(digits)));
    if (digits === '' || !onRecargoOverrideChange) return;
    const magnitude = Number(digits);
    onRecargoOverrideChange(isDescuento ? -magnitude : magnitude);
  };
  const handleRecargoBlur = () => {
    recargoFocused.current = false;
    if (recargoStr === '') {
      setRecargoStr(fmtNum(Math.abs(financialSummary.saldoFinancieroFinal)));
      onRecargoOverrideChange?.(null);
    }
  };
  const colsTabla = ignorarRecargo ? 6 : 8;
  return (
    <div className={styles.root}>
      {warning && (
        <div className={styles.aviso} role="alert">
          <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>{warning}</span>
        </div>
      )}

      <section className={table.card}>
        <header className={table.head}>
          <h3 className={table.titulo}>
            Cronograma <span className={styles.conteo}>{modeledPlan.length} pagos · editar una cuota la fija; las libres se reparten el resto</span>
          </h3>
          <div className={styles.accionesCabecera}>
            <Button variant="secondary" onClick={() => setRangoAbierto((v) => !v)} aria-expanded={rangoAbierto}>
              Aplicar a un rango…
            </Button>
            <Button variant="secondary" onClick={liberarTodas}>
              Liberar todas
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                liberarTodas();
                onRestablecer?.();
              }}
            >
              Restablecer a estándar
            </Button>
          </div>
        </header>

        {/* Edición masiva: seleccionar por checkbox y/o por rango, luego fijar todas al mismo valor */}
        {(rangoAbierto || selectedQuotas.size > 0) && (
        <div className={styles.masiva}>
          <span className={styles.masivaTitulo}>Edición masiva:</span>
          <div className={styles.rango}>
            <span>Desde</span>
            <input
              type="number"
              value={rangoDesde}
              onChange={(e) => setRangoDesde(e.target.value)}
              placeholder="ej. 5"
              aria-label="Cuota inicial del rango"
              className={`${table.control} ${styles.numeroInput}`}
            />
            <span>hasta</span>
            <input
              type="number"
              value={rangoHasta}
              onChange={(e) => setRangoHasta(e.target.value)}
              placeholder="ej. 20"
              aria-label="Cuota final del rango"
              className={`${table.control} ${styles.numeroInput}`}
            />
            <button type="button" onClick={selectRange} className={styles.enlace}>
              Seleccionar rango
            </button>
          </div>
          <button type="button" onClick={toggleSelectAll} className={styles.enlace}>
            {allEligibleSelected ? 'Deseleccionar todas' : 'Seleccionar todas las libres'}
          </button>

          {selectedQuotas.size > 0 && (
            <div className={styles.seleccion}>
              <span className={styles.seleccionConteo}>{selectedQuotas.size} seleccionadas</span>
              <div className={styles.monto}>
                <span className={styles.montoPrefijo} aria-hidden="true">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={bulkValorStr}
                  onChange={handleBulkValorChange}
                  placeholder="Monto"
                  aria-label="Monto para las cuotas seleccionadas"
                  className={`${table.control} ${styles.montoInput}`}
                />
              </div>
              <Button onClick={applyBulkValue}>Aplicar</Button>
              <button type="button" onClick={releaseSelected} className={`${styles.enlace} ${styles.enlaceSutil}`} title="Volver estas cuotas a Libre">
                Liberar
              </button>
              <button
                type="button"
                onClick={() => setSelectedQuotas(new Set())}
                className={styles.enlace}
                title="Limpiar selección"
                aria-label="Limpiar selección"
              >
                <X size={14} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
        )}

        <div className={table.scroll}>
          <table className={table.tabla}>
            <thead>
              <tr>
                <th className={table.colCheck}>
                  <input
                    type="checkbox"
                    checked={allEligibleSelected}
                    onChange={toggleSelectAll}
                    title="Seleccionar todas las cuotas libres"
                    aria-label="Seleccionar todas las cuotas libres"
                    className={styles.checkbox}
                  />
                </th>
                <th className={`${table.numeroCol} ${table.centro}`}>#</th>
                <th>Concepto</th>
                <th>Plan estándar</th>
                <th>Plan modelado</th>
                {!ignorarRecargo && (
                  <>
                    <th>Interés (MV)</th>
                    <th>Dif. acumulada</th>
                  </>
                )}
                <th className={table.centro}>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {modeledPlan.map((entry, idx) => {
                if (!verTodas && idxColapsables.includes(idx)) {
                  return idx === primeraOculta ? (
                    <tr key="ver-mas">
                      <td colSpan={colsTabla} className={styles.verMasCelda}>
                        <button type="button" onClick={() => setVerTodas(true)} className={styles.enlace}>
                          Ver las {ocultas} cuotas restantes
                        </button>
                      </td>
                    </tr>
                  ) : null;
                }
                const isFirst = idx === 0;
                const isLast = idx === modeledPlan.length - 1;
                const isSubsidyRow = !!subsidioNombre && entry.numero === subsidioCuotaNumero;
                const isExtraordinaria = !!entry.esFechaExtraordinaria;
                // Find standard entry — matching solo por número mezclaría el saldo
                // final del estándar con una cuota normal cuando el plazo modelado
                // supera las cuotas estándar. La fila final siempre se compara contra
                // el saldo final real del estándar (última entrada), no por número.
                const standardEntry = isLast
                  ? standardPlan[standardPlan.length - 1]
                  : entry.numero <= standardCalc.cuotas
                    ? standardPlan.find((s) => s.numero === entry.numero)
                    : undefined;
                const standardValue = standardEntry ? standardEntry.valor : 0;
                const difAcumulada = entry.diferenciaAcumulada || 0;
                const interes = entry.interesGenerado || 0;
                const isDiferente = difAcumulada !== 0 && !isFirst && !isLast;
                const isSelectable = isEditableRow(idx, entry);
                const isSelected = isSelectable && selectedQuotas.has(entry.numero);
                const filaClase = isSelected
                  ? table.filaSeleccion
                  : isSubsidyRow || entry.isAbono
                    ? table.filaExito
                    : isExtraordinaria || isDiferente
                      ? table.filaInfo
                      : '';
                return (
                  <Fragment key={entry.numero}>
                    {idx === firstAbonoIdx && (
                      <tr className={table.filaSeccion}>
                        <td colSpan={colsTabla}>Abono adicional (al saldo {saldoPct}%)</td>
                      </tr>
                    )}
                    <tr className={filaClase}>
                      <td className={table.colCheck}>
                        {isSelectable && (
                          <input
                            type="checkbox"
                            checked={selectedQuotas.has(entry.numero)}
                            onChange={() => toggleSelected(entry.numero)}
                            aria-label={`Seleccionar cuota ${entry.numero}`}
                            className={styles.checkbox}
                          />
                        )}
                      </td>
                      <td className={`${table.centro} ${table.muted}`}>{isLast ? '—' : entry.numero}</td>
                      <td className={isFirst || isLast || isSubsidyRow ? '' : table.muted}>
                        {isSubsidyRow ? `Subsidio ${subsidioNombre}` : entry.concepto}
                        {!isSubsidyRow && isExtraordinaria ? (
                          <button
                            type="button"
                            onClick={() => onToggleFechaExtra?.(entry.numero)}
                            title="Quitar fecha extraordinaria"
                            className={table.chipExtra}
                          >
                            + {entry.conceptoExtraordinario} ({formatPrice(entry.montoExtraordinario || 0)})
                            <X size={12} strokeWidth={2} aria-hidden="true" />
                          </button>
                        ) : !isSubsidyRow && entry.fechaExtraTipoDisponible ? (
                          <button
                            type="button"
                            onClick={() => onToggleFechaExtra?.(entry.numero)}
                            title={`Asignar ${entry.fechaExtraTipoDisponible} a esta cuota`}
                            className={table.chipAgregar}
                          >
                            <Plus size={12} strokeWidth={2} aria-hidden="true" />
                            Agregar {entry.fechaExtraTipoDisponible}
                          </button>
                        ) : null}
                        {isFirst && onSeparacionFechaChange ? (
                          <div>
                            <input
                              type="date"
                              value={separacionFecha}
                              min={separacionFechaMin}
                              max={separacionFechaMax}
                              aria-label="Fecha de la separación"
                              onChange={(e) => onSeparacionFechaChange(e.target.value)}
                              className={table.control}
                            />
                          </div>
                        ) : (
                          <span className={table.fecha}>{entry.fecha_estimada}</span>
                        )}
                      </td>
                      <td className={table.muted}>{standardEntry ? formatPrice(standardValue) : '—'}</td>
                      <td>
                        {isFirst || isLast || isSubsidyRow ? (
                          <div className={styles.cuotaCelda}>
                            <strong className={isFirst ? table.primario : isSubsidyRow ? table.exito : table.advertencia}>{formatPrice(entry.valor)}</strong>
                            {/* El recargo/descuento financiero se cobra acá, en el saldo
                        contraentrega (las cuotas van limpias). */}
                            {isLast && ajusteAplicado !== 0 && entry.valor > 0 && (
                              <span className={`${styles.incluye} ${ajusteAplicado > 0 ? table.advertencia : table.exito}`}>
                                incluye {ajusteAplicado > 0 ? 'recargo +' : 'descuento −'}
                                {formatPrice(Math.abs(ajusteAplicado))}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className={styles.cuotaCelda}>
                            <div className={styles.cuotaCampo}>
                              <span className={styles.cuotaPrefijo} aria-hidden="true">
                                $
                              </span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={
                                  localQuotaStr[entry.numero] !== undefined
                                    ? localQuotaStr[entry.numero]
                                    : formatQuotaDisplay(fixedQuotas[entry.numero] !== undefined ? fixedQuotas[entry.numero] : entry.valor)
                                }
                                onChange={(e) => handleQuotaChange(entry.numero, e.target.value)}
                                onBlur={() => handleQuotaBlur(entry.numero)}
                                onFocus={(e) => e.target.select()}
                                aria-label={`Valor de la cuota ${entry.numero}`}
                                className={`${table.control} ${styles.cuotaInput} ${entry.isFixed ? styles.cuotaFija : ''}`}
                              />
                            </div>
                            {/* Sin saldo contraentrega (modo 100%) el recargo/descuento se
                        cobra dentro de las cuotas: se avisa cuánto lleva esta. */}
                            {entry.ajusteAlmar && entry.ajusteAlmar.monto !== 0 && (
                              <span className={`${styles.incluye} ${entry.ajusteAlmar.monto > 0 ? table.advertencia : table.exito}`}>
                                incluye {entry.ajusteAlmar.monto > 0 ? 'recargo +' : 'descuento −'}
                                {formatPrice(Math.abs(entry.ajusteAlmar.monto))}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      {!ignorarRecargo && (
                        <>
                          <td className={table.advertencia}>{interes !== 0 ? formatPrice(interes) : <span className={table.muted}>$0</span>}</td>
                          <td>
                            {difAcumulada !== 0 ? (
                              <span className={difAcumulada > 0 ? table.advertencia : table.primario}>
                                {difAcumulada > 0 ? '+' : ''}
                                {formatPrice(difAcumulada)}
                              </span>
                            ) : (
                              <span className={table.muted}>$0</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className={table.centro}>
                        {isSubsidyRow ? (
                          <Badge variant="success">Subsidio</Badge>
                        ) : isFirst ? (
                          <Badge variant="neutral">Editada</Badge>
                        ) : isLast ? (
                          <span className={table.muted}>—</span>
                        ) : entry.isAbono ? (
                          <button
                            type="button"
                            onClick={() => setFixedQuota(entry.numero, null)}
                            className={`${table.chipAccion} ${styles.chipAccionExito}`}
                            title="Quitar abono"
                          >
                            Abono
                            <X size={12} strokeWidth={2} aria-hidden="true" />
                          </button>
                        ) : entry.isFixed ? (
                          <button
                            type="button"
                            onClick={() => setFixedQuota(entry.numero, null)}
                            className={`${table.chipAccion} ${styles.chipAccionInfo}`}
                            title="Liberar cuota"
                          >
                            Fija
                            <X size={12} strokeWidth={2} aria-hidden="true" />
                          </button>
                        ) : (
                          <Badge variant="neutral">Libre</Badge>
                        )}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
              {verTodas && idxColapsables.length > 0 && (
                <tr key="ver-menos">
                  <td colSpan={colsTabla} className={styles.verMasCelda}>
                    <button type="button" onClick={() => setVerTodas(false)} className={styles.enlace}>
                      Ver menos
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className={table.derecha}>
                  Total proyecto:
                </td>
                <td className={table.primario}>{formatPrice(standardCalc.precio)}</td>
                <td className={table.primario}>{formatPrice(modeledCalc.precio)}</td>
                <td colSpan={ignorarRecargo ? 1 : 3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Resumen Financiero */}
      <div className={styles.resumenHead}>
        <h4 className={styles.resumenTitulo}>Resumen financiero</h4>
        <div className={styles.resumenAcciones}>
          {/* Admin-only: apaga el recargo/descuento por completo — el plan queda
            plano (sin interés ni diferencia acumulada), como si esos conceptos
            no existieran para esta cotización. Siempre visible (no depende de si
            hay o no un recargo/descuento activo ahora mismo), para poder
            prenderlo/apagarlo en cualquier momento. */}
          {onIgnorarRecargoChange && (
            <div className={styles.ajuste}>
              <span>Ignorar recargo/descuento</span>
              <Switch checked={ignorarRecargo} onChange={onIgnorarRecargoChange} label="Ignorar recargo/descuento" />
            </div>
          )}
          {!ignorarRecargo && (isRecargo || isDescuento) && onRecargoOverrideChange && (
            <div className={`${styles.ajuste} ${styles.ajusteAdvertencia}`}>
              <span>{isRecargo ? 'Recargo a cobrar' : 'Descuento a aplicar'}</span>
              <div className={styles.monto}>
                <span className={styles.montoPrefijo} aria-hidden="true">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={recargoStr}
                  onChange={handleRecargoChange}
                  onFocus={(e) => {
                    recargoFocused.current = true;
                    e.target.select();
                  }}
                  onBlur={handleRecargoBlur}
                  aria-label={isRecargo ? 'Recargo a cobrar' : 'Descuento a aplicar'}
                  className={`${table.control} ${styles.montoInput}`}
                />
              </div>
              {isOverridden && (
                <button
                  type="button"
                  onClick={() => onRecargoOverrideChange(null)}
                  className={`${styles.enlace} ${styles.enlaceSutil}`}
                  title="Volver al valor calculado"
                >
                  Restablecer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <dl className={styles.kpis}>
        <div className={styles.kpi}>
          <dt>Capital prestado inicial</dt>
          <dd>{formatPrice(financialSummary.capitalPrestadoInicial)}</dd>
          <span className={styles.kpiNota}>Diferencia en separación</span>
        </div>
        <div className={styles.kpi}>
          <dt>Saldo financiero final</dt>
          <dd className={isRecargo && !isOverridden ? table.advertencia : isDescuento ? table.primario : ''}>
            {isOverridden ? (
              <>
                <span className={styles.tachado}>{formatPrice(financialSummary.saldoFinancieroFinal)}</span>
                <span className={effectiveRecargo === 0 ? table.exito : table.advertencia}>{formatPrice(effectiveRecargo)}</span>
              </>
            ) : (
              formatPrice(financialSummary.saldoFinancieroFinal)
            )}
          </dd>
          <span className={styles.kpiNota}>Al finalizar entregas</span>
        </div>
        <div className={styles.kpi}>
          <dt>Resultado financiero</dt>
          <dd className={styles.resultado}>
            {isOverridden && effectiveRecargo === 0 ? (
              <Badge variant="success">{isRecargo ? 'Sin recargo' : 'Sin descuento'}</Badge>
            ) : isRecargo ? (
              <Badge variant="warning">Recargo para cliente</Badge>
            ) : isDescuento ? (
              <Badge variant="success">Descuento financiero</Badge>
            ) : (
              <Badge variant="neutral">Neutro</Badge>
            )}
            {effectiveRecargo !== 0 && <span className={styles.resultadoMonto}>{formatPrice(Math.abs(effectiveRecargo))}</span>}
          </dd>
        </div>
        <div className={styles.kpi}>
          <dt>Tasa aplicada (MV)</dt>
          <dd className={table.primario}>{financialSummary.tasaAplicada.toFixed(2)}%</dd>
          <span className={styles.kpiNota}>Tasa Fiduciaria E.M.</span>
        </div>
      </dl>
    </div>
  );
}
