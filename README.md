# Bazar Vecino — Frontend (Angular 18)

Interfaz para la tendera del bazar. Consume el backend `bazar-backend` (Node + Express + MySQL).
Standalone components, signals, nuevo control flow (`@if`/`@for`), carga diferida de todas las pantallas.

## Puesta en marcha

```bash
npm install
npm start            # http://localhost:4200  (abre el navegador)
```

1. Levanta antes el backend (`npm run dev` en `bazar-backend`, puerto 3000).
2. `src/environments/environment.ts` apunta a `http://localhost:3000/api`.
3. Para producción cambia `src/environments/environment.prod.ts` por la URL real del backend
   (terminando en `/api`) y agrega el dominio del frontend en `FRONTEND_URL` del backend (CORS).
4. `npm run build` → `dist/bazar-frontend/browser`.

Ingreso: la tendera entra con su `usuario_login`; el administrador (tú) con su correo desde el
enlace «Soy el administrador» de la pantalla de login (`/admin`: crear, suspender y reactivar tiendas).

> La cámara solo funciona en `https://` o en `localhost` (regla del navegador).

## Pantallas

| Ruta | Qué resuelve |
|---|---|
| `/mostrador` | **Un toque**: cuadrícula de favoritos y más vendidos, búsqueda predictiva (texto o voz), escáner con cámara, pistola USB, ticket con vuelto, pago en un toque (Efectivo / Yape-Plin / Tarjeta) y **Fiado Express** (Fiar → nombre → Guardar). «Deshacer» la última venta. |
| `/fiados` | El cuaderno digital: quién debe, historial, cobrar abonos, recordar por WhatsApp. |
| `/inventario` | Semáforo verde/amarillo/rojo, «Contar» (ajuste de stock), fijar favoritos, presentaciones (caja ×24), historial de movimientos. |
| `/mercaderia` | Carga rápida de factura del proveedor: busca/escanea, cantidad, costo, precio de venta; calcula unidades y margen. |
| `/caja` | Cierre visual (gaveta, Yape/Plin, fiado, total), **Cerrar día y guardar reporte**, resumen por WhatsApp, ventas del día con anulación, historial con gráfico. |
| `/cuenta` | Datos de la tienda, cambio de contraseña, cerrar sesión. |

## Diseño

- **Paleta**: crema (papel de cuaderno), dorado (monedas y rótulo), granate (toldo). Tokens en `src/styles.css`.
- **Tipografía**: *Fraunces* (serifa cálida para títulos y cifras de dinero) + *Figtree* (interfaz).
- **Iconos propios** (`shared/icono.component.ts`) y logo de toldo; sin emojis ni librerías de iconos.
- **Táctil primero**: todo lo que se toca mide ≥ 52 px; el botón de cobrar en efectivo es el más grande de la pantalla.
- **Tablet**: riel lateral granate. **Celular**: barra inferior y ticket como hoja que sube desde abajo.
- Productos sin foto → monograma de color estable por nombre (se reconoce rápido en la cuadrícula).
- El semáforo de stock nunca depende solo del color: lleva texto y una forma distinta.

## Cómo se conecta con el backend

- El **precio lo decide siempre el servidor**; el front solo envía `id_producto` y `cantidad`.
- Cada ticket lleva un `uuid_cliente` (guardado en el navegador). Si se cae el internet y se reintenta,
  el backend responde con la venta original y no se duplica. El ticket también sobrevive a recargas.
- Los vecinos se cargan una vez en memoria: el autocompletado del fiado es instantáneo.
- Errores del backend (`{status:'error', message}`) se muestran tal cual, en español. Un `401` fuera del login
  devuelve al login; sin internet se explica con palabras sencillas.

## Estructura

```
src/app/
  core/       modelos, sesión (JWT), interceptores, guards, servicios de API, ticket
  shared/     icono, logo, avatar, modal, semáforo, escáner, avisos
  layout/     shell (riel + barra inferior)
  pages/      login, mostrador, fiados, inventario, mercaderia, caja, cuenta, admin
```

## Siguientes pasos sugeridos

- PWA completa (`ng add @angular/pwa`) + cola de ventas sin internet (el `uuid_cliente` ya lo permite).
- Pruebas unitarias de `TicketService` y `format.ts`.
- Fotos de productos subidas desde el celular (hoy se acepta una URL).
