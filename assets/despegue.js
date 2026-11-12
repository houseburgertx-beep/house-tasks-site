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

  let activeRocket;

  window.houseLaunchRocket = function () {
    if (activeRocket) {
      clearTimeout(activeRocket.timer);
      activeRocket.overlay.remove();
    }

    const overlay = document.createElement("div");
    overlay.className = "house-rocket-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="house-rocket-halo"></div>
      <div class="house-rocket-smoke">
        <i></i><i></i><i></i><i></i><i></i>
      </div>
      <div class="house-rocket-speed"><i></i><i></i><i></i></div>
      <svg class="house-rocket-flight" viewBox="0 0 120 270" focusable="false">
        <defs>
          <linearGradient id="house-rocket-shell" x2="1" y2=".65" gradientUnits="objectBoundingBox">
            <stop stop-color="#fff"/>
            <stop offset=".45" stop-color="#f4eaff"/>
            <stop offset="1" stop-color="#9e7bd9"/>
          </linearGradient>
          <linearGradient id="house-rocket-nose" x2=".85" y2="1" gradientUnits="objectBoundingBox">
            <stop stop-color="#fff4c5"/>
            <stop offset=".55" stop-color="#ffc762"/>
            <stop offset="1" stop-color="#e68435"/>
          </linearGradient>
          <linearGradient id="house-rocket-fin" x2="1" y2="1" gradientUnits="objectBoundingBox">
            <stop stop-color="#b698f2"/>
            <stop offset="1" stop-color="#503097"/>
          </linearGradient>
          <linearGradient id="house-rocket-flame" x2="0" y2="1" gradientUnits="objectBoundingBox">
            <stop stop-color="#fff6c8"/>
            <stop offset=".46" stop-color="#ffc358"/>
            <stop offset="1" stop-color="#f07a62" stop-opacity=".15"/>
          </linearGradient>
          <radialGradient id="house-rocket-glass" cx=".32" cy=".25" r=".84">
            <stop stop-color="#f7fcff"/>
            <stop offset=".45" stop-color="#c3bdfb"/>
            <stop offset="1" stop-color="#724fbd"/>
          </radialGradient>
        </defs>
        <g class="house-rocket-flame">
          <path fill="url(#house-rocket-flame)" d="M60 197C32 221 47 251 60 270 73 251 88 221 60 197Z"/>
          <path fill="#fff4bd" d="M60 204C47 219 53 236 60 250 67 236 73 219 60 204Z"/>
          <path fill="#fffdf2" d="M60 207C54 216 57 225 60 232 63 225 66 216 60 207Z"/>
        </g>
        <path fill="url(#house-rocket-fin)" stroke="#6643ad" stroke-width="1.3" d="M36 142 7 196 5 208 34 194ZM84 142 113 196 115 208 86 194Z"/>
        <path fill="#dfcdfc" fill-opacity=".7" d="M34 151 13 194 31 185ZM86 151 107 194 89 185Z"/>
        <path fill="url(#house-rocket-shell)" stroke="#7654bc" stroke-width="1.5" d="M34 81H86L91 178Q91 190 84 202H36Q29 190 29 178Z"/>
        <path fill="url(#house-rocket-nose)" stroke="#ba7538" stroke-width="1.4" d="M60 4C48 24 36 53 34 84Q60 91 86 84C84 53 72 24 60 4Z"/>
        <path fill="none" stroke="#fff3c3" stroke-width="2" stroke-linecap="round" d="M54 25Q42 47 40 69"/>
        <path fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8" d="M39 96 35 159"/>
        <path fill="#7550bc" d="M30 169Q60 176 90 169L91 179Q60 187 29 179Z"/>
        <path fill="url(#house-rocket-fin)" stroke="#6643ad" d="M36 196Q60 201 84 196L80 207H40Z"/>
        <circle cx="60" cy="123" r="21" fill="#7550bc" stroke="#fff" stroke-width="1.4"/>
        <circle cx="60" cy="123" r="15" fill="url(#house-rocket-glass)"/>
        <path d="M51 120a9 9 0 0 1 8-6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
      </svg>`;

    if (typeof overlay.showPopover === "function") {
      overlay.setAttribute("popover", "manual");
    }
    document.body.appendChild(overlay);
    if (overlay.hasAttribute("popover")) {
      try {
        overlay.showPopover();
      } catch {
        overlay.removeAttribute("popover");
      }
    }

    const rocket = overlay.querySelector(".house-rocket-flight");
    const remove = () => {
      if (activeRocket?.overlay !== overlay) return;
      clearTimeout(activeRocket.timer);
      overlay.remove();
      activeRocket = null;
    };
    activeRocket = { overlay, timer: setTimeout(remove, 2800) };
    rocket.addEventListener("animationend", event => {
      if (event.target === rocket) remove();
    });
  };

  window.houseAnimateTask = function ({ id, from }) {
    const card = document.querySelector(`[data-task-id="${CSS.escape(id)}"]`);
    if (!card) return;
    requestAnimationFrame(() => {
      if (!card.isConnected) return;
      const column = card.closest(".column");
      if (window.innerWidth <= 768 && column) {
        column.scrollIntoView({
          behavior: reduce.matches ? "instant" : "smooth", block: "nearest", inline: "center",
        });
      }
      if (reduce.matches || !card.animate || card.closest("details:not([open])")) return;
      const rect = card.getBoundingClientRect();
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
