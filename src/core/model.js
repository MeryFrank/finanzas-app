/**
 * @typedef {'gasto'|'ingreso'|'traspaso'|'reembolso-compartido'|'ahorro-inversion'|'devolucion'|'por-revisar'|'ignorar'} Kind
 *  gasto: sale dinero a un comercio. ingreso: entra dinero que cuenta como ingreso.
 *  traspaso: entre cuentas propias (ni gasto ni ingreso). reembolso-compartido: bizum o transferencia con personas (ni gasto ni ingreso).
 *  ahorro-inversion: paso a fondo monetario, cuenta remunerada o broker. devolucion: un comercio devuelve dinero (reduce el gasto).
 *  por-revisar: la app no sabe qué es; lo decide la usuaria. ignorar: movimiento de 0 € u otro sin efecto.
 *
 * @typedef {Object} Movement
 * @property {string} key clave de duplicado (incluye la plataforma)
 * @property {'revolut-card'|'revolut-account'} source
 * @property {string} date AAAA-MM-DD
 * @property {string} description
 * @property {number} amountCents con signo; ya incluye la comisión (importe - comisión)
 * @property {number|null} balanceCents saldo tras el movimiento, si el extracto lo trae
 * @property {string} currency
 * @property {Kind} kind
 * @property {string|null} categoryId
 * @property {string} rawType tipo tal como viene en el extracto
 */
export const KINDS = ['gasto', 'ingreso', 'traspaso', 'reembolso-compartido', 'ahorro-inversion', 'devolucion', 'por-revisar', 'ignorar'];
