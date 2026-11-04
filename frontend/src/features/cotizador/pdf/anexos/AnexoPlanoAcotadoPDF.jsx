import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { ANX, ANX_PAGE, FirmasCaja } from './anexosShared.jsx';
import { numeroApto } from './AnexoParqueaderoPDF.jsx';
import logoOlivVerde from '../../../../assets/anexos/logo-oliv-verde.png';
import icoSala from '../../../../assets/anexos/ico-sala.png';
import icoCocina from '../../../../assets/anexos/ico-cocina.png';
import icoBano from '../../../../assets/anexos/ico-bano.png';
import icoAlcoba from '../../../../assets/anexos/ico-alcoba.png';
import icoBalcon from '../../../../assets/anexos/ico-balcon.png';
const s = StyleSheet.create({
  page: { backgroundColor: ANX.BLANCO, fontFamily: 'Inter', fontWeight: 400, color: ANX.TEXTO, alignItems: 'center' },
  logo: { width: 167, height: 95, marginTop: 44, objectFit: 'contain' },
  torre: {
    fontFamily: 'Playfair',
    fontWeight: 400,
    fontSize: 46,
    letterSpacing: 12,
    color: ANX.OLIVO,
    textAlign: 'center',
    marginTop: 28,
  },
  plano: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: 4.2,
    color: ANX.OLIVO,
    textAlign: 'center',
    marginTop: 12,
  },
  // Franja verde con el resumen de la unidad
  banda: { width: 756, height: 169, marginTop: 24, backgroundColor: ANX.OLIVO_OSC },
  tipo: { position: 'absolute', left: 16, top: 38, fontFamily: 'Playfair', fontWeight: 400, fontSize: 31, color: ANX.ACENTO },
  numeroCaja: {
    position: 'absolute',
    left: 29,
    top: 88,
    width: 63,
    height: 26,
    borderRadius: 3,
    backgroundColor: ANX.BLANCO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroTxt: { fontFamily: 'Inter', fontWeight: 400, fontSize: 15, letterSpacing: 4.5, color: ANX.OLIVO, paddingLeft: 4 },
  divisor: { position: 'absolute', top: 51, height: 75, width: 0.8, backgroundColor: ANX.OLIVO },
  etiqueta: { position: 'absolute', top: 66, fontFamily: 'Inter', fontWeight: 400, fontSize: 7.2, letterSpacing: 2.3, color: ANX.CREMA },
  valor: { position: 'absolute', top: 80, fontFamily: 'Bodoni', fontWeight: 400, fontSize: 21, color: ANX.CREMA },
  valorTotal: { fontFamily: 'Bodoni', fontWeight: 700, fontSize: 22, color: ANX.BLANCO },
  icono: { position: 'absolute', width: 13, height: 13, objectFit: 'contain' },
  rasgo: { position: 'absolute', fontFamily: 'Inter', fontWeight: 700, fontSize: 8.4, letterSpacing: 1.6, color: ANX.BLANCO },
  // Los dos planos (acotado arriba, piso sombreado abajo) se reparten el área a partes iguales;
  // sin plano sombreado, el acotado ocupa toda el área.
  cuerpo: { width: 756, flexDirection: 'column', marginTop: 14, height: 545, gap: 10 },
  mitad: { flex: 1, flexDirection: 'column' },
  mitadLabel: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 9,
    letterSpacing: 1.4,
    color: ANX.OLIVO,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mitadBox: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: ANX.OLIVO,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nota: { width: 756, fontSize: 9.5, lineHeight: 1.5, color: ANX.GRIS, marginTop: 6 },
  firmas: { width: 750, marginTop: 24 },
});
const m2 = (v) => `${Number(v || 0).toFixed(2)} m²`;
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
export default function AnexoPlanoAcotadoPDF({ unit, planoUrl, plantaUbicacionUrl, nombreComprador, nombreDirector }) {
  const numero = numeroApto(unit);
  const edificio = (unit.codigo_unidad || '').split('-')[0].trim().toUpperCase();
  const tipo = (unit.tipo_de_apartamento || '').toUpperCase();
  const alcobas = Number(unit.alcobas) || 0;
  const banos = Number(unit.banos) || 0;
  return (
    <Document title={`Plano acotado ${numero}`}>
      <Page size={[ANX_PAGE.width, ANX_PAGE.height]} style={s.page}>
        <Image src={logoOlivVerde} style={s.logo} />
        <Text style={s.torre}>{edificio ? `TORRE ${edificio}` : 'PLANO'}</Text>
        <Text style={s.plano}>PLANO ACOTADO - {numero}</Text>

        <View style={s.banda}>
          <Text style={s.tipo}>{tipo}</Text>
          <View style={s.numeroCaja}>
            <Text style={s.numeroTxt}>{numero.split('').join(' ')}</Text>
          </View>

          <View style={[s.divisor, { left: 242 }]} />
          <Text style={[s.etiqueta, { left: 154 }]}>ÁREA PRIVADA</Text>
          <Text style={[s.valor, { left: 154 }]}>{m2(unit.private_area_m2)}</Text>

          <View style={[s.divisor, { left: 360 }]} />
          <Text style={[s.etiqueta, { left: 264 }]}>ÁREA TERRAZA</Text>
          <Text style={[s.valor, { left: 264 }]}>{m2(unit.terrace_area_m2)}</Text>

          <View style={[s.divisor, { left: 501 }]} />
          <Text style={[s.etiqueta, { left: 375 }]}>ÁREA TOTAL</Text>
          <Text style={[s.valor, s.valorTotal, { left: 375, top: 79 }]}>{m2(unit.area_construida)}</Text>

          <Image src={icoSala} style={[s.icono, { left: 521, top: 52 }]} />
          <Text style={[s.rasgo, { left: 545, top: 53 }]}>SALA-COMEDOR</Text>
          {banos > 0 && (
            <>
              <Image src={icoBano} style={[s.icono, { left: 521, top: 81 }]} />
              <Text style={[s.rasgo, { left: 545, top: 82 }]}>{plural(banos, 'BAÑO', 'BAÑOS')}</Text>
            </>
          )}
          <Image src={icoBalcon} style={[s.icono, { left: 521, top: 112 }]} />
          <Text style={[s.rasgo, { left: 545, top: 113 }]}>BALCÓN</Text>

          <Image src={icoCocina} style={[s.icono, { left: 667, top: 52 }]} />
          <Text style={[s.rasgo, { left: 690, top: 53 }]}>COCINA</Text>
          {alcobas > 0 && (
            <>
              <Image src={icoAlcoba} style={[s.icono, { left: 663, top: 85 }]} />
              <Text style={[s.rasgo, { left: 690, top: 86 }]}>{plural(alcobas, 'ALCOBA', 'ALCOBAS')}</Text>
            </>
          )}
        </View>

        <View style={s.cuerpo}>
          <View style={s.mitad}>
            <Text style={s.mitadLabel}>Plano acotado</Text>
            <View style={s.mitadBox}>
              <Image src={planoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </View>
          </View>
          {plantaUbicacionUrl && (
            <View style={s.mitad}>
              <Text style={s.mitadLabel}>Ubicación en el piso</Text>
              <View style={s.mitadBox}>
                <Image src={plantaUbicacionUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </View>
            </View>
          )}
        </View>
        <Text style={s.nota}>* Imagen sujeta a modificaciones por requerimientos técnicos y estructurales.</Text>

        <FirmasCaja style={s.firmas} nombreComprador={nombreComprador} nombreDirector={nombreDirector} />
      </Page>
    </Document>
  );
}
