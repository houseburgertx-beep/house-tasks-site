(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  window.confirmarTarefaConcluida = function () {
    if (!reduce.matches && navigator.vibrate) {
      try { navigator.vibrate(25); } catch (_) {}
    }

    let toast = document.getElementById("houseMicroToast");
    if (toast) toast.remove();

    toast = document.createElement("div");
    toast.id = "houseMicroToast";
    toast.className = "house-micro-toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `
      <span class="micro-toast-icon">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      </span>
      <span class="micro-toast-text">Tarefa concluída</span>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("is-active");
    });

    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.classList.remove("is-active");
        setTimeout(() => toast.remove(), 250);
      }
    }, 1900);
  };

  window.houseLaunchRocket = function () {
    if (reduce.matches) return;
    document.querySelector(".house-rocket-flight")?.remove();
    const rocket = document.createElement("div");
    rocket.className = "house-rocket-flight";
    rocket.setAttribute("aria-hidden", "true");
    rocket.innerHTML = `<svg viewBox="0 0 120 270" width="110" height="248" focusable="false">
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
          </svg>`;
    document.body.appendChild(rocket);
    rocket.addEventListener("animationend", event => {
      if (event.target === rocket) rocket.remove();
    });
    setTimeout(() => rocket.remove(), 1800);
  };

  window.houseAnimateTask = function ({ id, from }) {
    const card = document.querySelector(`[data-task-id="${CSS.escape(id)}"]`);
    if (!card) return;
    requestAnimationFrame(() => {
      if (!card.isConnected) return;
      const rect = card.getBoundingClientRect();
      if (window.innerWidth <= 768 && card.closest(".column")) {
        card.closest(".column").scrollIntoView({
          behavior: reduce.matches ? "instant" : "smooth", block: "nearest", inline: "center",
        });
      }
      if (reduce.matches || !card.animate) return;
      const x = from ? Math.max(-120, Math.min(120, from.left - rect.left)) : 0;
      const y = from ? Math.max(-36, Math.min(36, from.top - rect.top)) : 10;
      card.animate([
        { transform: `translate(${x}px, ${y}px)`, opacity: .45 },
        { transform: "translate(0, 0)", opacity: 1 },
      ], { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)" });
    });
  };

  document.addEventListener("click", event => {
    const tab = event.target.closest(".mobile-status button");
    if (!tab) return;
    const index = Array.from(tab.parentElement.children).indexOf(tab);
    document.querySelectorAll(".kanban .column")[index]?.scrollIntoView({
      behavior: reduce.matches ? "instant" : "smooth", block: "nearest", inline: "center",
    });
  });

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

        try {
          const task = window.__HOUSE_TASKS__?.find(item => item.id === taskId);
          if (!task || !window.__HOUSE_MOVE_TASK__) return;
          await window.__HOUSE_MOVE_TASK__(task, nextStatus);
        } catch {
          // The task form reports the API error.
        } finally {
          btn.disabled = false;
        }
      });

      const bottom = card.querySelector(".card-bottom");
      if (bottom) {
        bottom.appendChild(btn);
      }
    });
  }

  const observer = new MutationObserver(() => {
    decorarKanbanCards();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      decorarKanbanCards();
        observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    decorarKanbanCards();
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
