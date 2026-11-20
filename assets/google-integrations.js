(() => {
  const config = window.__HOUSE_CONFIG__?.firebaseConfig;
  const googleClientId = "664192166444-cmmm8p9mt7l43dd881gm9oaqrf40bnrh.apps.googleusercontent.com";
  const apiBase = window.__HOUSE_CONFIG__?.apiBaseUrl?.replace(/\/$/, "") ||
    "https://house-tasks-api.brunohouse.workers.dev";
  const sameOrigin = location.hostname === config?.authDomain;
  const messages = {
    "auth/unauthorized-domain": "O domínio do site precisa ser autorizado no Firebase.",
    "auth/operation-not-allowed": "O login Google ainda não foi ativado no Firebase.",
    "auth/popup-closed-by-user": "A janela do Google foi fechada. Tente novamente.",
    "auth/popup-blocked": "O navegador bloqueou a janela do Google. Toque em Entrar com Google novamente ou abra o site em uma aba do Safari ou Chrome.",
    "auth/operation-not-supported-in-this-environment": "Abra o HOUSE TASKS em uma aba do Safari ou Chrome para entrar com Google.",
    "auth/network-request-failed": "Falha de conexão com o Google. Tente novamente.",
  };

  function authClient() {
    if (!window.firebase || !config?.apiKey) throw new Error("Login Google indisponível.");
    const app = firebase.apps[0] || firebase.initializeApp(config);
    return app.auth();
  }

  async function withDeadline(operation) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(
        "A entrada expirou. Se a janela do Google não abriu, tente em uma aba do Safari ou Chrome."
      )), 60000);
    });
    try {
      return await Promise.race([operation, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function login() {
    const auth = authClient();
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      if (sameOrigin) {
        await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        await auth.signInWithRedirect(provider);
        return null;
      }
      const result = await withDeadline(auth.signInWithPopup(provider));
      if (!result.user) throw new Error("O Google não confirmou sua identidade.");
      return await result.user.getIdToken();
    } catch (error) {
      throw new Error(messages[error.code] || error.message);
    } finally {
      if (!sameOrigin) void auth.signOut().catch(() => {});
    }
  }

  async function resume() {
    if (!sameOrigin) return null;
    const auth = authClient();
    try {
      const result = await withDeadline(auth.getRedirectResult());
      return result.user ? await result.user.getIdToken() : null;
    } catch (error) {
      throw new Error(messages[error.code] || error.message);
    } finally {
      void auth.signOut().catch(() => {});
    }
  }

  window.HouseGoogle = { login, resume };

  function showIdentityError(message) {
    const card = document.querySelector(".auth-card");
    if (!card) return;
    let status = card.querySelector(".google-identity-error");
    if (!status) {
      status = document.createElement("p");
      status.className = "form-error google-identity-error";
      status.setAttribute("role", "alert");
      card.querySelector(".google-identity-button")?.after(status);
    }
    status.textContent = message;
  }

  async function finishIdentity(credential) {
    try {
      const response = await fetch(apiBase + "/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credential }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "O Google não confirmou sua identidade.");
      sessionStorage.setItem("house-tasks-session", result.token);
      location.reload();
    } catch (error) {
      showIdentityError(error.message || "Não foi possível entrar com Google.");
    }
  }

  let identityInitialized = false;
  function renderIdentityButton() {
    const original = document.querySelector(".google-auth-btn");
    if (!original || original.dataset.identityReplaced || !window.google?.accounts?.id) return;
    original.dataset.identityReplaced = "true";
    original.hidden = true;
    const container = document.createElement("div");
    container.className = "google-identity-button";
    original.after(container);
    if (!identityInitialized) {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: response => finishIdentity(response.credential),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      identityInitialized = true;
    }
    google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: Math.max(240, Math.min(400, Math.round(original.getBoundingClientRect().width || 320))),
    });
  }

  const identityObserver = new MutationObserver(renderIdentityButton);
  identityObserver.observe(document.documentElement, { childList: true, subtree: true });
  document.querySelector('script[src*="accounts.google.com/gsi/client"]')?.addEventListener("load", renderIdentityButton);
  window.addEventListener("load", renderIdentityButton);
  setTimeout(renderIdentityButton, 0);
  let gsiTries = 0;
  const gsiPoll = setInterval(() => {
    renderIdentityButton();
    if (document.querySelector(".google-identity-button") || ++gsiTries >= 40) clearInterval(gsiPoll);
  }, 250);

  // Start Firebase initialization before the first tap. Login can then call
  // signInWithPopup directly from the button without waiting on setup.
  if (window.firebase && config?.apiKey) authClient();
})();
