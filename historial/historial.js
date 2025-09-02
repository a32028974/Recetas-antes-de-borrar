// historial.js
import { API_URL as BASE } from '../js/api.js';
const API_URL = BASE;

// ====== helpers UI ======
const $  = (s) => document.querySelector(s);

function setSpin(on){ const sp = $('#spinner'); if (sp) sp.hidden = !on; }
function setStatus(msg){ const el = $('#status'); if (el) el.innerHTML = msg || ''; }
function showEmpty(show){ const el = $('#empty'); if (el) el.hidden = !show; } // <- corregido

// ====== estado ======
let ALL_ROWS = [];     // crudo del server
let FILTERED = [];     // con filtros cliente
const PAGE_SIZE = 50;
let page = 1;

// ====== render ======
function renderPage(){
  const tbody = $('#tbody');
  tbody.innerHTML = '';

  if (!FILTERED.length){
    showEmpty(true);              // <- mostrar cartel vacío
    $('#pager').hidden = true;
    $('#pageInfo').textContent = '';
    return;
  }
  showEmpty(false);

  const totalPages = Math.max(1, Math.ceil(FILTERED.length / PAGE_SIZE));
  page = Math.min(Math.max(1, page), totalPages);

  const start = (page-1)*PAGE_SIZE;
  const slice = FILTERED.slice(start, start + PAGE_SIZE);

  const frag = document.createDocumentFragment();
  slice.forEach(r=>{
    const pdf = r.pdf ? `<a href="${r.pdf}" target="_blank" rel="noopener">Abrir PDF</a>` : '<span style="opacity:.6">—</span>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.numero ?? ''}</td>
      <td>${r.fecha ?? ''}</td>
      <td>${r.nombre ?? ''}</td>
      <td>${r.dni ?? ''}</td>
      <td>${r.telefono ?? ''}</td>
      <td>${pdf}</td>
      <td class="row" style="gap:6px">
        <button class="btn-secondary" ${r.pdf?'':'disabled'} data-act="open" data-pdf="${r.pdf||''}">Abrir</button>
        <button class="btn-secondary" ${r.pdf?'':'disabled'} data-act="print" data-pdf="${r.pdf||''}">Imprimir</button>
        <button class="btn-secondary" ${r.pdf?'':'disabled'} data-act="copy" data-pdf="${r.pdf||''}">Copiar link</button>
      </td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);

  // pager
  $('#pager').hidden = (totalPages <= 1);
  $('#pageInfo').textContent = `Página ${page} de ${totalPages} — ${FILTERED.length} resultado${FILTERED.length!==1?'s':''}`;

  // acciones por fila
  tbody.querySelectorAll('button[data-act]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const pdf = btn.getAttribute('data-pdf');
      const act = btn.getAttribute('data-act');
      if (!pdf) return;

      if (act==='open'){
        window.open(pdf, '_blank', 'noopener');
      } else if (act==='print'){
        const w = window.open(pdf, '_blank', 'noopener');
        if (!w) return;
        const tryPrint = () => { try { w.focus(); w.print(); } catch(_){} };
        w.onload = tryPrint;
        setTimeout(tryPrint, 1200);
      } else if (act==='copy'){
        navigator.clipboard.writeText(pdf).then(()=>{
          if (window.Swal) Swal.fire({toast:true, position:'top', timer:1200, showConfirmButton:false, icon:'success', title:'Link copiado'});
        });
      }
    });
  });
}

// ====== filtros cliente ======
function applyFilters(){
  const pdfOnly = $('#pdfOnly').checked;

  FILTERED = ALL_ROWS.filter(r=>{
    if (pdfOnly && !r.pdf) return false;
    return true;
  });

  page = 1;
  renderPage();
}

// ====== buscar al servidor ======
async function buscar(){
  const q = $('#q').value.trim();
  if (!q){
    setStatus('Escribí algo para buscar…');
    ALL_ROWS = [];
    applyFilters();
    return;
  }

  setSpin(true);
  setStatus('');
  try{
    const url = `${API_URL}?buscar=1&q=${encodeURIComponent(q)}&limit=500`;

    const controller = new AbortController();              // timeout defensivo
    const t = setTimeout(()=>controller.abort(), 15000);

    const res = await fetch(url, { method:'GET', signal: controller.signal });
    clearTimeout(t);

    const raw = await res.text();                          // leemos como texto
    if (!res.ok){
      console.error('HTTP', res.status, raw);
      throw new Error(`HTTP ${res.status}`);
    }

    let json;
    try{
      json = raw ? JSON.parse(raw) : null;                 // intentamos parsear JSON
    }catch(parseErr){
      console.error('Respuesta no JSON:', raw);
      throw new Error('Respuesta del servidor inválida');
    }

    const rows = Array.isArray(json?.rows) ? json.rows : [];
    ALL_ROWS = rows.map(r=>({
      numero:    r.numero    || '',
      fecha:     r.fecha     || '',
      nombre:    r.nombre    || '',
      dni:       r.dni       || '',
      telefono:  r.telefono  || '',
      pdf:       r.pdf       || ''
    }));

    const updated = json?.updatedAt ? ` · Actualizado: ${json.updatedAt}` : '';
    setStatus(`<b>${ALL_ROWS.length}</b> resultado${ALL_ROWS.length!==1?'s':''}${updated}`);

    applyFilters();

  }catch(err){
    console.error('Buscar falló:', err);
    // Si abortó por timeout:
    const msg = (err.name === 'AbortError')
      ? 'La búsqueda tardó demasiado. Probá de nuevo.'
      : 'Error al buscar';
    setStatus(`<span style="color:#d33">${msg}</span>`);
    ALL_ROWS = [];
    applyFilters();
  }finally{
    setSpin(false);
  }
}

// ====== eventos ======
function attach(){
  $('#btnBuscar')?.addEventListener('click', buscar);
  $('#btnLimpiar')?.addEventListener('click', ()=>{
    $('#q').value = '';
    setStatus('');
    ALL_ROWS = [];
    applyFilters();
  });
  $('#q')?.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') buscar(); });

  $('#pdfOnly')?.addEventListener('change', applyFilters);

  $('#prev')?.addEventListener('click', ()=>{ page--; renderPage(); });
  $('#next')?.addEventListener('click', ()=>{ page++; renderPage(); });
}

attach();

// Búsqueda inicial opcional si viene ?q= en la URL
const params = new URLSearchParams(location.search);
if (params.get('q')) {
  $('#q').value = params.get('q');
  buscar();
}
