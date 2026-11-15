/* Shared case study behaviour: theme, nav, stepper, prototype, hover scroll, slider, lightbox */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- theme ---------- */
  const tog = document.getElementById('tog');
  const setTheme = t => { root.dataset.theme = t; if (tog) { tog.setAttribute('aria-pressed', t === 'dark'); tog.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); } try { localStorage.setItem('adya-theme', t); } catch (e) {} };
  try { const s = localStorage.getItem('adya-theme'); if (s) setTheme(s); } catch (e) {}
  if (tog) tog.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || reduce) return setTheme(next);
    const r = tog.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(() => setTheme(next)).ready.then(() => root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] }, { duration: 750, easing: 'cubic-bezier(.65,0,.25,1)', pseudoElement: '::view-transition-new(root)' }));
  });

  /* ---------- nav + progress ---------- */
  const nav = document.getElementById('nav'), bar = document.getElementById('progress'), hero = document.querySelector('.hero');
  const onScroll = () => {
    if (nav) nav.classList.toggle('scrolled', scrollY > (hero ? hero.offsetHeight - 80 : 10));
    if (bar) { const m = root.scrollHeight - innerHeight; bar.style.transform = `scaleX(${m > 0 ? scrollY / m : 0})`; }
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- stepper ---------- */
  const panels = [...document.querySelectorAll('.panel[data-step]')];
  const tabs = [...document.querySelectorAll('.stepper [data-go]')];
  const sbar = document.querySelector('.sbar i');
  const swrap = document.querySelector('.stepper-wrap');
  let current = -1;
  const titleOf = i => { const t = tabs[i]; return t ? t.dataset.title || t.textContent.trim() : ''; };
  function show(i, scroll) {
    if (i < 0 || i >= panels.length || i === current) { if (scroll) toStepper(); return; }
    current = i;
    panels.forEach((p, k) => p.classList.toggle('on', k === i));
    tabs.forEach((t, k) => { t.classList.toggle('on', k === i); t.classList.toggle('done', k < i); t.setAttribute('aria-selected', k === i); });
    if (sbar) sbar.style.width = ((i + 1) / panels.length * 100) + '%';
    const t = tabs[i]; if (t && t.scrollIntoView) { const s = t.parentNode; s.scrollTo({ left: t.offsetLeft - s.clientWidth / 2 + t.offsetWidth / 2, behavior: 'smooth' }); }
    try { history.replaceState(null, '', '#step-' + (i + 1)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('stepchange', { detail: i }));
    if (scroll) toStepper();
  }
  function toStepper() { if (!swrap) return; const y = swrap.getBoundingClientRect().top + scrollY - 72 + 1; if (scrollY > y + 2 || scrollY < y - 2) scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); }
  tabs.forEach((t, i) => t.addEventListener('click', () => show(i, true)));
  document.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); show(+b.dataset.start || 0, true); }));
  const m = /#step-(\d+)/.exec(location.hash);
  show(m ? Math.min(panels.length, Math.max(1, +m[1])) - 1 : 0, false);
  if (m) setTimeout(toStepper, 50);
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea,[data-proto]')) return;
    if (e.key === 'ArrowRight' && !e.metaKey && !e.altKey) { if (current < panels.length - 1) show(current + 1, true); }
    if (e.key === 'ArrowLeft' && !e.metaKey && !e.altKey) { if (current > 0) show(current - 1, true); }
  });

  /* ---------- clickable prototype (slow, calm autoplay) ---------- */
  const T = { pre: 1600, scroll: 4200, toTarget: 2400, hover: 1500, tap: 380, after: 2600, toast: 2200, loop: 2400 };
  document.querySelectorAll('[data-proto]').forEach(proto => {
    const cfg = JSON.parse(proto.querySelector('script[type="application/json"]').textContent);
    const demo = JSON.parse(proto.getAttribute('data-demo') || '[]');
    const scr = proto.querySelector('.pscr'), view = proto.querySelector('.pview'), img = view.querySelector('img');
    const nowEl = proto.querySelector('.now b'), back = proto.querySelector('[data-back]'), flowEls = [...proto.querySelectorAll('.pflow li')];
    const toast = proto.querySelector('.ptoast'), playBtn = proto.querySelector('[data-play]');
    const panel = proto.closest('.panel');
    const load = document.createElement('span'); load.className = 'load'; proto.querySelector('.pdev').appendChild(load);
    const cursor = document.createElement('span'); cursor.className = 'pcursor'; view.appendChild(cursor);
    const hist = []; let cur = null; const seen = new Set();
    const flash = () => { scr.classList.remove('flash'); void scr.offsetWidth; scr.classList.add('flash'); };
    const say = t => { toast.textContent = t; toast.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('on'), 2000); };
    function render(id) {
      const s = cfg.screens[id]; cur = id; seen.add(id);
      img.src = s.src; img.alt = s.name;
      view.querySelectorAll('.hs').forEach(h => h.remove());
      s.hs.forEach(([t, h, l, w, target, label]) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'hs';
        Object.assign(b.style, { top: t + '%', height: h + '%', left: l + '%', width: w + '%' });
        b.setAttribute('aria-label', label || 'Go to ' + target); b.dataset.target = target;
        b.addEventListener('click', e => { e.stopPropagation(); act(target); });
        view.appendChild(b);
      });
      if (nowEl) nowEl.textContent = s.name; if (back) back.disabled = !hist.length;
      flowEls.forEach(li => { li.classList.toggle('cur', li.dataset.id === id); li.classList.toggle('seen', seen.has(li.dataset.id)); });
      scr.scrollTop = 0;
    }
    function act(target) { if (target === 'back') return goBack(); if (target.indexOf('toast:') === 0) return say(target.slice(6)); go(target); }
    let swapSeq = 0;
    function swap(id) { const mySwap = ++swapSeq; return new Promise(res => { if (load) { load.classList.remove('go'); void load.offsetWidth; load.classList.add('go'); } view.classList.add('out'); setTimeout(() => { if (mySwap !== swapSeq) return res(); render(id); view.classList.remove('out'); view.classList.add('in0'); void view.offsetWidth; requestAnimationFrame(() => { view.classList.remove('in0'); setTimeout(res, 600); }); }, 480); }); }
    function go(id) { if (!cfg.screens[id]) return; hist.push(cur); return swap(id); }
    function goBack() { if (hist.length) return swap(hist.pop()); }

    let playing = false, token = 0;
    const alive = my => playing && my === token;
    function scrollTo(y, ms) { return new Promise(res => { const s0 = scr.scrollTop, d = Math.max(0, Math.min(y, scr.scrollHeight - scr.clientHeight)) - s0, t0 = performance.now(); if (Math.abs(d) < 4) return res(); const dur = Math.max(900, Math.min(ms, Math.abs(d) * 3.2)); const my = token; const step = now => { if (my !== token) return res(); const k = Math.min(1, (now - t0) / dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; scr.scrollTop = s0 + d * e; if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); }
    async function runDemo(my) {
      await sleep(T.pre);
      while (alive(my)) {
        for (const stepDef of demo) {
          if (!alive(my)) return;
          if (stepDef.indexOf('jump:') === 0) { hist.length = 0; await swap(stepDef.slice(5)); await sleep(T.after); continue; }
          const hs = [...view.querySelectorAll('.hs')].find(b => b.getAttribute('aria-label') === stepDef);
          if (!hs) continue;
          const maxS = scr.scrollHeight - scr.clientHeight, target = hs.offsetTop - scr.clientHeight / 2 + hs.offsetHeight / 2;
          /* gently show the page first if the button sits further down */
          if (maxS > 80 && target > scr.clientHeight * .6) { await scrollTo(Math.min(target, maxS) * .5, T.scroll); if (!alive(my)) return; await sleep(700); }
          if (!alive(my)) return;
          await scrollTo(target, T.toTarget);
          if (!alive(my)) return;
          cursor.style.top = (hs.offsetTop + hs.offsetHeight / 2) + 'px'; cursor.style.left = (hs.offsetLeft + hs.offsetWidth / 2) + 'px';
          cursor.classList.add('on'); await sleep(T.hover);
          if (!alive(my)) { cursor.classList.remove('on'); return; }
          cursor.classList.add('tap'); await sleep(T.tap); cursor.classList.remove('tap', 'on');
          if (!alive(my)) return;
          const t = hs.dataset.target;
          if (t.indexOf('toast:') === 0) { say(t.slice(6)); await sleep(T.toast); } else { await go(t); await sleep(T.after); }
        }
        if (!alive(my)) return;
        await sleep(T.loop); hist.length = 0; if (alive(my)) await swap(cfg.start); await sleep(T.after);
      }
    }
    function setPlay(on) { playing = on; token++; if (playBtn) { playBtn.innerHTML = on ? '❚❚ Pause demo' : '▶ Play demo'; playBtn.classList.toggle('on', on); } if (on) runDemo(token); }
    if (playBtn) playBtn.addEventListener('click', e => { e.stopPropagation(); setPlay(!playing); });
    const userTook = () => { if (playing) setPlay(false); };
    proto.querySelector('.pdev').addEventListener('pointerdown', userTook);
    scr.addEventListener('wheel', userTook, { passive: true });
    scr.addEventListener('touchstart', userTook, { passive: true });
    if (back) back.addEventListener('click', () => { userTook(); goBack(); });
    const rs = proto.querySelector('[data-restart]'); if (rs) rs.addEventListener('click', () => { userTook(); hist.length = 0; swap(cfg.start); });
    const tgl = proto.querySelector('[data-hs]');
    if (tgl) tgl.addEventListener('click', () => { const on = scr.classList.toggle('showhs'); tgl.classList.toggle('on', on); tgl.setAttribute('aria-pressed', on); });
    proto.querySelectorAll('[data-jump]').forEach(b => b.addEventListener('click', () => { userTook(); hist.length = 0; swap(b.dataset.jump); }));
    render(cfg.start);
    /* auto-play only while its step is open and the device is on screen; the visitor can pause any time */
    let userPaused = false, visible = false;
    if (playBtn) playBtn.addEventListener('click', () => { userPaused = !playing; });
    proto.querySelector('.pdev').addEventListener('pointerdown', () => { userPaused = true; });
    const panelOn = () => !panel || panel.classList.contains('on');
    const check = () => { const want = !reduce && demo.length && visible && panelOn() && !userPaused; if (want && !playing) setPlay(true); else if (!want && playing) setPlay(false); };
    if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; check(); }), { threshold: .4 }).observe(proto.querySelector('.pdev'));
    document.addEventListener('stepchange', () => { if (!panelOn()) { hist.length = 0; } setTimeout(check, 60); });
    if (reduce && playBtn) { playBtn.innerHTML = '▶ Play demo'; playBtn.classList.remove('on'); }
  });

  /* ---------- hover (or tap) a phone/browser to scroll its full screen, slowly ---------- */
  document.querySelectorAll('[data-scroll]').forEach(im => {
    const box = im.parentNode;
    const host = box.closest('.phone, .browser') || box;
    let on = false;
    const run = v => { on = v; const d = Math.max(0, im.offsetHeight - box.clientHeight); im.style.transitionDuration = v ? Math.max(3, d / 120) + 's' : '1.4s'; im.style.transform = v ? `translateY(${-d}px)` : 'translateY(0)'; };
    host.addEventListener('mouseenter', () => run(true));
    host.addEventListener('mouseleave', () => run(false));
    host.addEventListener('click', e => { if (e.target.closest('.zoom')) return; run(!on); });
  });

  /* ---------- draw-on-view (SVG motifs, borders) ---------- */
  if ('IntersectionObserver' in window) {
    const dio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); dio.unobserve(e.target); } }), { threshold: .2 });
    document.querySelectorAll('.border, .motif, .draw').forEach(el => dio.observe(el));
  } else document.querySelectorAll('.border, .motif, .draw').forEach(el => el.classList.add('in'));

  /* ---------- before / after slider ---------- */
  document.querySelectorAll('.ba').forEach(b => { const r = b.querySelector('input'); const upd = () => b.style.setProperty('--x', r.value + '%'); r.addEventListener('input', upd); upd(); });

  /* ---------- lightbox ---------- */
  const lb = document.createElement('div'); lb.className = 'lb'; lb.innerHTML = '<button type="button" aria-label="Close">✕</button><img alt="">'; document.body.appendChild(lb);
  const lbImg = lb.querySelector('img');
  const close = () => lb.classList.remove('on');
  lb.addEventListener('click', close); addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.querySelectorAll('.zoom').forEach(z => z.addEventListener('click', () => { const i = z.querySelector('img'); lbImg.src = z.dataset.full || i.currentSrc || i.src; lbImg.alt = i.alt; lb.classList.add('on'); lb.scrollTop = 0; }));
})();
