# Pizarra de Pedidos — versión simple

Esta versión NO necesita Node.js, npm, Wrangler ni Cloudflare.

Solo usa:

- GitHub Pages para publicar la web.
- Firebase Realtime Database para guardar y sincronizar los pedidos.

## Archivos

- `index.html`
- `styles.css`
- `firebase-config.js`
- `app.js`
- `database.rules.json`

La configuración de tu proyecto Firebase ya está puesta en `firebase-config.js`.

## 1. Configurar las reglas de Firebase

En Firebase:

1. Entra en **Realtime Database**.
2. Abre la pestaña **Reglas**.
3. Borra lo que haya.
4. Copia TODO el contenido de `database.rules.json`.
5. Pulsa **Publicar**.

IMPORTANTE: estas reglas permiten leer y escribir en `pedidos` sin inicio de sesión.
Eso hace posible usar la pizarra sin cuentas, pero no es privacidad fuerte.

## 2. Subir la web a GitHub

Crea un repositorio nuevo en GitHub, por ejemplo:

`pizarra-pedidos`

Sube estos cuatro archivos a la RAÍZ del repositorio:

- `index.html`
- `styles.css`
- `firebase-config.js`
- `app.js`

`database.rules.json` puede quedarse también en el repositorio, aunque Firebase no lo lee automáticamente.

## 3. Activar GitHub Pages

En GitHub:

1. Entra en tu repositorio.
2. **Settings**
3. **Pages**
4. En **Build and deployment**, elige **Deploy from a branch**.
5. Rama: `main`
6. Carpeta: `/ (root)`
7. Pulsa **Save**.

GitHub te mostrará una dirección parecida a:

`https://TU-USUARIO.github.io/pizarra-pedidos/`

Usa esa misma dirección en los tres ordenadores.

## 4. Probar

Abre la web.

El indicador debe pasar de:

`Conectando...`

a:

`Sincronizado`

Crea un pedido y abre la misma URL en otro ordenador o en otra ventana.
El pedido debe aparecer automáticamente.

## Si se queda en "Conectando..."

Pulsa `F12` y abre **Consola**.

- Si aparece `PERMISSION_DENIED`, las reglas de Firebase no están publicadas correctamente.
- Si aparece `firebase is not defined`, algún script de Firebase no se ha cargado.
- Si aparece un error 404 con `firebase-config.js`, `app.js` o `styles.css`, esos archivos no están en la raíz del repositorio.

## Seguridad

La configuración `firebaseConfig` que aparece en `firebase-config.js` es pública por diseño en las aplicaciones web de Firebase.

La versión actual no usa autenticación porque el objetivo es no tener inicios de sesión. Por ello, cualquier persona que conozca la base de datos y pueda acceder a ella podría intentar leer o modificar los pedidos. No guardes datos especialmente sensibles en esta versión.
