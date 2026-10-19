# Llevar GRAM Football a otro servidor

Esta guía copia la app entera (código + datos) a un servidor nuevo.

## Qué se copia

Jugadores (saldo, cartas, niveles, referidos, baneos), tareas y su progreso,
IPs para la detección de multicuentas, depósitos TON y punto de escaneo,
retiros, pagos y entregas pendientes, mercado (ventas e intercambios),
torneos semanales y registro de broadcasts y posts del canal.

## Paso 1 — Montar la copia nueva

1. Despliega el mismo código (los ZIP descargados) en el nuevo hosting.
2. Crea una base de datos Postgres vacía y ejecuta `docs/migracion/esquema.sql`
   (son todas las migraciones en orden). Necesita las extensiones `pg_cron` y `pg_net`
   para las tareas automáticas.
3. Configura en el servidor nuevo las mismas variables:
   `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`,
   `TON_WALLET_MNEMONIC`, `TONCENTER_API_KEY`, `BACKUP_API_KEY` (la misma clave
   que en la app actual) y las de la base de datos (`SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).

## Paso 2 — Importar los datos

La importación **solo funciona si la copia nueva no tiene jugadores**. Una app con
jugadores nunca se sobrescribe.

### Opción A: la copia nueva se conecta a la actual (recomendado)

```bash
curl -X POST https://NUEVO-SERVIDOR/api/public/backup/import \
  -H "Authorization: Bearer TU_BACKUP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"https://gramfootball.lovable.app"}'
```

Si las dos apps usan claves distintas, define `BACKUP_SOURCE_KEY` en la nueva con la
clave de la app actual.

### Opción B: con un archivo

1. Descarga la copia:

   ```bash
   curl https://gramfootball.lovable.app/api/public/backup/export \
     -H "Authorization: Bearer TU_BACKUP_API_KEY" -o copia.json
   ```

   O, desde el panel de administración → pestaña **Copia** → «Enviar copia a mi
   Telegram», y el bot te manda el archivo.

2. Súbela a la copia nueva:

   ```bash
   curl -X POST https://NUEVO-SERVIDOR/api/public/backup/import \
     -H "Authorization: Bearer TU_BACKUP_API_KEY" \
     -H "Content-Type: application/json" --data-binary @copia.json
   ```

   O en el panel de administración de la copia nueva → **Copia** → «Cargar copia».

## Paso 3 — Cambiar a la copia nueva

Haz el cambio de una vez, nunca con las dos apps activas a la vez (comparten bot y
wallet TON, y podrían pagar dos veces):

1. Importa los datos justo antes del cambio para que estén al día.
2. Apunta el webhook del bot de Telegram al nuevo servidor
   (`/api/public/telegram/setup` en la copia nueva).
3. Programa las tareas automáticas en la base nueva (depósitos, broadcasts, torneo)
   con las funciones `schedule_gram_football_*` y la URL del nuevo servidor.
4. Cambia el enlace de la Mini App en BotFather a la nueva URL.
5. Apaga la app antigua.

## Seguridad

- Sin la clave `BACKUP_API_KEY` la API responde «Unauthorized».
- El archivo de copia contiene datos de jugadores (IDs de Telegram, usuarios, wallets):
  guárdalo en un lugar privado.
