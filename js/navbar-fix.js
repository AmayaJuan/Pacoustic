/**
 * ========================================
 * PA ACOUSTIC - Fix Dynamic Navbar
 * ========================================
 * Este script calcula automáticamente la altura del navbar
 * y aplica el padding correspondiente al body para evitar
 * que el contenido quede oculto en tablets y dispositivos móviles.
 * 
 * Solución dinámica que:
 * - Detecta la altura del navbar al cargar
 * - Aplica padding-top al body igual a la altura del navbar
 * - Recalcula automáticamente al cambiar tamaño de ventana
 * - Maneja cambio de orientación en móviles
 */

(function() {
  'use strict';

  // Elemento del navbar
  var navbar = document.querySelector('nav');
  
  // Verificar que existe el navbar
  if (!navbar) {
    console.warn('PA Acoustic: No se encontró el elemento nav');
    return;
  }

  /**
   * Función principal que calcula y aplica el padding
   */
  function aplicarPaddingNavbar() {
    // Obtener la altura computada del navbar
    var alturaNavbar = navbar.offsetHeight;
    
    // Verificar que tenemos una altura válida
    if (alturaNavbar > 0) {
      // Aplicar padding-top al body
      document.body.style.paddingTop = alturaNavbar + 'px';
      
      console.log('PA Acoustic: Padding aplicado - ' + alturaNavbar + 'px');
    }
  }

  // Aplicar padding al cargar la página
  window.addEventListener('load', aplicarPaddingNavbar);

  // Recalcular padding al cambiar el tamaño de ventana
  // Usando debounce para mejorar rendimiento
  var timeoutDeResize = null;
  
  window.addEventListener('resize', function() {
    // Limpiar timeout anterior
    if (timeoutDeResize) {
      clearTimeout(timeoutDeResize);
    }
    
    // Aplicar nuevo padding después de 150ms de inactividad
    timeoutDeResize = setTimeout(aplicarPaddingNavbar, 150);
  });

  // Manejar cambio de orientación en dispositivos móviles
  window.addEventListener('orientationchange', function() {
    // Aplicar padding después de que cambie la orientación
    setTimeout(aplicarPaddingNavbar, 100);
  });

  console.log('PA Acoustic: Sistema de padding dinámico del navbar inicializado');

})();

