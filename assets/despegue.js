/**
 * DESPEGUE · Lista de ativação com barra e cohete que despega
 * Inspirado no componente Moxen Despegue, adaptado ao Grupo House190
 */

(function () {
  'use strict';

  // Áudio sintético suave de decolagem via Web Audio API (sem dependências externas)
  function playLiftoffSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.65);
      
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.75);
    } catch (e) {
      // Navegadores com autoplay restrito ignoram silenciosamente
    }
  }

  // Gera o SVG do Cohete (Foguete)
  function getRocketSvgMarkup() {
    return `
      <svg class="despegue-rocket-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="despegueBody" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stop-color="#ffffff"/>
            <stop offset="0.6" stop-color="#f6f2fe"/>
            <stop offset="1" stop-color="#e0d4fa"/>
          </linearGradient>
          <linearGradient id="despegueAccent" x1="20" y1="10" x2="45" y2="35" gradientUnits="userSpaceOnUse">
            <stop stop-color="#795fd2"/>
            <stop offset="1" stop-color="#614ab8"/>
          </linearGradient>
          <linearGradient id="despegueThruster" x1="15" y1="45" x2="5" y2="58" gradientUnits="userSpaceOnUse">
            <stop stop-color="#ffe066"/>
            <stop offset="0.5" stop-color="#ff922b"/>
            <stop offset="1" stop-color="#e24a4a"/>
          </linearGradient>
        </defs>

        <!-- Chamas do propulsor -->
        <g class="despegue-fire-plume">
          <path d="M18 43 L8 53 C6 56 10 58 13 55 L22 46 Z" fill="url(#despegueThruster)"/>
          <path d="M19 44 L11 50 C10 52 12 53 14 51 L21 45 Z" fill="#ffffff" opacity="0.9"/>
        </g>

        <!-- Asas e estabilizadores laterais -->
        <path d="M17 38 L9 42 C7 43 7 45 9 46 L21 47 Z" fill="#614ab8"/>
        <path d="M38 17 L42 9 C43 7 45 7 46 9 L47 21 Z" fill="#614ab8"/>

        <!-- Corpo do foguete -->
        <path d="M47 17 C50 14 51 9 51 9 C51 9 46 10 43 13 L24 32 C22 34 21 37 21 40 L24 43 C27 43 30 42 32 40 L47 17 Z" fill="url(#despegueBody)"/>
        
        <!-- Bico aerodinâmico -->
        <path d="M47 17 C50 14 51 9 51 9 C51 9 46 10 43 13 L39 17 C42 16 44 16 47 17 Z" fill="url(#despegueAccent)"/>

        <!-- Janela de observação da cabine -->
        <circle cx="35" cy="27" r="4.5" fill="#795fd2"/>
        <circle cx="35" cy="27" r="3" fill="#62e6d6"/>
        <circle cx="34" cy="26" r="1.2" fill="#ffffff"/>

        <!-- Detalhe da fuselagem HouseBurger -->
        <path d="M26 38 L28 40" stroke="#795fd2" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;
  }

  // Gera partículas de fumaça na decolagem
  function emitSmokePuffs(container, rocketElem) {
    if (!container || !rocketElem) return;
    const rect = rocketElem.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const startX = rect.left - containerRect.left + rect.width / 2;
    const startY = rect.top - containerRect.top + rect.height / 2;

    for (let i = 0; i < 9; i++) {
      const smoke = document.createElement('div');
      smoke.className = 'despegue-smoke-particle';
      const size = 18 + Math.random() * 20;
      smoke.style.width = `${size}px`;
      smoke.style.height = `${size}px`;
      smoke.style.left = `${startX + (Math.random() - 0.5) * 22}px`;
      smoke.style.top = `${startY + (Math.random() - 0.5) * 16}px`;
      smoke.style.animationDelay = `${i * 0.05}s`;
      container.appendChild(smoke);

      setTimeout(() => smoke.remove(), 900);
    }
  }

  // Anexa o componente Despegue na modal de criação de tarefa
  function attachDespegueToModal(modal) {
    if (!modal || modal.querySelector('.despegue-container')) return;

    // Apenas aplica na modal de criação de tarefa (não no modo de visualização de tarefa já existente)
    const heading = modal.querySelector('.modal-heading');
    if (!heading) return;

    const eyebrow = heading.querySelector('.eyebrow');
    const isNewTask = eyebrow && (eyebrow.textContent.includes('DO COMBINADO') || eyebrow.textContent.includes('NOVA TAREFA'));
    if (!isNewTask) return;

    const form = modal.querySelector('form');
    if (!form) return;

    // Cria a estrutura visual do Despegue
    const despegue = document.createElement('div');
    despegue.className = 'despegue-container';
    despegue.innerHTML = `
      <div class="despegue-header">
        <div class="despegue-title-wrap">
          <span class="despegue-tag"><span class="dot"></span> Puesta en marcha</span>
          <span class="despegue-subtitle">Etapas da sua entrega</span>
        </div>
        <div class="despegue-percent">
          <span class="despegue-percent-num">0</span>%
        </div>
      </div>

      <div class="despegue-track-wrap">
        <div class="despegue-rail">
          <div class="despegue-progress"></div>
        </div>

        <div class="despegue-nodes">
          <div class="despegue-node active" data-step="1">1</div>
          <div class="despegue-node" data-step="2">2</div>
          <div class="despegue-node" data-step="3">3</div>
          <div class="despegue-node" data-step="4">4</div>
        </div>

        <div class="despegue-rocket-wrapper">
          ${getRocketSvgMarkup()}
        </div>

        <div class="despegue-smoke-container"></div>
      </div>

      <div class="despegue-labels">
        <span class="despegue-label-item active" data-step-label="1">Objetivo</span>
        <span class="despegue-label-item" data-step-label="2">Unidade</span>
        <span class="despegue-label-item" data-step-label="3">Prazo</span>
        <span class="despegue-label-item" data-step-label="4">Despegue</span>
      </div>
    `;

    heading.insertAdjacentElement('afterend', despegue);

    const progressEl = despegue.querySelector('.despegue-progress');
    const rocketWrapper = despegue.querySelector('.despegue-rocket-wrapper');
    const percentEl = despegue.querySelector('.despegue-percent-num');
    const nodes = despegue.querySelectorAll('.despegue-node');
    const labels = despegue.querySelectorAll('.despegue-label-item');
    const smokeContainer = despegue.querySelector('.despegue-smoke-container');

    // Função de atualização do progresso com base nos campos do formulário
    function updateProgress() {
      const titleInput = form.querySelector('input[required]');
      const selects = form.querySelectorAll('select');
      const unitSelect = selects[0];
      const personSelect = selects[1];
      const dateInput = form.querySelector('input[type="date"]');
      const prioritySelect = selects[2];
      const checklistItems = form.querySelectorAll('.check-item');

      let completedSteps = 0;
      let score = 0;

      // Passo 1: Nome da tarefa
      const hasTitle = Boolean(titleInput && titleInput.value.trim().length >= 3);
      if (hasTitle) {
        completedSteps++;
        score += 25;
      }

      // Passo 2: Unidade ou Responsável
      const hasUnitOrPerson = Boolean(
        (unitSelect && unitSelect.value) || (personSelect && personSelect.value)
      );
      if (hasUnitOrPerson) {
        completedSteps++;
        score += 25;
      }

      // Passo 3: Prazo ou Prioridade
      const hasDateOrPriority = Boolean(
        (dateInput && dateInput.value) || (prioritySelect && prioritySelect.value)
      );
      if (hasDateOrPriority) {
        completedSteps++;
        score += 25;
      }

      // Passo 4: Detalhes, Checklist ou pronto para criar
      const hasChecklist = checklistItems.length > 0;
      const descArea = form.querySelector('textarea');
      const hasDesc = Boolean(descArea && descArea.value.trim().length > 0);
      if (hasChecklist || hasDesc || score >= 75) {
        completedSteps++;
        score += 25;
      }

      // Garante limites 0-100%
      score = Math.min(100, Math.max(0, score));

      // Atualiza a barra de progresso e a posição do foguete na pista
      progressEl.style.width = `${score}%`;
      rocketWrapper.style.left = `${score}%`;
      percentEl.textContent = score;

      // Atualiza os nós e rótulos
      nodes.forEach((node, idx) => {
        const stepNum = idx + 1;
        const label = labels[idx];

        if (score >= stepNum * 25) {
          node.classList.remove('active');
          node.classList.add('completed');
          node.innerHTML = '&#10003;';
          if (label) {
            label.classList.remove('active');
            label.classList.add('completed');
          }
        } else if (score >= (stepNum - 1) * 25) {
          node.classList.add('active');
          node.classList.remove('completed');
          node.textContent = stepNum;
          if (label) {
            label.classList.add('active');
            label.classList.remove('completed');
          }
        } else {
          node.classList.remove('active', 'completed');
          node.textContent = stepNum;
          if (label) {
            label.classList.remove('active', 'completed');
          }
        }
      });
    }

    // Escuta alterações em todos os campos do formulário
    form.addEventListener('input', updateProgress);
    form.addEventListener('change', updateProgress);

    // Efeito de Decolagem (Despegue!) no envio do formulário
    let isLaunching = false;
    form.addEventListener(
      'submit',
      function (event) {
        if (isLaunching) return;

        // Ativa ignição e decolagem
        isLaunching = true;
        rocketWrapper.classList.add('igniting');
        playLiftoffSound();
        emitSmokePuffs(smokeContainer, rocketWrapper);

        setTimeout(() => {
          rocketWrapper.classList.remove('igniting');
          rocketWrapper.classList.add('launching');

          // Exibe banner de decolagem
          const banner = document.createElement('div');
          banner.className = 'despegue-launch-banner';
          banner.innerHTML = `<span>🚀</span> ¡Despegue! Tarefa em lançamento para a equipe da House.`;
          despegue.appendChild(banner);
        }, 150);
      },
      true // capture phase para rodar a animação logo no clique de envio
    );

    // Executa a primeira verificação de estado
    updateProgress();
  }

  // Observa aberturas de modais
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'DIALOG' && node.classList.contains('modal')) {
            attachDespegueToModal(node);
          } else {
            const modal = node.querySelector && node.querySelector('dialog.modal');
            if (modal) attachDespegueToModal(modal);
          }
        }
      }
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    // Verifica caso uma modal já esteja aberta
    const existingModal = document.querySelector('dialog.modal');
    if (existingModal) attachDespegueToModal(existingModal);
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
