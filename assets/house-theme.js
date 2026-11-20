(() => {
  // The Google OAuth client is registered for Firebase's canonical domain.
  // Keep every entry point on that origin so login, PWA storage and sessions
  // never split between the two Firebase Hosting aliases.
  if (location.hostname === "house-task-327d6.web.app") {
    location.replace(`https://house-task-327d6.firebaseapp.com${location.pathname}${location.search}${location.hash}`);
    return;
  }

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
