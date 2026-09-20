# Partidos: alineación con tus cartas y partido animado

Nueva sección donde cada usuario forma su once con las cartas de su álbum, paga una entrada en GRAM y se enfrenta a la alineación guardada de otro usuario real. El partido se ve como una animación en el campo con narración minuto a minuto, y el ganador se lleva el bote.

Aviso importante antes de construirlo: como el GRAM se puede convertir en TON, cobrar una entrada y pagar al ganador es, legalmente, apostar con dinero real. Eso normalmente exige licencia, verificación de edad y bloqueo por países. Una alternativa sin ese riesgo es que la entrada sean "entradas de partido" diarias gratuitas y el premio sean cartas y puntos de liga. Lo construyo con entrada en GRAM tal como pediste, pero dejo el importe de la entrada y el premio configurables en un solo sitio para poder cambiarlo a entradas gratuitas sin rehacer nada.

## Cómo lo vive el usuario

1. Nueva pestaña **Partidos** en la barra inferior.
2. **Mi alineación**: elige 11 cartas de su álbum en formación 4-3-3 (portero, defensas, medios, delanteros). Cada carta aporta sus seis atributos; colocarla en su posición natural da un pequeño bonus, fuera de posición una penalización. Arriba se ve la fuerza total del equipo.
3. **Jugar partido**: elige una de tres mesas de entrada (por ejemplo 1, 5 y 20 GRAM). Se empareja con la alineación guardada de otro jugador de fuerza parecida.
4. **El partido**: pantalla de campo con las cartas colocadas, el balón moviéndose entre ellas, marcador, minuto y narración que va apareciendo ("Minuto 34 — centro al área, remate de VANDEN y gol"). Dura unos 60 segundos con opción de saltar al resultado.
5. **Resultado**: premio acreditado, resumen con goleadores, mejor jugador del partido y puntos de liga. Historial de últimos partidos y clasificación semanal de Partidos.

## Reglas del juego

- Once obligatorio: 11 cartas distintas, sin repetir.
- Fuerza de cada carta: media ponderada de sus atributos según la posición (un delantero pesa más TIR/RIT, un defensa DEF/FIS), más el nivel de la carta.
- El partido se resuelve en el servidor: 90 minutos simulados en turnos, cada ataque compara ataque contra defensa con un dado. Empate se resuelve con penaltis.
- La animación y la narración son una reproducción de los eventos que el servidor ya decidió, así que lo que ve el usuario es exactamente el resultado real.
- Bote: las dos entradas menos una comisión del 5%. El ganador cobra el resto.
- Puntos de liga: 3 por victoria, 1 por empate resuelto, 0 por derrota.

## Anti-abuso

- Entrada, emparejamiento, simulación y pago se hacen solo en el servidor con la sesión firmada de Telegram; el cliente nunca decide el resultado.
- La entrada se cobra antes de simular y el premio se paga una sola vez por partido (registro único por partido, sin dobles pagos).
- Solo cartas que el jugador posee realmente, comprobadas en el servidor en cada partido.
- Cuentas bloqueadas no pueden jugar ni recibir premios.
- Un partido a la vez por cuenta; límite diario de partidos por cuenta.
- No se empareja a un jugador consigo mismo, ni con cuentas de su misma red o misma cartera (reutiliza la detección de multicuentas ya existente) para evitar granjas que se pasen GRAM entre sí.
- El administrador queda fuera de la clasificación de Partidos.

## Detalles técnicos

- Migración: tablas `match_lineups` (once guardado por jugador), `matches` (rivales, entrada, resultado, eventos, semilla, estado), `match_league` (puntos semanales). RLS activada y GRANT solo a `service_role`; todo el acceso pasa por funciones de servidor.
- Nuevo `src/lib/matches.ts` (posiciones, pesos por posición, cálculo de fuerza, constantes de entrada y comisión) y `src/lib/match-sim.ts` (simulación determinista con semilla, devuelve lista de eventos con minuto, tipo, jugador y marcador).
- Nuevo `src/lib/matches.functions.ts`: `getLineup`, `saveLineup`, `playMatch` (cobra entrada, empareja, simula, paga, registra), `getMatchHistory`, `getMatchLeague`. Pagos y cobros mediante RPC atómica `settle_match` (solo `service_role`) para evitar carreras.
- Nuevas rutas `src/routes/matches.tsx` (alineación + mesas) y `src/routes/matches.play.$id.tsx` (campo animado y narración), con `head()` propio. Icono nuevo en `FootballNavIcon.tsx` y entrada en `BottomNav.tsx`.
- Animación con CSS y estado en React sobre los eventos del servidor, en el tema táctico oscuro/cian actual. Las cartas coleccionables no se modifican.
- Textos nuevos en los 6 idiomas de `src/lib/i18n.ts`.
- Verificación con `tsgo` y Playwright en móvil: guardar alineación, jugar un partido y comprobar cobro, premio y clasificación.
