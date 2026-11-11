/**
 * HOUSE TASKS · DESPEGUE & MODERN KANBAN ENGINE
 * Foguete de origami com física de decolagem, confetes e fumaça física.
 * Drag-and-drop touch no mobile e mouse no desktop para o Kanban.
 * Totalmente integrado à identidade do Grupo House190.
 */
(function () {
  'use strict';

  const reduce = false; // Exibição obrigatória e gloriosa do foguete

  // Gerador pseudo-aleatório com semente (confeti consistente)
  function mulberry32(s) {
    return () => {
      s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Paleta oficial HouseBurger / Grupo House190
  const COLORES = ['#795fd2', '#9d83e8', '#ebb76c', '#3c8777', '#e24a4a', '#614ab8', '#f0ebfc', '#ffffff'];

  const SUB_PT = [
    '4 etapas para decolar sua entrega na House',
    '3 etapas restantes para o lançamento',
    '2 etapas para a decolagem',
    'Só mais um passo e estamos prontos',
    'Tudo pronto para a decolagem!'
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

        <!-- O Foguete Origami em camada fixa sobreposta -->
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

        <div class="de-caja">
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
                      <button class="de-accion" type="button" data-hecho><span data-txt>Avançar para resumo</span> <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
                    </div></div>
                  </li>

                  <!-- Passo 4: Resumo e Decolagem -->
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
    const o = Object.assign({ semilla: 7, reinicio: 2800, alCompletar: null, alDespegar: null }, opcoes);
    const azar = mulberry32(o.semilla);
    const $ = s => raiz.querySelector(s), $$ = s => Array.from(raiz.querySelectorAll(s));
    const tarjeta = $('[data-tarjeta]'), barra = $('[data-barra]'), barraCaja = $('[data-barra-caja]'), nEl = $('[data-n]'), sub = $('[data-sub]');
    const cohete = $('[data-cohete]'), lienzo = $('[data-lienzo]'), g = lienzo.getContext('2d');
    const pasos = $$('[data-paso]'), TOTAL = pasos.length;

    let hechos = 0, estado = 'pasos', relojes = [], parts = [], raf = 0, ultimo = null;
    const luego = (f, ms) => { const id = setTimeout(f, ms); relojes.push(id); return id; };

    $('.de-cuenta-de').textContent = '/ ' + TOTAL;
    barraCaja.setAttribute('aria-valuemax', TOTAL);

    function pintaProgreso(anim) {
      barra.style.transform = 'translateX(' + ((hechos / TOTAL - 1) * 100) + '%)';
      barraCaja.setAttribute('aria-valuenow', hechos);
      if (String(hechos) !== nEl.textContent) {
        nEl.textContent = hechos;
      }
      const txt = hechos >= TOTAL ? SUB_PT[SUB_PT.length - 1] : (TOTAL === 4 ? SUB_PT[hechos] : (hechos === 0 ? 'Comece pelo primeiro passo' : 'Faltam ' + (TOTAL - hechos) + ' passos'));
      const velho = sub.firstElementChild;
      if (velho && velho.textContent === txt) return;
      if (velho) {
        const novo = document.createElement('span');
        novo.textContent = txt;
        sub.appendChild(novo);
        setTimeout(() => velho.remove(), 200);
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
        if (previewSub) previewSub.textContent = (nomeUnidade && nomeUnidade !== 'Sem unidade') ? nomeUnidade : 'Grupo House190';
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
      if (o.alCompletar) o.alCompletar({ paso: n + 1, hechos });

      if (hechos >= TOTAL) {
        activa(-1);
        luego(despega, 300);
      } else {
        activa(hechos);
        const foco = pasos[hechos].querySelector('input, select, button');
        if (foco) foco.focus({ preventScroll: true });
      }
    }

    pasos.forEach((p, i) => p.querySelector('[data-hecho]').addEventListener('click', (ev) => {
      if (i === hechos) {
        if (i === 3) {
          // Desabilita para evitar clique duplo e lança imediatamente
          ev.target.disabled = true;
          salvarTarefaNaApi();
          completa();
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
        const a = -Math.PI / 2 + (azar() - .5) * 2.6, v = 280 + azar() * 680, forma = azar();
        parts.push({
          t: 'c', x: x + (azar() - .5) * 120, y: y + (azar() - .5) * 30,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: azar() * 6.28, vr: (azar() - .5) * 14,
          w: 7 + azar() * 8, h: forma < .55 ? 4 + azar() * 4 : (forma < .8 ? 7 + azar() * 7 : 4 + azar() * 4),
          redondo: forma > .8, col: COLORES[Math.floor(azar() * COLORES.length)], vida: 0, max: 2.8 + azar() * 1.6, fase: azar() * 6.28
        });
      }
    }

    function humo(x, y, escala) {
      parts.push({
        t: 'h', x: x + (azar() - .5) * 20, y,
        vx: (azar() - .5) * 70, vy: 45 + azar() * 80,
        r: (12 + azar() * 12) * escala, vida: 0, max: 1.0 + azar() * .7
      });
    }

    function dibuja(dt) {
      g.clearRect(0, 0, W, H);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vida += dt;
        if (p.vida >= p.max || p.y > H + 50) { parts.splice(i, 1); continue; }
        const u = p.vida / p.max;
        if (p.t === 'h') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= .98;
          const r = p.r * (1 + u * 2.4);
          g.globalAlpha = (1 - u) * (1 - u) * .85;
          g.fillStyle = '#ffffff';
          g.shadowColor = 'rgba(121, 95, 210, .35)';
          g.shadowBlur = 12;
          g.beginPath();
          g.arc(p.x, p.y, r, 0, 6.2832);
          g.fill();
          g.shadowBlur = 0;
        } else {
          p.vy += 900 * dt;
          p.vx *= Math.pow(.3, dt);
          p.vy *= Math.pow(.55, dt);
          p.x += (p.vx + Math.sin(p.vida * 4 + p.fase) * 40) * dt;
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

    // Decolagem do foguete: treme, acende fogo, solta fumaça e voa pelo topo da tela
    let vuelo = null;
    const base = () => {
      const r = cohete.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height * .97];
    };

    function poseCohete(x, y, rot, esc) {
      cohete.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg) scale(' + esc.toFixed(3) + ')';
    }

    function volando(dt) {
      if (!vuelo) return;
      const v = vuelo;
      v.t += dt;
      if (v.fase === 'tiembla') {
        const k = Math.min(1, v.t / v.dura);
        const shakeX = Math.sin(v.t * 80) * (2 + k * 2);
        const shakeRot = Math.sin(v.t * 60) * (1.2 + k * 1.5);
        poseCohete(shakeX, 0, shakeRot, 1);

        if (((v.t * 60) | 0) % 2 === 0 && ((v.t * 60) | 0) !== v.ult) {
          v.ult = (v.t * 60) | 0;
          const [bx, by] = base();
          humo(bx, by, .85);
        }

        if (v.t >= v.dura) {
          v.fase = 'sube';
          v.t = 0;
          v.v = -120;
          v.y = 0;
          const [bx, by] = base();
          confeti(bx, by - 140, 180);
          onDespegue();
        }
      } else if (v.fase === 'sube') {
        // Aceleração potente até sair completamente do topo da tela
        v.v -= 3400 * dt;
        v.y += v.v * dt;
        const tilt = Math.sin(v.t * 8) * 1.2;
        poseCohete(0, v.y, tilt, 1 + Math.min(.2, v.t * .15));

        v.acum += dt;
        while (v.acum > .012) {
          v.acum -= .012;
          const [bx, by] = base();
          humo(bx, by + 6, 1.1 + v.t * .9);
        }

        if (v.y < -(window.innerHeight + 600)) {
          vuelo = null;
          cohete.style.opacity = '0';
          cohete.classList.remove('is-fuego');
        }
      }
    }

    function onDespegue() {
      tocarSomDecolagem();
      tarjeta.classList.add('is-final');
      $('[data-final]').setAttribute('aria-hidden', 'false');
      $('[data-repite]').tabIndex = 0;
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

      tocarSomDecolagem();
      if (navigator.vibrate) { try { navigator.vibrate([40, 50, 40]); } catch (_) {} }
      // Revela o foguete
      cohete.style.opacity = '1';
      poseCohete(0, 0, 0, 1);

      // Inicia fogo e vibração
      luego(() => {
        cohete.classList.add('is-fuego');
        vuelo = { fase: 'tiembla', t: 0, dura: .6, y: 0, v: 0, acum: 0, ult: -1 };
        enciende();
      }, 250);

      // Failsafe de lançamento garantido
      luego(() => {
        if (vuelo && vuelo.fase === 'tiembla') {
          vuelo.fase = 'sube';
          vuelo.t = 0;
          vuelo.v = -100;
          const [bx, by] = base();
          confeti(bx, by - 140, 180);
          onDespegue();
        }
      }, 950);
    }

    function reinicia() {
      relojes.forEach(clearTimeout);
      relojes = [];
      estado = 'pasos';
      hechos = 0;
      vuelo = null;
      tarjeta.classList.remove('is-final', 'is-despega');
      cohete.style.opacity = '0';
      cohete.classList.remove('is-fuego');
      cohete.style.transform = '';
      $('[data-final]').setAttribute('aria-hidden', 'true');
      $('[data-repite]').tabIndex = -1;
      pasos.forEach(p => p.classList.remove('is-hecho'));
      activa(0);
      validaNombre();
      pintaProgreso(true);
    }
    $('[data-repite]').addEventListener('click', reinicia);

    document.addEventListener('keydown', e => {
      const m = document.getElementById('despegueModal');
      if (!m || !m.open) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter' && estado === 'pasos') {
        const t = e.target;
        if (t.matches && t.matches('button, a, textarea')) return;
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
      let data = null;
      if (typeof window.__HOUSE_GET_DATA__ === 'function') {
        try {
          data = await window.__HOUSE_GET_DATA__();
        } catch (err) {}
      }

      if (!data) {
        const session = sessionStorage.getItem('house-tasks-session');
        const base = (window.__HOUSE_CONFIG__ && window.__HOUSE_CONFIG__.apiBaseUrl) || 'https://house-tasks-api.brunohouse.workers.dev';
        const res = await fetch(base.replace(/\/$/, '') + '/api/data', {
          headers: session ? { 'Authorization': 'Bearer ' + session } : {}
        });
        if (res.ok) {
          data = await res.json();
        }
      }

      if (data) {
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
      console.warn('[HOUSE TASKS] Erro ao carregar dados operacionais:', e);
    }
  }

  async function salvarTarefaNaApi() {
    try {
      const titleEl = document.querySelector('[data-nombre]');
      const title = (titleEl ? titleEl.value : '').trim() || 'Nova entrega da House';
      const descEl = document.querySelector('[data-descricao]');
      const description = (descEl ? descEl.value : '').trim();
      const unitEl = document.querySelector('[data-unidade]');
      const unit_id = (unitEl && unitEl.value) ? unitEl.value : null;
      const respEl = document.querySelector('[data-responsavel]');
      const person_id = (respEl && respEl.value) ? respEl.value : null;
      const prazoEl = document.querySelector('[data-prazo]');
      const due = (prazoEl && prazoEl.value) ? prazoEl.value : null;

      const prioBtn = document.querySelector('[data-prio][aria-pressed="true"]');
      const priority = prioBtn ? prioBtn.getAttribute('data-prio') : 'normal';

      const payload = {
        title,
        description,
        unit_id,
        person_id,
        due,
        priority,
        status: 'todo',
        checklist: [],
        approval: false
      };

      console.log('[HOUSE TASKS] Lançando tarefa:', payload);

      if (typeof window.__HOUSE_SAVE_TASK__ === 'function') {
        try {
          await window.__HOUSE_SAVE_TASK__(payload);
          window.dispatchEvent(new CustomEvent('house:refresh'));
          return;
        } catch (errSave) {
          console.warn('[HOUSE TASKS] Fallback direto de salvamento:', errSave);
        }
      }

      // Fallback para chamada direta à API
      const session = sessionStorage.getItem('house-tasks-session');
      const base = (window.__HOUSE_CONFIG__ && window.__HOUSE_CONFIG__.apiBaseUrl) || 'https://house-tasks-api.brunohouse.workers.dev';
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
  
  // Síntese de áudio para som de decolagem sem dependências externas
  function tocarSomDecolagem() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Rugido potente do propulsor (whoosh)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.85);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.25);

      // Chime musical triunfante de conclusão (C5, E5, G5, C6)
      const notas = [523.25, 659.25, 783.99, 1046.5];
      notas.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.value = freq;
        const t = now + 0.18 + idx * 0.09;
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.14, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.8);
      });
    } catch (_) {}
  }

  // Foguete de celebração cinematográfico quando uma entrega é concluída
  window.lancarFogueteCelebracao = function () {
    tocarSomDecolagem();
    if (navigator.vibrate) {
      try { navigator.vibrate([40, 50, 40]); } catch (_) {}
    }

    let celebContainer = document.getElementById("deCelebracaoFoguete");
    if (celebContainer) {
      celebContainer.remove();
    }

    celebContainer = document.createElement("div");
    celebContainer.id = "deCelebracaoFoguete";
    celebContainer.innerHTML = `
      <div class="de-celeb-toast">
        <span class="de-celeb-icon">🚀</span>
        <div class="de-celeb-text">
          <b>Entrega Concluída!</b>
          <small>Ritmo da House: missão cumprida com sucesso</small>
        </div>
      </div>
      <div class="de-cohete-celeb" aria-hidden="true">
        <svg viewBox="0 0 120 280" width="120" height="280">
          <defs>
            <linearGradient id="celeb-fuego-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="25%" stop-color="#fff176"/>
              <stop offset="60%" stop-color="#ff9800"/>
              <stop offset="100%" stop-color="#f44336" stop-opacity="0.85"/>
            </linearGradient>
            <linearGradient id="celeb-corpo-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#795fd2"/>
              <stop offset="50%" stop-color="#9173eb"/>
              <stop offset="100%" stop-color="#614ab8"/>
            </linearGradient>
            <filter id="celeb-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
          </defs>
          <g class="de-celeb-flame">
            <path d="M60 210 Q35 245 60 278 Q85 245 60 210 Z" fill="url(#celeb-fuego-grad)" filter="url(#celeb-glow)"/>
            <path d="M60 212 Q45 238 60 262 Q75 238 60 212 Z" fill="#ffffff"/>
          </g>
          <path d="M30 150 L2 212 L30 195 Z" fill="#583ebd" stroke="#3d2a8a" stroke-width="1.5"/>
          <path d="M90 150 L118 212 L90 195 Z" fill="#4d35a8" stroke="#3d2a8a" stroke-width="1.5"/>
          <path d="M32 82 H88 V198 L60 204 L32 198 Z" fill="url(#celeb-corpo-grad)" stroke="#4d37a2" stroke-width="1.5"/>
          <path d="M32 165 H88 V177 H32 Z" fill="#ebb76c"/>
          <path d="M60 2 C44 30 34 56 32 82 H88 C86 56 76 30 60 2 Z" fill="#fcd34d" stroke="#f59e0b" stroke-width="1.5"/>
          <path d="M32 198 L60 204 L88 198 L82 212 H38 Z" fill="#2d225a"/>
          <circle cx="60" cy="120" r="18" fill="#ffffff" stroke="#ebb76c" stroke-width="3"/>
          <circle cx="60" cy="120" r="13" fill="#614ab8"/>
          <circle cx="56" cy="116" r="4" fill="#ffffff" opacity="0.8"/>
        </svg>
      </div>
      <canvas class="de-lienzo-celeb"></canvas>
    `;

    document.body.appendChild(celebContainer);

    const rocket = celebContainer.querySelector(".de-cohete-celeb");
    const toast = celebContainer.querySelector(".de-celeb-toast");
    const canvas = celebContainer.querySelector(".de-lienzo-celeb");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    requestAnimationFrame(() => {
      toast.classList.add("is-visible");
      rocket.classList.add("is-launching");
    });

    let parts = [];
    for (let i = 0; i < 180; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.8;
      const speed = 320 + Math.random() * 750;
      parts.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 80,
        y: window.innerHeight * 0.75,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 7 + Math.random() * 7,
        color: COLORES[Math.floor(Math.random() * COLORES.length)],
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 12,
        life: 0,
        maxLife: 2.5 + Math.random() * 1.5
      });
    }

    let lastTime = performance.now();
    function animLoop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.maxLife || p.y > canvas.height + 50) {
          parts.splice(i, 1);
          continue;
        }
        p.vy += 800 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;

        const progress = p.life / p.maxLife;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - progress * progress);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (parts.length > 0) {
        requestAnimationFrame(animLoop);
      } else {
        setTimeout(() => {
          if (celebContainer && celebContainer.parentNode) celebContainer.remove();
        }, 600);
      }
    }
    requestAnimationFrame(animLoop);

    setTimeout(() => {
      if (celebContainer && celebContainer.parentNode) {
        celebContainer.remove();
      }
    }, 3600);
  };

  window.abrirDespegue = function () {
    injetaModalDespegue();
    const modal = document.getElementById("despegueModal");
    if (!modal) return;

    if (!window.despegueInstancia) {
      const raiz = modal.querySelector("[data-despegue]");
      window.despegueInstancia = Despegue(raiz);
    } else {
      window.despegueInstancia.reinicia();
    }

    carregarDadosOperacao();
    modal.showModal();
    const nomeInput = modal.querySelector("[data-nombre]");
    if (nomeInput) {
      nomeInput.value = "";
      setTimeout(() => nomeInput.focus(), 80);
    }
  };

  // Intercepta qualquer botão ou gatilho de criação de tarefa no app
  document.addEventListener("click", function (e) {
    const btn = e.target.closest("button, a");
    if (!btn) return;

    const txt = (btn.textContent || "").trim().toLowerCase();
    const aria = (btn.getAttribute("aria-label") || "").toLowerCase();
    const cls = btn.className || "";

    const isTaskCreation = txt.includes("nova tarefa") ||
                           txt.includes("criar tarefa") ||
                           txt.includes("criar primeira tarefa") ||
                           txt.includes("adicionar tarefa") ||
                           aria.includes("criar tarefa") ||
                           aria.includes("nova tarefa") ||
                           (typeof cls === "string" && (cls.includes("mobile-create") || cls.includes("column-add")));

    if (isTaskCreation && !btn.closest("#despegueModal")) {
      e.preventDefault();
      e.stopPropagation();

      const openDialog = document.querySelector("dialog.modal:not(#despegueModal)");
      if (openDialog && openDialog.open) openDialog.close();

      window.abrirDespegue();
    }
  }, true);

  // Monitora aberturas de modal nativas do React para criação de tarefas
  const observer = new MutationObserver(() => {
    const reactModal = document.querySelector("dialog.modal:not(#despegueModal)");
    if (reactModal && reactModal.open) {
      const heading = reactModal.querySelector(".modal-heading");
      if (heading) {
        const isCreating = heading.textContent.includes("DO COMBINADO À AÇÃO") || heading.textContent.includes("Qual é o próximo passo?");
        if (isCreating) {
          reactModal.close();
          window.abrirDespegue();
        }
      }
    }
    decorarKanbanCards();
    sincronizarCarrosselKanban();
  });

  // ══════════════════════════════════════════════════════════════════════
  // MODERN KANBAN & INSTANT ACTION ENGINE
  // Ações Diretas: Iniciar / Pronto / Reabrir com animação suave entre colunas
  // ══════════════════════════════════════════════════════════════════════

  // Sincronização suave entre as abas superiores e o carrossel Kanban
  function sincronizarCarrosselKanban() {
    const kanban = document.querySelector(".kanban");
    const tabs = document.querySelectorAll(".mobile-status button");
    const columns = document.querySelectorAll(".column");
    if (!kanban || !tabs.length || !columns.length) return;

    tabs.forEach((tab, idx) => {
      tab.addEventListener("click", () => {
        const targetCol = columns[idx];
        if (targetCol) {
          targetCol.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
          tabs.forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
        }
      });
    });

    let scrollTimer = null;
    kanban.addEventListener("scroll", () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const kanbanCenter = kanban.getBoundingClientRect().left + kanban.offsetWidth / 2;
        let closestIdx = 0;
        let minDiff = Infinity;
        columns.forEach((col, idx) => {
          const colCenter = col.getBoundingClientRect().left + col.offsetWidth / 2;
          const diff = Math.abs(kanbanCenter - colCenter);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = idx;
          }
        });
        tabs.forEach((t, i) => t.classList.toggle("active", i === closestIdx));
      }, 50);
    }, { passive: true });
  }

  function decorarKanbanCards() {
    const cards = document.querySelectorAll(".task-card");
    cards.forEach(card => {
      const select = card.querySelector(".status-select");
      const taskId = card.getAttribute("data-task-id");
      const currentStatus = card.getAttribute("data-task-status") || (select ? select.value : "todo");

      const existingBtn = card.querySelector(".task-action-btn");
      if (existingBtn && existingBtn.dataset.currentStatus === currentStatus) {
        return;
      }
      if (existingBtn) existingBtn.remove();

      let btnLabel = "";
      let btnClass = "";
      let nextStatus = "";
      let btnIcon = "";

      if (currentStatus === "todo") {
        btnLabel = "Iniciar";
        btnClass = "iniciar";
        nextStatus = "doing";
        btnIcon = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
      } else if (currentStatus === "doing") {
        btnLabel = "Pronto";
        btnClass = "pronto";
        nextStatus = "done";
        btnIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
      } else if (currentStatus === "done") {
        btnLabel = "Reabrir";
        btnClass = "reabrir";
        nextStatus = "todo";
        btnIcon = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
      } else {
        return;
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `task-action-btn ${btnClass}`;
      btn.dataset.currentStatus = currentStatus;
      btn.dataset.nextStatus = nextStatus;
      btn.innerHTML = `${btnIcon}<span>${btnLabel}</span>`;

      btn.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        ev.preventDefault();

        if (btn.disabled || card.classList.contains("task-card-exit")) return;
        btn.disabled = true;

        // 1. Inicia animação suave de saída da coluna atual
        card.classList.add("task-card-exit");

        // 2. Se a tarefa foi dada como pronta, lança o foguete de celebração!
        if (nextStatus === "done" && window.lancarFogueteCelebracao) {
          window.lancarFogueteCelebracao();
        }

        // 3. Aguarda o término da transição de sumiço (220ms)
        await new Promise(res => setTimeout(res, 220));

        // 4. Atualiza o status da tarefa no estado do aplicativo
        let atualizado = false;
        if (typeof window.__HOUSE_MOVE_TASK__ === "function") {
          let taskObj = null;
          if (window.__HOUSE_TASKS__ && taskId) {
            taskObj = window.__HOUSE_TASKS__.find(t => t.id === taskId);
          }
          if (!taskObj && typeof window.__HOUSE_GET_DATA__ === "function") {
            try {
              const d = await window.__HOUSE_GET_DATA__();
              if (d && d.tasks && taskId) taskObj = d.tasks.find(t => t.id === taskId);
            } catch (_) {}
          }
          if (taskObj) {
            try {
              await window.__HOUSE_MOVE_TASK__(taskObj, nextStatus);
              atualizado = true;
            } catch (err) {
              console.warn("[HOUSE TASKS] Fallback ao mover tarefa:", err);
            }
          }
        }

        // Fallback: Dispara evento no select do React
        if (!atualizado && select) {
          const tracker = select._valueTracker;
          if (tracker) tracker.setValue(nextStatus);
          const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
          if (setter) setter.call(select, nextStatus);
          else select.value = nextStatus;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }

        // 5. No celular (carrossel), desliza suavemente até o Kanban de destino
        if (window.innerWidth <= 768) {
          const targetIdx = nextStatus === "todo" ? 0 : (nextStatus === "doing" ? 1 : 2);
          const cols = document.querySelectorAll(".column");
          const tabs = document.querySelectorAll(".mobile-status button");
          if (cols[targetIdx]) {
            setTimeout(() => {
              cols[targetIdx].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              tabs.forEach((t, i) => t.classList.toggle("active", i === targetIdx));
            }, 80);
          }
        }
      });

      const bottom = card.querySelector(".card-bottom");
      if (bottom) {
        bottom.appendChild(btn);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      injetaModalDespegue();
      decorarKanbanCards();
      sincronizarCarrosselKanban();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    injetaModalDespegue();
    decorarKanbanCards();
    sincronizarCarrosselKanban();
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
