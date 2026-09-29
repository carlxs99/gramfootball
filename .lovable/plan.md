# Traducir completamente el ranking

## Cambios
- Mover los textos visibles del ranking semanal al sistema común de traducciones.
- Añadir traducciones completas para inglés, español, ruso, árabe, hindi y portugués.
- Traducir títulos, cuenta atrás, premios, posición personal, referidos, estados vacíos, ganadores anteriores y etiquetas de premios.
- Mantener en inglés los mensajes automáticos del canal y privados, como se acordó anteriormente.

## Verificación
- Comprobar los seis idiomas en la pantalla del ranking, incluido el sentido de lectura árabe.
- Confirmar que no quedan textos visibles fijados en inglés o español y que la app carga sin errores.

## Detalles técnicos
- Reutilizar `useT` y las claves de `src/lib/i18n.ts` en lugar del diccionario local limitado a dos idiomas.
- No cambiar clasificación, premios, fechas ni entrega automática.
