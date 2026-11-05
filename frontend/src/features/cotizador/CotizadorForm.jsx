import { useState, useCallback, useEffect, useRef } from 'react';
import { format, endOfMonth } from 'date-fns';
import { useFinancialCalc } from '../../hooks/useFinancialCalc.js';
import { usePaymentPlan } from '../../hooks/usePaymentPlan.js';
import { nthPaymentDate } from '../../utils/planFinanciero.js';
import { useAppConfig } from '../../context/AppConfigContext.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { pdf } from '@react-pdf/renderer';
import QuotePDF from './pdf/QuotePDF.jsx';
import QuotePDFAlmar from './pdf/QuotePDFAlmar.jsx';
import QuotePDFAlegra from './pdf/QuotePDFAlegra.jsx';
import { associateUnitToDeal, associateParkingToDeal, saveQuoteWithPDF, fetchUnitTower, fetchAccessories } from '../../api/cotizador.js';
import EnhancedUnitSelector from './EnhancedUnitSelector.jsx';
import AccesoriosSection from './AccesoriosSection.jsx';
import CotizacionesPrevias from './CotizacionesPrevias.jsx';
import PropertyDisplay from './PropertyDisplay.jsx';
import FinancialCalculator from './FinancialCalculator.jsx';
import PlanEstandarCompacto from './PlanEstandarCompacto.jsx';
import { useCurrency } from '../../context/CurrencyContext.jsx';
import ModeledPlanTable from './ModeledPlanTable.jsx';
import DealInfo from './DealInfo.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CircleAlert, CircleCheck, Eye, TriangleAlert } from 'lucide-react';
import styles from './CotizadorForm.module.css';
import { useModeledPlan } from '../../hooks/useModeledPlan.js';
// ─── Main Component ────────────────────────────────────────────────────────
// El selector de moneda (CurrencyProvider + el toggle COP/USD con banderas) vive
// en CotizadorPage.tsx, junto al botón "Cambiar negocio" — antes estaba acá
// arriba de la columna izquierda, ocupando una línea propia casi sin uso real.
export default function CotizadorForm({ dealId, deal, dealLoading, associatedUnits, availableUnits, availableLoading, onRefreshAvailable }) {
  const { config, role, setActiveProject } = useAppConfig();
  const { usuario: user } = useAuth();
  const { formatPrice } = useCurrency();
  // Financial config follows the open deal's own project (Oliv/Matimba/Alegra/Almar)
  useEffect(() => {
    if (deal?.proyecto_inmobiliario_cac) setActiveProject(deal.proyecto_inmobiliario_cac);
  }, [deal?.proyecto_inmobiliario_cac, setActiveProject]);
  // ─── State ───
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [needsAssociation, setNeedsAssociation] = useState(false);
  const [towerObjectId, setTowerObjectId] = useState(null);
  const [towerName, setTowerName] = useState(null);
  const [parkingOptions, setParkingOptions] = useState([]);
  const [parkingLoading, setParkingLoading] = useState(false);
  const [selectedParking, setSelectedParking] = useState(null);
  const [depositoOptions, setDepositoOptions] = useState([]);
  const [selectedDeposito, setSelectedDeposito] = useState(null);
  const [cuartoUtilOptions, setCuartoUtilOptions] = useState([]);
  const [selectedCuartoUtil, setSelectedCuartoUtil] = useState(null);
  // El asesor confirmo explicitamente que esta cotizacion va sin accesorios.
  const [sinAccesorios, setSinAccesorios] = useState(false);
  const [accesoriosAviso, setAccesoriosAviso] = useState(null);
  // Cotizacion previa a re-cotizar: sus accesorios se aplican cuando terminan de cargar los de la torre.
  const recotizarPendienteRef = useRef(null);
  const [recotizandoId, setRecotizandoId] = useState(null);
  const [quoteType, setQuoteType] = useState('estandar');
  const [bonoAplicado, setBonoAplicado] = useState(0);
  const [subsidioId, setSubsidioId] = useState('');
  const [adicionalesIds, setAdicionalesIds] = useState([]);
  // Recargo/descuento financiero ajustado manualmente (admin) para esta cotización.
  // `null` = usa el valor calculado por el motor sin modificar.
  const [recargoOverride, setRecargoOverride] = useState(null);
  // Admin: apaga el recargo/descuento por completo — el plan queda plano, como si ese
  // concepto no existiera para esta cotización (ver useModeledPlan.ts).
  const [ignorarRecargo, setIgnorarRecargo] = useState(false);
  // Ajuste puntual (admin) del % de cuota inicial para esta cotización — no toca la
  // configuración del proyecto. null = usa el % configurado por defecto.
  const [cuotaInicialPctOverride, setCuotaInicialPctOverride] = useState(null);
  // Cuotas de fechas extraordinarias asignadas manualmente por el asesor, clave `${planKey}:${numero}`
  const [fechasExtraToggled, setFechasExtraToggled] = useState(new Set());
  const toggleFechaExtra = useCallback((planKey, numero) => {
    const key = `${planKey}:${numero}`;
    setFechasExtraToggled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  // Fecha de pago de la Separación — editable dentro del mes actual (hoy..fin de mes),
  // el resto del plan (cuotas, saldo) siempre cae fin de cada mes siguiente, sin cambios.
  const [separacionFecha, setSeparacionFecha] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const separacionFechaMin = format(new Date(), 'yyyy-MM-dd');
  const separacionFechaMax = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const separacionFechaDate = new Date(separacionFecha + 'T00:00:00');
  // Modelador State
  const [separacionModelada, setSeparacionModelada] = useState(0);
  // true cuando el usuario fijó manualmente una separación mayor al mínimo configurado
  const separacionManualRef = useRef(false);
  const [cuotasModeladas, setCuotasModeladas] = useState(0);
  const [abonoActivo, setAbonoActivo] = useState(false);
  const [modo100, setModo100] = useState(false);
  const [paso, setPaso] = useState(0);
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);
  // ─── Derived ───
  const allUnits = [...associatedUnits, ...availableUnits];
  const selectedUnit = allUnits.find((u) => u.id === selectedUnitId) ?? null;
  // Descuento especial: applies only to valor_unidad_comercial
  const descuentoTipo = deal?.descuento_especial;
  const descuentoConfig = descuentoTipo ? (config.descuentosPorTipo?.[descuentoTipo] ?? null) : null;
  const descuentoPct = descuentoConfig?.porcentaje ?? 0;
  const descuentoModo = descuentoConfig?.modo ?? 'porcentaje';
  const unitBasePrice = selectedUnit?.valor_unidad_comercial ?? 0;
  const parkingPrice = selectedParking?.price ?? 0;
  const depositoPrice = selectedDeposito?.price ?? 0;
  const cuartoUtilPrice = selectedCuartoUtil?.price ?? 0;
  const unitDescuento = descuentoModo === 'montoFijo' ? Math.min(descuentoPct, unitBasePrice) : Math.round((unitBasePrice * descuentoPct) / 100);
  const parkingDescuento = descuentoConfig?.incluyeParqueadero
    ? descuentoModo === 'montoFijo'
      ? Math.min(descuentoPct, parkingPrice)
      : Math.round((parkingPrice * descuentoPct) / 100)
    : 0;
  const depositoDescuento = descuentoConfig?.incluyeParqueadero
    ? descuentoModo === 'montoFijo'
      ? Math.min(descuentoPct, depositoPrice)
      : Math.round((depositoPrice * descuentoPct) / 100)
    : 0;
  const cuartoUtilDescuento = descuentoConfig?.incluyeParqueadero
    ? descuentoModo === 'montoFijo'
      ? Math.min(descuentoPct, cuartoUtilPrice)
      : Math.round((cuartoUtilPrice * descuentoPct) / 100)
    : 0;
  const descuentoMonto = unitDescuento + parkingDescuento + depositoDescuento + cuartoUtilDescuento;
  const precio =
    unitBasePrice - unitDescuento + (parkingPrice - parkingDescuento) + (depositoPrice - depositoDescuento) + (cuartoUtilPrice - cuartoUtilDescuento);
  const bonoMax = selectedUnit?.bono || 0;
  // Adicionales (ej. Acabados, Aire Acondicionado) — monto fijo que se SUMA al precio.
  // A diferencia del bono/descuento, se pueden elegir varios a la vez.
  const adicionalesSeleccionados = config.adicionalesEnabled ? (config.adicionales ?? []).filter((a) => adicionalesIds.includes(a.id)) : [];
  const adicionalesTotal = adicionalesSeleccionados.reduce((s, a) => s + a.monto, 0);
  const adicionalesAplicadosProp =
    adicionalesSeleccionados.length > 0 ? adicionalesSeleccionados.map((a) => ({ nombre: a.nombre, monto: a.monto })) : undefined;
  const precioConDescuento = Math.max(0, precio - bonoAplicado + adicionalesTotal);
  // Subsidio (ej. Mi Casa Ya) — monto fijo aplicado a cuota inicial o saldo, según config.
  // "Saldo": se resta directo (pago único al final, no requiere redistribuir nada más).
  // "Cuota Inicial": el subsidio se agrega como una cuota ADICIONAL (N+1) al final de las
  // N cuotas configuradas — no reemplaza ninguna cuota existente. Las N cuotas originales
  // se recalculan repartiendo entre ellas (montoCuotasIniciales − subsidio) / N.
  //
  // El o los subsidios elegibles se calculan según los ingresos mensuales del contacto
  // asociado al negocio, expresados en múltiplos de SMLV. Si hay un solo elegible se aplica
  // automáticamente; si hay varios (rangos de distintos programas que se solapan), no se
  // elige ninguno solo — el asesor decide cuál de los elegibles aplicar desde el selector
  // (que solo lista esos, no todos los subsidios configurados). El asesor también puede
  // quitarlo para comparar cotizaciones con/sin subsidio; una vez ajusta algo a mano, ese
  // ajuste se respeta y deja de recalcularse automáticamente hasta que cambie de unidad.
  const contactIngresosMensuales = deal?.contact_ingresos_mensuales;
  const contactSmlvMultiple = config.smlv > 0 && contactIngresosMensuales ? contactIngresosMensuales / config.smlv : null;
  const subsidiosElegibles =
    config.subsidiosEnabled && contactSmlvMultiple != null
      ? (config.subsidios ?? []).filter((s) => contactSmlvMultiple >= s.smlvMin && contactSmlvMultiple <= s.smlvMax)
      : [];
  // Solo se auto-aplica cuando la elegibilidad no es ambigua (exactamente un elegible).
  const subsidioAutoId = subsidiosElegibles.length === 1 ? subsidiosElegibles[0].id : undefined;
  const subsidioManualOverrideRef = useRef(false);
  const handleSubsidioChange = useCallback((id) => {
    subsidioManualOverrideRef.current = true;
    setSubsidioId(id);
  }, []);
  // Al cambiar de unidad se libera el ajuste manual previo (declarado ANTES del efecto de
  // abajo para que corra primero en el mismo commit y el auto-match no lo lea desactualizado).
  useEffect(() => {
    if (selectedUnit) subsidioManualOverrideRef.current = false;
  }, [selectedUnit]);
  // Aplica el subsidio sugerido automáticamente mientras el asesor no lo haya ajustado
  // a mano para este negocio/unidad. También depende de selectedUnit para re-evaluarse
  // justo después del reset de arriba, aunque el subsidio elegible en sí no cambie.
  useEffect(() => {
    if (subsidioManualOverrideRef.current) return;
    setSubsidioId(subsidioAutoId ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subsidioAutoId, selectedUnit]);
  const subsidioSeleccionado = config.subsidiosEnabled && subsidioId ? (config.subsidios?.find((s) => s.id === subsidioId) ?? null) : null;
  const subsidioMonto = subsidioSeleccionado?.monto ?? 0;
  const subsidioAplicaCuotaInicial = subsidioSeleccionado?.aplicaA === 'cuotaInicial' && subsidioMonto > 0;
  const subsidioAplicaSaldo = subsidioSeleccionado?.aplicaA === 'saldo' && subsidioMonto > 0;
  function applySubsidioSaldo(calc) {
    if (!subsidioAplicaSaldo) return calc;
    return { ...calc, saldo: Math.max(0, calc.saldo - subsidioMonto) };
  }
  // Recalcula valorCuotaMensual para que las N cuotas originales repartan lo que queda
  // de montoCuotasIniciales una vez separado el monto que cubre la cuota (N+1) del subsidio.
  function withCuotaInicialSubsidyRegularValue(calc) {
    if (!subsidioAplicaCuotaInicial || calc.cuotas <= 0) return calc;
    const valorCuotaMensual = Math.round(Math.max(0, calc.montoCuotasIniciales - subsidioMonto) / calc.cuotas);
    return { ...calc, valorCuotaMensual };
  }
  // Inserta el subsidio como una cuota adicional numero = baseCuotas + 1 (justo después de la
  // última cuota "N"), recorriendo un mes hacia adelante todo lo que venía después (Saldo Final,
  // y eventuales meses de abono en el Modelador).
  function insertSubsidyCuota(planArr, baseCuotas, monto, nombre) {
    const idx = planArr.findIndex((e) => e.numero === baseCuotas);
    if (idx === -1) return planArr;
    const today = new Date();
    const subsidyEntry = {
      ...planArr[idx],
      numero: baseCuotas + 1,
      concepto: `Subsidio ${nombre}`,
      valor: monto,
      fecha_estimada: format(nthPaymentDate(today, baseCuotas + 1), 'yyyy-MM-dd'),
      isFixed: true,
      interesGenerado: 0,
    };
    return [
      ...planArr.slice(0, idx + 1),
      subsidyEntry,
      ...planArr.slice(idx + 1).map((e) => ({
        ...e,
        numero: e.numero + 1,
        fecha_estimada: format(nthPaymentDate(today, e.numero + 1), 'yyyy-MM-dd'),
      })),
    ];
  }
  // Fechas extraordinarias (cesantías en marzo, primas en junio/diciembre): NO se agregan
  // automáticamente — el asesor asigna manualmente, cuota por cuota, cuál lleva el abono
  // (botón que solo aparece en meses 3/6/12). Este primer paso solo ANOTA qué cuotas SON
  // elegibles y cuánto sumarían, sin tocar `valor` todavía. No toca Separación, Saldo Final
  // ni filas de abono del Modelador. Se aplica ANTES de insertar la cuota del subsidio, para
  // que esa fila (que no representa un mes de sueldo real) nunca quede marcada como elegible.
  function annotateFechaExtraDisponible(planArr, salario) {
    if (!config.fechasExtraordinariasEnabled || !salario || salario <= 0 || planArr.length < 2) return planArr;
    const lastIdx = planArr.length - 1;
    return planArr.map((entry, idx) => {
      if (idx === 0 || idx === lastIdx) return entry; // Separación / Saldo Final
      if (entry.isAbono) return entry;
      const mes = Number(entry.fecha_estimada.slice(5, 7));
      let pct = 0;
      let tipo = null;
      if (mes === 3) {
        pct = 0.5;
        tipo = 'Cesantías';
      } else if (mes === 6 || mes === 12) {
        pct = 0.25;
        tipo = 'Prima';
      }
      if (!tipo) return entry;
      return {
        ...entry,
        fechaExtraTipoDisponible: tipo,
        fechaExtraMontoDisponible: Math.round(salario * pct),
      };
    });
  }
  // Segundo paso: aplica el abono SOLO en las cuotas que el asesor marcó manualmente
  // (fechasExtraToggled), usando el tipo/monto ya calculado arriba. El total de cuota
  // inicial (`poolTotal`) NO cambia: la cuota con abono queda en su valor normal + el
  // abono, y las demás cuotas "libres" (ni fijadas por el asesor, ni de abono al saldo)
  // se recalculan para que la suma total siga dando `poolTotal`, igual que antes de
  // agregar el abono — así las cuotas restantes bajan en vez de quedar sin cambios.
  function applyFechaExtraToggle(planArr, planKey, poolTotal, maxCuotaNumero) {
    if (planArr.length < 3) return planArr;
    const lastIdx = planArr.length - 1;
    const isPoolRow = (entry, idx) => idx > 0 && idx < lastIdx && !entry.isAbono && entry.numero <= maxCuotaNumero;
    const isToggled = (entry) => {
      const key = `${planKey}:${entry.numero}`;
      return fechasExtraToggled.has(key) && !!entry.fechaExtraTipoDisponible;
    };
    let toggledSum = 0;
    let fixedSum = 0;
    let freeCount = 0;
    let hasToggled = false;
    planArr.forEach((entry, idx) => {
      if (!isPoolRow(entry, idx)) return;
      if (isToggled(entry)) {
        hasToggled = true;
        toggledSum += entry.valor + (entry.fechaExtraMontoDisponible || 0);
      } else if (entry.isFixed) {
        fixedSum += entry.valor;
      } else {
        freeCount++;
      }
    });
    if (!hasToggled) return planArr;
    const freeValue = freeCount > 0 ? Math.round((poolTotal - toggledSum - fixedSum) / freeCount) : 0;
    return planArr.map((entry, idx) => {
      if (!isPoolRow(entry, idx)) return entry;
      if (isToggled(entry)) {
        const monto = entry.fechaExtraMontoDisponible || 0;
        return {
          ...entry,
          valor: entry.valor + monto,
          esFechaExtraordinaria: true,
          conceptoExtraordinario: entry.fechaExtraTipoDisponible,
          montoExtraordinario: monto,
        };
      }
      if (entry.isFixed) return entry; // fijada manualmente por el asesor, no se toca
      return { ...entry, valor: freeValue };
    });
  }
  // Standard Calculation
  const standardCalcBase = useFinancialCalc(precioConDescuento, config.cuotasEstandar, config, cuotaInicialPctOverride);
  const standardCalc = withCuotaInicialSubsidyRegularValue(applySubsidioSaldo(standardCalcBase));
  // Edición manual de la separación: se marca como "manual" solo si supera el mínimo configurado
  const handleSeparacionChange = (value) => {
    setSeparacionModelada(value);
    separacionManualRef.current = value > standardCalc.separacion;
  };
  // Modo 100% y Abono son mutuamente excluyentes
  const handleModo100Change = (v) => {
    setModo100(v);
    if (v) setAbonoActivo(false);
  };
  // "Restablecer a estándar" del Modelador: separación, plazo, modo y abono vuelven a lo del plan estándar.
  const restablecerModelado = () => {
    separacionManualRef.current = false;
    setSeparacionModelada(standardCalc.separacion);
    setCuotasModeladas(config.cuotasEstandar);
    setAbonoActivo(false);
    setModo100(false);
  };
  // Modeled Calculation logic
  // En modo 100% las cuotas cubren el precio completo (no solo la cuota inicial) y el saldo es 0.
  const cuotaInicialPct = (cuotaInicialPctOverride ?? config.cuotaInicialPct ?? 30) / 100;
  const baseCuotaInicial = modo100 ? precioConDescuento : precioConDescuento * cuotaInicialPct;
  const modeledMontoCuotasIniciales = Math.max(0, baseCuotaInicial - separacionModelada);
  const modeledCuotaMensual =
    subsidioAplicaCuotaInicial && cuotasModeladas > 0
      ? Math.round(Math.max(0, modeledMontoCuotasIniciales - subsidioMonto) / cuotasModeladas)
      : cuotasModeladas > 0
        ? modeledMontoCuotasIniciales / cuotasModeladas
        : 0;
  const modeledSaldo = modo100 ? 0 : precioConDescuento * (1 - cuotaInicialPct);
  // montoCuotasIniciales se mantiene íntegro para mostrar en pantalla (el subsidio es un
  // aporte adicional, no reduce el total requerido de cuota inicial).
  const modeledCalc = applySubsidioSaldo({
    precio: precioConDescuento,
    cuotas: cuotasModeladas,
    separacion: separacionModelada,
    montoCuotasIniciales: modeledMontoCuotasIniciales,
    valorCuotaMensual: modeledCuotaMensual,
    saldo: modeledSaldo,
  });
  // Copia con montoCuotasIniciales reducido, usada SOLO para alimentar el reparto de cuotas
  // libres de useModeledPlan (así las cuotas libres dividen (monto − subsidio) / cuotas activas).
  const modeledCalcForEngine = subsidioAplicaCuotaInicial
    ? { ...modeledCalc, montoCuotasIniciales: Math.max(0, modeledCalc.montoCuotasIniciales - subsidioMonto) }
    : modeledCalc;
  const standardPlanBase = usePaymentPlan(standardCalc, separacionFechaDate);
  const standardPlanAnnotated = annotateFechaExtraDisponible(standardPlanBase, contactIngresosMensuales ?? 0);
  const standardPlanWithFechas = applyFechaExtraToggle(standardPlanAnnotated, 'estandar', standardCalc.montoCuotasIniciales, standardCalc.cuotas);
  // El subsidio se agrega como cuota adicional (cuotas + 1), después de la última cuota "N".
  const standardPlan =
    subsidioAplicaCuotaInicial && standardCalc.cuotas > 0
      ? insertSubsidyCuota(standardPlanWithFechas, standardCalc.cuotas, subsidioMonto, subsidioSeleccionado.nombre)
      : standardPlanWithFechas;
  const modeledPlanData = useModeledPlan(
    standardCalc,
    modeledCalcForEngine,
    config,
    cuotasModeladas,
    abonoActivo,
    separacionFechaDate,
    recargoOverride,
    ignorarRecargo
  );
  const modeledPlanAnnotated = annotateFechaExtraDisponible(modeledPlanData.modeledPlan, contactIngresosMensuales ?? 0);
  // Sin saldo contraentrega (modo 100%) el recargo/descuento va dentro de las cuotas, así
  // que el total que se reparte entre las cuotas libres al asignar una fecha extraordinaria
  // debe incluirlo — si no, esa redistribución lo borraría del plan.
  const modeledPlanWithFechas = applyFechaExtraToggle(
    modeledPlanAnnotated,
    'modelador',
    modeledCalcForEngine.montoCuotasIniciales + modeledPlanData.ajusteEnCuotas,
    cuotasModeladas
  );
  const modeledPlanFinal =
    subsidioAplicaCuotaInicial && cuotasModeladas > 0
      ? insertSubsidyCuota(modeledPlanWithFechas, cuotasModeladas, subsidioMonto, subsidioSeleccionado.nombre)
      : modeledPlanWithFechas;
  // Saldo contra entrega mostrado = saldo modelado − abonos (los abonos lo reducen)
  const saldoMostrado = modeledCalc.saldo - (abonoActivo ? modeledPlanData.abonoTotal : 0);
  // Current Active Config
  const currentCalc = quoteType === 'estandar' ? standardCalc : { ...modeledCalc, saldo: saldoMostrado };
  const currentCuotas = quoteType === 'estandar' ? config.cuotasEstandar : cuotasModeladas;
  const currentSeparacion = quoteType === 'estandar' ? standardCalc.separacion : separacionModelada;
  const activePaymentPlan = quoteType === 'estandar' ? standardPlan : modeledPlanFinal;
  // ─── Effects ───
  // When unit changes, reset state
  useEffect(() => {
    if (selectedUnit) {
      setQuoteType('estandar');
      setBonoAplicado(0);
      setAdicionalesIds([]);
      setFechasExtraToggled(new Set());
      setSubmitStatus('idle');
      setErrorMessage('');
      setAssociationWarning(null);
      setGeneratedPdfBlob(null);
    }
  }, [selectedUnit]);
  // Fetch associated torre name from HubSpot when unit changes
  useEffect(() => {
    if (!selectedUnitId) {
      setTowerName(null);
      return;
    }
    fetchUnitTower(selectedUnitId)
      .then((tower) => {
        if (tower?.name) setTowerName(tower.name);
      })
      .catch(() => {});
  }, [selectedUnitId]);
  // Fetch parking spots when tower is known. dealId is passed so parking already
  // reserved for THIS deal on a previous quote still shows up even if marked 'Separado'.
  // Seleccion vigente de accesorios, para que el efecto de carga la lea sin depender de ella.
  const seleccionRef = useRef({});
  seleccionRef.current = { parking: selectedParking, deposito: selectedDeposito, cuartoUtil: selectedCuartoUtil };
  // Deja elegidos los accesorios de una cotizacion previa (los que sigan disponibles) y copia su decision.
  const aplicarAccesoriosDe = useCallback((q, opciones, avisoExtra = '') => {
    const buscar = (lista, id) => (id ? (lista.find((o) => o.id === id) ?? null) : null);
    const parking = buscar(opciones.parking, q.parking_id);
    const deposito = buscar(opciones.depositos, q.deposito_id);
    const cuartoUtil = buscar(opciones.cuartosUtiles, q.cuarto_util_id);
    setSelectedParking(parking);
    setSelectedDeposito(deposito);
    setSelectedCuartoUtil(cuartoUtil);
    const tuvo = [q.parking_id, q.deposito_id, q.cuarto_util_id].filter(Boolean).length;
    const quedaron = [parking, deposito, cuartoUtil].filter(Boolean).length;
    setSinAccesorios(tuvo === 0);
    const faltante = quedaron < tuvo ? 'Algún accesorio de esa cotización ya no está disponible y no se cargó.' : '';
    setAccesoriosAviso([avisoExtra, faltante].filter(Boolean).join(' ') || null);
  }, []);
  useEffect(() => {
    if (!towerObjectId) {
      setParkingOptions([]);
      setDepositoOptions([]);
      setCuartoUtilOptions([]);
      setSelectedParking(null);
      setSelectedDeposito(null);
      setSelectedCuartoUtil(null);
      return;
    }
    setParkingLoading(true);
    fetchAccessories(towerObjectId, dealId)
      .then((data) => {
        const opciones = { parking: data.parking || [], depositos: data.depositos || [], cuartosUtiles: data.cuartosUtiles || [] };
        setParkingOptions(opciones.parking);
        setDepositoOptions(opciones.depositos);
        setCuartoUtilOptions(opciones.cuartosUtiles);
        const previa = recotizarPendienteRef.current;
        recotizarPendienteRef.current = null;
        if (previa) {
          aplicarAccesoriosDe(previa.q, opciones, previa.avisoExtra);
          return;
        }
        // Al cambiar de apto se conservan los accesorios que tambien se ofrecen en esta torre; los demas se quitan y se avisa.
        const actual = seleccionRef.current;
        const conservar = (lista, sel) => (sel ? (lista.find((o) => o.id === sel.id) ?? null) : null);
        const parking = conservar(opciones.parking, actual.parking);
        const deposito = conservar(opciones.depositos, actual.deposito);
        const cuartoUtil = conservar(opciones.cuartosUtiles, actual.cuartoUtil);
        setSelectedParking(parking);
        setSelectedDeposito(deposito);
        setSelectedCuartoUtil(cuartoUtil);
        const antes = [actual.parking, actual.deposito, actual.cuartoUtil].filter(Boolean).length;
        const ahora = [parking, deposito, cuartoUtil].filter(Boolean).length;
        setAccesoriosAviso(ahora < antes ? 'Se quitaron accesorios que no se ofrecen en la torre de este inmueble.' : null);
      })
      .catch((err) => console.error('Error fetching parking:', err))
      .finally(() => setParkingLoading(false));
  }, [towerObjectId, dealId, aplicarAccesoriosDe]);
  // La separación auto-sigue el mínimo configurado (AppConfig.separacionModo/Pct/minSeparation)
  // cuando el precio cambia (bono, parqueadero, descuento). Si el usuario fijó un valor mayor,
  // se respeta (solo sube si el nuevo mínimo lo supera).
  useEffect(() => {
    const onePct = standardCalc.separacion;
    if (onePct <= 0) return;
    setSeparacionModelada((prev) => (separacionManualRef.current ? Math.max(prev, onePct) : onePct));
  }, [standardCalc.separacion]);
  // Default del plazo (cuotas) del Modelador — `activeProject` arranca en 'Oliv' (default
  // fijo de AppConfigContext) hasta que el negocio real termina de cargar y lo corrige, así
  // que la PRIMERA vez que corre este efecto puede estar viendo el `cuotasEstandar` del
  // proyecto equivocado. `cuotasEstandarAutoRef` recuerda qué valor se puso automáticamente
  // la última vez, para poder reemplazarlo cuando `config.cuotasEstandar` cambie de verdad
  // (el proyecto activo se corrigió) — pero sin pisar un plazo que el asesor ya haya editado
  // a mano (si `cuotasModeladas` ya no coincide con lo último que este efecto puso, se asume
  // que es una edición manual y se deja intacto).
  const cuotasEstandarAutoRef = useRef(null);
  useEffect(() => {
    if (config.cuotasEstandar > 0 && (cuotasModeladas === 0 || cuotasModeladas === cuotasEstandarAutoRef.current)) {
      setCuotasModeladas(config.cuotasEstandar);
      cuotasEstandarAutoRef.current = config.cuotasEstandar;
    }
  }, [config.cuotasEstandar]);
  // Resetear el ajuste manual del recargo/descuento si los cambios en el plan lo eliminan (queda en 0)
  useEffect(() => {
    if (recargoOverride !== null && modeledPlanData.financialSummary.saldoFinancieroFinal === 0) {
      setRecargoOverride(null);
    }
  }, [recargoOverride, modeledPlanData.financialSummary.saldoFinancieroFinal]);
  // ─── Handlers ───
  const handleUnitChange = useCallback((unitId, isExternal, towerId) => {
    setSelectedUnitId(unitId || null);
    setNeedsAssociation(isExternal);
    setTowerObjectId(towerId);
    setTowerName(null);
  }, []);
  const [associationWarning, setAssociationWarning] = useState(null);
  // Elegir un accesorio es una decision; quitar el ultimo vuelve la seccion a "pendiente".
  const handleSeleccionAccesorio = useCallback((tipo, valor) => {
    if (tipo === 'parking') setSelectedParking(valor);
    else if (tipo === 'deposito') setSelectedDeposito(valor);
    else setSelectedCuartoUtil(valor);
    if (valor) setSinAccesorios(false);
    setAccesoriosAviso(null);
  }, []);
  const handleSinAccesorios = useCallback((valor) => {
    if (valor) {
      setSelectedParking(null);
      setSelectedDeposito(null);
      setSelectedCuartoUtil(null);
    }
    setSinAccesorios(valor);
    setAccesoriosAviso(null);
  }, []);
  // Recotizar: vuelve a cargar el inmueble y los accesorios de una cotizacion previa de este negocio.
  const handleRecotizar = useCallback(
    async (q) => {
      const unidad = allUnits.find((u) => u.id === q.unit_id);
      if (!unidad) {
        setAccesoriosAviso('Ese inmueble ya no está disponible para cotizar.');
        return;
      }
      setRecotizandoId(q.id);
      try {
        const tower = await fetchUnitTower(q.unit_id).catch(() => null);
        const torreId = tower?.id ?? null;
        const anterior = Number(q.snapshot_json?.unit?.valor_unidad_comercial);
        const avisoExtra =
          anterior > 0 && Math.round(anterior) !== Math.round(unidad.valor_unidad_comercial)
            ? 'El precio del inmueble cambió desde esa cotización: se usa el precio actual.'
            : '';
        setSelectedUnitId(unidad.id);
        setNeedsAssociation(!associatedUnits.some((u) => u.id === unidad.id));
        setTowerName(null);
        setTowerObjectId(torreId);
        if (torreId && torreId === towerObjectId) {
          // Misma torre: las opciones ya estan cargadas, no hay nueva carga que espere.
          aplicarAccesoriosDe(q, { parking: parkingOptions, depositos: depositoOptions, cuartosUtiles: cuartoUtilOptions }, avisoExtra);
        } else if (torreId) {
          recotizarPendienteRef.current = { q, avisoExtra };
        } else {
          recotizarPendienteRef.current = null;
          setAccesoriosAviso(avisoExtra || null);
        }
      } finally {
        setRecotizandoId(null);
      }
    },
    [allUnits, associatedUnits, towerObjectId, parkingOptions, depositoOptions, cuartoUtilOptions, aplicarAccesoriosDe]
  );
  const handleSubmit = useCallback(
    async (skipDealStage = false) => {
      if (!selectedUnit || !deal || precio <= 0) return;
      setSubmitStatus('loading');
      setErrorMessage('');
      setAssociationWarning(null);
      setGeneratedPdfBlob(null);
      try {
        // Try to associate the unit if it came from the available tab.
        // Failure here is non-fatal — we still save the quote.
        if (needsAssociation) {
          try {
            await associateUnitToDeal(dealId, selectedUnit.id);
          } catch (assocErr) {
            const detail =
              assocErr?.details?.hubspot?.message || (assocErr instanceof Error ? assocErr.message : null);
            setAssociationWarning(
              detail
                ? `No se pudo asociar el inmueble al negocio: ${detail}`
                : 'No se pudo asociar el inmueble al negocio en HubSpot. La cotización se guardará de todas formas.'
            );
            console.error('Association failed:', assocErr);
          }
        }
        // Associate the selected parking spot to the deal (idempotent — safe to call
        // every time). Without this, a parking reserved on a previous quote for this
        // same deal has no HubSpot record tying it to the deal, so it disappears from
        // the picker as soon as it's marked 'Separado'. Failure here is non-fatal too.
        if (selectedParking) {
          try {
            await associateParkingToDeal(dealId, selectedParking.id);
          } catch (assocErr) {
            console.error('Parking association failed:', assocErr);
          }
        }
        if (selectedDeposito) {
          try {
            await associateParkingToDeal(dealId, selectedDeposito.id);
          } catch (assocErr) {
            console.error('Depósito association failed:', assocErr);
          }
        }
        if (selectedCuartoUtil) {
          try {
            await associateParkingToDeal(dealId, selectedCuartoUtil.id);
          } catch (assocErr) {
            console.error('Cuarto útil association failed:', assocErr);
          }
        }
        // Single timestamp used as quote number in the PDF and in the filename on the server
        const quoteTs = Date.now();
        // Each project can have its own PDF template — defaults to the Oliv template
        const PdfTemplate =
          deal.proyecto_inmobiliario_cac === 'Almar' ? QuotePDFAlmar : deal.proyecto_inmobiliario_cac === 'Alegra' ? QuotePDFAlegra : QuotePDF;
        // El motor (useModeledPlan) ya recibe `recargoOverride`/`ignorarRecargo` y deja el
        // ajuste dentro del Saldo Final de `activePaymentPlan` (las cuotas van limpias).
        // Acá solo falta reflejarlo en el resumen financiero del PDF (de donde sale
        // "Saldo Contraentrega Propuesta Cliente"), que el hook reporta "en crudo" a
        // propósito para poder mostrar antes/después en la UI. Con "ignorar" activo el
        // resumen ya viene en 0 y NO se pisa con un override viejo que haya quedado puesto.
        let adjustedFinancialSummary = quoteType === 'modelador' ? modeledPlanData.financialSummary : undefined;
        if (adjustedFinancialSummary && !ignorarRecargo && recargoOverride !== null && recargoOverride !== adjustedFinancialSummary.saldoFinancieroFinal) {
          adjustedFinancialSummary = {
            ...adjustedFinancialSummary,
            saldoFinancieroFinal: recargoOverride,
          };
        }
        // Generate PDF Blob
        const blob = await pdf(
          <PdfTemplate
            deal={deal}
            unit={selectedUnit}
            calc={currentCalc}
            paymentPlan={activePaymentPlan}
            quoteType={quoteType}
            quoteNumber={quoteTs}
            hasCustomQuotas={quoteType === 'modelador' && modeledPlanData.hasChanges}
            ownerEmail={deal?.owner_email || user?.email}
            financialSummary={adjustedFinancialSummary}
            towerName={towerName ?? undefined}
            parking={selectedParking}
            deposito={selectedDeposito}
            cuartoUtil={selectedCuartoUtil}
            bonoAplicado={bonoAplicado > 0 ? bonoAplicado : undefined}
            descuentoTipo={descuentoTipo}
            descuentoPct={descuentoPct > 0 ? descuentoPct : undefined}
            descuentoMonto={descuentoMonto > 0 ? descuentoMonto : undefined}
            descuentoModo={descuentoModo}
            subsidioNombre={subsidioSeleccionado?.nombre}
            subsidioMonto={subsidioMonto > 0 ? subsidioMonto : undefined}
            adicionalesAplicados={adicionalesAplicadosProp}
          />
        ).toBlob();
        // Snapshot con los MISMOS datos que recibe el PDF (para la vista HTML)
        const snapshot = {
          deal,
          unit: selectedUnit,
          calc: currentCalc,
          paymentPlan: activePaymentPlan,
          quoteType,
          quoteNumber: quoteTs,
          hasCustomQuotas: quoteType === 'modelador' && modeledPlanData.hasChanges,
          ownerEmail: deal?.owner_email || user?.email,
          towerName: towerName ?? undefined,
          parking: selectedParking,
          deposito: selectedDeposito,
          cuartoUtil: selectedCuartoUtil,
          bonoAplicado: bonoAplicado > 0 ? bonoAplicado : undefined,
          descuentoTipo,
          descuentoPct: descuentoPct > 0 ? descuentoPct : undefined,
          descuentoMonto: descuentoMonto > 0 ? descuentoMonto : undefined,
          descuentoModo,
          subsidioNombre: subsidioSeleccionado?.nombre,
          subsidioMonto: subsidioMonto > 0 ? subsidioMonto : undefined,
          adicionalesAplicados: adicionalesAplicadosProp,
          financialSummary: adjustedFinancialSummary,
          isRecargoAjustado:
            quoteType === 'modelador' && !ignorarRecargo && recargoOverride !== null && modeledPlanData.financialSummary.saldoFinancieroFinal !== 0
              ? true
              : undefined,
        };
        // Save to tracking system (NOT HubSpot) — upload happens when quote is accepted
        await saveQuoteWithPDF(
          blob,
          {
            dealId,
            dealName: deal.dealname || '',
            unitId: selectedUnit.id,
            unitCode: selectedUnit.codigo_unidad || selectedUnit.id_unidad || '',
            unitTower: selectedUnit.torre || '',
            unitFloor: selectedUnit.piso || 0,
            // El dueño real del negocio (asesora) es quien debe poder ver/aceptar esta
            // cotización en Seguimiento — no quien la generó. Sin esto, cuando un admin
            // cotiza sobre el negocio de otra persona, la cotización quedaba "invisible"
            // para la asesora dueña del negocio (solo la veía el admin que la generó).
            userEmail: deal?.owner_email || user?.email || '',
            // Quien de verdad generó la cotización (el usuario logueado), sin importar
            // de quién sea el negocio — para poder distinguirlo en Seguimiento.
            generatedByEmail: user?.email || '',
            quoteType,
            totalPrice: precioConDescuento,
            separation: currentSeparacion,
            // Con el recargo/descuento dentro de las cuotas (modo 100%) la cuota que de verdad
            // se paga es la del plan, no la "base" de calc — Seguimiento muestra este número.
            monthlyPayment:
              (quoteType === 'modelador' && modeledPlanData.ajusteEnCuotas !== 0 ? activePaymentPlan[1]?.valor : currentCalc.valorCuotaMensual) || 0,
            numInstallments: currentCuotas,
            balance: currentCalc.saldo || 0,
            quoteTs,
            snapshot,
            parkingId: selectedParking?.id,
            parkingName: selectedParking?.name,
            depositoId: selectedDeposito?.id,
            depositoName: selectedDeposito?.name,
            cuartoUtilId: selectedCuartoUtil?.id,
            cuartoUtilName: selectedCuartoUtil?.name,
            skipDealStage: skipDealStage || undefined,
            project: deal.proyecto_inmobiliario_cac,
          }
        );
        setGeneratedPdfBlob(blob);
        setSubmitStatus('success');
      } catch (err) {
        console.error(err);
        setSubmitStatus('error');
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Error al guardar la cotización.');
        }
      }
    },
    [
      selectedUnit,
      deal,
      dealId,
      precio,
      currentCalc,
      currentSeparacion,
      currentCuotas,
      activePaymentPlan,
      quoteType,
      needsAssociation,
      user,
      modeledPlanData,
      subsidioSeleccionado,
      subsidioMonto,
      adicionalesAplicadosProp,
      recargoOverride,
      ignorarRecargo,
    ]
  );
  // ─── Validation ───
  const isModeledInvalid = quoteType === 'modelador' && modeledPlanData.warning !== null;
  const canSubmit = !!deal && !dealLoading && selectedUnit !== null && precio > 0 && !isModeledInvalid;
  // ─── Pasos ───
  // Todos los paneles siguen montados y solo se oculta el de los pasos inactivos,
  // así ningún selector/calculadora pierde su estado al navegar entre pasos.
  const pasos = ['Inmueble y accesorios', 'Plan de pagos', 'Revisión y generación'];
  const esUltimoPaso = paso === pasos.length - 1;
  // Accesorios: si la torre ofrece alguno, hay que decidir (elegir uno o confirmar «Sin accesorios») antes de seguir.
  const hayAccesorios = parkingOptions.length + depositoOptions.length + cuartoUtilOptions.length > 0;
  const tieneAccesorio = !!(selectedParking || selectedDeposito || selectedCuartoUtil);
  const accesoriosPendientes = selectedUnit !== null && towerObjectId !== null && (parkingLoading || hayAccesorios) && !tieneAccesorio && !sinAccesorios;
  const totalAcumulado = unitBasePrice + parkingPrice + depositoPrice + cuartoUtilPrice;
  // Sin inmueble elegido (o con los accesorios pendientes) no hay nada que configurar: solo el paso 1 es alcanzable.
  const puedeIrAPaso = (i) => i === 0 || (selectedUnit !== null && !accesoriosPendientes && !(i >= 2 && isModeledInvalid));
  // Detalle bajo cada KPI y datos de la barra inferior del paso Plan de pagos.
  const fmtCop = formatPrice;
  const ultimaEntrada = activePaymentPlan[activePaymentPlan.length - 1];
  const detallePrecio = [
    `Apto ${fmtCop(unitBasePrice)}`,
    parkingPrice > 0 && `Parq. ${fmtCop(parkingPrice)}`,
    depositoPrice > 0 && `Dep. ${fmtCop(depositoPrice)}`,
    cuartoUtilPrice > 0 && `Cuarto útil ${fmtCop(cuartoUtilPrice)}`,
  ]
    .filter(Boolean)
    .join(' + ');
  const detalleSaldo = ultimaEntrada ? `Contra entrega · ${ultimaEntrada.fecha_estimada}` : '';
  const cuotasFijas = Object.keys(modeledPlanData.fixedQuotas ?? {}).length;
  const detalleCuotas = quoteType === 'estandar' ? `${currentCuotas} cuotas iguales` : `${Math.max(0, currentCuotas - cuotasFijas)} libres · ${cuotasFijas} fijas`;
  const cuotaInicialModelada = modeledCalc.precio - modeledCalc.saldo;
  const asignadoModelado = modeledPlanFinal.filter((e, i) => i !== modeledPlanFinal.length - 1 && !e.isAbono).reduce((suma, e) => suma + (e.valor || 0), 0);
  const difModelado = Math.abs(cuotaInicialModelada - asignadoModelado) <= 1 ? 0 : Math.round(cuotaInicialModelada - asignadoModelado);
  const ajusteFinanciero = ignorarRecargo ? 0 : (recargoOverride ?? modeledPlanData.financialSummary.saldoFinancieroFinal);
  const datosBarraPlan =
    quoteType === 'estandar'
      ? [
          ['Precio total', fmtCop(currentCalc.precio)],
          ['Cuota inicial', fmtCop(currentCalc.precio - currentCalc.saldo)],
          ['Saldo', fmtCop(currentCalc.saldo)],
        ]
      : [
          ['Cuota inicial', fmtCop(cuotaInicialModelada)],
          ['Asignado', fmtCop(asignadoModelado)],
          ['Diferencia', difModelado === 0 ? `${fmtCop(0)} ✓` : fmtCop(difModelado)],
          ['Resultado financiero', ajusteFinanciero === 0 ? 'Sin ajuste' : `${ajusteFinanciero > 0 ? 'Recargo +' : 'Descuento −'}${fmtCop(Math.abs(ajusteFinanciero))}`],
        ];
  const mensajePaso1 = !selectedUnit
    ? 'Selecciona un inmueble para continuar'
    : accesoriosPendientes
      ? 'Accesorios: Pendiente'
      : `Total acumulado: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalAcumulado)}`;
  const irAPaso = (i) => {
    if (!puedeIrAPaso(i)) return;
    setPaso(i);
    setTimeout(() => document.getElementById('cotizador-stepper')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };
  return (
    <div className={styles.form}>
      <ol id="cotizador-stepper" aria-label="Pasos de la cotización" className={styles.stepper}>
        {pasos.map((label, i) => {
          const actual = i === paso;
          const hecho = i < paso;
          return (
            <li
              key={label}
              className={`${styles.stepperItem} ${hecho ? styles.stepperDone : ''} ${actual ? styles.stepperCurrent : ''}`}
              aria-current={actual ? 'step' : undefined}
            >
              <button type="button" className={styles.stepperBtn} onClick={() => irAPaso(i)} disabled={!puedeIrAPaso(i)}>
                <span className={styles.stepperDot}>{hecho ? '✓' : i + 1}</span>
                <span className={styles.stepperLabel} title={label}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className={styles.form}>
        {/* ── PASO 1 — Inmueble y accesorios ── */}
        <div hidden={paso !== 0} className={styles.panel}>
          <DealInfo deal={deal} loading={dealLoading} descuentoPct={descuentoPct > 0 ? descuentoPct : undefined} descuentoModo={descuentoModo} />

          <CotizacionesPrevias
            dealId={dealId}
            onRecotizar={handleRecotizar}
            recotizandoId={recotizandoId}
            precioActual={(q) => allUnits.find((u) => u.id === q.unit_id)?.valor_unidad_comercial ?? null}
          />

          <EnhancedUnitSelector
            associatedUnits={associatedUnits}
            availableUnits={availableUnits}
            availableLoading={availableLoading}
            selectedId={selectedUnitId}
            onChange={handleUnitChange}
            onRefreshAvailable={onRefreshAvailable}
            project={deal?.proyecto_inmobiliario_cac}
          />

          {selectedUnit && <PropertyDisplay unit={selectedUnit} towerName={towerName ?? undefined} />}

          <AccesoriosSection
            bloqueado={!selectedUnit}
            cargando={parkingLoading}
            opciones={{ parking: parkingOptions, depositos: depositoOptions, cuartosUtiles: cuartoUtilOptions }}
            seleccion={{ parking: selectedParking, deposito: selectedDeposito, cuartoUtil: selectedCuartoUtil }}
            onSeleccion={handleSeleccionAccesorio}
            sinAccesorios={sinAccesorios}
            onSinAccesorios={handleSinAccesorios}
            pendiente={accesoriosPendientes}
            aviso={accesoriosAviso}
          />
        </div>

        {selectedUnit && (
          <>
            {/* ── PASO 2 — Plan de pagos (condiciones y cronograma juntos: al cambiar plazo o separación se recalcula aquí mismo) ── */}
            <div hidden={paso !== 1} className={styles.panel}>
              <FinancialCalculator
                precio={precio}
                bonoMax={bonoMax}
                bonoAplicado={bonoAplicado}
                onBonoChange={setBonoAplicado}
                cuotas={currentCuotas}
                separacion={currentSeparacion}
                onSeparacionChange={handleSeparacionChange}
                onCuotasChange={setCuotasModeladas}
                calc={currentCalc}
                quoteType={quoteType}
                onQuoteTypeChange={setQuoteType}
                precioDetalle={detallePrecio}
                saldoDetalle={detalleSaldo}
                cuotasDetalle={detalleCuotas}
                separacionFecha={separacionFecha}
                onSeparacionFechaChange={setSeparacionFecha}
                separacionFechaMin={separacionFechaMin}
                separacionFechaMax={separacionFechaMax}
                hasCustomQuotas={quoteType === 'modelador' && modeledPlanData.hasChanges}
                descuentoTipo={descuentoTipo}
                descuentoPct={descuentoPct}
                descuentoMonto={descuentoMonto}
                descuentoModo={descuentoModo}
                descuentoIncluyeParqueadero={descuentoConfig?.incluyeParqueadero}
                abonoActivo={abonoActivo}
                onAbonoActivoChange={setAbonoActivo}
                modo100={modo100}
                onModo100Change={handleModo100Change}
                subsidioId={subsidioId}
                onSubsidioChange={handleSubsidioChange}
                subsidiosElegibles={subsidiosElegibles}
                contactIngresosMensuales={contactIngresosMensuales}
                contactSmlvMultiple={contactSmlvMultiple ?? undefined}
                adicionalesIds={adicionalesIds}
                onAdicionalesChange={setAdicionalesIds}
                cuotaInicialPctOverride={cuotaInicialPctOverride}
                onCuotaInicialPctOverrideChange={role === 'admin' ? setCuotaInicialPctOverride : undefined}
              />

              {quoteType === 'modelador' && (
                <ModeledPlanTable
                  standardCalc={standardCalc}
                  modeledCalc={modeledCalc}
                  modeledPlanData={{ ...modeledPlanData, modeledPlan: modeledPlanFinal }}
                  standardPlan={standardPlan}
                  subsidioCuotaNumero={subsidioAplicaCuotaInicial ? cuotasModeladas + 1 : undefined}
                  subsidioNombre={subsidioAplicaCuotaInicial ? subsidioSeleccionado?.nombre : undefined}
                  onToggleFechaExtra={(numero) => toggleFechaExtra('modelador', numero)}
                  recargoOverride={recargoOverride}
                  onRecargoOverrideChange={role === 'admin' ? setRecargoOverride : undefined}
                  ignorarRecargo={ignorarRecargo}
                  onIgnorarRecargoChange={role === 'admin' ? setIgnorarRecargo : undefined}
                  onRestablecer={restablecerModelado}
                />
              )}

              {quoteType === 'estandar' && (
                <PlanEstandarCompacto
                  entries={activePaymentPlan}
                  cuotas={currentCuotas}
                  valorCuota={currentCalc.valorCuotaMensual}
                  onPersonalizar={() => setQuoteType('modelador')}
                  onToggleFechaExtra={(numero) => toggleFechaExtra('estandar', numero)}
                />
              )}
            </div>

            {/* ── PASO 3 — Revisión y generación ── */}
            <div hidden={paso !== 2} className={styles.panel}>
              <div className={styles.acciones}>
                <Button onClick={() => handleSubmit(false)} disabled={!canSubmit || submitStatus === 'loading'}>
                  {dealLoading ? (
                    <>
                      <span className={styles.spinner} aria-hidden="true" />
                      Cargando negocio…
                    </>
                  ) : submitStatus === 'loading' ? (
                    <>
                      <span className={styles.spinner} aria-hidden="true" />
                      {needsAssociation ? 'Asociando inmueble y generando PDF…' : 'Generando PDF…'}
                    </>
                  ) : (
                    'Generar Cotización PDF'
                  )}
                </Button>

                {role === 'admin' && quoteType === 'modelador' && (
                  <Button variant="secondary" onClick={() => handleSubmit(true)} disabled={!canSubmit || submitStatus === 'loading'}>
                    {submitStatus === 'loading' ? (
                      <>
                        <span className={styles.spinner} aria-hidden="true" />
                        Generando PDF…
                      </>
                    ) : (
                      'Generar y guardar internamente'
                    )}
                  </Button>
                )}

                {needsAssociation && selectedUnit && submitStatus === 'idle' && (
                  <div className={`${styles.aviso} ${styles.avisoAdvertencia}`} role="status">
                    <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
                    <span>Esta unidad se asociará al negocio automáticamente al generar el PDF</span>
                  </div>
                )}

                {submitStatus === 'success' && (
                  <div className={styles.resultado}>
                    <div className={`${styles.aviso} ${styles.avisoExito}`} role="status">
                      <span className={styles.avisoTexto}>
                        <CircleCheck size={16} strokeWidth={1.75} aria-hidden="true" />
                        Cotización guardada en Seguimiento de Cotizaciones
                      </span>
                      {generatedPdfBlob && (
                        <Button variant="secondary" onClick={() => window.open(URL.createObjectURL(generatedPdfBlob), '_blank')}>
                          <Eye size={16} strokeWidth={1.75} aria-hidden="true" />
                          Ver PDF
                        </Button>
                      )}
                    </div>
                    {associationWarning && (
                      <div className={`${styles.aviso} ${styles.avisoAdvertencia}`} role="status">
                        <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
                        <span>{associationWarning}</span>
                      </div>
                    )}
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className={`${styles.aviso} ${styles.avisoError}`} role="alert">
                    <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
                    <span>Error: {errorMessage || 'No se pudo generar la cotización.'}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Navegación entre pasos ── */}
        <div className={styles.pie}>
          <Button variant="secondary" onClick={() => irAPaso(paso - 1)} disabled={paso === 0 || submitStatus === 'loading'}>
            Anterior
          </Button>
          {paso === 1 && selectedUnit && (
            <dl className={styles.pieDatos}>
              {datosBarraPlan.map(([etiqueta, valor]) => (
                <div key={etiqueta}>
                  <dt>{etiqueta}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          )}
          {paso === 0 && <span className={`${styles.pieMensaje} ${accesoriosPendientes ? styles.pieMensajePendiente : ''}`}>{mensajePaso1}</span>}
          {!esUltimoPaso && (
            <div className={styles.pieAcciones}>
              <Button onClick={() => irAPaso(paso + 1)} disabled={!puedeIrAPaso(paso + 1)}>
                Siguiente
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
