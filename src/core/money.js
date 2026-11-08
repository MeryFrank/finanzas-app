/**
 * Convierte un importe en texto a un entero escalado (por defecto céntimos), sin decimales flotantes.
 * Reglas del separador:
 *  - Si hay punto y coma, el último es el decimal y el otro es de miles ("1.234,56" y "1,234.56").
 *  - Si hay solo un tipo y aparece más de una vez, es de miles ("1.234.567").
 *  - Si hay solo un tipo y aparece una vez, es el decimal ("12,34", "-12.3456").
 *    Las plataformas que importamos no usan separador de miles sin decimales.
 * @param {string} text
 * @param {number} [decimals=2] decimales de la escala (2 = céntimos, 4 para rendimientos del fondo monetario)
 * @returns {number|null} entero escalado, o null si está vacío o no es un número
 */
export function parseAmount(text, decimals = 2) {
  let s = String(text ?? '').replace(/\s/g, '');
  if (s === '') return null;
  let sign = 1;
  if (s[0] === '-') { sign = -1; s = s.slice(1); } else if (s[0] === '+') { s = s.slice(1); }
  const dots = (s.match(/\./g) || []).length;
  const commas = (s.match(/,/g) || []).length;
  let decSep = null;
  if (dots && commas) decSep = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
  else if (dots === 1) decSep = '.';
  else if (commas === 1) decSep = ',';
  let intPart = s;
  let decPart = '';
  if (decSep) {
    const at = s.lastIndexOf(decSep);
    intPart = s.slice(0, at);
    decPart = s.slice(at + 1);
  }
  intPart = intPart.replace(/[.,]/g, '');
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(decPart) || (intPart === '' && decPart === '')) return null;
  const scale = 10 ** decimals;
  const frac = decPart.padEnd(decimals + 1, '0');
  let value = Number(intPart || '0') * scale + Number(frac.slice(0, decimals) || '0');
  if (Number(frac[decimals]) >= 5) value += 1; // redondeo: mitad hacia arriba en valor absoluto
  return sign * value;
}

/** Atajo para céntimos. */
export const parseCents = (text) => parseAmount(text, 2);

/** @param {number} cents */
export function formatEuros(cents) {
  const abs = Math.abs(cents);
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const dec = String(abs % 100).padStart(2, '0');
  return `${cents < 0 ? '-' : ''}${whole},${dec} €`;
}
