// Router mínimo por hash: #/resumen, #/gastos...
export const DEFAULT_ROUTE = 'resumen';

export function currentRoute(hash, routes) {
  const name = String(hash || '').replace(/^#\/?/, '');
  return routes.includes(name) ? name : DEFAULT_ROUTE;
}

/** '#/gastos/clasificar' -> { id: 'gastos', sub: 'clasificar' } (id desconocido -> Resumen) */
export function parseHash(hash, routes) {
  const [first, sub] = String(hash || '').replace(/^#\/?/, '').split('/');
  return { id: routes.includes(first) ? first : DEFAULT_ROUTE, sub: sub || null };
}

export function onRoute(routes, handler) {
  const run = () => handler(currentRoute(location.hash, routes));
  addEventListener('hashchange', run);
  run();
}
