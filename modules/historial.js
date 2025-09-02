// /RECETAS/js/modules/historial.js
import { API_URL, withParams, apiGet } from '../api.js';

const $  = (id)  => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const normalizeKey = (k)=> String(k||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/\s+/g,'_').replace(/[^\w]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');

const ALIAS = {
  numero_trabajo: ['numero_trabajo','n_trabajo','n','num','numero','nro','sobre'],
  nombre: ['nombre','cliente','paciente'],
  dni: ['dni','doc','documento'],
  telefono: ['telefono','tel','celular','cel'],
  numero_armazon: ['numero_armazon','nro_armazon','n_armazon','armazon_numero'],
  armazon_detalle: ['armazon_detalle','armazon','detalle','detalle_armazon'],
  cristal: ['cristal','cristales','tipo_cristal','descripcion'],
  precio_cristal: ['precio_cristal','p_cristal'],
  precio_armazon: ['precio_armazon','p_armazon'],
  precio_otro: ['precio_otro','monto_otro','precio_tratamiento'],
  importe_obra_social: ['importe_obra_social','precio_obra_social'],
  sena: ['sena','senia','seña'],
  total: ['total'], saldo:['saldo'],
  fecha:['fecha','fecha_encargo'], fecha_retira:['fecha_retira','fecha_prometida'],
  od_esf:['od_esf'], od_cil:['od_cil'], od_eje:['od_eje'],
  oi_esf:['oi_esf'], oi_cil:['oi_cil'], oi_eje:['oi_eje'],
  add:['add','adicion'], dnp:['dnp'], df:['df','distancia_focal'],
  od:['od'], oi:['oi']
};
const getByAliases = (o, names)=> {
  for (const a of names){ const k=normalizeKey(a); const v=o[k]; if (v!==undefined && v!==null && String(v).trim()!=='') return v; }
  return '';
};
const parseGradLine=(s)=>{ if(!s) return {}; const m=String(s).replace(',', '.').match(/([+\-]?\d+(?:\.\d+)?)(?:\s+([+\-]\d+(?:\.\d+)?))?(?:\s*[xX]\s*(\d{1,3}))?/); if(!m) return {}; const [,esf,cil,eje]=m; return { esf, cil, eje }; };
function aplicarGraduacion(lado, o){
  const L=lado.toLowerCase();
  const dir={ esf:getByAliases(o,ALIAS[`${L}_esf`]||[]), cil:getByAliases(o,ALIAS[`${L}_cil`]||[]), eje:getByAliases(o,ALIAS[`${L}_eje`]||[]) };
  if (!(dir.esf && dir.cil)){ const linea=getByAliases(o,ALIAS[L]||[]); const p=parseGradLine(linea); dir.esf ||= p.esf; dir.cil ||= p.cil; dir.eje ||= p.eje; }
  if (dir.esf) document.getElementById(`${L}_esf`).value = dir.esf;
  if (dir.cil) document.getElementById(`${L}_cil`).value = dir.cil;
  if (dir.eje) document.getElementById(`${L}_eje`).value = dir.eje;
}
function setVal(id,val){ const el=$(id); if(!el || val==null) return; el.value=String(val); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }

export function fillFormFromRow(itemRaw={}){
  const o={}; Object.keys(itemRaw).forEach(k=>{ o[normalizeKey(k)] = itemRaw[k]; });
  const map = [
    ['numero_trabajo','numero_trabajo'],['nombre','nombre'],['dni','dni'],['telefono','telefono'],
    ['numero_armazon','numero_armazon'],['armazon_detalle','armazon_detalle'],['cristal','cristal'],
    ['precio_cristal','precio_cristal'],['precio_armazon','precio_armazon'],['precio_otro','precio_otro'],
    ['importe_obra_social','importe_obra_social'],['sena','sena'],['total','total'],['saldo','saldo'],
    ['fecha','fecha'],['fecha_retira','fecha_retira'],['add','add'],['dnp','dnp'],['df','df']
  ];
  map.forEach(([id,key])=>{ const v=getByAliases(o,ALIAS[key]||[key]); if(v!=='') setVal(id,v); });
  aplicarGraduacion('od', o); aplicarGraduacion('oi', o);
}

async function fetchTrabajoCompleto(n){
  if(!n) return null;
  for (const p of [{ op:'getTrabajo', n }, { getTrabajo:n }, { op:'trabajo', n }]){
    try{ const res = await apiGet(withParams(API_URL,p)); if (res?.row) return res.row; if(res?.ok && res?.data) return res.data; if (res && typeof res==='object' && !Array.isArray(res)) return res; }catch(e){}
  }
  return null;
}
const numeroFromItem = (it)=>{ const t={}; Object.keys(it).forEach(k=>t[normalizeKey(k)]=it[k]); return getByAliases(t, ALIAS.numero_trabajo)||''; };

async function tryHist(paramsList){
  for (const p of paramsList){ try{ const data = await apiGet(withParams(API_URL,p)); if (Array.isArray(data)) return data; }catch(e){} }
  return [];
}

export function initHistorialUI(){
  const host=$('historial'), q=$('hist-q'), lim=$('hist-limit'), btn=$('hist-buscar');
  const render=(items=[])=>{
    if (!host) return;
    if (!Array.isArray(items)||!items.length){ host.innerHTML='<em class="muted">Sin resultados</em>'; return; }
    const P=(...a)=> a.find(v=>v!=null && String(v).trim()!=='') ?? '';
    host.innerHTML = items.map((it,idx)=>{
      const n=P(it.numero,it.num,it.nro,it.n_trabajo,it.n,it.sobre);
      const nm=P(it.nombre,it.cliente,it.paciente);
      const cr=P(it.cristal,it.cristales,it.tipo_cristal,it.descripcion,it.detalle,it.armazon,it.armazon_detalle);
      return `<button type="button" class="hist-item" data-idx="${idx}" data-json="${encodeURIComponent(JSON.stringify(it))}"
              style="display:block;width:100%;text-align:left;padding:8px 10px;margin:6px 0;border:1px solid #e5e7eb;border-radius:10px;background:#fff;">
              🧾 <strong>${n||'—'}</strong> — ${nm||'SIN NOMBRE'} — <span>${cr||'—'}</span></button>`;
    }).join('');
  };

  const cargarUltimos = async(limit=15)=>{ const data=await tryHist([{ histUltimos:limit },{ hist:1, limit }]); render(data); };

  lim && (lim.value='15'); cargarUltimos(15);
  btn?.addEventListener('click', async()=>{
    const limit=parseInt(lim?.value||'100',10)||100;
    const query=(q?.value||'').trim();
    const data=await tryHist([{ histBuscar: query, limit },{ hist:1, limit, q:query }]);
    render(data);
  });
  q?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); btn?.click(); } });

  host?.addEventListener('click', async(e)=>{
    const el=e.target.closest('.hist-item'); if(!el) return;
    const it=JSON.parse(decodeURIComponent(el.dataset.json||'%7B%7D'));
    const n=numeroFromItem(it);
    const full=await fetchTrabajoCompleto(n);
    fillFormFromRow(full || it);
    window.scrollTo({ top:0, behavior:'smooth' });
  });
}
