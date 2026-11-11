(() => {
  const config = window.__HOUSE_CONFIG__?.firebaseConfig;
  const sameOrigin = location.hostname === config?.authDomain;
  const messages = {
    "auth/unauthorized-domain": "O domínio do site precisa ser autorizado no Firebase.",
    "auth/operation-not-allowed": "O login Google ainda não foi ativado no Firebase.",
    "auth/popup-closed-by-user": "A janela do Google foi fechada. Tente novamente.",
    "auth/popup-blocked": "Abra o HOUSE TASKS em uma aba do Safari ou Chrome para entrar.",
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
})();
