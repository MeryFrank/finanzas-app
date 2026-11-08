// Datos INVENTADOS. No copiar nunca extractos reales aquí.
export const CARD_CSV = [
  'Type,Started Date,Completed Date,Description,Amount,Fee,Balance',
  'CARD_PAYMENT,2026-10-01 10:15:00,2026-10-02 08:00:00,Supermercado Ejemplo,-23.45,0.00,-23.45',
  'CARD_PAYMENT,2026-10-03 19:30:00,2026-10-04 09:10:00,Taxi Ficticio,-8.90,0.00,-32.35',
  'CARD_PAYMENT,2026-10-05 12:00:00,2026-10-06 08:00:00,Tienda Inventada,12.00,0.00,-20.35',
  'CARD_PAYMENT,2026-10-07 12:00:00,,Cafe Pendiente,-3.00,0.00,-23.35',
  'TRANSFER,2026-10-10 09:00:00,2026-10-10 09:00:01,To EUR,20.35,0.00,0.00'
].join('\n');

export const ACCOUNT_CSV = [
  'Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo',
  'Recargas,Actual,2026-10-01 08:00:00,2026-10-01 08:00:01,Pago de Titular Ficticio,500.00,0.00,EUR,COMPLETADO,500.00',
  'Pago con tarjeta,Actual,2026-10-02 12:00:00,2026-10-03 08:00:00,Cafeteria Imaginaria,-3.50,0.00,EUR,COMPLETADO,496.50',
  'Transferir,Actual,2026-10-04 10:00:00,2026-10-04 10:00:01,Transferencia a Persona Inventada,-20.00,0.00,EUR,COMPLETADO,476.50',
  'Transferir,Actual,2026-10-05 10:00:00,2026-10-05 10:00:01,To EUR,-100.00,0.00,EUR,COMPLETADO,376.50',
  'Transferir,Actual,2026-10-06 10:00:00,2026-10-06 10:00:01,A EUR Fondos Monetarios Flexibles,-50.00,0.00,EUR,COMPLETADO,326.50',
  'Reembolso de tarjeta,Actual,2026-10-07 10:00:00,2026-10-07 10:00:01,Tienda Imaginaria,5.00,0.00,EUR,COMPLETADO,331.50',
  'Cobro,Actual,2026-10-08 10:00:00,2026-10-08 10:00:01,Cuota del plan,0.00,0.00,EUR,COMPLETADO,331.50',
  'Cobro,Actual,2026-10-09 10:00:00,2026-10-09 10:00:01,Comision ficticia,-1.00,0.00,EUR,COMPLETADO,330.50',
  'Pago con tarjeta,Actual,2026-10-10 10:00:00,,Compra anulada,-9.00,0.00,EUR,REVERTIDO,330.50'
].join('\n');
