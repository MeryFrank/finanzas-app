import { esc } from './html.js';
import { MIN_PASSWORD } from '../core/session.js';

const error = (msg) => (msg ? `<p class="error" role="alert">${esc(msg)}</p>` : '');

/** Primera vez: crear la contraseña. */
export const setupScreen = (msg) => `
<form class="card stack" data-form="setup" autocomplete="off">
  <h2>Crea tu contraseña</h2>
  <p class="note">*protege todos tus datos en este dispositivo; si la olvidas no se pueden recuperar, así que guarda también una copia de seguridad</p>
  <label>Contraseña<input name="password" type="password" autocomplete="new-password" minlength="${MIN_PASSWORD}" required></label>
  <label>Repite la contraseña<input name="confirm" type="password" autocomplete="new-password" required></label>
  <p class="note">*mínimo ${MIN_PASSWORD} caracteres</p>
  ${error(msg)}
  <button class="btn" type="submit">Crear y entrar</button>
</form>`;

/** Datos cifrados ya existentes: pedir la contraseña. */
export const unlockScreen = (msg) => `
<form class="card stack" data-form="unlock">
  <h2>Desbloquear</h2>
  <label>Contraseña<input name="password" type="password" autocomplete="current-password" enterkeyhint="go" required autofocus></label>
  ${error(msg)}
  <button class="btn" type="submit">Entrar</button>
</form>`;
