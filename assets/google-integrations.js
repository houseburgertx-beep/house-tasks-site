(() => {
  const config = window.__HOUSE_CONFIG__?.firebaseConfig;
  const messages = {
    "auth/unauthorized-domain": "O domínio do site precisa ser autorizado no Firebase.",
    "auth/operation-not-allowed": "O login Google ainda não foi ativado no Firebase.",
    "auth/popup-closed-by-user": "A janela do Google foi fechada. Tente novamente.",
    "auth/popup-blocked": "A janela do Google foi bloqueada. Abra o HOUSE TASKS no Safari ou Chrome e tente novamente.",
    "auth/network-request-failed": "Falha de conexão com o Google. Tente novamente.",
  };

  function withDeadline(operation) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(
        "O Google não concluiu a entrada. Se a janela não abriu, tente pelo Safari ou Chrome."
      )), 120000);
    });
    return Promise.race([operation, timeout]).finally(() => clearTimeout(timer));
  }

  async function login() {
    if (!window.firebase || !config?.apiKey) throw new Error("Login Google indisponível.");
    const app = firebase.apps[0] || firebase.initializeApp(config);
    const auth = app.auth();
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      return await withDeadline(auth.signInWithPopup(provider).then(result => {
        if (!result.user) throw new Error("O Google não confirmou sua identidade.");
        return result.user.getIdToken();
      }));
    } catch (error) {
      throw new Error(messages[error.code] || error.message);
    } finally {
      void auth.signOut().catch(() => {});
    }
  }

  window.HouseGoogle = { login };
})();
