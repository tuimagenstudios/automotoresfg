/* =============================================================
   FG Automotores · catálogo, fichas y datos desde Google Sheets
   -------------------------------------------------------------
   La web lee la planilla indicada en <meta name="fg-planilla">.
   Pestañas: Vehículos · Datos · Servicios · Gestoría
   Si Google no responde, se usa la última copia guardada en el
   teléfono o los datos que vienen escritos acá (nunca queda vacía).
   Todo lo que viene de la planilla se muestra como texto.
   ============================================================= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- Planilla ---------- */
const PLANILLA_ID = ($('meta[name="fg-planilla"]')?.content || '').trim();
// Número interno de cada pestaña (no cambia aunque se renombre); si falla, se busca por nombre
const PESTANAS = {
  vehiculos: { gid: 856656791, nombre: 'Vehículos' },
  datos: { gid: 449201688, nombre: 'Datos' },
  servicios: { gid: 301190719, nombre: 'Servicios' },
  gestoria: { gid: 976530972, nombre: 'Gestoría' }
};
const CLAVE_COPIA = 'fg-planilla-v1';

/* ---------- Utilidades ---------- */
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const esc = s => String(s ?? '').replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
const texto = (s, max = 600) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const numero = s => { const d = String(s ?? '').replace(/[.,]\d{1,2}$/, '').replace(/\D/g, ''); return d ? Number(d) : 0; };
const si = (s, porDefecto = true) => { const v = norm(s); return v ? !['no', 'n', 'false', '0'].includes(v) : porDefecto; };
const lista = s => texto(s, 1500).split(/[,;\n·•]+/).map(x => x.trim()).filter(Boolean).slice(0, 30);
const fmt = n => Number(n).toLocaleString('es-AR');
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Links de fotos: Google Drive se convierte a imagen directa; el resto tiene que ser https
function foto(url, ancho = 1200) {
  const u = String(url ?? '').trim();
  if (!u) return '';
  const drive = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/) || u.match(/docs\.google\.com\/uc\?.*id=([\w-]{20,})/);
  if (drive) return `https://lh3.googleusercontent.com/d/${drive[1]}=w${ancho}`;
  if (!/^https:\/\/[^\s"'<>]+$/i.test(u)) return '';
  if (/images\.unsplash\.com/.test(u)) return u.replace(/([?&])w=\d+/, `$1w=${ancho}`);
  return u;
}

function parseCSV(t) {
  const filas = []; let fila = [], v = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { v += '"'; i++; } else q = false; } else v += c; }
    else if (c === '"') q = true;
    else if (c === ',') { fila.push(v); v = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; fila.push(v); filas.push(fila); fila = []; v = ''; }
    else v += c;
  }
  if (v || fila.length) { fila.push(v); filas.push(fila); }
  return filas.filter(f => f.some(c => c.trim()));
}
// Convierte la tabla en objetos con los títulos normalizados ("Foto 1" → "foto 1")
function aObjetos(csv) {
  const t = parseCSV(csv);
  if (t.length < 1) return [];
  const tit = t[0].map(norm);
  return t.slice(1).map(f => Object.fromEntries(tit.map((k, i) => [k, (f[i] ?? '').trim()])));
}

/* ---------- Datos que vienen escritos (se usan si no hay planilla) ---------- */
const U = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`;
const EJEMPLO_DESC = 'Unidad de ejemplo para mostrar cómo se ve la ficha. Reemplazá esta fila por un vehículo real.';
const fila = (marca, modelo, version, anio, km, precio, tipo, comb, trans, motor, color, puertas, dest, estado, fotos) => ({
  mostrar: 'SI', estado, destacado: dest, marca, modelo, version, ano: anio, kilometros: km, precio, moneda: 'ARS', tipo, combustible: comb,
  transmision: trans, motor, color, puertas, descripcion: EJEMPLO_DESC,
  equipamiento: 'Aire acondicionado, Dirección asistida, Levantavidrios eléctricos, Bluetooth', seguridad: 'ABS, Airbags frontales, Control de estabilidad',
  ...Object.fromEntries(fotos.map((f, i) => ['foto ' + (i + 1), U(f)]))
});
const BASE = {
  vehiculos: [
    fila('Peugeot', '208 Allure', '1.6 Allure · 5 puertas', 2021, 42000, 18500000, 'Hatchback', 'Nafta', 'Manual', '1.6', 'Gris', 5, 'SI', 'Disponible', ['photo-1492144534655-ae79c964c9d7', 'photo-1503376780353-7e6692767b70', 'photo-1503736334956-4c8f8e92946d']),
    fila('Toyota', 'Hilux SRV', '2.8 SRV · Doble cabina', 2020, 87000, 38500000, 'Pickup', 'Diésel', 'Automática', '2.8', 'Blanco', 4, 'SI', 'Disponible', ['photo-1551830820-330a71b99659', 'photo-1519608230357-a9a81adef76f', 'photo-1503376780353-7e6692767b70']),
    fila('Volkswagen', 'Nivus Highline', '200 TSI · Highline', 2022, 31000, 27900000, 'SUV', 'Nafta', 'Automática', '1.0 Turbo', 'Rojo', 5, 'NO', 'Disponible', ['photo-1549317661-bd32c8ce0db2', 'photo-1503376780353-7e6692767b70', 'photo-1492144534655-ae79c964c9d7']),
    fila('Ford', 'Focus Titanium', '2.0 Titanium · 4 puertas', 2018, 76000, 17200000, 'Sedán', 'Nafta', 'Manual', '2.0', 'Gris', 4, 'NO', 'Disponible', ['photo-1503736334956-4c8f8e92946d', 'photo-1492144534655-ae79c964c9d7', 'photo-1503376780353-7e6692767b70']),
    fila('Chevrolet', 'Cruze LTZ', '1.4 Turbo LTZ', 2021, 49000, 23900000, 'Sedán', 'Nafta', 'Automática', '1.4 Turbo', 'Blanco', 4, 'SI', 'Reservado', ['photo-1552519507-da3b142c6e3d', 'photo-1503376780353-7e6692767b70', 'photo-1503736334956-4c8f8e92946d']),
    fila('Renault', 'Sandero Intens', '1.6 Intens · 5 puertas', 2020, 63000, 14800000, 'Hatchback', 'Nafta', 'Manual', '1.6', 'Negro', 5, 'NO', 'Disponible', ['photo-1494905998402-395d579af36f', 'photo-1492144534655-ae79c964c9d7', 'photo-1503736334956-4c8f8e92946d'])
  ],
  datos: { nombre: 'Facundo Gomez Automotores', whatsapp: '542281579090', direccion: 'Lavalle 539', ciudad: 'Azul, Buenos Aires', horario: '09:00 a 13:00 / 17:00 a 20:30', instagram: 'automotoresfg', 'gestoria mensaje': 'Hola, quiero consultar por un trámite de gestoría.', 'modo demostracion': 'SI' },
  servicios: [
    { mostrar: 'SI', icono: '↔', titulo: 'Compra y venta', texto: 'Encontrá tu próximo vehículo o consultanos por la venta del tuyo.' },
    { mostrar: 'SI', icono: '⇄', titulo: 'Permutas', texto: 'Tu auto puede ser parte del próximo paso. Consultá por su evaluación.' },
    { mostrar: 'SI', icono: '▤', titulo: 'Financiación con DNI', texto: 'Consultanos por opciones, requisitos y condiciones para cada unidad.' },
    { mostrar: 'SI', icono: '✓', titulo: 'Consignación', texto: 'Dejá tu vehículo en consignación y nosotros nos ocupamos de mostrarlo.' }
  ],
  gestoria: [
    { mostrar: 'SI', icono: '⇆', tramite: 'Transferencias', detalle: 'Cambio de titularidad del vehículo, de principio a fin.' },
    { mostrar: 'SI', icono: '▤', tramite: 'Informes de dominio', detalle: 'Estado del dominio, deudas e inhibiciones antes de comprar.' },
    { mostrar: 'SI', icono: '◫', tramite: 'Cédulas', detalle: 'Cédula para autorizar a otro conductor y duplicados.' },
    { mostrar: 'SI', icono: '✦', tramite: 'Patentamiento', detalle: 'Inscripción inicial de vehículos 0 km.' },
    { mostrar: 'SI', icono: '✎', tramite: 'Denuncia de venta', detalle: 'Para desligarte del vehículo que ya vendiste.' },
    { mostrar: 'SI', icono: '⌕', tramite: 'Verificación policial', detalle: 'Te orientamos con turnos y documentación.' }
  ]
};

/* ---------- Estado ---------- */
let vehicles = [], DATOS = {}, demo = true;
let saved; try { saved = new Set(JSON.parse(localStorage.getItem('fg-saved') || '[]')); } catch { saved = new Set(); }
const comparing = new Set(); let activeTab = 'all';

/* ---------- Normalizar vehículos ---------- */
function aVehiculos(filas) {
  const usados = new Set();
  return filas.filter(r => (r.marca || r.modelo) && si(r.mostrar)).map(r => {
    const photos = [1, 2, 3, 4, 5, 6].map(i => r['foto ' + i]).filter(u => foto(u));
    const estado = norm(r.estado);
    let id = slug(`${r.marca} ${r.modelo} ${r.ano || r.año || ''}`) || 'vehiculo';
    while (usados.has(id)) id += '-b'; usados.add(id);
    return {
      id, brand: texto(r.marca, 40), name: texto(r.modelo, 60), version: texto(r.version, 90),
      year: numero(r.ano ?? r.año) || '', km: numero(r.kilometros), price: numero(r.precio),
      currency: norm(r.moneda).startsWith('us') ? 'USD' : 'ARS', type: texto(r.tipo, 30), fuel: texto(r.combustible, 30),
      trans: texto(r.transmision, 30), engine: texto(r.motor, 30), color: texto(r.color, 30), doors: numero(r.puertas) || '',
      desc: texto(r.descripcion, 1200), equip: lista(r.equipamiento), safety: lista(r.seguridad),
      photos, featured: si(r.destacado, false),
      status: estado.startsWith('vend') ? 'sold' : estado.startsWith('reserv') ? 'reserved' : 'available'
    };
  }).sort((a, b) => (a.status === 'sold') - (b.status === 'sold'));
}
const money = v => !v.price ? 'Consultar' : (v.currency === 'USD' ? 'US$ ' : '$ ') + fmt(v.price);
// Acepta 542281579090, +54 9 2281 57-9090, 02281 15 579090 o 2281 579090
const waNum = n => {
  let d = String(n ?? '').replace(/\D/g, '');
  if (d.startsWith('54')) return d.length >= 12 ? d : '';
  d = d.replace(/^0+/, '');
  if (d.length === 12) for (const i of [2, 3, 4]) if (d.slice(i, i + 2) === '15') { d = d.slice(0, i) + d.slice(i + 2); break; }
  return d.length === 10 ? '54' + d : '';
};
const waLink = (num, msg) => `https://wa.me/${num}${msg ? '?text=' + encodeURIComponent(msg) : ''}`;
const agenciaWA = () => waNum(DATOS.whatsapp) || BASE.datos.whatsapp;

/* ---------- Aplicar Datos, Servicios y Gestoría ---------- */
function aplicarDatos(datos) {
  DATOS = { ...BASE.datos, ...Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== '')) };
  demo = si(DATOS['modo demostracion']);
  document.body.classList.toggle('modo-demo', demo);
  $$('[data-campo]').forEach(el => {
    const v = texto(DATOS[el.dataset.campo] ?? '', 400);
    if (v && el.textContent !== v) el.textContent = v;
  });
  const aCargo = texto(DATOS['gestoria a cargo de']);
  $('.gest-firma').hidden = !aCargo;
  const num = agenciaWA();
  $$('[data-wa]').forEach(a => a.href = waLink(num));
  const gNum = waNum(DATOS['gestoria whatsapp']) || num;
  $$('[data-wa-gestoria]').forEach(a => a.href = waLink(gNum, texto(DATOS['gestoria mensaje']) || BASE.datos['gestoria mensaje']));
  const ig = String(DATOS.instagram || '').replace(/^@/, '').replace(/[^\w.]/g, '');
  if (ig) $$('[data-ig]').forEach(a => a.href = `https://www.instagram.com/${ig}/`);
  const q = encodeURIComponent(`${DATOS.direccion || ''} ${DATOS.ciudad || ''}`.trim());
  $$('[data-maps]').forEach(a => a.href = `https://www.google.com/maps/search/?api=1&query=${q}`);
  const frente = foto(DATOS['foto del frente'], 1400);
  if (frente) $('[data-foto-frente]').src = frente;
  if (DATOS.nombre && location.hash.indexOf('#auto/') !== 0) document.title = `${texto(DATOS.nombre, 60)} · Tu próxima oportunidad`;
}

function renderServicios(filas) {
  const lista = filas.filter(r => r.titulo && si(r.mostrar));
  if (!lista.length) return;
  $('#serviceGrid').innerHTML = lista.map((r, i) => `<article class="svc"><span class="svc-glow" aria-hidden="true"></span><span class="svc-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span class="svc-icon" aria-hidden="true">${esc(texto(r.icono, 4) || '✓')}</span><h3>${esc(texto(r.titulo, 60))}</h3><p>${esc(texto(r.texto, 220))}</p><span class="svc-line" aria-hidden="true"></span></article>`).join('');
}
function renderGestoria(filas) {
  const lista = filas.filter(r => (r.tramite || r.trámite) && si(r.mostrar));
  $('#gestGrid').innerHTML = lista.map((r, i) => `<article class="gest-card" style="--i:${i}"><span class="gest-icon" aria-hidden="true">${esc(texto(r.icono, 4) || '✓')}</span><div><h3>${esc(texto(r.tramite || r.trámite, 60))}</h3><p>${esc(texto(r.detalle, 220))}</p></div></article>`).join('');
}

/* ---------- Catálogo ---------- */
function toast(t) { $('#toast').textContent = t; $('#toast').classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2600); }
function etiqueta(v) {
  if (v.status === 'sold') return '<span class="badge sold">VENDIDO</span>';
  if (v.status === 'reserved') return '<span class="badge reserved">RESERVADO</span>';
  return v.featured ? '<span class="badge">DESTACADO</span>' : '';
}
const altFoto = v => demo ? `Fotografía ilustrativa; no representa el ${v.brand} ${v.name}` : `${v.brand} ${v.name}`;
function card(v) {
  const img = foto(v.photos[0], 800);
  const meta = [v.year, v.trans, v.fuel].filter(Boolean).map(esc).join(' &nbsp;·&nbsp; ');
  return `<article class="card${v.status === 'sold' ? ' is-sold' : ''}"><button class="save" data-save="${v.id}" aria-label="${saved.has(v.id) ? 'Quitar de' : 'Agregar a'} favoritos" aria-pressed="${saved.has(v.id)}">${saved.has(v.id) ? '♥' : '♡'}</button><a class="card-photo" href="#auto/${v.id}">${img ? `<img src="${esc(img)}" loading="lazy" alt="${esc(altFoto(v))}">` : '<span class="no-photo">Foto próximamente</span>'}${etiqueta(v)}${v.km ? `<span class="km">${fmt(v.km)} km</span>` : ''}</a><div class="card-body"><span class="car-brand">${esc(v.brand)}${v.type ? ' · ' + esc(v.type) : ''}</span><a href="#auto/${v.id}"><h3>${esc(v.name)}</h3></a><div class="meta">${meta}</div><a class="card-price" href="#auto/${v.id}">${money(v)} <span>↗</span></a><label class="compare-label"><input type="checkbox" data-compare="${v.id}" ${comparing.has(v.id) ? 'checked' : ''}> Comparar vehículo</label></div></article>`;
}
function opcionesTipo() {
  const sel = $('#type'), actual = sel.value;
  const tipos = [...new Set(vehicles.map(v => v.type).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Todos los vehículos</option>' + tipos.map(t => `<option${t === actual ? ' selected' : ''}>${esc(t)}</option>`).join('');
}
function render() {
  const q = norm($('#search').value), tipo = $('#type').value, orden = $('#sort').value;
  const list = vehicles.filter(v => norm(`${v.brand} ${v.name} ${v.version} ${v.year}`).includes(q) && (!tipo || v.type === tipo) && (activeTab !== 'featured' || v.featured) && (activeTab !== 'saved' || saved.has(v.id)));
  if (orden !== 'default') list.sort((a, b) => (!a.price) - (!b.price) || (orden === 'asc' ? a.price - b.price : b.price - a.price));
  $('#cards').innerHTML = list.length ? list.map(card).join('') : '<p class="empty">No encontramos vehículos con esos filtros. Probá otra búsqueda.</p>';
  $('#results').textContent = `${list.length} ${list.length === 1 ? 'vehículo' : 'vehículos'}${demo ? ' de ejemplo · Fotos ilustrativas que no representan las unidades' : ''}.`;
  $('#compareCount').textContent = comparing.size;
}
$('#filters').addEventListener('submit', e => { e.preventDefault(); render(); });
$('#search').addEventListener('input', render);
['#type', '#sort'].forEach(s => $(s).addEventListener('change', render));
$$('[data-tab]').forEach(b => b.addEventListener('click', () => { activeTab = b.dataset.tab; $$('[data-tab]').forEach(x => x.classList.toggle('active', x === b)); render(); }));

document.addEventListener('click', e => {
  const s = e.target.closest('[data-save]');
  if (s) {
    const id = s.dataset.save; saved.has(id) ? saved.delete(id) : saved.add(id);
    try { localStorage.setItem('fg-saved', JSON.stringify([...saved])); } catch { }
    render(); if (location.hash.startsWith('#auto/')) detail(location.hash.split('/')[1], false);
    toast(saved.has(id) ? 'Vehículo guardado en este navegador' : 'Vehículo eliminado de guardados');
  }
  const thumb = e.target.closest('[data-photo]');
  if (thumb) { $('#mainPhoto').src = thumb.dataset.photo; $$('[data-photo]').forEach(b => b.classList.toggle('active', b === thumb)); }
  if (e.target.id === 'mainPhoto') { $('#lightbox img').src = e.target.src; $('#lightbox').showModal(); }
  if (e.target.closest('[data-share]')) navigator.clipboard?.writeText(location.href).then(() => toast('Enlace de la ficha copiado')).catch(() => toast('Copiá la dirección de esta ficha desde el navegador'));
  const dc = e.target.closest('[data-detail-compare]'); if (dc) { toggleCompare(dc.dataset.detailCompare); toast('Comparación actualizada'); }
});
function toggleCompare(id) { if (comparing.has(id)) comparing.delete(id); else if (comparing.size < 3) comparing.add(id); else toast('Podés comparar hasta 3 vehículos'); render(); }
document.addEventListener('change', e => { if (e.target.dataset.compare) toggleCompare(e.target.dataset.compare); });
$('#compareOpen').addEventListener('click', () => {
  const list = vehicles.filter(v => comparing.has(v.id));
  if (list.length < 2) { toast('Elegí al menos 2 vehículos para comparar'); return; }
  const filas = [['Precio', money], ['Año', v => v.year || '—'], ['Kilometraje', v => v.km ? fmt(v.km) + ' km' : '—'], ['Transmisión', v => v.trans || '—'], ['Combustible', v => v.fuel || '—'], ['Motor', v => v.engine || '—']];
  $('#comparisonBody').innerHTML = `<div style="overflow-x:auto"><table><tr><th>${demo ? 'Datos de ejemplo' : 'Vehículo'}</th>${list.map(v => `<th>${esc(v.brand)} ${esc(v.name)}</th>`).join('')}</tr>${filas.map(([k, f]) => `<tr><td>${k}</td>${list.map(v => `<td>${esc(f(v))}</td>`).join('')}</tr>`).join('')}</table></div>`;
  $('#comparison').showModal();
});
$$('dialog').forEach(d => { d.querySelector('.close').onclick = () => d.close(); d.addEventListener('click', e => { if (e.target === d) d.close(); }); });

/* ---------- Ficha ---------- */
function spec(title, rows, open = false) {
  rows = rows.filter(([, b]) => b !== '' && b != null);
  return rows.length ? `<details ${open ? 'open' : ''}><summary>${title}</summary>${rows.map(([a, b]) => `<div class="spec-row"><span>${a}</span><strong>${esc(b)}</strong></div>`).join('')}</details>` : '';
}
const listaSpec = (title, items) => items.length ? `<details><summary>${title}</summary><ul class="spec-list">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></details>` : '';
function detail(id, scroll = true) {
  const v = vehicles.find(x => x.id === id);
  if (!v) { if (vehicles.length) location.hash = 'vehiculos'; return; }
  $('#home').hidden = true; $('#detail').hidden = false;
  document.title = `${v.brand} ${v.name} · FG Automotores`;
  const wa = waLink(agenciaWA(), `Hola FG, quiero consultar por ${v.brand} ${v.name}${v.year ? ' (' + v.year + ')' : ''}. Vi esta ficha: ${location.href}`);
  const fotos = v.photos.map(p => foto(p, 1400));
  const chips = [v.year && `Año <strong>${v.year}</strong>`, v.km && `<strong>${fmt(v.km)} km</strong>`, v.trans && esc(v.trans), v.fuel && esc(v.fuel)].filter(Boolean);
  const estado = v.status === 'sold' ? '<span class="status sold">Vendido</span>' : v.status === 'reserved' ? '<span class="status reserved">Reservado</span>' : '';
  $('#detail').innerHTML = `<div class="detail-wrap"><div class="breadcrumbs"><a href="#vehiculos">← Volver al catálogo</a> &nbsp; / &nbsp; ${esc(v.brand)} ${esc(v.name)}</div><div class="detail-top"><div>${fotos[0] ? `<img id="mainPhoto" class="main-photo" src="${esc(fotos[0])}" alt="${esc(altFoto(v))}">` : '<div class="main-photo no-photo">Foto próximamente</div>'}${fotos.length > 1 ? `<div class="thumbs">${fotos.map((p, i) => `<button data-photo="${esc(p)}" class="${i === 0 ? 'active' : ''}" aria-label="Ver foto ${i + 1}"><img src="${esc(foto(v.photos[i], 400))}" alt="Foto ${i + 1}" loading="lazy"></button>`).join('')}</div>` : ''}${demo ? '<p class="demo">Fotografías ilustrativas · No representan esta unidad</p>' : ''}</div><div class="detail-info"><span class="eyebrow red">${esc(v.brand.toUpperCase())}${v.type ? ' · ' + esc(v.type.toUpperCase()) : ''}</span><h1>${esc(v.brand)} ${esc(v.name)} ${estado}</h1>${v.version ? `<p>${esc(v.version)}</p>` : ''}<div class="chips">${chips.map(c => `<span>${c}</span>`).join('')}</div><div class="price">${money(v)} ${v.price ? `<small style="font-size:12px;color:#777">${v.currency}</small>` : ''}</div>${demo ? '<span class="demo">Unidad y precio de demostración</span>' : ''}${v.desc ? `<p>${esc(v.desc)}</p>` : ''}<p>Consultá por financiación con DNI y la posibilidad de entregar tu vehículo en parte de pago.</p><a class="button" href="${esc(wa)}" target="_blank" rel="noopener">Consultar por WhatsApp ↗</a><div class="detail-tools"><button data-save="${v.id}">${saved.has(v.id) ? '♥ Guardado' : '♡ Guardar'}</button><button data-detail-compare="${v.id}">⇄ Comparar</button><button data-share>Compartir ↗</button></div><p>📍 ${esc(DATOS.direccion || '')}, ${esc(DATOS.ciudad || '')} · Coordiná tu visita con nosotros.</p></div></div><div class="spec-layout"><div><h2>Conocé cada detalle.</h2>${spec('Información principal', [['Marca', v.brand], ['Modelo', v.name], ['Versión', v.version], ['Año', v.year], ['Kilómetros', v.km ? fmt(v.km) + ' km' : ''], ['Carrocería', v.type], ['Color', v.color], ['Puertas', v.doors]], true)}${spec('Motor y transmisión', [['Motor', v.engine], ['Combustible', v.fuel], ['Transmisión', v.trans]])}${listaSpec('Confort y equipamiento', v.equip)}${listaSpec('Seguridad', v.safety)}</div><aside class="benefits"><p class="eyebrow red">ELEGÍ FG AUTOMOTORES</p><h3>Te acompañamos<br>en cada paso.</h3><p>↗ Atención personalizada<br>↔ Aceptamos permutas<br>▤ Consultá por financiación con DNI<br>📋 Gestoría del automotor</p><hr style="border:0;border-top:1px solid #ffffff22"><p>${esc(DATOS.direccion || '')} · ${esc(DATOS.ciudad || '')}<br>${esc(DATOS.horario || '')}</p></aside></div><section class="related"><h2>Otros caminos para elegir.</h2><div class="cards">${vehicles.filter(x => x.id !== v.id && x.status !== 'sold').slice(0, 3).map(card).join('')}</div></section></div>`;
  if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
}
function route() {
  if (location.hash.startsWith('#auto/')) detail(decodeURIComponent(location.hash.split('/')[1]));
  else {
    $('#detail').hidden = true; $('#home').hidden = false;
    if (DATOS.nombre) document.title = `${texto(DATOS.nombre, 60)} · Tu próxima oportunidad`;
    requestAnimationFrame(() => { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView({ behavior: 'instant' }); });
  }
}
window.addEventListener('hashchange', () => {
  const toDetail = location.hash.startsWith('#auto/'), wasDetail = !$('#detail').hidden;
  if ((toDetail || wasDetail) && document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) { const t = document.startViewTransition(route); [t.ready, t.finished, t.updateCallbackDone].forEach(p => p?.catch(() => { })); }
  else route();
});

/* ---------- Pintar todo ---------- */
let ultima = '';
function pintar(p, primera = false) {
  const firma = JSON.stringify(p);
  if (firma === ultima) return; ultima = firma;
  const datos = Object.fromEntries((p.datos || []).map(r => [norm(r.campo), texto(r.valor, 600)]).filter(([k]) => k));
  aplicarDatos(datos);
  const vs = aVehiculos(p.vehiculos || []);
  vehicles = vs.length ? vs : aVehiculos(BASE.vehiculos);
  opcionesTipo();
  if (!primera) renderServicios(p.servicios || []);
  renderGestoria((p.gestoria || []).length ? p.gestoria : BASE.gestoria);
  render();
  if (location.hash.startsWith('#auto/')) detail(decodeURIComponent(location.hash.split('/')[1]), primera);
}
const BASE_PLANILLA = { vehiculos: BASE.vehiculos, datos: Object.entries(BASE.datos).map(([campo, valor]) => ({ campo, valor })), servicios: BASE.servicios, gestoria: BASE.gestoria };

async function leerPestana(p) {
  const base = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(PLANILLA_ID)}`;
  for (const url of [`${base}/export?format=csv&gid=${p.gid}`, `${base}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(p.nombre)}`]) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) continue;
      const t = await r.text();
      if (/^\s*</.test(t)) continue; // página de Google en vez de datos: la planilla no es pública
      return aObjetos(t);
    } catch { }
  }
  return null;
}
async function cargarPlanilla() {
  if (!PLANILLA_ID) return;
  const claves = Object.keys(PESTANAS);
  const res = await Promise.all(claves.map(k => leerPestana(PESTANAS[k])));
  if (res.every(r => r === null)) { console.warn('FG: no se pudo leer la planilla; se muestra la última copia.'); return; }
  const nueva = Object.fromEntries(claves.map((k, i) => [k, res[i] ?? (copia?.[k] || BASE_PLANILLA[k])]));
  try { localStorage.setItem(CLAVE_COPIA, JSON.stringify(nueva)); } catch { }
  pintar(nueva);
}

let copia = null; try { copia = JSON.parse(localStorage.getItem(CLAVE_COPIA)); } catch { }
pintar(copia || BASE_PLANILLA, true);
if (copia?.servicios) renderServicios(copia.servicios);
route();
cargarPlanilla();

/* ---------- Video de portada ---------- */
const video = $('#heroVideo'), toggle = $('#videoToggle');
const setToggle = (txt, label) => { toggle.textContent = txt; toggle.setAttribute('aria-label', label); toggle.title = label; };
toggle.onclick = () => { if (video.paused) video.play().then(() => setToggle('Ⅱ', 'Pausar video')).catch(() => toast('El video no está disponible. Se muestra la portada de respaldo.')); else { video.pause(); setToggle('▷', 'Reproducir video'); } };
video.addEventListener('error', () => setToggle('▷', 'Reintentar video'));
if (matchMedia('(prefers-reduced-motion: reduce)').matches) { video.pause(); setToggle('▷', 'Reproducir video'); }

// Evita repetir el acceso flotante junto a los botones de contacto
if ('IntersectionObserver' in window) {
  const visibles = new Set();
  const io = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? visibles.add(e.target) : visibles.delete(e.target)); $('.whatsapp').hidden = visibles.size > 0; }, { threshold: .1 });
  ['#conocenos .button', '.gest-wa'].forEach(s => $(s) && io.observe($(s)));
}
