/* ==========================================================
   GharSe demo v2 : shared script for all three demo pages.
   Axis 1 (ambient) and axis 2 (hover) live in demo2.css.
   Axis 3 (GSAP ScrollTrigger / MotionPath / Flip) lives here.

   DEMO ONLY: sample data and cart maths are in the browser to keep the
   demo self-contained. In the real project prices, totals and stock stay
   on the backend (NFR15) and tag cards are rendered from API data.
   ========================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const page = document.body.dataset.page;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasLibs = !!(window.gsap && window.ScrollTrigger && window.MotionPathPlugin && window.Flip);
  const canAnimate = hasLibs && !reduce;

  root.classList.add('js');
  if (!canAnimate) root.classList.add('no-motion');
  if (hasLibs) gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, Flip);

  /* ---------- helpers ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');

  /* split text into word spans; inline elements (pills, highlights, counters) stay whole */
  function splitWords(el) {
    const out = [];
    const UNIT = '.pill,.hl,.big,.count,.small-word,svg,img';
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.append(s);
            out.push(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          if (n.matches(UNIT)) out.push(n); else walk(n);
        }
      });
    };
    walk(el);
    return out;
  }

  /* ---------- sample data (demo) ---------- */
  const PRODUCTS = [
    { id: 1, name: 'Sourdough loaf', maker: "Meena's Kitchen", area: 'Andheri', cat: 'bakes', price: 180, km: 2.1, verified: true, note: "Baked at 5am, packed while it's still warm.", h: 220 },
    { id: 2, name: 'Clay chai cups (set of 4)', maker: 'Sunita Pottery', area: 'Bandra', cat: 'pottery', price: 650, km: 4.8, verified: true, note: 'Thrown on my balcony wheel. No two are twins.', h: 170 },
    { id: 3, name: 'Block-print kurta', maker: 'Farida Stitches', area: 'Kurla', cat: 'tailoring', price: 1450, km: 6.2, verified: false, mto: true, note: "Made to order. I'll message you the date.", h: 240 },
    { id: 4, name: 'Mango pickle, 500g', maker: "Lata's Pantry", area: 'Dadar', cat: 'pickles', price: 240, km: 3.4, verified: true, note: "My mother-in-law's recipe. She checked.", h: 190 },
    { id: 5, name: 'Jaggery cookies', maker: "Meena's Kitchen", area: 'Andheri', cat: 'bakes', price: 240, km: 2.1, verified: true, note: 'Box of six. Gone by Tuesday.', h: 160 },
    { id: 6, name: 'Terracotta planter', maker: 'Sunita Pottery', area: 'Bandra', cat: 'pottery', price: 420, km: 4.8, verified: true, note: 'Drainage hole included, as requested by plants.', h: 200 },
    { id: 7, name: 'Jute tote bag', maker: 'Rekha Crafts', area: 'Malad', cat: 'crafts', price: 360, km: 7.5, verified: false, note: 'Hand-stitched handles. Holds a week of vegetables.', h: 180 },
    { id: 8, name: 'Kokum sharbat concentrate', maker: "Lata's Pantry", area: 'Dadar', cat: 'pickles', price: 210, km: 3.4, verified: true, note: 'Dilute 1 to 4. Add ice. Thank me later.', h: 150 },
    { id: 9, name: 'Cardamom buns', maker: "Meena's Kitchen", area: 'Andheri', cat: 'bakes', price: 150, km: 2.1, verified: true, note: 'Sticky, soft, a little bit sinful.', h: 130 },
    { id: 10, name: 'Embroidered cushion cover', maker: 'Farida Stitches', area: 'Kurla', cat: 'tailoring', price: 520, km: 6.2, verified: false, note: 'Every stitch counted twice.', h: 210 },
    { id: 11, name: 'Macramé wall hanging', maker: 'Rekha Crafts', area: 'Malad', cat: 'crafts', price: 880, km: 7.5, verified: false, mto: true, note: 'Takes me three evenings. Worth it.', h: 250 },
    { id: 12, name: 'Garam masala, 100g', maker: "Lata's Pantry", area: 'Dadar', cat: 'pickles', price: 130, km: 3.4, verified: true, note: 'Ground this morning. Your kitchen will know.', h: 140 },
  ];

  function tagHTML(p, i, offset) {
    const r = ['-2deg', '1.6deg', '-1deg', '2.2deg', '-1.6deg', '1deg'][i % 6];
    const y = offset ? ['0px', '22px', '-8px', '14px', '4px', '26px'][i % 6] : '0px';
    const badge = p.verified ? '<span class="sticker sticker--teal" style="--r:5deg">Verified</span>'
      : p.mto ? '<span class="sticker" style="--r:5deg">Made to order</span>' : '';
    return `<article class="tag board-item" data-id="${p.id}" data-cat="${p.cat}" data-km="${p.km}" data-price="${p.price}" data-verified="${p.verified ? 1 : 0}" style="--r:${r};--y:${y};--h:${p.h}px">
      <i class="tag__pin"></i>${badge}
      <div class="tag__media"><span>photo</span></div>
      <span class="stamp">${inr(p.price)}</span>
      <div class="tag__body">
        <h3>${esc(p.name)}</h3>
        <p class="tag__maker">${esc(p.maker)}, ${esc(p.area)}</p>
        <p class="tag__note">“${esc(p.note)}”</p>
        <div class="tag__row"><span class="tag__dist">${p.km} km away</span>
          <button class="add" type="button" aria-label="Add ${esc(p.name)} to basket">+</button></div>
      </div></article>`;
  }

  /* ---------- shared chrome (the real project does this in nav.js) ---------- */
  const NAV = [['demo2-home.html', 'Home'], ['demo2-market.html', 'Explore'], ['#', 'Makers'], ['#', 'Sell with us']];
  const here = location.pathname.split('/').pop();

  let basket = 0;
  try { basket = +sessionStorage.getItem('gs_basket') || 0; } catch (e) { /* storage may be blocked */ }
  const saveBasket = () => { try { sessionStorage.setItem('gs_basket', basket); } catch (e) { /* ignore */ } };

  function chrome() {
    const h = $('[data-chrome="header"]');
    if (h) {
      h.className = 'site-header';
      h.innerHTML = `<div class="wrap"><a class="brand" href="demo2-home.html"><i></i>GharSe</a>
        <nav class="nav">${NAV.map(([href, t]) => `<a href="${href}"${href === here ? ' aria-current="page"' : ''}>${t}</a>`).join('')}
        <a class="cart" href="demo2-cart.html" data-basket-icon>Basket<span data-basket>${basket}</span></a></nav></div>`;
    }
    const f = $('[data-chrome="footer"]');
    if (f) {
      f.className = 'site-footer';
      f.innerHTML = `<div class="wrap"><div class="footer__grid">
        <div><a class="brand" href="demo2-home.html"><i></i>GharSe</a><p style="margin-top:1rem;max-width:30ch;opacity:.85">A noticeboard for Mumbai's home makers. Pinned up one lane at a time.</p></div>
        <div><h4>Shop</h4><ul><li>Explore</li><li>Makers</li><li>Shelves</li></ul></div>
        <div><h4>Sell</h4><ul><li>Pin a tag</li><li>Seller guide</li><li>Dashboard</li></ul></div>
        <div><h4>Help</h4><ul><li>Support</li><li>Orders</li><li>About</li></ul></div></div>
        <div class="footer__word" aria-hidden="true">GharSe</div>
        <p class="footer__legal">© 2026 GharSe. Made with care in Mumbai.</p></div>`;
    }
  }

  const toast = (msg) => {
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.append(t);
    if (canAnimate) gsap.fromTo(t, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .3, onComplete: () => gsap.to(t, { opacity: 0, delay: 1.4, duration: .3, onComplete: () => t.remove() }) });
    else setTimeout(() => t.remove(), 1800);
  };

  function setBasket(n) {
    basket = n; saveBasket();
    $$('[data-basket]').forEach((el) => { el.textContent = basket; });
  }
  function bumpBasket() {
    const c = $('[data-basket-icon]');
    if (c) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    setBasket(basket + 1);
    toast('Pinned to your basket');
  }
  function flyToBasket(fromEl) {
    const to = $('[data-basket-icon]');
    if (!canAnimate || !to) { bumpBasket(); return; }
    const a = fromEl.getBoundingClientRect(), b = to.getBoundingClientRect();
    const dot = document.createElement('i');
    dot.className = 'fly';
    document.body.append(dot);
    gsap.set(dot, { x: a.left + a.width / 2 - 10, y: a.top + a.height / 2 - 10 });
    gsap.to(dot, { x: b.left + b.width / 2 - 10, duration: .75, ease: 'power1.inOut' });
    gsap.to(dot, { y: b.top + b.height / 2 - 10, scale: .45, duration: .75, ease: 'power3.in', onComplete: () => { dot.remove(); bumpBasket(); } });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.add');
    if (b) flyToBasket(b);
  });

  /* ---------- tag rendering ---------- */
  function renderTags() {
    $$('[data-render="tags"]').forEach((el) => {
      const limit = +el.dataset.limit || PRODUCTS.length;
      const offset = el.dataset.offset === '1';
      let html = PRODUCTS.slice(0, limit).map((p, i) => tagHTML(p, i, offset));
      if (el.dataset.specials === '1') {
        html.splice(3, 0, `<aside class="note board-item" data-special style="--r:2deg;--n:var(--butter)"><blockquote>Can't find it? Ask on the lane. Most makers take custom orders.</blockquote><cite><a class="link" href="#">Ask a neighbour →</a></cite></aside>`);
        html.splice(8, 0, `<aside class="visit visit--mini board-item" data-special><span class="sticker sticker--hand" style="--r:6deg">maker of the week</span><h3>Sunita Pottery</h3><p class="hand">spinning since 2019</p><dl><dt>Bandra West · </dt><dd>potter</dd><br><dt>★ 4.9 · </dt><dd>212 orders</dd></dl></aside>`);
      }
      el.innerHTML = html.join('');
    });
  }

  /* drop-in entrance for tags (axis 3) */
  function dropIn(selector, scope) {
    const items = $$(selector, scope);
    if (!items.length) return;
    gsap.set(items, { opacity: 0, y: -70, rotation: () => gsap.utils.random(-9, 9), transformOrigin: '50% 0' });
    ScrollTrigger.batch(items, {
      start: 'top 92%', once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, rotation: 0, duration: 1.3, stagger: .12, ease: 'elastic.out(1, .62)' }),
    });
  }

  /* ==========================================================
     HOME
     ========================================================== */
  function home() {
    /* --- hero intro --- */
    const h1 = $('.hero h1');
    const words = splitWords(h1);
    gsap.set(h1, { opacity: 1 });
    const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
    intro
      .from(words, { y: 70, opacity: 0, rotation: () => gsap.utils.random(-8, 8), duration: .9, stagger: .07 })
      .from('[data-hero]', { autoAlpha: 0, y: 30, duration: .8, stagger: .12 }, '-=.5')
      .from('.hero__cluster .tag', { y: -140, opacity: 0, rotation: (i) => [-14, 12, -9][i % 3], duration: 1.1, stagger: .16, ease: 'back.out(1.5)' }, '-=1')
      .from('.hero__cluster .sticker', { scale: 0, rotation: -45, duration: .6, stagger: .12, ease: 'back.out(3)' }, '-=.5');

    /* --- parallax wrappers --- */
    $$('[data-parallax]').forEach((el) => {
      gsap.to(el, { yPercent: -parseFloat(el.dataset.parallax), ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    });

    /* --- marquee speeds up with scroll velocity and reverses with direction --- */
    const track = $('.marquee__track');
    const anim = track && track.getAnimations()[0];
    if (anim) {
      anim.currentTime = 100000; /* keeps reverse playback inside an iteration */
      let rate = 1, target = 1;
      ScrollTrigger.create({ onUpdate: (s) => { target = s.direction * (1 + Math.min(Math.abs(s.getVelocity()) / 300, 5)); } });
      gsap.ticker.add(() => {
        rate += (target - rate) * .08;
        target += (Math.sign(target) - target) * .04;
        anim.playbackRate = rate;
      });
    }

    /* --- manifesto: words light up as you read --- */
    const para = $('.manifesto p');
    const mw = splitWords(para);
    gsap.fromTo(mw, { opacity: .16 }, { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: para, start: 'top 82%', end: 'bottom 55%', scrub: true } });
    $$('[data-count]').forEach((el) => {
      const end = +el.dataset.count, suffix = el.dataset.suffix || '', o = { v: 0 };
      el.textContent = '0' + suffix;
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 1.8, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v) + suffix; } }) });
    });

    /* --- shelf objects pop up --- */
    const things = $$('.thing');
    gsap.set(things, { opacity: 0, y: 80 });
    ScrollTrigger.batch(things, { start: 'top 92%', once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: .9, stagger: .09, ease: 'back.out(1.6)' }) });

    /* --- noticeboard --- */
    gsap.from('.note-title', { rotation: -9, y: 40, opacity: 0, duration: .9, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.note-title', start: 'top 85%' } });
    dropIn('.board .tag');

    /* --- notes on the wall --- */
    dropIn('.notes .note');

    /* --- the pinned story --- */
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const route = $('#route');
      const len = route.getTotalLength();
      gsap.set(route, { strokeDasharray: len, strokeDashoffset: len });
      gsap.set('.stop', { opacity: .25, y: 24 });
      gsap.set('.spot', { opacity: .35 });
      const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.story', start: 'top top', end: '+=2400', scrub: .6, pin: true, anticipatePin: 1 } });
      tl.to(route, { strokeDashoffset: 0, duration: 3 }, 0)
        .to('#scooter', { motionPath: { path: '#route', align: '#route', alignOrigin: [.5, .5] }, duration: 3 }, 0);
      [0, 1.35, 2.7].forEach((t, i) => {
        tl.to(`.stop[data-i="${i}"]`, { opacity: 1, y: 0, duration: .4, ease: 'power2.out' }, t)
          .to(`.spot[data-i="${i}"]`, { opacity: 1, duration: .3 }, t);
      });
    });
    mm.add('(max-width: 899px)', () => {
      $$('.stop').forEach((s) => gsap.from(s, { y: 40, opacity: 0, duration: .7, scrollTrigger: { trigger: s, start: 'top 90%', once: true } }));
    });

    /* --- background morph between sections --- */
    root.classList.add('js-morph');
    $$('[data-theme]').forEach((sec) => {
      ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => { if (s.isActive) document.body.dataset.theme = sec.dataset.theme; } });
    });

    /* --- footer reveal (desktop) --- */
    mm.add('(min-width: 900px)', () => {
      const f = $('.site-footer');
      const setH = () => root.style.setProperty('--footer-h', f.offsetHeight + 'px');
      document.body.classList.add('footer-reveal');
      setH();
      addEventListener('resize', setH);
      return () => { document.body.classList.remove('footer-reveal'); removeEventListener('resize', setH); };
    });

    addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ==========================================================
     MARKET
     ========================================================== */
  function market() {
    const wrap = $('#tags');
    const all = $$('.board-item', wrap);
    const products = all.filter((el) => !el.hasAttribute('data-special'));
    const specials = all.filter((el) => el.hasAttribute('data-special'));
    const state = { cat: 'all', km: 10, verified: false, sort: 'near' };

    const visible = (el) => {
      if (el.hasAttribute('data-special')) return state.cat === 'all' && !state.verified && state.km >= 10;
      return (state.cat === 'all' || el.dataset.cat === state.cat)
        && +el.dataset.km <= state.km
        && (!state.verified || el.dataset.verified === '1');
    };

    function apply() {
      const st = canAnimate ? Flip.getState(all) : null;
      const sorted = products.slice().sort((a, b) => state.sort === 'near' ? a.dataset.km - b.dataset.km || a.dataset.id - b.dataset.id
        : state.sort === 'low' ? a.dataset.price - b.dataset.price : b.dataset.price - a.dataset.price);
      const order = sorted.slice();
      if (specials[0]) order.splice(Math.min(3, order.length), 0, specials[0]);
      if (specials[1]) order.splice(Math.min(8, order.length), 0, specials[1]);
      order.forEach((el) => wrap.appendChild(el));
      all.forEach((el) => el.classList.toggle('is-hidden', !visible(el)));

      const n = products.filter(visible).length;
      $('#count').textContent = n ? `${n} tag${n === 1 ? '' : 's'} pinned within ${state.km} km` : '';
      $('#empty').classList.toggle('is-hidden', n > 0);

      if (st) Flip.from(st, {
        duration: .7, ease: 'power2.inOut', stagger: .03, absolute: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: .7 }, { opacity: 1, scale: 1, duration: .45, delay: .15 }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: .6, duration: .3 }),
      });
    }

    $$('.chip[data-cat]').forEach((chip) => chip.addEventListener('click', () => {
      $$('.chip[data-cat]').forEach((c) => c.setAttribute('aria-pressed', c === chip));
      state.cat = chip.dataset.cat; apply();
    }));
    $('#verified').addEventListener('click', (e) => {
      state.verified = !state.verified; e.currentTarget.setAttribute('aria-pressed', state.verified); apply();
    });
    $('#radius').addEventListener('input', (e) => { state.km = +e.target.value; $('#radius-out').textContent = state.km + ' km'; apply(); });
    $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; apply(); });
    $('#reset').addEventListener('click', () => {
      state.cat = 'all'; state.km = 10; state.verified = false;
      $$('.chip[data-cat]').forEach((c) => c.setAttribute('aria-pressed', c.dataset.cat === 'all'));
      $('#verified').setAttribute('aria-pressed', 'false');
      $('#radius').value = 10; $('#radius-out').textContent = '10 km';
      apply();
    });

    apply();
    if (canAnimate) {
      const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
      const h1 = $('.page-head h1');
      const w = splitWords(h1);
      intro.from(w, { y: 50, opacity: 0, duration: .8, stagger: .07 }).from('.page-head .hand', { opacity: 0, y: 14 }, '-=.5');
      dropIn('.board-item', wrap);
    }
  }

  /* ==========================================================
     CART (receipt)
     ========================================================== */
  function cart() {
    const lines = [
      { id: 1, name: 'Sourdough loaf', note: 'Ready stock', unit: 180, qty: 1 },
      { id: 2, name: 'Jaggery cookies (box of 6)', note: 'Ready stock', unit: 240, qty: 2 },
      { id: 3, name: 'Cardamom buns', note: 'Ready by Thu 13 Nov', unit: 150, qty: 1 },
    ];
    let mode = 'delivery';
    const list = $('#lines');
    const shown = { v: 0 };

    const subtotal = () => lines.reduce((s, l) => s + l.unit * l.qty, 0);
    const fee = () => (mode === 'delivery' && lines.length ? 40 : 0);

    function totals() {
      $('#sub').textContent = inr(subtotal());
      $('#fee').textContent = inr(fee());
      const end = subtotal() + fee();
      if (canAnimate) gsap.to(shown, { v: end, duration: .5, ease: 'power2.out', onUpdate: () => { $('#total').textContent = inr(Math.round(shown.v)); } });
      else $('#total').textContent = inr(end);
      $('#pay').disabled = !lines.length;
    }

    function draw() {
      list.innerHTML = lines.length ? lines.map((l) => `<div class="line" data-id="${l.id}">
        <div class="line__name">${esc(l.name)}<small>${esc(l.note)}</small></div>
        <div class="qty"><button type="button" data-d="-1" aria-label="Less">−</button><span>${l.qty}</span><button type="button" data-d="1" aria-label="More">+</button></div>
        <div class="line__price">${inr(l.unit * l.qty)}</div>
        <button class="line__rm" type="button">remove</button></div>`).join('')
        : `<div class="empty"><p class="hand">your basket is empty.</p><p><a class="link" href="demo2-market.html">The lane's still baking →</a></p></div>`;
      totals();
    }

    list.addEventListener('click', (e) => {
      const row = e.target.closest('.line'); if (!row) return;
      const l = lines.find((x) => x.id === +row.dataset.id);
      const d = e.target.closest('[data-d]');
      if (d) { l.qty = Math.max(1, Math.min(20, l.qty + +d.dataset.d)); $('.qty span', row).textContent = l.qty; $('.line__price', row).textContent = inr(l.unit * l.qty); totals(); }
      if (e.target.closest('.line__rm')) {
        const done = () => { lines.splice(lines.indexOf(l), 1); draw(); };
        if (canAnimate) gsap.to(row, { height: 0, opacity: 0, paddingBlock: 0, duration: .4, ease: 'power2.inOut', onComplete: done }); else done();
      }
    });
    $$('.modes .chip').forEach((c) => c.addEventListener('click', () => {
      mode = c.dataset.mode;
      $$('.modes .chip').forEach((x) => x.setAttribute('aria-pressed', x === c));
      totals();
    }));

    $('#pay').addEventListener('click', () => {
      const s = $('.placed span');
      if (!canAnimate) { s.style.opacity = 1; return; }
      gsap.timeline()
        .set(s, { opacity: 1, scale: 3.2 })
        .to(s, { scale: 1, duration: .28, ease: 'power4.in' })
        .to('.page', { x: 8, duration: .04, repeat: 5, yoyo: true, clearProps: 'x' }, '>-0.02')
        .to(s, { opacity: 0, duration: .5, delay: 1.2 });
    });

    draw();
    if (canAnimate) {
      gsap.from('.receipt', { y: -80, rotation: -3, opacity: 0, duration: 1, ease: 'elastic.out(1, .7)' });
      gsap.from('.receipt .line', { opacity: 0, x: -20, stagger: .1, delay: .4, duration: .5 });
    }
  }

  /* ---------- boot ---------- */
  chrome();
  renderTags();
  if (!hasLibs) return; /* page stays fully readable without GSAP */
  if (page === 'home' && canAnimate) home();
  if (page === 'market') market();
  if (page === 'cart') cart();
})();
