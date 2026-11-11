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
      <svg class="house-rocket-flight" viewBox="0 0 120 270" focusable="false">
        <path fill="#f3a63a" d="M60 201C40 229 50 252 60 268 70 252 80 229 60 201Z"/>
        <path fill="#fff0b8" d="M60 207C49 227 55 242 60 253 65 242 71 227 60 207Z"/>
        <path fill="#8060cb" d="M34 145 5 208 34 192ZM86 145 115 208 86 192Z"/>
        <path fill="#b69ce9" d="M30 150 17 201 34 192ZM90 150 103 201 86 192Z"/>
        <path fill="#d9c9f4" stroke="#795fd2" stroke-width="1.5" d="M34 84H86L90 192 84 206H36L30 192Z"/>
        <path fill="#fff" d="M35 85H60V196L31 191Z"/>
        <path fill="#7961d0" d="M32 168H88L89 178H31Z"/>
        <path fill="#f8c560" stroke="#c98432" stroke-width="1.5" d="M60 4C45 31 36 56 34 84H86C84 56 75 31 60 4Z"/>
        <path fill="#ffe5a4" d="M60 7C46 33 37 58 35 83H60Z"/>
        <path fill="none" stroke="#9a7bda" stroke-width="1" d="M60 85V164"/>
        <circle cx="60" cy="123" r="19" fill="#614ab8"/>
        <circle cx="60" cy="123" r="13" fill="#e1d4f8"/>
        <path d="M52 120a9 9 0 0 1 8-6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
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

    const timer = setTimeout(() => {
      overlay.remove();
      activeRocket = null;
    }, 2800);
    activeRocket = { overlay, timer };
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
