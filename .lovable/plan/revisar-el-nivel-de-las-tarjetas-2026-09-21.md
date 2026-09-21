# Revisar el nivel de las tarjetas

## Cambios
- Corregir cualquier diferencia entre el nivel guardado, el nivel mostrado y el aumento por duplicados.
- Mostrar el nivel real alcanzado al revelar cartas de un sobre y en su resumen.
- Tratar correctamente el nivel máximo para que la barra de progreso no vuelva a cero ni la producción supere el límite.
- Mantener intactos precios, probabilidades, estadísticas y recompensas.
- Verificar el resultado en el álbum y al abrir sobres.

## Detalles técnicos
- Centralizar el cálculo del nivel de carta y su progreso de XP.
- Limitar el multiplicador de producción al nivel máximo permitido.
- Incluir el nivel resultante en cada carta obtenida del sobre.
