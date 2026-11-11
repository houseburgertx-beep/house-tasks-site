(() => {
  const config = window.__HOUSE_CONFIG__?.firebaseConfig;
  const messages = {
    "auth/unauthorized-domain": "O domínio do site precisa ser autorizado no Firebase.",
    "auth/operation-not-allowed": "O login Google ainda não foi ativado no Firebase.",
    "auth/popup-closed-by-user": "A janela do Google foi fechada. Tente novamente.",
    "auth/popup-blocked": "Permita a abertura da janela do Google neste navegador.",
    "auth/network-request-failed": "Falha de conexão com o Google. Tente novamente.",
  };

  async function login() {
    if (!window.firebase || !config?.apiKey) throw new Error("Login Google indisponível.");
    const app = firebase.apps[0] || firebase.initializeApp(config);
    const auth = app.auth();
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await auth.signInWithPopup(provider);
      if (!result.user) throw new Error("O Google não confirmou sua identidade.");
      return await result.user.getIdToken();
    } catch (error) {
      throw new Error(messages[error.code] || error.message);
    } finally {
      await auth.signOut().catch(() => {});
    }
  }

  window.HouseGoogle = { login };
})();
