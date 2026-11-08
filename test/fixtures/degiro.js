// Datos INVENTADOS (productos, ISIN, importes y pedidos ficticios). No copiar nunca extractos reales aquí.
export const PORTFOLIO_CSV = [
  'Product,Symbol/ISIN,Amount,Closing,Local value,,Value in EUR',
  'CASH & CASH FUND & FTX CASH (EUR),,,,EUR,12.50,12.50',
  'ETF Mundial Ficticio,XX0000000001,10,100.50,EUR,1005.00,1005.00',
  'Acción Inventada A,XX0000000002,4,200.00,USD,800.00,690.00'
].join('\n');

export const TRANSACTIONS_CSV = [
  'Date,Time,Product,ISIN,Reference exchange,Venue,Quantity,Price,,Local value,,Value EUR,Exchange rate,AutoFX Fee,Transaction and/or third party fees EUR,Total EUR,Order ID',
  '05-10-2026,10:00,ETF Mundial Ficticio,XX0000000001,XET,XETA,2,100.0000,EUR,-200.00,EUR,-200.00,,0.00,-1.00,-201.00,ORDER-0001',
  '06-10-2026,15:30,Acción Inventada A,XX0000000002,NSY,XNYS,1,200.0000,USD,-200.00,USD,-172.00,1.1628,-0.50,-1.00,-173.50,ORDER-0002',
  '07-10-2026,09:00,ETF Mundial Ficticio,XX0000000001,XET,XETA,-1,101.0000,EUR,101.00,EUR,101.00,,0.00,-1.00,100.00,ORDER-0003'
].join('\n');

export const STATEMENT_CSV = [
  'Date,Time,Value date,Product,ISIN,Description,FX,Change,,Balance,,Order Id',
  '16-10-2026,08:00,16-10-2026,,,FX Credit,,EUR,0.19,EUR,10.00,',
  '16-10-2026,08:00,16-10-2026,,,FX Debit,1.1600,USD,-0.22,USD,0.00,',
  '15-10-2026,07:00,15-10-2026,Acción Inventada A,XX0000000002,Dividend,,USD,0.30,USD,0.22,',
  '15-10-2026,07:00,15-10-2026,Acción Inventada A,XX0000000002,Dividend Tax,,USD,-0.08,USD,-0.08,',
  '10-10-2026,12:00,10-10-2026,,,Flatex Interest Income,,EUR,0.05,EUR,9.81,',
  '09-10-2026,12:00,09-10-2026,,,DEGIRO Exchange Connection Fee 2026 (Ejemplo),,EUR,-2.50,EUR,9.76,',
  '08-10-2026,12:00,08-10-2026,,,DEGIRO Rebate Promotion,,EUR,1.00,EUR,12.26,',
  '07-10-2026,09:00,07-10-2026,ETF Mundial Ficticio,XX0000000001,DEGIRO Transaction and/or third party fees,,EUR,-1.00,EUR,11.26,ORDER-0003',
  '06-10-2026,15:30,06-10-2026,Acción Inventada A,XX0000000002,Buy 1 Acción Inventada A@200 USD (XX0000000002),,USD,-200.00,USD,0.00,ORDER-0002',
  '05-10-2026,12:00,05-10-2026,,,Degiro Cash Sweep Transfer,,EUR,50.00,EUR,12.26,',
  '04-10-2026,12:00,04-10-2026,,,Transfer to your Cash Account at flatexDEGIRO Bank SE: 50 EUR,,,,EUR,12.26,',
  '03-10-2026,12:00,03-10-2026,,,flatex Deposit,,EUR,300.00,EUR,300.00,'
].join('\n');
