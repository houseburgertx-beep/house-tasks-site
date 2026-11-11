(() => {
  const { firebaseConfig, googleEmail } = window.__HOUSE_CONFIG__ || {};
  const scopes = {
    drive: "https://www.googleapis.com/auth/drive.file",
    calendar: "https://www.googleapis.com/auth/calendar.events.owned",
  };
  const credentials = new Map();

  async function authenticate(service) {
    if (!window.firebase || !firebaseConfig?.apiKey) throw new Error("Firebase indisponível.");
    const app = firebase.apps[0] || firebase.initializeApp(firebaseConfig);
    const auth = app.auth();
    await auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ login_hint: googleEmail, prompt: "select_account" });
    if (service) provider.addScope(scopes[service]);
    try {
      const result = await auth.signInWithPopup(provider);
      if (result.user?.email?.toLowerCase() !== googleEmail) {
        throw new Error("Use a conta " + googleEmail + ".");
      }
      if (!service) return await result.user.getIdToken();
      if (!result.credential?.accessToken) throw new Error("O Google não concedeu acesso.");
      credentials.set(service, result.credential.accessToken);
    } catch (error) {
      const messages = {
        "auth/unauthorized-domain": "O domínio do site precisa ser autorizado no Firebase.",
        "auth/operation-not-allowed": "Ative o provedor Google no Firebase Authentication.",
        "auth/popup-closed-by-user": "A janela do Google foi fechada.",
        "auth/popup-blocked": "Permita a abertura da janela do Google no navegador.",
      };
      throw new Error(messages[error.code] || error.message);
    } finally {
      await auth.signOut().catch(() => {});
    }
  }

  async function request(service, url, options = {}) {
    const token = credentials.get(service);
    if (!token) throw new Error("Conecte sua conta Google para continuar.");
    const headers = new Headers(options.headers);
    headers.set("Authorization", "Bearer " + token);
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      credentials.delete(service);
      throw new Error("A autorização expirou. Conecte sua conta novamente.");
    }
    return response;
  }

  async function json(response) {
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "O Google recusou a solicitação.");
    return result;
  }

  const driveFiles = "https://www.googleapis.com/drive/v3/files";
  const folderType = "application/vnd.google-apps.folder";

  async function list(query) {
    let pageToken = "";
    const files = [];
    do {
      const params = new URLSearchParams({
        q: "trashed = false and (" + query + ")",
        fields: "nextPageToken,files(id,name,webViewLink,createdTime)",
        orderBy: "createdTime",
        pageSize: "100",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const result = await json(await request("drive", driveFiles + "?" + params));
      files.push(...result.files);
      pageToken = result.nextPageToken;
    } while (pageToken);
    return files;
  }

  function postJson(body, method = "POST") {
    return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  }

  async function folder() {
    const existing = await list("mimeType = '" + folderType + "' and appProperties has { key='houseTasksRoot' and value='1' }");
    if (existing.length) return existing[0].id;
    const created = await json(await request("drive", driveFiles, postJson({
      name: "HOUSE TASKS",
      mimeType: folderType,
      appProperties: { houseTasksRoot: "1" },
    })));
    return created.id;
  }

  function taskKey(id) {
    if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new Error("Tarefa inválida.");
    return id;
  }

  async function upload(taskId, file) {
    if (!/^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/.test(file.type)) {
      throw new Error("Escolha uma imagem JPEG, PNG, WebP, HEIC ou um PDF.");
    }
    if (!file.size || file.size > 10 * 1024 * 1024) throw new Error("O arquivo precisa ter até 10 MB.");
    const parent = await folder();
    const boundary = crypto.randomUUID();
    const metadata = { name: file.name, parents: [parent], appProperties: { houseTaskId: taskKey(taskId) } };
    const body = new Blob([
      "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n",
      JSON.stringify(metadata),
      "\r\n--" + boundary + "\r\nContent-Type: " + file.type + "\r\n\r\n",
      file,
      "\r\n--" + boundary + "--\r\n",
    ]);
    return json(await request("drive", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
      method: "POST", headers: { "Content-Type": "multipart/related; boundary=" + boundary }, body,
    }));
  }

  async function saveEvent(task) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(task.due || "")) throw new Error("Defina um prazo e salve a tarefa primeiro.");
    const next = new Date(task.due + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(taskKey(task.id)));
    const id = Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join("");
    const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    const event = {
      summary: task.title,
      description: task.description || "",
      start: { date: task.due },
      end: { date: next.toISOString().slice(0, 10) },
    };
    const response = await request("calendar", url, postJson({ ...event, id }));
    if (response.status === 409) {
      return json(await request("calendar", url + "/" + id, postJson(event, "PATCH")));
    }
    return json(response);
  }

  window.HouseGoogle = {
    login: () => authenticate(),
    connect: authenticate,
    connected: (service) => credentials.has(service),
    clear: () => credentials.clear(),
    upload,
    files: (id) => list("appProperties has { key='houseTaskId' and value='" + taskKey(id) + "' }"),
    saveEvent,
  };
})();
