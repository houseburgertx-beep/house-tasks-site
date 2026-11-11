/**
 * HOUSE TASKS · DESPEGUE
 * Criação de tarefas com barra de ativação, física de mola e cohete que despega.
 * Totalmente integrado à identidade do Grupo House190.
 */
(function () {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Resorte com solução de equação diferencial a 240 fps
  function muelle(k, c) {
    const pts = [0];
    let x = 0, v = 0, t = 0;
    while (t < 3) {
      v += (k * (1 - x) - c * v) / 240;
      x += v / 240;
      t += 1 / 240;
      pts.push(x);
      if (t > .15 && Math.abs(1 - x) < .001 && Math.abs(v) < .01) break;
    }
    const out = [];
    for (let i = 0; i <= 40; i++) {
      out.push(pts[Math.round(i / 40 * (pts.length - 1))].toFixed(4));
    }
    out[40] = '1';
    return { ease: 'linear(' + out.join(', ') + ')', ms: Math.round(t * 1000) };
  }

  // Gerador pseudo-aleatório com semente (confeti consistente)
  function mulberry32(s) {
    return () => {
      s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Paleta oficial HouseBurger / Grupo House190 para os confetes
  const COLORES = ['#795fd2', '#9d83e8', '#ebb76c', '#3c8777', '#e24a4a', '#614ab8', '#f0ebfc', '#ffffff'];

  const SUB_PT = [
    '4 etapas para decolar sua entrega na House',
    '3 etapas restantes para o lançamento',
    '2 etapas para a decolagem',
    'Só mais um passo e estamos prontos',
    'Tudo pronto para o despegue!'
  ];

  // Injeta a estrutura HTML do modal
  function injetaModalDespegue() {
    if (document.getElementById('despegueModal')) return;

    const modal = document.createElement('dialog');
    modal.id = 'despegueModal';
    modal.innerHTML = `
      <div class="de-escena" data-despegue>
        <div class="de-fondo" aria-hidden="true">
          <div class="de-nube de-n1"></div>
          <div class="de-nube de-n2"></div>
          <div class="de-nube de-n3"></div>
        </div>
        <canvas class="de-lienzo" data-lienzo aria-hidden="true"></canvas>

        <div class="de-caja">
          <!-- O Cohete de Papel Geométrico (Origami) -->
          <div class="de-cohete" data-cohete aria-hidden="true">
            <svg viewBox="0 0 120 270" width="110" height="248" focusable="false">
              <defs>
                <linearGradient id="de-g-llama" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#fff3c4"/>
                  <stop offset=".45" stop-color="#fdba74"/>
                  <stop offset="1" stop-color="#fb923c" stop-opacity=".85"/>
                </linearGradient>
                <radialGradient id="de-g-ojo" cx=".35" cy=".3" r=".8">
                  <stop offset="0" stop-color="#ffffff"/>
                  <stop offset=".5" stop-color="#f0ebfc"/>
                  <stop offset="1" stop-color="#9d83e8"/>
                </radialGradient>
              </defs>
              <g class="de-llama" data-llama>
                <path class="de-llama-a" d="M60 208C42 230 51 250 60 268 69 250 78 230 60 208Z"/>
                <path class="de-llama-b" d="M60 210C51 226 55 240 60 252 65 240 69 226 60 210Z"/>
              </g>
              <path class="de-ala-i" d="M30 150 5 208 30 192Z"/>
              <path class="de-ala-i2" d="M30 150 30 192 17 200Z"/>
              <path class="de-ala-d" d="M90 150 115 208 90 192Z"/>
              <path class="de-ala-d2" d="M90 150 90 192 103 200Z"/>
              <path class="de-cuerpo-i" d="M34 84H60V198L30 192Z"/>
              <path class="de-cuerpo-d" d="M60 84H86L90 192 60 198Z"/>
              <path class="de-banda" d="M32 168H88L88.6 178H31.4Z"/>
              <path class="de-base" d="M30 192 60 198 90 192 84 206H36Z"/>
              <path class="de-nariz-i" d="M60 4C46 32 36 56 34 84H60Z"/>
              <path class="de-nariz-d" d="M60 4C74 32 84 56 86 84H60Z"/>
              <path class="de-pliegue" d="M60 8V196"/>
              <circle cx="60" cy="124" r="18" class="de-ojo-aro"/>
              <circle cx="60" cy="124" r="13.5" fill="url(#de-g-ojo)"/>
              <path class="de-ojo-luz" d="M52 120a9 9 0 0 1 8-6"/>
            </svg>
          </div>

          <section class="de-tarjeta" data-tarjeta aria-labelledby="de-titulo">
            <button type="button" class="de-cerrar-modal" id="despegueCerrar" aria-label="Fechar modal">
              <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
            </button>

            <header class="de-cab">
              <div class="de-cab-t">
                <span class="de-badge"><span class="dot"></span> Do combinado à ação</span>
                <h1 id="de-titulo">Criar nova tarefa</h1>
                <p data-sub><span>4 etapas para decolar sua entrega na House</span></p>
              </div>
              <div class="de-cuenta" aria-hidden="true">
                <span class="de-cuenta-n" data-n>0</span>
                <span class="de-cuenta-de">/ 4</span>
              </div>
            </header>

            <div class="de-barra" role="progressbar" aria-label="Passos completados" aria-valuemin="0" aria-valuemax="4" aria-valuenow="0" data-barra-caja>
              <i class="de-barra-fill" data-barra></i>
            </div>

            <div class="de-lista-caja" data-lista-caja>
              <div class="de-lista-in">
                <ol class="de-pasos" data-pasos>
                  <!-- Passo 1: O que precisa ser feito -->
                  <li class="de-paso is-activo" data-paso aria-current="step">
                    <div class="de-paso-cab">
                      <span class="de-nodo" aria-hidden="true"><span class="de-num">1</span><svg viewBox="0 0 24 24"><path d="m5.6 12.6 4.2 4.2 8.6-9.4"/></svg></span>
                      <span class="de-paso-t"><b>Defina sua tarefa</b><small>Nome claro e informações da entrega</small></span>
                    </div>
                    <div class="de-cuerpo"><div class="de-cuerpo-in">
                      <label class="de-campo">
                        <span>Nome da tarefa *</span>
                        <input type="text" placeholder="Ex. Conferir estoque para o fim de semana" maxlength="180" autocomplete="off" data-nombre>
                      </label>
                      <label class="de-campo">
                        <span>Descrição opcional</span>
                        <textarea rows="2" placeholder="O que precisa ser feito? Acrescente detalhes importantes..." data-descricao class="de-select"></textarea>
                      </label>
                      <button class="de-accion" type="button" data-hecho>Avançar para equipe <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
                    </div></div>
                  </li>

                  <!-- Passo 2: Unidade e Responsável -->
                  <li class="de-paso" data-paso>
                    <div class="de-paso-cab">
                      <span class="de-nodo" aria-hidden="true"><span class="de-num">2</span><svg viewBox="0 0 24 24"><path d="m5.6 12.6 4.2 4.2 8.6-9.4"/></svg></span>
                      <span class="de-paso-t"><b>Unidade e Responsável</b><small>Onde e quem cuidará desta entrega na House</small></span>
                    </div>
                    <div class="de-cuerpo"><div class="de-cuerpo-in">
                      <div class="de-grid-campos">
                        <label class="de-campo">
                          <span>Unidade da House</span>
                          <select data-unidade class="de-select"><option value="">Sem unidade</option></select>
                        </label>
                        <label class="de-campo">
                          <span>Responsável</span>
                          <select data-responsavel class="de-select"><option value="">Sem responsável</option></select>
                        </label>
                      </div>
                      <button class="de-accion" type="button" data-hecho><span data-txt>Avançar para prazos</span> <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
                    </div></div>
                  </li>

                  <!-- Passo 3: Prazo e Prioridade -->
                  <li class="de-paso" data-paso>
                    <div class="de-paso-cab">
                      <span class="de-nodo" aria-hidden="true"><span class="de-num">3</span><svg viewBox="0 0 24 24"><path d="m5.6 12.6 4.2 4.2 8.6-9.4"/></svg></span>
                      <span class="de-paso-t"><b>Prazo e Prioridade</b><small>Tempo limite e urgência da operação</small></span>
                    </div>
                    <div class="de-cuerpo"><div class="de-cuerpo-in">
                      <div class="de-grid-campos">
                        <label class="de-campo">
                          <span>Data limite</span>
                          <input type="date" data-prazo class="de-select">
                        </label>
                        <label class="de-campo">
                          <span>Prioridade</span>
                          <div class="de-fuentes" role="group" aria-label="Prioridade">
                            <button class="de-fuente" type="button" aria-pressed="true" data-prio="normal"><span>Normal</span><i aria-hidden="true"></i></button>
                            <button class="de-fuente" type="button" aria-pressed="false" data-prio="high"><span>Alta</span><i aria-hidden="true"></i></button>
                            <button class="de-fuente" type="button" aria-pressed="false" data-prio="urgent"><span>Urgente</span><i aria-hidden="true"></i></button>
                          </div>
                        </label>
                      </div>
                      <button class="de-accion" type="button" data-hecho><span data-txt>Avançar para checklist</span> <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
                    </div></div>
                  </li>

                  <!-- Passo 4: Checklist e Decolagem -->
                  <li class="de-paso" data-paso>
                    <div class="de-paso-cab">
                      <span class="de-nodo" aria-hidden="true"><span class="de-num">4</span><svg viewBox="0 0 24 24"><path d="m5.6 12.6 4.2 4.2 8.6-9.4"/></svg></span>
                      <span class="de-paso-t"><b>Lançar entrega</b><small>Tudo pronto para decolar no ritmo da House</small></span>
                    </div>
                    <div class="de-cuerpo"><div class="de-cuerpo-in">
                      <div class="de-proyecto">
                        <div class="de-proy-ico" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </div>
                        <div class="de-proy-t">
                          <b data-preview-titulo>Nova entrega</b>
                          <small data-preview-sub>Pronto para decolar</small>
                        </div>
                        <span class="de-estado" data-estado>Pronto</span>
                      </div>
                      <button class="de-accion es-lancar" type="button" data-hecho><span data-txt>Lançar tarefa na House 🚀</span> <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
                    </div></div>
                  </li>
                </ol>
              </div>
            </div>

            <div class="de-final" data-final aria-hidden="true">
              <div class="de-final-in">
                <span class="de-final-ok"><svg viewBox="0 0 24 24"><path d="m5.6 12.6 4.2 4.2 8.6-9.4"/></svg></span>
                <div><b>Sua tarefa foi lançada!</b><small>Tudo pronto para fazer acontecer no ritmo da House.</small></div>
                <button class="de-repite" type="button" data-repite tabindex="-1">Criar outra tarefa</button>
              </div>
            </div>
          </section>
        </div>

        <p class="de-pista"><span>Preencha cada etapa para avançar</span><i></i><span><kbd>Enter</kbd> confirma</span></p>
        <p class="de-oculto" role="status" aria-live="polite" data-vivo></p>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('despegueCerrar').addEventListener('click', () => {
      modal.close();
    });

    modal.addEventListener('cancel', () => {
      modal.close();
    });
  }

  // Motor Despegue com física, partículas e decolagem
  function Despegue(raiz, opcoes) {
    const o = Object.assign({ semilla: 7, reinicio: 2600, alCompletar: null, alDespegar: null }, opcoes);
    const azar = mulberry32(o.semilla);
    const $ = s => raiz.querySelector(s), $$ = s => Array.from(raiz.querySelectorAll(s));
    const tarjeta = $('[data-tarjeta]'), barra = $('[data-barra]'), barraCaja = $('[data-barra-caja]'), nEl = $('[data-n]'), sub = $('[data-sub]');
    const cohete = $('[data-cohete]'), lienzo = $('[data-lienzo]'), g = lienzo.getContext('2d'), vivo = $('[data-vivo]');
    const pasos = $$('[data-paso]'), TOTAL = pasos.length;
    const avisa = s => { vivo.textContent = ''; vivo.textContent = s; };
    let hechos = 0, estado = 'pasos', relojes = [], parts = [], raf = 0, ultimo = null;

    const SALTO = muelle(140, 13);
    raiz.style.setProperty('--de-muelle', SALTO.ease);
    raiz.style.setProperty('--de-muelle-ms', SALTO.ms + 'ms');
    const luego = (f, ms) => { const id = setTimeout(f, ms); relojes.push(id); return id; };
    const anima = (e, kf, ms, ease, extra) => { if (reduce || !e.animate) return null; return e.animate(kf, Object.assign({ duration: ms, easing: ease || 'ease' }, extra)); };
    $('.de-cuenta-de').textContent = '/ ' + TOTAL;
    barraCaja.setAttribute('aria-valuemax', TOTAL);

    function pintaProgreso(anim) {
      barra.style.transform = 'translateX(' + ((hechos / TOTAL - 1) * 100) + '%)';
      barraCaja.setAttribute('aria-valuenow', hechos);
      if (String(hechos) !== nEl.textContent) {
        nEl.textContent = hechos;
        if (anim) anima(nEl, [{ transform: 'translateY(55%)', opacity: 0 }, { transform: 'none', opacity: 1 }], 520, SALTO.ease);
      }
      const txt = hechos >= TOTAL ? SUB_PT[SUB_PT.length - 1] : (TOTAL === 4 ? SUB_PT[hechos] : (hechos === 0 ? 'Comece pelo primeiro passo' : 'Faltam ' + (TOTAL - hechos) + ' passos'));
      const viejo = sub.firstElementChild;
      if (viejo && viejo.textContent === txt) return;
      if (viejo) {
        const nuevo = document.createElement('span');
        nuevo.textContent = txt;
        sub.appendChild(nuevo);
        const a = anima(viejo, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px)' }], 220, 'ease-in', { fill: 'forwards' });
        if (a) {
          a.onfinish = () => viejo.remove();
          anima(nuevo, [{ opacity: 0, transform: 'translateY(9px)' }, { opacity: 1, transform: 'none' }], 420, 'cubic-bezier(.22, 1, .36, 1)', { delay: 80, fill: 'backwards' });
        } else {
          viejo.remove();
        }
      }
    }

    function activa(i) {
      pasos.forEach((p, k) => {
        p.classList.toggle('is-activo', k === i);
        if (k === i) p.setAttribute('aria-current', 'step'); else p.removeAttribute('aria-current');
        const cuerpo = p.querySelector('.de-cuerpo-in');
        if (cuerpo) cuerpo.inert = k !== i;
      });
      if (i === 3) {
        const previewTitulo = $('[data-preview-titulo]');
        const previewSub = $('[data-preview-sub]');
        const nomeVal = $('[data-nombre]').value.trim();
        const selUnidade = $('[data-unidade]');
        const nomeUnidade = selUnidade.options[selUnidade.selectedIndex]?.text || '';
        if (previewTitulo && nomeVal) previewTitulo.textContent = nomeVal;
        if (previewSub) previewSub.textContent = nomeUnidade !== 'Sem unidade' ? nomeUnidade : 'Grupo House190';
      }
    }

    const nombre = $('[data-nombre]');
    const btn = i => pasos[i].querySelector('[data-hecho]');
    function validaNombre() { btn(0).disabled = !nombre.value.trim(); }
    nombre.addEventListener('input', validaNombre);

    // Seleção de prioridade
    const prios = $$('[data-prio]');
    prios.forEach(b => b.addEventListener('click', () => {
      prios.forEach(p => p.setAttribute('aria-pressed', p === b ? 'true' : 'false'));
    }));

    function completa() {
      if (estado !== 'pasos' || hechos >= TOTAL) return;
      const n = hechos, p = pasos[n];
      hechos++;
      p.classList.add('is-hecho');
      pintaProgreso(true);
      avisa('Passo ' + (n + 1) + ' completado');
      if (o.alCompletar) o.alCompletar({ paso: n + 1, hechos });

      if (hechos >= TOTAL) {
        activa(-1);
        luego(despega, 600);
      } else {
        activa(hechos);
        const foco = pasos[hechos].querySelector('input, select, button');
        if (foco) foco.focus({ preventScroll: true });
      }
    }

    pasos.forEach((p, i) => p.querySelector('[data-hecho]').addEventListener('click', () => {
      if (i === hechos) {
        if (i === 3) {
          salvarTarefaNaApi().then(() => completa()).catch(() => completa());
        } else {
          completa();
        }
      }
    }));

    // Partículas no canvas: confetes e fumaça física
    let W = 0, H = 0, dpr = 1;
    function ajusta() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth;
      H = window.innerHeight;
      lienzo.width = W * dpr;
      lienzo.height = H * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ajusta();
    window.addEventListener('resize', ajusta);

    function confeti(x, y, n) {
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + (azar() - .5) * 2.5, v = 260 + azar() * 640, forma = azar();
        parts.push({
          t: 'c', x: x + (azar() - .5) * 120, y: y + (azar() - .5) * 30,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: azar() * 6.28, vr: (azar() - .5) * 14,
          w: 6 + azar() * 7, h: forma < .55 ? 3 + azar() * 3 : (forma < .8 ? 6 + azar() * 6 : 3 + azar() * 3),
          redondo: forma > .8, col: COLORES[Math.floor(azar() * COLORES.length)], vida: 0, max: 2.6 + azar() * 1.6, fase: azar() * 6.28
        });
      }
    }

    function humo(x, y, escala) {
      parts.push({
        t: 'h', x: x + (azar() - .5) * 18, y,
        vx: (azar() - .5) * 60, vy: 40 + azar() * 70,
        r: (10 + azar() * 10) * escala, vida: 0, max: .9 + azar() * .6
      });
    }

    function dibuja(dt) {
      g.clearRect(0, 0, W, H);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vida += dt;
        if (p.vida >= p.max || p.y > H + 40) { parts.splice(i, 1); continue; }
        const u = p.vida / p.max;
        if (p.t === 'h') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= .98;
          const r = p.r * (1 + u * 2.4);
          g.globalAlpha = (1 - u) * (1 - u) * .85;
          g.fillStyle = '#ffffff';
          g.shadowColor = 'rgba(121, 95, 210, .35)';
          g.shadowBlur = 10;
          g.beginPath();
          g.arc(p.x, p.y, r, 0, 6.2832);
          g.fill();
          g.shadowBlur = 0;
        } else {
          p.vy += 900 * dt;
          p.vx *= Math.pow(.3, dt);
          p.vy *= Math.pow(.55, dt);
          p.x += (p.vx + Math.sin(p.vida * 4 + p.fase) * 38) * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          g.globalAlpha = u > .78 ? (1 - u) / .22 : 1;
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.rot);
          g.scale(1, Math.cos(p.vida * 7 + p.fase));
          g.fillStyle = p.col;
          if (p.redondo) {
            g.beginPath();
            g.arc(0, 0, p.w * .5, 0, 6.2832);
            g.fill();
          } else {
            g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          }
          g.restore();
        }
      }
      g.globalAlpha = 1;
    }

    function bucle(t) {
      if (ultimo == null) ultimo = t;
      const dt = Math.min(.05, Math.max(0, (t - ultimo) / 1000));
      ultimo = t;
      volando(dt);
      dibuja(dt);
      if (parts.length || vuelo) raf = requestAnimationFrame(bucle);
      else { raf = 0; ultimo = null; g.clearRect(0, 0, W, H); }
    }
    const enciende = () => { if (!raf) { ultimo = null; raf = requestAnimationFrame(bucle); } };

    // Decolagem do foguete: aparece, tiembla, enciende la llama e sobe acelerando
    let vuelo = null;
    const base = () => {
      const r = cohete.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height * .97];
    };
    function poseCohete(y, rot, esc) {
      cohete.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg) scale(' + esc.toFixed(3) + ')';
    }

    function volando(dt) {
      if (!vuelo) return;
      const v = vuelo;
      v.t += dt;
      if (v.fase === 'tiembla') {
        const k = v.t / v.dura, a = Math.min(1, k * 1.6);
        poseCohete(Math.sin(v.t * 70) * 1.6 * a + 4 * Math.min(1, k * 3), Math.sin(v.t * 53) * 1.8 * a, 1 - .02 * a);
        if (((v.t * 60) | 0) % 3 === 0 && ((v.t * 60) | 0) !== v.ult) {
          v.ult = (v.t * 60) | 0;
          const [bx, by] = base();
          humo(bx, by, .7);
        }
        if (v.t >= v.dura) {
          v.fase = 'sube';
          v.t = 0;
          v.v = -40;
          v.y = 4;
          const [bx, by] = base();
          confeti(bx, by - 140, 150);
          onDespegue();
        }
      } else if (v.fase === 'sube') {
        v.v -= 2300 * dt;
        v.y += v.v * dt;
        poseCohete(v.y, Math.sin(v.t * 9) * .8 * Math.min(1, v.t * 2), 1 + Math.min(.12, v.t * .1));
        v.acum += dt;
        while (v.acum > .016) {
          v.acum -= .016;
          const [bx, by] = base();
          humo(bx, by + 4, .9 + v.t * .6);
        }
        if (v.y < -(window.innerHeight + 420)) {
          vuelo = null;
          cohete.style.opacity = 0;
          cohete.classList.remove('is-fuego');
        }
      }
    }

    function onDespegue() {
      tarjeta.classList.add('is-final');
      $('[data-final]').setAttribute('aria-hidden', 'false');
      $('[data-repite]').tabIndex = 0;
      avisa('Tudo pronto: sua tarefa está em lançamento');
      if (o.alDespegar) o.alDespegar();
      if (o.reinicio) {
        luego(() => {
          const m = document.getElementById('despegueModal');
          if (m && m.open) m.close();
          reinicia();
        }, o.reinicio);
      }
    }

    function despega() {
      estado = 'despega';
      tarjeta.classList.add('is-despega');
      if (reduce) { onDespegue(); estado = 'final'; return; }
      cohete.style.opacity = 1;
      poseCohete(30, 0, .6);
      anima(cohete, [{ opacity: 0 }, { opacity: 1 }], 260, 'ease-out');
      anima(cohete, [{ scale: '.6', translate: '0 40px' }, { scale: '1', translate: '0 0' }], SALTO.ms + 150, SALTO.ease);
      luego(() => {
        cohete.classList.add('is-fuego');
        vuelo = { fase: 'tiembla', t: 0, dura: .7, y: 0, v: 0, acum: 0, ult: -1 };
        poseCohete(0, 0, 1);
        enciende();
      }, 460);
    }

    function reinicia() {
      relojes.forEach(clearTimeout);
      relojes = [];
      estado = 'pasos';
      hechos = 0;
      vuelo = null;
      tarjeta.classList.remove('is-final', 'is-despega');
      cohete.style.opacity = 0;
      cohete.classList.remove('is-fuego');
      cohete.style.transform = '';
      $('[data-final]').setAttribute('aria-hidden', 'true');
      $('[data-repite]').tabIndex = -1;
      pasos.forEach(p => p.classList.remove('is-hecho'));
      activa(0);
      validaNombre();
      pintaProgreso(true);
      avisa('De novo a partir do primeiro passo');
    }
    $('[data-repite]').addEventListener('click', reinicia);

    document.addEventListener('keydown', e => {
      const m = document.getElementById('despegueModal');
      if (!m || !m.open) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter' && estado === 'pasos') {
        const t = e.target;
        if (t.matches && t.matches('button, a')) return;
        e.preventDefault();
        completa();
      }
    });

    activa(0);
    validaNombre();
    pintaProgreso(false);
    $('[data-final]').setAttribute('aria-hidden', 'true');

    return { completa, reinicia, despega };
  }

  // Integração com a API do HOUSE TASKS
  async function carregarDadosOperacao() {
    try {
      const session = sessionStorage.getItem('house-tasks-session');
      const base = (window.__HOUSE_CONFIG__ && window.__HOUSE_CONFIG__.apiBaseUrl) || 'https://house-tasks-api.brunohouse.workers.dev';
      const res = await fetch(base.replace(/\/$/, '') + '/api/data', {
        headers: session ? { 'Authorization': 'Bearer ' + session } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const selUnidade = document.querySelector('[data-unidade]');
        const selResp = document.querySelector('[data-responsavel]');
        if (selUnidade && data.units) {
          selUnidade.innerHTML = '<option value="">Sem unidade</option>' +
            data.units.filter(u => u.active).map(u => `<option value="${u.id}">${u.name}</option>`).join('');
        }
        if (selResp && data.people) {
          selResp.innerHTML = '<option value="">Sem responsável</option>' +
            data.people.filter(p => p.active).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }
      }
    } catch (e) {
      console.warn('[HOUSE TASKS] Não foi possível carregar dados para o Despegue:', e);
    }
  }

  async function salvarTarefaNaApi() {
    try {
      const session = sessionStorage.getItem('house-tasks-session');
      const base = (window.__HOUSE_CONFIG__ && window.__HOUSE_CONFIG__.apiBaseUrl) || 'https://house-tasks-api.brunohouse.workers.dev';
      const title = document.querySelector('[data-nombre]').value.trim();
      const description = (document.querySelector('[data-descricao]')?.value || '').trim();
      const unit_id = document.querySelector('[data-unidade]').value || null;
      const person_id = document.querySelector('[data-responsavel]').value || null;
      const due = document.querySelector('[data-prazo]').value || null;

      const prioBtn = document.querySelector('[data-prio][aria-pressed="true"]');
      const priority = prioBtn ? prioBtn.getAttribute('data-prio') : 'normal';

      const payload = {
        title: title || 'Nova entrega da House',
        description,
        unit_id,
        person_id,
        due,
        priority,
        status: 'todo',
        checklist: [],
        approval: false
      };

      const res = await fetch(base.replace(/\/$/, '') + '/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { 'Authorization': 'Bearer ' + session } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        window.dispatchEvent(new CustomEvent('house:refresh'));
      }
    } catch (e) {
      console.error('[HOUSE TASKS] Erro ao salvar tarefa:', e);
    }
  }

  // Abre a modal do Despegue
  window.abrirDespegue = function () {
    injetaModalDespegue();
    const modal = document.getElementById('despegueModal');
    if (!modal) return;

    if (!window.despegueInstancia) {
      const raiz = modal.querySelector('[data-despegue]');
      window.despegueInstancia = Despegue(raiz);
    } else {
      window.despegueInstancia.reinicia();
    }

    carregarDadosOperacao();
    modal.showModal();
    const nomeInput = modal.querySelector('[data-nombre]');
    if (nomeInput) {
      nomeInput.value = '';
      setTimeout(() => nomeInput.focus(), 80);
    }
  };

  // Intercepta qualquer botão ou gatilho de criação de tarefa no app
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('button, a');
    if (!btn) return;

    const txt = (btn.textContent || '').trim().toLowerCase();
    const isTaskCreation = txt.includes('nova tarefa') ||
                           txt.includes('criar tarefa') ||
                           txt.includes('criar primeira tarefa') ||
                           (btn.classList.contains('primary') && (txt.includes('tarefa') || btn.closest('.welcome-actions')));

    if (isTaskCreation && !btn.closest('#despegueModal')) {
      e.preventDefault();
      e.stopPropagation();

      // Fecha eventuais gavetas padrões abertas pelo React
      const openDialog = document.querySelector('dialog.modal:not(#despegueModal)');
      if (openDialog && openDialog.open) openDialog.close();

      window.abrirDespegue();
    }
  }, true);

  // Monitora aberturas de modal nativas do React para criação de tarefas
  const observer = new MutationObserver(() => {
    const reactModal = document.querySelector('dialog.modal:not(#despegueModal)');
    if (reactModal && reactModal.open) {
      const heading = reactModal.querySelector('.modal-heading');
      if (heading) {
        const isCreating = heading.textContent.includes('DO COMBINADO À AÇÃO') || heading.textContent.includes('Qual é o próximo passo?');
        if (isCreating) {
          reactModal.close();
          window.abrirDespegue();
        }
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injetaModalDespegue();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    injetaModalDespegue();
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
