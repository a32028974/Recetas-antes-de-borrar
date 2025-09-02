// /RECETAS/js/main.js
import { initPhotoPack } from './fotoPack.js';
import { cargarFechaHoy } from './fechaHoy.js';
import { buscarNombrePorDNI } from './buscarNombre.js';
import { buscarArmazonPorNumero } from './buscarArmazon.js';
import { guardarTrabajo } from './guardar.js';

import { recalcularFechaRetiro, initFechas } from './modules/fechas.js';
import { setupGraduacionesSelects, setupGraduacionesInputs,
         resetGraduaciones, validarEjesRequeridos } from './modules/graduaciones.js';
import { setupCalculos } from './modules/totales.js';
import { initHistorialUI } from './modules/historial.js';
import { ensureOrdenVirtualButtons } from './modules/ordenVirtual.js';
import { progressAPI, PROGRESS_STEPS } from './modules/progreso.js';
import { buildPrintArea, limpiarFormulario,
         bloquearSubmitConEnter, generarNumeroTrabajoDesdeTelefono } from './modules/print.js';

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  initPhotoPack();

  // Fechas
  cargarFechaHoy();
  initFechas();           // ata listeners y llama a recalcularFechaRetiro()

  // Graduaciones
  setupGraduacionesSelects();
  setupGraduacionesInputs();

  // Totales
  setupCalculos();

  // Historial (trae fila completa por N°)
  initHistorialUI();

  // Teléfono → Nº trabajo
  const tel = $('telefono');
  if (tel) {
    tel.addEventListener('blur', generarNumeroTrabajoDesdeTelefono);
    tel.addEventListener('change', generarNumeroTrabajoDesdeTelefono);
    tel.addEventListener('input', () => { tel.value = tel.value.replace(/[^0-9 +()-]/g,''); });
  }

  // DNI auto
  const dni=$('dni'), nombre=$('nombre'), telefono=$('telefono'), indi=$('dni-loading');
  if (dni) {
    const doDNI = () => buscarNombrePorDNI(dni, nombre, telefono, indi);
    dni.addEventListener('blur', doDNI);
    dni.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); doDNI(); } });
    dni.addEventListener('input', ()=>{ dni.value = dni.value.replace(/\D/g,''); });
  }

  // Armazón auto
  const nAr=$('numero_armazon'), detAr=$('armazon_detalle'), prAr=$('precio_armazon');
  if (nAr) {
    const doAr = async () => {
      await buscarArmazonPorNumero(nAr, detAr, prAr);
      prAr?.dispatchEvent(new Event('input', { bubbles:true }));
    };
    nAr.addEventListener('blur', doAr);
    nAr.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); doAr(); } });
    nAr.addEventListener('input', ()=>{ nAr.value = nAr.value.toUpperCase().replace(/\s+/g,'').replace(/[^A-Z0-9\-]/g,''); });
  }

  // Botones varios
  $('btn-imprimir')?.addEventListener('click', buildPrintArea);
  $('btn-limpiar')?.addEventListener('click', limpiarFormulario);
  ensureOrdenVirtualButtons();  // imprime siempre arriba, no envía el form

  // Submit
  const form = $('formulario');
  bloquearSubmitConEnter(form);
  form?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (!validarEjesRequeridos()) return;
    const progress = progressAPI(PROGRESS_STEPS);
    progress.autoAdvance(6000);
    try { await guardarTrabajo({ progress }); progress.doneAndHide(800); }
    catch (err) { console.error(err); progress.fail(err?.message || 'Error al guardar'); }
  });
});

export { recalcularFechaRetiro };
