import { SCREENS } from './screens/index.js';
import { onRoute } from './router.js';

const ids = SCREENS.map((s) => s.id);
const nav = document.getElementById('nav');
nav.innerHTML = SCREENS.map((s) =>
  `<a href="#/${s.id}" data-id="${s.id}"><svg viewBox="0 0 24 24" aria-hidden="true">${s.icon}</svg>${s.label}</a>`).join('');

onRoute(ids, (id) => {
  const screen = SCREENS.find((s) => s.id === id);
  document.getElementById('title').textContent = screen.title;
  document.getElementById('screen').innerHTML = screen.render();
  nav.querySelectorAll('a').forEach((a) => {
    if (a.dataset.id === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
