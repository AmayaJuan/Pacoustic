// ========================================
// PA ACOUSTIC — modalZoom.js
// Zoom sutil en imagen principal del modal
// ========================================

const MODAL_ZOOM_CONFIG = {
  currentZoom: 1,
  maxZoom: 1.12,     // ← zoom máximo sutil (12% más grande)
  minZoom: 1,       // ← nunca más pequeño que el tamaño original
  step: 0.04        // Pasos de 4% por scroll
};

function modalZoomInit() {
  const imgMain = document.getElementById('modalImgMain');
  if (!imgMain) return;

  // Reset al abrir
  MODAL_ZOOM_CONFIG.currentZoom  = 1;
  imgMain.style.transform        = 'scale(1)';
  imgMain.style.transformOrigin  = 'center center';
  imgMain.style.transition       = 'transform 0.25s ease';

  imgMain.addEventListener('wheel',    _zoomWheel,   { passive: false });
  imgMain.addEventListener('dblclick', _zoomReset);
}

function _zoomWheel(e) {
  e.preventDefault();
  e.stopPropagation();

  const delta = e.deltaY > 0 ? -MODAL_ZOOM_CONFIG.step : MODAL_ZOOM_CONFIG.step;  // ← Fix indent + restricción zoom
  MODAL_ZOOM_CONFIG.currentZoom = Math.max(
    MODAL_ZOOM_CONFIG.minZoom,
    Math.min(MODAL_ZOOM_CONFIG.maxZoom, MODAL_ZOOM_CONFIG.currentZoom + delta)
  );

  const imgMain = document.getElementById('modalImgMain');
  if (imgMain) imgMain.style.transform = `scale(${MODAL_ZOOM_CONFIG.currentZoom})`;
}

function _zoomReset(e) {
  e.preventDefault();
  MODAL_ZOOM_CONFIG.currentZoom = 1;
  const imgMain = document.getElementById('modalImgMain');
  if (imgMain) imgMain.style.transform = 'scale(1)';
}

function modalZoomCleanup() {
  const imgMain = document.getElementById('modalImgMain');
  if (!imgMain) return;
  imgMain.removeEventListener('wheel',    _zoomWheel);
  imgMain.removeEventListener('dblclick', _zoomReset);
  // Reset visual al cambiar imagen o cerrar
  MODAL_ZOOM_CONFIG.currentZoom = 1;
  imgMain.style.transform = 'scale(1)';
}