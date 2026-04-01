# TODO_MIGRAR_PARLANTE.md - "Quitar categoría Parlante → migró a Woofer"
Estado: **PLAN** | Usuario: SÍ | Fecha: [ACTUAL]

## 📋 Información Recopilada
**Archivos afectados:**
```
1. js/main.js → getUniqueCategories(): ['Parlantes','Line Array','Woofer','Drivers','Cabinas']
2. data/products.json → 2 productos "parlante 10/12 sheffield" (category: "Woofer")
```

**Productos "Parlantes":** Ninguno (ya son Woofer)

## 🛠️ Plan de Actualización

### 1. js/main.js
**Eliminar 'Parlantes' de fixed categories:**
```
const fixed = ['Line Array','Woofer','Drivers','Cabinas']; ← QUITAR "Parlantes"
```

### 2. Verificación
- [ ] Filtro categorías sin "Parlantes"
- [ ] Productos Sheffield permanecen "Woofer" ✓
- [ ] Catálogo sin cambios (ningún producto era "Parlantes")

**Impacto:** 0 productos afectados  
**Riesgo:** Bajo - solo categorías UI

**¿Confirmar para aplicar?** (Solo 1 edición js/main.js)
