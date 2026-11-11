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

  function sincronizarCarrosselKanban() {
    const kanban = document.querySelector(".kanban");
    const tabs = document.querySelectorAll(".mobile-status button");
    const columns = document.querySelectorAll(".column");
    if (!kanban || !tabs.length || !columns.length) return;

    tabs.forEach((tab, idx) => {
      tab.addEventListener("click", () => {
        const targetCol = columns[idx];
        if (targetCol) {
          targetCol.scrollIntoView({ behavior: reduce.matches ? "instant" : "smooth", block: "nearest", inline: "center" });
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

        try {
          const task = window.__HOUSE_TASKS__?.find(item => item.id === taskId);
          if (!task || !window.__HOUSE_MOVE_TASK__) return;
          await window.__HOUSE_MOVE_TASK__(task, nextStatus);
          if (window.innerWidth <= 768) {
            const target = nextStatus === "todo" ? 0 : nextStatus === "doing" || task.approval && nextStatus === "done" ? 1 : 2;
            document.querySelectorAll(".column")[target]?.scrollIntoView({
              behavior: reduce.matches ? "instant" : "smooth",
              block: "nearest",
              inline: "center",
            });
          }
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
    sincronizarCarrosselKanban();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      decorarKanbanCards();
      sincronizarCarrosselKanban();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    decorarKanbanCards();
    sincronizarCarrosselKanban();
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
