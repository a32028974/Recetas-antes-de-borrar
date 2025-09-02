// /RECETAS/js/modules/ordenVirtual.js
const $ = (id) => document.getElementById(id);
const enc = (v) => encodeURIComponent((v ?? '').toString());

function textoArmazon(){
  const num = $('numero_armazon')?.value?.trim();
  const det = $('armazon_detalle')?.value?.trim();
  if (num && det) return `N° ${num} • ${det}`;
  if (num) return `N° ${num}`;
  return det || '';
}
function getDistanciaFocal(){
  const cand=['#distancia_focal','#distancia','#distanciaFocal','select[name="distancia_focal"]','select[name="distancia"]'];
  for (const sel of cand) { const el=document.querySelector(sel); if (el && el.value!=null) return (el.value||'').trim(); }
  return '';
}
function tomarDatos(){
  const n      = $('numero_trabajo')?.value?.trim() || '';
  const nombre = ($('nombre')?.value || '').trim().toUpperCase();
  const armazon = textoArmazon();
  const cristal = $('cristal')?.value?.trim() || '';
  const fecha   = $('fecha')?.value?.trim() || '';
  const df      = getDistanciaFocal();
  const od_esf=$('od_esf')?.value||'', od_cil=$('od_cil')?.value||'', od_eje=$('od_eje')?.value||'';
  const oi_esf=$('oi_esf')?.value||'', oi_cil=$('oi_cil')?.value||'', oi_eje=$('oi_eje')?.value||'';
  return { n, nombre, armazon, cristal, fecha, df, od_esf, od_cil, od_eje, oi_esf, oi_cil, oi_eje };
}
function abrir2Up(d){
  const url = 'print-orden-virtual-2up.html'
    + `?slot=1`
    + `&n=${enc(d.n)}&nombre=${enc(d.nombre)}`
    + `&armazon=${enc(d.armazon)}&cristal=${enc(d.cristal)}`
    + `&fecha=${enc(d.fecha)}&df=${enc(d.df)}`
    + `&od_esf=${enc(d.od_esf)}&od_cil=${enc(d.od_cil)}&od_eje=${enc(d.od_eje)}`
    + `&oi_esf=${enc(d.oi_esf)}&oi_cil=${enc(d.oi_cil)}&oi_eje=${enc(d.oi_eje)}`;
  window.open(url, '_blank');
}
function wire(btn){
  if (!btn) return;
  btn.type='button';
  btn.setAttribute('form','');
  btn.addEventListener('click',(ev)=>{
    ev.preventDefault(); ev.stopPropagation();
    const d = tomarDatos();
    if (!d.n) { if (window.Swal) Swal.fire('Atención','Falta el número de trabajo.','warning'); return; }
    abrir2Up(d);
  }, { capture:true });
}
export function ensureOrdenVirtualButtons(){
  const actions=document.querySelector('.actions');
  if (actions && !actions.querySelector('#btn-orden-virtual')) {
    const btn=document.createElement('button');
    btn.id='btn-orden-virtual';
    btn.textContent='Orden VIRTUAL (arriba)';
    btn.className='ghost';
    actions.appendChild(btn);
  }
  const selectors=['#btn-orden-virtual','#btn-orden-virtual-bottom','#btn-orden-virtual-primary','.btn-orden-virtual','[data-orden-virtual]','[data-action="orden-virtual"]'];
  new Set(selectors.flatMap(s=>Array.from(document.querySelectorAll(s)))).forEach(wire);

  // Delegación por si se agregan dinámicamente
  document.addEventListener('click', (ev)=>{
    const trg=ev.target.closest(selectors.join(', '));
    if (!trg) return;
    ev.preventDefault(); ev.stopPropagation();
    wire(trg); trg.click();
  }, { capture:true });
}
