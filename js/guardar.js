// js/guardar.js
import { API_URL, PACK_URL, withParams, apiGet } from "./api.js";
import { renderAndPrint } from "./print.js";

/* ===== Helpers ===== */
const $ = (id) => document.getElementById(id);
const V = (id) => (document.getElementById(id)?.value ?? "").toString().trim();
const U = (v) => (v ?? "").toString().trim().toUpperCase();

function setNumeroTrabajo(n) {
  const vis = $("numero_trabajo");
  if (vis) vis.value = (n ?? "").toString().trim();
  const hid = $("numero_trabajo_hidden");
  if (hid) hid.value = (n ?? "").toString().trim();
}

function syncNumeroTrabajoHidden() {
  const vis = $("numero_trabajo");
  const hid = $("numero_trabajo_hidden");
  if (vis && hid) hid.value = vis.value.trim();
}

function entregaTxt() {
  const sel = document.getElementById("entrega-select");
  const v = sel?.value || "7";
  if (v === "3") return "URGENTE";
  if (v === "15") return "LABORATORIO";
  return "STOCK";
}
function entregaLabel() {
  const sel = document.getElementById("entrega-select");
  return sel?.options[sel.selectedIndex]?.text || entregaTxt();
}

function fotosBase64() {
  const a = Array.isArray(window.__FOTOS) ? window.__FOTOS : [];
  return a.map((d) => (d.split(",")[1] || "").trim()).filter(Boolean);
}

function resumenPack() {
  const money = (v) => (v ? `$ ${v}` : "");
  return {
    "Fecha": V("fecha"),
    "Retira (estimada)": V("fecha_retira"),
    "N° trabajo": V("numero_trabajo"),
    "DNI": V("dni"),
    "Cliente": V("nombre"),
    "Teléfono": V("telefono"),
    "DR (oculista)": V("dr"),
    "Cristal": `${V("cristal")} ${money(V("precio_cristal"))}`,
    "Obra social": `${V("obra_social")} ${money(V("importe_obra_social"))}`,
    "Armazón": `${V("numero_armazon")} ${V("armazon_detalle")} ${money(V("precio_armazon"))}`,
    "Otro": `${V("otro_concepto")} ${money(V("precio_otro"))}`,
    "Distancia focal": V("distancia_focal"),
    "OD": `ESF ${V("od_esf")}  |  CIL ${V("od_cil")}  |  EJE ${V("od_eje")}`,
    "OI": `ESF ${V("oi_esf")}  |  CIL ${V("oi_cil")}  |  EJE ${V("oi_eje")}`,
    "DNP (OD/OI)": V("dnp"),
    "ADD": V("add"),
    "TOTAL": money(V("total")),
    "SEÑA": money(V("sena")),
    "SALDO": money(V("saldo")),
    "Vendedor": V("vendedor"),
    "Forma de pago": V("forma_pago"),
    "Entrega": entregaLabel()
  };
}

/* ===== Flujo principal ===== */
export async function guardarTrabajo({ progress } = {}) {
  const spinner = $("spinner");
  const setStep = (label, status = "done") => { try { progress?.mark?.(label, status); } catch {} };

  try {
    if (spinner) spinner.style.display = "block";

    // Sincronizar hidden (si existe)
    syncNumeroTrabajoHidden();

    // Validaciones mínimas
    setStep("Validando datos", "run");
    const nroBase = V("numero_trabajo");
    if (!nroBase) throw new Error("Ingresá el número de trabajo");
    if (!V("dni")) throw new Error("Ingresá el DNI");
    if (!V("nombre")) throw new Error("Ingresá el nombre");
    setStep("Validando datos", "done");

    // 1) Guardar en planilla
    setStep("Guardando en planilla", "run");
    const formEl = $("formulario");
    if (!formEl) throw new Error("Formulario no encontrado");
    const body = new URLSearchParams(new FormData(formEl));

    let postJson;
    try {
      const res = await fetch(API_URL, { method: "POST", body });
      const txt = await res.text();
      try { postJson = JSON.parse(txt); } catch { postJson = null; }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
      if (!postJson || postJson.ok !== true) {
        const msg = (postJson && postJson.error) ? postJson.error : "Respuesta inválida del servidor";
        throw new Error(msg);
      }
    } catch (e) {
      console.error("Error al guardar en planilla:", e);
      throw e;
    }
    setStep("Guardando en planilla", "done");

    // Número final (si el backend devolvió uno con sufijo)
    const numeroFinal = (postJson && postJson.numero_trabajo)
      ? String(postJson.numero_trabajo).trim()
      : nroBase;
    setNumeroTrabajo(numeroFinal);

    // 2) PACK (PDF + Telegram)
    setStep("Generando PDF", "run");
    const payload = {
      numero_trabajo: numeroFinal,
      dni: V("dni"),
      nombre: U(V("nombre")),
      resumen: resumenPack(),
      imagenesBase64: fotosBase64()
    };

    const packRes = await fetch(PACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ genPack: "1", payload: JSON.stringify(payload) })
    });
    const raw = await packRes.text();
    if (!packRes.ok) throw new Error(`Error PACK (${packRes.status})`);
    let j; try { j = JSON.parse(raw); } catch { j = null; }
    if (!j?.ok) throw new Error("No se pudo crear/enviar el PDF");
    const packUrl = j.url || j.pdf || "";
    setStep("Generando PDF", "done");

    // Guardar link del PDF
    const hidden = $("pack_url");
    if (hidden) hidden.value = packUrl;
    if (packUrl) {
      setStep("Guardando link del PDF", "run");
      try {
        const setUrl = withParams(API_URL, { setPdf: 1, numero: numeroFinal, url: packUrl });
        await apiGet(setUrl);
      } catch (e) {
        console.warn("No se pudo actualizar la columna PDF:", e?.message || e);
      }
      setStep("Guardando link del PDF", "done");
    }

    // 3) Confirmar + imprimir
    try { progress?.doneAndHide?.(0); } catch {}
    if (spinner) spinner.style.display = "none";

    let imprimir = true;
    if (window.Swal) {
      const r = await Swal.fire({
        title: "Guardado y PDF enviado",
        text: "¿Imprimir ahora?",
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "Imprimir",
        cancelButtonText: "Cerrar"
      });
      imprimir = r.isConfirmed;
    } else {
      imprimir = confirm("Guardado y PDF enviado.\n¿Imprimir ahora?");
    }

    if (imprimir) {
      await renderAndPrint({
        numero: numeroFinal,
        fecha: V("fecha"),
        fechaRetira: V("fecha_retira"),
        nombre: V("nombre"),
        dni: V("dni"),
        telefono: V("telefono"),
        dr: V("dr"),
        cristal: V("cristal"),
        precioCristal: V("precio_cristal"),
        armazonNumero: V("numero_armazon"),
        armazonDetalle: V("armazon_detalle"),
        precioArmazon: V("precio_armazon"),
        entregaLabel: entregaLabel(),
        od_esf: V("od_esf"), od_cil: V("od_cil"), od_eje: V("od_eje"),
        oi_esf: V("oi_esf"), oi_cil: V("oi_cil"), oi_eje: V("oi_eje"),
        dnp: V("dnp"), add: V("add"),
        total: V("total"), sena: V("sena"), saldo: V("saldo"),
        fotoDataUrl: (Array.isArray(window.__FOTOS) && window.__FOTOS[0]) ? window.__FOTOS[0] : ""
      });
    }

    return { ok: true, numero_trabajo: numeroFinal, pdf: packUrl };

  } catch (err) {
    try { progress?.fail?.(err?.message || "Error al guardar"); } catch {}
    if (window.Swal) Swal.fire("Error", err?.message || "Error inesperado", "error");
    throw err;
  } finally {
    if ($("spinner")) $("spinner").style.display = "none";
  }
}

/* ===== Botón “Imprimir” manual (sin guardar) ===== */
function bindManualPrintButton() {
  const btn = $("btn-imprimir");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const numero = V("numero_trabajo") || "(SIN N°)";
    await renderAndPrint({
      numero,
      fecha: V("fecha"),
      fechaRetira: V("fecha_retira"),
      nombre: V("nombre"),
      dni: V("dni"),
      telefono: V("telefono"),
      dr: V("dr"),
      cristal: V("cristal"),
      precioCristal: V("precio_cristal"),
      armazonNumero: V("numero_armazon"),
      armazonDetalle: V("armazon_detalle"),
      precioArmazon: V("precio_armazon"),
      entregaLabel: entregaLabel(),
      od_esf: V("od_esf"), od_cil: V("od_cil"), od_eje: V("od_eje"),
      oi_esf: V("oi_esf"), oi_cil: V("oi_cil"), oi_eje: V("oi_eje"),
      dnp: V("dnp"), add: V("add"),
      total: V("total"), sena: V("sena"), saldo: V("saldo"),
      fotoDataUrl: (Array.isArray(window.__FOTOS) && window.__FOTOS[0]) ? window.__FOTOS[0] : ""
    });
  });
}

// Auto-bind
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindManualPrintButton);
} else {
  bindManualPrintButton();
}
