// Arbol de navegacion del Centro de Aplicaciones Comerciales -- unica fuente de verdad
// para el sidebar (AppShell.jsx). Un item con `soloAdmin` solo lo ve un administrador.
import { Calculator, ClipboardList, FileText, FolderOpen, Building2, Settings } from 'lucide-react';

const ICON_SIZE = 16;
const ICON_STROKE_WIDTH = 1.75;

const icono = (Icon) => () => <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />;

export const NAV_GROUPS = [
  { title: 'Cotizador', icon: icono(Calculator), directo: true, items: [{ label: 'Cotizador', to: '/cotizador' }] },
  { title: 'Seguimiento', icon: icono(ClipboardList), directo: true, items: [{ label: 'Seguimiento', to: '/seguimiento' }] },
  { title: 'Trámites', icon: icono(FileText), directo: true, items: [{ label: 'Trámites', to: '/tramites' }] },
  { title: 'Inventario', icon: icono(Building2), directo: true, items: [{ label: 'Inventario', to: '/inventario', soloAdmin: true }] },
  { title: 'Configuración', icon: icono(Settings), directo: true, items: [{ label: 'Configuración', to: '/configuracion', soloAdmin: true }] },
  { title: 'Documentación', icon: icono(FolderOpen), directo: true, items: [{ label: 'Documentación', to: '/documentacion' }] },
];
