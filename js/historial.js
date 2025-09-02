// js/historial.js
import { API_URL } from './api.js';

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function norm(s){
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // sin tildes
    .toLowerCase().trim();
}
function onlyDigits(s){ return String(s||'').replace(/\D+/g,''); }

function setSpin(on){ const sp = $('#hist-spinner'); if (sp) sp.hidden = !on; }
function setStatus(msg){ const el = $('#hist-status'); if (el) el.innerHTML = msg || ''; }

function buildQueryParts(qraw){
  // tokens preservando "comillas"; @123 o "123" => exacto por número
  const parts = qraw ? (qraw.match(/"[^"]+"|\S+/g) || []) : [];
  const exactNums = [];
  const free = [];
  for (const p of parts){
    const s = p.trim();
    let m = s.match(/^[#@](\d+)$/);    // @123 o #123
    if (m) { exactNums.push(m[1]); continue; }
    m = s.match(/^"(\d+)"$/);          // "123"
    if (m) { exactNums.push(m[1]); continue; }
    free.push(s.replace(/^["']|["']$/g,''));
  }
  return { exactNums, free };
}

function renderRows(rows){
  const tbody = $('#hist-body');
  const empty = $('#hist-empty');
  tbody.innerHTML = '';
  if (!rows || !rows.length){
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  const frag = document.createDocumentFragment();
  rows.forEach(r=>{
    const tr = document.createElement('tr');
    const pdf = r.pdf ? `<a href="${r.pdf}" target="_blank" rel="noopener">Abrir PDF</a>` : '<span style="opacity:.6">—</span>';
    tr.innerHTML = `
      <td>${r.numero ?? ''}</td>
      <td>${r.fecha ?? ''}</td>
      <td>${r.nombre ?? ''}</td>
      <td>${r.dni ?? ''}</td>
      <td>${r.telefono ?? ''}</td>
      <td>${pdf}</td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

async function buscar(){
  const qraw = $('#hist-q').value.trim();
  setStatus('');
  setSpin(true);
  try{
    const url = `${API_URL}?buscar=1&q=${encodeURIComponent(qraw)}&limit=100`;
    const res = await fetch(url, { method:'GET' });
    if (!res.ok) throw new Error('HTTP '+res.status);
    const json = await res.json();

    // forma esperada: { ok:true, rows:[{numero, fecha, nombre, dni, telefono, pdf}], total }
    const rows = Array.isArray(json?.rows) ? json.rows : [];
    renderRows(rows);
    setStatus(rows.length ? `<b>${rows.length}</b> resultado(s)` : 'Sin resultados');

  }catch(e){
    console.error('historial buscar error:', e);
    setStatus('<span style="color:#d33">Error al buscar</span>');
    renderRows([]);
  }finally{
    setSpin(false);
  }
}

function clear(){
  $('#hist-q').value = '';
  renderRows([]);
  setStatus('');
}

function attach(){
  $('#hist-search')?.addEventListener('click', buscar);
  $('#hist-clear')?.addEventListener('click', clear);
  $('#hist-q')?.addEventListener('keydown', e=>{
    if (e.key === 'Enter') buscar();
  });
}

attach();
