# 📈 Quant Dashboard

Dashboard personal para visualización de señales cuantitativas generadas automáticamente.

Este proyecto **NO es multiusuario** y **NO ejecuta modelos** en el frontend.  
El frontend solo **consume datos ya calculados** desde un backend cuantitativo.

---

## 🎯 Objetivo

Mostrar, de forma clara y honesta:

- Señal activa por activo (ej: SPY)
- Qué está diciendo HOY el modelo sobre los próximos días
- Precio actual vs precio objetivo
- Horizonte temporal
- Estado de validación (aunque aún no exista historial)
- Confianza y calidad **solo cuando sea estadísticamente válido**

> ❗ Nunca se muestran datos “rotos”, vacíos o engañosos.

---

## 🧠 Filosofía del sistema

- El modelo **predice hoy** lo que puede pasar en *N días*
- La evaluación **solo aparece con el tiempo**
- La ausencia de validación es un **estado válido**, no un error

Ejemplo de estado inicial:

