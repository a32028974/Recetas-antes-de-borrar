// js/print.js
// Render del layout de impresión (#print-root) + print seguro.

const $ = (id) => document.getElementById(id);
const safe = (v) => (v ?? "").toString().trim();
const money = (v) => (v ? `$ ${v}` : "");

// Setter seguro
function setText(id, value) {
  const el = $(id);
  if (!el) { console.warn(`[print] Falta nodo #${id}`); return; }
  el.textContent = value;
}

// Chequea que existan los nodos mínimos del template
function assertPrintDOM() {
  const needed = [
    "pv-numero","pv-cliente","pv-dni","pv-tel","pv-fecha","pv-retira",
    "pv-od-esf","pv-od-cil","pv-od-eje","pv-oi-esf","pv-oi-cil","pv-oi-eje",
    "pv-cristal","pv-armazon","pv-entrega","pv-dnp","pv-add","pv-dr",
    "pv-total","pv-sena","pv-saldo",
    "cpn-numero","cpn-cliente","cpn-retira","cpn-tel","cpn-total",
    "print-logo","print-barcode","coupon-barcode"
  ];
  const missing = needed.filter((id) => !$(id));
  if (missing.length) {
    throw new Error(`Faltan nodos de impresión: ${missing.map((s)=>'#'+s).join(', ')}`);
  }
}

// Código de barras simple (placeholder)
function drawBarcodeToImg(imgEl, text, { width = 480, height = 140 } = {}) {
  if (!imgEl) return;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#000";

  const seed = Array.from(text || "").reduce((a, c) => a + c.charCodeAt(0), 0) || 1;
  let x = 10;
  const max = width - 10;
  while (x < max) {
    const w = 1 + ((x * seed) % 4);
    const h = height - 20 - ((x * seed) % 10);
    ctx.fillRect(x, 10, w, h);
    x += w + 1 + ((x + seed) % 3);
  }
  ctx.font = "16px system-ui, Arial";
  ctx.textAlign = "center";
  ctx.fillText(text || "", width / 2, height - 4);

  imgEl.src = canvas.toDataURL("image/png");
}

function imgLoaded(img) {
  if (!img || !img.src) return Promise.resolve();
  return new Promise((res) => {
    if (img.complete) return res();
    img.onload = () => res();
    img.onerror = () => res();
  });
}

export async function renderAndPrint({
  numero,
  fecha,
  fechaRetira,
  nombre,
  dni,
  telefono,
  dr,
  cristal, precioCristal,
  armazonNumero, armazonDetalle, precioArmazon,
  entregaLabel,
  od_esf, od_cil, od_eje,
  oi_esf, oi_cil, oi_eje,
  dnp, add,
  total, sena, saldo,
  fotoDataUrl // opcional
}) {
  // Verificación de DOM
  assertPrintDOM();

  // Panel
  setText("pv-numero",  safe(numero));
  setText("pv-cliente", safe(nombre));
  setText("pv-dni",     safe(dni));
  setText("pv-tel",     safe(telefono));
  setText("pv-fecha",   safe(fecha));
  setText("pv-retira",  safe(fechaRetira));

  setText("pv-od-esf",  safe(od_esf));
  setText("pv-od-cil",  safe(od_cil));
  setText("pv-od-eje",  safe(od_eje));
  setText("pv-oi-esf",  safe(oi_esf));
  setText("pv-oi-cil",  safe(oi_cil));
  setText("pv-oi-eje",  safe(oi_eje));

  setText("pv-cristal", [safe(cristal), money(precioCristal)].filter(Boolean).join(" "));
  setText("pv-armazon", [safe(armazonNumero), safe(armazonDetalle), money(precioArmazon)].filter(Boolean).join(" "));
  setText("pv-entrega", safe(entregaLabel));
  setText("pv-dnp",     safe(dnp));
  setText("pv-add",     safe(add));
  setText("pv-dr",      safe(dr));

  setText("pv-total",   money(total));
  setText("pv-sena",    money(sena));
  setText("pv-saldo",   money(saldo));

  // Foto
  const foto = $("panel-foto");
  if (foto) {
    if (fotoDataUrl) {
      foto.src = fotoDataUrl;
      foto.style.visibility = "visible";
    } else {
      foto.removeAttribute("src");
      foto.style.visibility = "hidden";
    }
  }

  // Cupón
  setText("cpn-numero",  `N° ${safe(numero)}`);
  setText("cpn-cliente", safe(nombre));
  setText("cpn-retira",  safe(fechaRetira));
  setText("cpn-tel",     safe(telefono));
  setText("cpn-total",   money(total));

  // Barcodes
  drawBarcodeToImg($("print-barcode"),  safe(numero), { width: 560, height: 160 });
  drawBarcodeToImg($("coupon-barcode"), safe(numero), { width: 420, height: 120 });

  // Esperar imágenes
  await Promise.all(
    [$("print-logo"), $("print-barcode"), $("coupon-barcode"), foto]
      .filter(Boolean)
      .map(imgLoaded)
  );

  // Activar layout
  document.body.classList.add("use-new-print");
  try {
    window.print();
  } finally {
    setTimeout(() => document.body.classList.remove("use-new-print"), 0);
  }
}
