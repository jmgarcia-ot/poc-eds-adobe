# Nivel de encabezado seleccionable y auditoría de encabezados

## 1. Nivel estructural de encabezado en bloques

El nivel (h2…h6) es independiente del estilo visual. La lógica vive en un único helper,
`applyHeadingLevel(block)` en `scripts/scripts.js`; cada bloque llama a `extractHeadingLevel(block)` al inicio y a `applyHeadingLevel(block)` al final de `decorate()`
(hoy: `cards` y `teaser`).

**Uso del autor (DA):** añadir la variante al nombre del bloque, p. ej. `Cards (heading-h3)`.
El primer encabezado del bloque pasa a ser h3 y el resto mantiene su desfase relativo.
El aspecto no cambia: el encabezado conserva su estilo original mediante las clases `.h1`–`.h6`
(`styles/styles.css`). Sin variante, el bloque no se toca.

**Nuevo bloque:** `import { applyHeadingLevel, extractHeadingLevel } from '../../scripts/scripts.js';` y llamarlos al inicio y al final del `decorate()`.
Si el CSS del bloque selecciona por etiqueta (`h3`), usar `:is(h3, .h3)`.

**Desplegable en da.live (hoja options):** el bloque puede llevar una fila de configuración
`heading-level | h4`. `extractHeadingLevel(block)` (al inicio de `decorate()`) la lee, la quita del
bloque y la convierte en la variante `heading-hN`. Para ofrecerla como desplegable, añadir en la hoja
*options* de la Library una fila con `key = heading-level`, `blocks = cards, teaser`,
`values = h2|h3|h4|h5|h6` y `type = single`. Un valor no válido se ignora.
Las dos formas (variante en el nombre o fila `heading-level`) son equivalentes.

## 2. Plugin de auditoría (`tools/plugins/heading-audit`)

Plugin de la Library de DA que lee el documento abierto y avisa de: sin h1 o más de un h1,
saltos de nivel y encabezados vacíos. La lógica pura está en `audit.js`.

Registro: añadir en la config de la Library del sitio una entrada de plugin con
`title = Auditoría de encabezados` y `path = /tools/plugins/heading-audit/heading-audit.html`.
Con `ref=local` en la URL de da.live se prueba contra `http://localhost:3000`.
