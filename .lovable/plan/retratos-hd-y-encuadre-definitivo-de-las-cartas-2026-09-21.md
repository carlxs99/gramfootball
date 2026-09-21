# Retratos HD y encuadre definitivo de las cartas

## Objetivo
Rehacer los 170 futbolistas y 35 entrenadores para que cada retrato se vea nítido, profesional y correctamente integrado en la tarjeta tanto a tamaño completo como en miniatura.

## Cambios
- Regenerar los 205 retratos en formato vertical 2:3 y alta resolución real, sin ampliar recortes pequeños.
- Crear cada personaje con rostro ficticio y único, presencia de futbolista o entrenador de élite y calidad fotográfica editorial.
- Jugadores: encuadre desde la cabeza hasta la parte alta de los muslos, centrado, con aire mínimo sobre el pelo y brazos dentro del marco.
- Entrenadores: encuadre desde la cabeza hasta medio muslo, pose natural de banda y silueta completa dentro del área útil.
- Usar equipaciones y ropa ficticias, sin escudos, marcas ni copias reconocibles de personas reales.
- Mantener variedad realista de edad, género, físico y origen, respetando la identidad ya asignada a cada carta.
- Sustituir las imágenes actuales conservando exactamente los mismos identificadores, nombres, estadísticas y rarezas.

## Integración visual
- Ajustar el área fotográfica para que la imagen llene la tarjeta sin estirarse ni cortar cabeza, hombros o brazos.
- Reservar desde la propia composición la zona inferior oscura donde aparecen nombre y estadísticas.
- Aplicar un encuadre independiente para jugadores y entrenadores solo si sus composiciones lo requieren.
- Mantener el estilo táctico oscuro y cian del resto de GRAM Football.

## Verificación
- Comprobar dimensiones, nitidez y formato de los 205 archivos.
- Detectar duplicados exactos y retratos visualmente demasiado parecidos.
- Revisar muestras de todas las rarezas y ambos tipos de carta a tamaño completo y en miniatura móvil.
- Corregir cualquier cabeza cortada, figura demasiado pequeña, borde visible, texto solapado o imagen borrosa.
- Verificar la colección en móvil y escritorio y confirmar que la app carga sin errores.

## Detalles técnicos
- Resolución final mínima: 1280 × 1920 px por retrato.
- Generación directa en alta resolución; no se reutilizarán los recortes de 400 × 480 px actuales.
- Compresión WebP de alta calidad, conservando detalle facial y textura de ropa.
- `object-fit: cover` únicamente después de validar que la composición coincide con la proporción y zona útil de la tarjeta.
