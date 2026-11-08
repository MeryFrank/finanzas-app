// Router mínimo por hash: #/resumen, #/gastos...
export const DEFAULT_ROUTE = 'resumen';

export function currentRoute(hash, routes) {
  const name = String(hash || '').replace(/^#\/?/, '');
  return routes.includes(name) ? name : DEFAULT_ROUTE;
}

export function onRoute(routes, handler) {
  const run = () => handler(currentRoute(location.hash, routes));
  addEventListener('hashchange', run);
  run();
}
