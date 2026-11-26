/* FG Automotores · efectos de movimiento
   Librerías locales del kit (vendor/): GSAP + ScrollTrigger + SplitText, Anime.js, AOS, Animate.css.
   Con "reducir movimiento" activado, la web queda completa y quieta. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fino = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!window.gsap;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ---- Encabezado que se compacta + barra de progreso ---- */
  const header = $('header'), bar = $('.progress');
  let tick = false;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    header.classList.toggle('scrolled', y > 40);
    bar.style.setProperty('--p', max > 0 ? Math.min(1, y / max) : 0);
    tick = false;
  };
  addEventListener('scroll', () => { if (!tick) { requestAnimationFrame(onScroll); tick = true; } }, { passive: true });
  onScroll();

  /* ---- Pestañas: pastilla que se desliza ---- */
  const tabs = $('.tabs');
  const movePill = () => {
    const a = $('.active', tabs); if (!a) return;
    tabs.style.setProperty('--tx', a.offsetLeft + 'px');
    tabs.style.setProperty('--tw', a.offsetWidth + 'px');
  };
  movePill(); tabs.classList.add('ready');
  tabs.addEventListener('click', () => requestAnimationFrame(movePill));
  addEventListener('resize', movePill);
  document.fonts?.ready.then(movePill);

  /* ---- Tarjetas de autos ---- */
  const cards = $('#cards');
  const contados = new Set();
  let firma = '';
  const contar = el => {
    const fin = +el.dataset.valor;
    if (quieto || !window.anime) return;
    const o = { v: fin * .55 };
    anime.animate(o, { v: fin, duration: 1300, ease: 'outExpo',
      onUpdate: () => { el.firstChild.nodeValue = '$ ' + Math.round(o.v).toLocaleString('es-AR') + ' '; } });
  };
  const prepararTarjetas = () => {
    const lista = $$('.card', cards);
    const nueva = lista.map(c => $('[data-save]', c)?.dataset.save).join('|');
    // Si solo cambió un favorito o la comparación, no se repite la entrada
    cards.classList.toggle('quiet', nueva === firma);
    firma = nueva;
    lista.forEach((c, i) => {
      c.style.setProperty('--i', i);
      const precio = $('.card-price', c), id = $('[data-save]', c)?.dataset.save;
      if (precio && id) {
        precio.dataset.valor = precio.textContent.replace(/\D/g, '');
        if (!contados.has(id) && cards.classList.contains('in-view')) { contados.add(id); setTimeout(() => contar(precio), 250 + i * 90); }
      }
    });
  };
  new MutationObserver(prepararTarjetas).observe(cards, { childList: true });
  prepararTarjetas();

  const alVer = (el, fn, opts = { threshold: .15 }) => {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver(e => { if (e[0].isIntersecting) { fn(); io.disconnect(); } }, opts);
    io.observe(el);
  };
  alVer(cards, () => { cards.classList.add('in-view'); prepararTarjetas(); }, { threshold: .08 });

  // inclinación 3D + brillo que sigue al mouse (tarjetas de autos y de servicios)
  if (fino && !quieto) {
    document.addEventListener('pointermove', e => {
      const c = e.target.closest('.card, .svc'); if (!c) return;
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--mx', x * 100 + '%');
      c.style.setProperty('--my', y * 100 + '%');
      if (c.classList.contains('card')) {
        c.style.setProperty('--ry', (x - .5) * 10 + 'deg');
        c.style.setProperty('--rx', (.5 - y) * 10 + 'deg');
      }
    }, { passive: true });
    document.addEventListener('pointerout', e => {
      const c = e.target.closest('.card'); if (!c || c.contains(e.relatedTarget)) return;
      c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg');
    });
  }

  // corazón que late al guardar (Animate.css), contador que rebota, foto que cambia
  document.addEventListener('click', e => {
    const s = e.target.closest('[data-save]');
    if (s && !quieto) {
      const id = s.dataset.save;
      requestAnimationFrame(() => $$(`[data-save="${id}"]`).forEach(b => b.classList.add('animate__animated', 'animate__heartBeat')));
    }
    const t = e.target.closest('[data-photo]');
    if (t) { const m = $('#mainPhoto'); m.classList.remove('swap'); void m.offsetWidth; m.classList.add('swap'); }
  });
  const count = $('#compareCount');
  new MutationObserver(() => {
    if (quieto) return;
    count.classList.remove('animate__animated', 'animate__bounceIn'); void count.offsetWidth;
    count.classList.add('animate__animated', 'animate__bounceIn');
  }).observe(count, { childList: true, characterData: true, subtree: true });

  /* ---- Contacto: la foto se descubre ---- */
  const visit = $('.visit');
  alVer(visit, () => visit.classList.add('in-view'), { threshold: .3 });

  const grid = $('.service-grid');
  alVer(grid, () => grid.classList.add('in-view'), { threshold: .2 });

  /* ---- AOS: servicios y títulos que suben ---- */
  if (window.AOS) AOS.init({ once: true, duration: 800, easing: 'ease-out-cubic', offset: 60, disable: quieto });

  if (!hasGsap || quieto) return;

  /* ---- Portada: título por líneas, parallax del video al bajar ---- */
  const h1 = $('.hero h1');
  const lineas = SplitText.create(h1, { type: 'lines', mask: 'lines' });
  gsap.from(lineas.lines, { yPercent: 110, duration: 1.1, stagger: .12, ease: 'expo.out', delay: .25 });
  gsap.to('.hero video', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-copy', { y: -60, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ---- Servicios: el título se enciende palabra por palabra ---- */
  const t2 = $('.services h2');
  const palabras = SplitText.create(t2, { type: 'words', wordsClass: 'word' });
  gsap.fromTo(palabras.words, { opacity: .15, y: 12 }, { opacity: 1, y: 0, stagger: .1, ease: 'none',
    scrollTrigger: { trigger: '.services', start: 'top 80%', end: 'top 30%', scrub: 1 } });

  /* ---- Botones magnéticos (portada) ---- */
  if (fino) $$('.hero .button, header .button').forEach(b => {
    const x = gsap.quickTo(b, 'x', { duration: .4 }), y = gsap.quickTo(b, 'y', { duration: .4 });
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * .25); y((e.clientY - r.top - r.height / 2) * .35); });
    b.addEventListener('pointerleave', () => { x(0); y(0); });
  });
})();
