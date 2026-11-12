(() => {
  const key = "house-tasks-theme";
  const root = document.documentElement;
  try {
    root.dataset.houseTheme = localStorage.getItem(key) === "dark" ? "dark" : "light";
  } catch {
    root.dataset.houseTheme = "light";
  }
  document.addEventListener("click", event => {
    if (!event.target.closest("[data-house-theme-toggle]")) return;
    root.dataset.houseTheme = root.dataset.houseTheme === "dark" ? "light" : "dark";
    try { localStorage.setItem(key, root.dataset.houseTheme); } catch {}
  });
})();
