// Pantallas de la app. Datos ya está hecha; el resto son marcadores que se rellenan al avanzar el plan.
import { renderDatos } from './datos.js';
const pending = (text) => `<div class="card"><p>Pantalla en construcción.</p><p class="note">*${text}</p></div>`;

export const SCREENS = [
  { id: 'resumen', label: 'Resumen', title: 'Resumen', icon: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', render: () => pending('patrimonio, ingresos, gasto, ahorrado e invertido del mes') },
  { id: 'ingresos', label: 'Ingresos', title: 'Ingresos', icon: '<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>', render: () => pending('nómina y reembolsos por categoría') },
  { id: 'gastos', label: 'Gastos', title: 'Gastos', icon: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>', render: () => pending('anillos por categoría frente al presupuesto') },
  { id: 'ahorro', label: 'Ahorro', title: 'Ahorro', icon: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8"/><path d="M9.5 10.5h4a1.5 1.5 0 010 3h-3"/>', render: () => pending('saldo de la cuenta remunerada y cuadre de cuentas') },
  { id: 'cartera', label: 'Cartera', title: 'Cartera', icon: '<path d="M12 3v9h9"/><circle cx="12" cy="12" r="9"/>', render: () => pending('posiciones, rentabilidad y peso frente al objetivo') },
  { id: 'meta', label: 'Meta', title: 'Independencia', icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>', render: () => pending('fecha de independencia, escenarios Real y Prueba') },
  { id: 'datos', label: 'Datos', title: 'Datos', icon: '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M5 20h14"/>', render: (ctx) => (ctx ? renderDatos(ctx) : pending('importar CSV, copia de seguridad y ajustes')) }
];
