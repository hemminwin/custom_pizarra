# Pizarra de Pedidos — versión ultrasimple

No necesitas instalar absolutamente nada.

La web real son solo tres archivos:

- `index.html` — contiene toda la interfaz, estilos y funcionamiento.
- `firebase-config.js` — aquí pegas la configuración que te da Firebase.
- `database.rules.json` — copias su contenido una vez en las reglas de Realtime Database.

`README.md` es solamente este manual.

## PASO 1 — Crear Firebase

1. Entra en https://console.firebase.google.com/
2. Crea un proyecto. Puedes desactivar Google Analytics.
3. Dentro del proyecto abre **Realtime Database**.
4. Pulsa **Crear base de datos** y crea la base.

## PASO 2 — Reglas de la base

1. En **Realtime Database > Reglas**, borra las reglas que haya.
2. Abre `database.rules.json` con el Bloc de notas.
3. Copia todo su contenido.
4. Pégalo en Firebase.
5. Pulsa **Publicar**.

Estas reglas permiten trabajar sin iniciar sesión. Es la versión más sencilla, pero no es adecuada para información confidencial: quien consiga los datos técnicos de tu proyecto Firebase podría intentar leer o modificar la base.

## PASO 3 — Conseguir la configuración

1. Vuelve a **Descripción general del proyecto**.
2. Pulsa el icono Web `</>`.
3. Pon de nombre `Pizarra de Pedidos`.
4. NO necesitas Firebase Hosting.
5. Firebase mostrará un bloque `firebaseConfig`.
6. Abre `firebase-config.js` con el Bloc de notas y sustituye los `PEGA_AQUI` por esos datos.

Necesitas especialmente `databaseURL`. Si no aparece en el bloque, copia la URL que ves en Realtime Database; normalmente termina en `firebasedatabase.app`.

## PASO 4 — GitHub

1. Crea un repositorio llamado, por ejemplo, `pizarra-pedidos`.
2. Sube `index.html` y `firebase-config.js`. Puedes subir también README y `database.rules.json`; no afectan a la web.
3. En el repositorio ve a **Settings > Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Selecciona `main` y `/ (root)`.
6. Pulsa Guardar.

GitHub te dará una dirección parecida a:

`https://TUUSUARIO.github.io/pizarra-pedidos/`

## PASO 5 — Los tres ordenadores

Abre esa misma dirección en los tres PCs. No hay usuarios ni contraseñas. Cuando uno añade, modifica o elimina un pedido, Firebase transmite el cambio a los demás en tiempo real.

## Qué incluye

- Nº de pedido.
- Cliente.
- Artículos (admite varias líneas pegadas).
- Fecha.
- Añadir, editar y eliminar.
- Búsqueda.
- Sincronización en tiempo real.
- Exportar copia JSON.
- Importar copia JSON.
- Diseño de pizarra blanca.
- Una única lista de pedidos, uno debajo de otro.

## Coste

Para un uso pequeño, el plan Spark de Firebase Realtime Database dispone de cuota gratuita. Revisa sus límites vigentes si el uso crece.
