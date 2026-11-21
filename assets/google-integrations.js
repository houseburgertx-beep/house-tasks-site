(() => {
  const config = window.__HOUSE_CONFIG__?.firebaseConfig;
  const googleClientId = "664192166444-cmmm8p9mt7l43dd881gm9oaqrf40bnrh.apps.googleusercontent.com";
  const apiBase = window.__HOUSE_CONFIG__?.apiBaseUrl?.replace(/\/$/, "") ||
    "https://house-tasks-api.brunohouse.workers.dev";
  const canonicalUrl = "https://house-task-327d6.firebaseapp.com/house-tasks-site/";
  const sameOrigin = location.hostname === config?.authDomain;
  const messages = {
    "auth/unauthorized-domain": "O domínio do site precisa ser autorizado no Firebase.",
    "auth/operation-not-allowed": "Este método de login precisa estar ativado no Firebase Authentication.",
    "auth/popup-closed-by-user": "A janela do Google foi fechada. Tente novamente.",
    "auth/popup-blocked": "O navegador bloqueou a janela do Google. Toque em Entrar com Google novamente ou abra o site em uma aba do Safari ou Chrome.",
    "auth/operation-not-supported-in-this-environment": "Abra o HOUSE TASKS em uma aba do Safari ou Chrome para entrar com Google.",
    "auth/network-request-failed": "Falha de conexão com o Firebase/Google. Verifique sua internet e tente novamente.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/invalid-email": "Informe um endereço de e-mail válido.",
    "auth/user-disabled": "Esta conta foi desativada no Firebase.",
    "auth/too-many-requests": "Muitas tentativas seguidas. Aguarde alguns minutos ou redefina sua senha.",
    "auth/weak-password": "Escolha uma senha mais forte (mínimo de 6 caracteres).",
    "auth/email-already-in-use": "Este e-mail já possui cadastro no Firebase.",
    "auth/provider-already-linked": "Este e-mail já possui login por senha vinculado no Firebase.",
    "auth/requires-recent-login": "Informe sua senha atual ou redefina a senha por e-mail para concluir a alteração.",
  };

  function friendlyError(error, fallback) {
    const code = error?.code || "";
    const err = new Error(messages[code] || error?.message || fallback || "Não foi possível autenticar.");
    if (code) err.code = code;
    return err;
  }

  function authClient() {
    if (!window.firebase || !config?.apiKey) throw new Error("Firebase Authentication indisponível.");
    const app = firebase.apps.find((a) => a.name === "[DEFAULT]") || firebase.initializeApp(config);
    const auth = app.auth();
    auth.languageCode = "pt";
    return auth;
  }

  function secondaryAuthClient() {
    if (!window.firebase || !config?.apiKey) throw new Error("Firebase Authentication indisponível.");
    const name = "house-member-provision";
    const app = firebase.apps.find((a) => a.name === name) || firebase.initializeApp(config, name);
    const auth = app.auth();
    auth.languageCode = "pt";
    return auth;
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
      throw friendlyError(error, "Não foi possível entrar com Google.");
    }
  }

  async function resume() {
    if (!sameOrigin) return null;
    const auth = authClient();
    try {
      const result = await withDeadline(auth.getRedirectResult());
      return result.user ? await result.user.getIdToken() : null;
    } catch (error) {
      throw friendlyError(error, "Não foi possível concluir a entrada com Google.");
    }
  }

  async function signInWithPassword(email, password) {
    const auth = authClient();
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(() => {});
      const result = await auth.signInWithEmailAndPassword(String(email || "").trim(), String(password || ""));
      if (!result.user) throw new Error("Não foi possível confirmar sua senha no Firebase.");
      const idToken = await result.user.getIdToken(true);
      return {
        idToken,
        emailVerified: Boolean(result.user.emailVerified),
        sendVerification: async () => {
          await result.user.sendEmailVerification({ url: canonicalUrl });
        },
      };
    } catch (error) {
      throw friendlyError(error, "Não foi possível entrar com e-mail e senha.");
    }
  }

  async function registerWithPassword(name, email, password) {
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPass = String(password || "");
    if (cleanName.length < 2) throw new Error("Informe seu nome completo.");
    if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("Informe um endereço de e-mail válido.");
    if (cleanPass.length < 8) throw new Error("Escolha uma senha com pelo menos 8 caracteres.");

    const auth = authClient();
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(() => {});
      const result = await auth.createUserWithEmailAndPassword(cleanEmail, cleanPass);
      if (!result.user) throw new Error("Não foi possível concluir o cadastro no Firebase.");
      await result.user.updateProfile({ displayName: cleanName }).catch(() => {});
      const idToken = await result.user.getIdToken(true);
      return {
        idToken,
        rollback: async () => {
          try {
            await result.user.delete();
          } catch {
            await auth.signOut().catch(() => {});
          }
        },
      };
    } catch (error) {
      if (error?.code === "auth/email-already-in-use") {
        const err = new Error(
          "Este e-mail já possui cadastro no Firebase. Volte para Entrar e use sua senha ou 'Esqueci minha senha'."
        );
        err.code = "auth/email-already-in-use";
        throw err;
      }
      throw friendlyError(error, "Não foi possível criar seu cadastro no Firebase.");
    }
  }

  async function sendPasswordReset(email) {
    const clean = String(email || "").trim();
    if (!clean || !clean.includes("@")) {
      throw new Error("Informe o e-mail da conta para enviar o link de redefinição.");
    }
    const auth = authClient();
    try {
      await auth.sendPasswordResetEmail(clean, { url: canonicalUrl });
      return { ok: true };
    } catch (error) {
      throw friendlyError(error, "Não foi possível enviar o e-mail de redefinição.");
    }
  }

  async function setOwnPassword(email, newPassword, currentPassword) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const nextPass = String(newPassword || "");
    const currPass = String(currentPassword || "");
    if (nextPass.length < 8) {
      throw new Error("Use uma senha com pelo menos 8 caracteres.");
    }
    const auth = authClient();
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(() => {});
      const current = auth.currentUser;
      const sameUser = current && String(current.email || "").trim().toLowerCase() === cleanEmail;

      if (sameUser) {
        const hasPassProvider = (current.providerData || []).some((p) => p?.providerId === "password");
        if (!hasPassProvider) {
          const cred = firebase.auth.EmailAuthProvider.credential(cleanEmail, nextPass);
          const linked = await current.linkWithCredential(cred);
          const idToken = await linked.user.getIdToken(true);
          return { mode: "linked", idToken };
        }
        if (currPass) {
          const cred = firebase.auth.EmailAuthProvider.credential(cleanEmail, currPass);
          await current.reauthenticateWithCredential(cred);
        }
        await current.updatePassword(nextPass);
        const idToken = await current.getIdToken(true);
        return { mode: "updated", idToken };
      }

      if (currPass) {
        const signed = await auth.signInWithEmailAndPassword(cleanEmail, currPass);
        await signed.user.updatePassword(nextPass);
        const idToken = await signed.user.getIdToken(true);
        return { mode: "updated", idToken };
      }

      try {
        const created = await auth.createUserWithEmailAndPassword(cleanEmail, nextPass);
        const idToken = await created.user.getIdToken(true);
        return { mode: "created", idToken };
      } catch (createErr) {
        if (createErr?.code === "auth/email-already-in-use") {
          const err = new Error(
            "Esta conta já existe no Firebase. Informe sua senha atual para alterar ou use 'Enviar link de redefinição por e-mail'."
          );
          err.code = "need_current_or_reset";
          throw err;
        }
        throw createErr;
      }
    } catch (error) {
      if (error?.code === "need_current_or_reset") throw error;
      throw friendlyError(error, "Não foi possível salvar a senha no Firebase.");
    }
  }

  async function provisionMemberPassword(email, password) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPass = String(password || "");
    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("Informe um e-mail válido para criar a senha no Firebase.");
    }
    if (cleanPass.length < 8) {
      throw new Error("A senha inicial deve ter pelo menos 8 caracteres.");
    }
    const auth = secondaryAuthClient();
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.NONE).catch(() => {});
      const created = await auth.createUserWithEmailAndPassword(cleanEmail, cleanPass);
      const idToken = await created.user.getIdToken(true);
      await auth.signOut().catch(() => {});
      return { created: true, alreadyExists: false, idToken };
    } catch (error) {
      await auth.signOut().catch(() => {});
      if (error?.code === "auth/email-already-in-use") {
        return { created: false, alreadyExists: true, idToken: null };
      }
      throw friendlyError(error, "Não foi possível criar a senha do membro no Firebase.");
    }
  }

  async function migrateLegacyPassword(email, password, sessionToken) {
    if (!email || !password || !sessionToken || !window.firebase || !config?.apiKey) return;
    try {
      const auth = secondaryAuthClient();
      await auth.setPersistence(firebase.auth.Auth.Persistence.NONE).catch(() => {});
      const created = await auth.createUserWithEmailAndPassword(String(email).trim(), String(password));
      const idToken = await created.user.getIdToken(true);
      await auth.signOut().catch(() => {});
      await fetch(apiBase + "/api/auth/firebase/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + sessionToken,
        },
        body: JSON.stringify({ idToken }),
      }).catch(() => {});
    } catch {
      // Ignore if account already exists in Firebase or offline
    }
  }

  async function syncGoogleToFirebase(googleIdToken, sessionToken) {
    if (!googleIdToken || !sessionToken || !window.firebase || !config?.apiKey) return;
    try {
      const auth = authClient();
      await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(() => {});
      const cred = firebase.auth.GoogleAuthProvider.credential(googleIdToken);
      const signed = await auth.signInWithCredential(cred);
      const fbToken = await signed.user?.getIdToken();
      if (fbToken) {
        await fetch(apiBase + "/api/auth/firebase/link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + sessionToken,
          },
          body: JSON.stringify({ idToken: fbToken }),
        }).catch(() => {});
      }
    } catch {
      // Never block Google Identity login
    }
  }

  async function signOut() {
    try {
      if (window.firebase && config?.apiKey) {
        const app = firebase.apps.find((a) => a.name === "[DEFAULT]");
        if (app) await app.auth().signOut();
      }
    } catch {}
  }

  window.HouseGoogle = { login, resume };
  window.HouseFirebaseAuth = {
    signInWithPassword,
    registerWithPassword,
    sendPasswordReset,
    setOwnPassword,
    provisionMemberPassword,
    migrateLegacyPassword,
    signOut,
  };

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
      await Promise.race([
        syncGoogleToFirebase(credential, result.token),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
      location.reload();
    } catch (error) {
      showIdentityError(error.message || "Não foi possível entrar com Google.");
    }
  }

  let identityInitialized = false;
  function renderIdentityButton() {
    const original = document.querySelector(".google-auth-btn");
    if (!original) {
      document.querySelectorAll(".google-identity-button").forEach((el) => el.remove());
      return;
    }
    if (original.dataset.identityReplaced || !window.google?.accounts?.id) return;
    if (original.nextElementSibling?.classList.contains("google-identity-button")) {
      original.dataset.identityReplaced = "true";
      original.hidden = true;
      return;
    }
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
    const widthTarget = original.closest(".auth-card")?.getBoundingClientRect().width;
    const rawWidth = original.getBoundingClientRect().width || (widthTarget ? widthTarget - 48 : 320);
    google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: Math.max(240, Math.min(400, Math.round(rawWidth || 320))),
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

  if (window.firebase && config?.apiKey) authClient();
})();
