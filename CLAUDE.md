# Finanzas app: reglas del proyecto

PWA personal de finanzas, pensada primero para iPhone. Los datos viven cifrados en el dispositivo; este repositorio solo contiene código.

## Reglas innegociables
- **Cero datos personales o financieros en el repositorio.** Nada de CSV, Excel, PDF, nombres de personas, IBAN, números de cuenta o tarjeta, ni credenciales. El `.gitignore` bloquea `*.csv`, `*.xlsx`, `*.pdf` y copias cifradas: no lo debilites.
- **Las pruebas usan solo datos inventados** (comercios, nombres e importes ficticios). Nunca copies ni "anonimices" un extracto real para usarlo como fixture.
- Solo se guardan **saldos y movimientos**. Nunca números de cuenta, IBAN, tarjetas ni credenciales.
- Sin conexión directa a bancos: la entrada de datos es manual, con CSV exportados desde la app de cada plataforma.
- Gratis y con pocos servicios externos: nada de fuentes, analíticas ni CDN de terceros. Sin dependencias de ejecución; si hiciera falta una, versión exacta y revisada.
- El registro de actividad guarda solo el nombre del archivo y el número de filas, nunca su contenido.
- El móvil es la copia de referencia de los datos; el ordenador solo se usa para el código.

## Stack
- JavaScript con módulos ES y JSDoc para los tipos, sin paso de compilación: GitHub Pages sirve los archivos tal cual.
- Pruebas con el ejecutor integrado de Node: `npm test` (`node --test`).
- Lógica pura en `src/core/` (sin DOM), pantallas en `src/screens/`, estilos en `src/styles.css`.
- Cifrado previsto: Web Crypto, AES-256-GCM con clave derivada de la contraseña (PBKDF2 o Argon2) y sal distinta por archivo. La copia de seguridad es un archivo cifrado exportable y restaurable (`src/core/backup.js`, extensión `.finanzas`). Implementado en `src/core/crypto.js`: PBKDF2-SHA-256 con 600.000 iteraciones, sal nueva por archivo, IV nuevo en cada guardado y cabecera autenticada. La clave solo vive en memoria mientras la app está desbloqueada; la pantalla de bloqueo y el bloqueo automático por inactividad van en la capa de pantallas.

## Importación de CSV
- Detectar el formato **por la cabecera**, nunca por el nombre del archivo (el idioma de la app cambia cabeceras y tipos).
- Normalizar fecha, decimal (punto o coma) y signo; convertir cada fila al movimiento común.
- Evitar duplicados al reimportar periodos solapados (clave por plataforma). Se puede subir cualquier CSV varias veces: entra solo lo nuevo; la foto de posiciones de DEGIRO se sustituye por la más reciente.
- Cada pantalla muestra en pequeño, bajo el título, "*actualizado el ... · último dato ...", calculado con `freshness()` de `src/core/store.js`; en amarillo si alguna fuente lleva más de 30 días. Datos muestra el detalle por archivo.
- Lo no reconocido va a "sin clasificar"; las reglas que aprenda la app se guardan en los datos cifrados, no en el código.
- Dividendos, intereses y comisiones de inversión son **rendimiento de la inversión**, no ingresos ni gastos del día a día.
- Los traspasos internos (pago de la tarjeta, paso al fondo monetario) no son gasto ni ingreso.

## Categorías
Modelo aprobado: se guarda la subcategoría detallada (32 de gasto, 5 de ingreso); los anillos muestran el grupo (8 de gasto, los del Excel: Vivienda, Alimentación, Transporte, Ocio y deporte, Compras personales, Suscripciones, Finanzas, Otros).
Además cada subcategoría de gasto tiene un **tipo** aparte: Fijo, Variable necesario o Discrecional. El tipo solo se edita en Datos > Categorías (no en Gastos ni en Ingresos); ahí también se crean categorías nuevas. Los cambios de tipo y las categorías nuevas se guardan en los datos cifrados, no en el código.

## Cosas a tener en cuenta al modificar el código
- **Ventas en DEGIRO:** por ahora no habrá ventas. El lector asume que una venta trae la cantidad negativa, pero no está comprobado con un extracto real. Si algún día hay ventas, verificarlo (y cómo afectan al coste medio) antes de fiarse.
- **Fondo monetario de Revolut:** el saldo es el capital en participaciones (compras − ventas); el rendimiento pagado menos la comisión es rendimiento de la inversión. Reinvertir o retirar rendimiento es mover dinero, no rendimiento nuevo.
- **Dividendos en dólares (DEGIRO):** se pasan a euros con el tipo de cambio de las filas de cambio de divisa del mismo día o de los 3 siguientes; si no hay, el importe en euros queda sin calcular.
- **Formatos sin muestra:** Revolut cuenta con la app en inglés y MyInvestor. Al añadirlos, detectar por cabecera y escribir pruebas con datos inventados.

## Estilo
- Textos de la app en español. Las frases empiezan con mayúscula; las explicaciones empiezan con "*" y en minúscula. No usar "Datos de ejemplo".
- Barra inferior fija con 7 pestañas, elevada para la barra del iPhone. Campos editables a 16 px o más.
- Colores: menta y esmeralda, con verde, rojo, azul y amarillo para el significado financiero.

## Commits
Mensajes en español, cortos. Antes de empujar: `git fetch origin main`.
