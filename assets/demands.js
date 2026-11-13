const list = document.querySelector("#demand-list");
const tabs = document.querySelector(".demand-tabs");
const notice = document.querySelector("#demand-status");
const dialog = document.querySelector("#demand-dialog");
const form = document.querySelector("#demand-form");
const create = document.querySelector("#new-request");
const sessionKey = "house-tasks-session";
const categories = { maintenance: "Manutenção", purchases: "Compras", support: "Suporte" };
const stages = { todo: "A fazer", doing: "Em execução", review: "Para aprovar", done: "Concluída" };
let selected = "review";
let data;
let user;
const config = await fetch("./app-config.json").then(response => response.json())
  .catch(() => ({ apiBaseUrl: "https://house-tasks-api.brunohouse.workers.dev" }));

function element(tag, label, attrs = {}) {
  const node = document.createElement(tag);
  if (label) node.textContent = label;
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

function action(label, handler) {
  const node = element("button", label, { type: "button" });
  node.onclick = handler;
  return node;
}

async function api(path, method = "GET", payload) {
  const response = await fetch(config.apiBaseUrl + "/api/" + path, {
    method,
    headers: { Authorization: "Bearer " + sessionStorage.getItem(sessionKey), "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  if (response.status === 401) {
    sessionStorage.removeItem(sessionKey);
    sessionStorage.setItem("house-demands-return", "1");
    location.replace("./");
    throw new Error("Entre para continuar.");
  }
  if (!response.ok) throw new Error((await response.json()).error || "Não foi possível concluir.");
  return response;
}

function select(options, placeholder) {
  const input = element("select", "", { required: "" });
  input.append(element("option", placeholder, { value: "" }));
  for (const [key, label] of options) input.append(element("option", label, { value: key }));
  return input;
}

function field(label, control) {
  const wrapper = element("label", label);
  wrapper.append(control);
  return wrapper;
}

function edit(title, fields, verb, save, nextTab) {
  const feedback = element("p", "", { role: "status" });
  const submit = element("button", verb, { type: "submit", class: "primary" });
  const cancel = action("Cancelar", () => dialog.close());
  const actions = element("div", "", { class: "demand-actions" });
  actions.append(cancel, submit);
  form.replaceChildren(element("h2", title, { id: "demand-dialog-title" }), ...fields, feedback, actions);
  dialog.setAttribute("aria-labelledby", "demand-dialog-title");
  dialog.oncancel = event => { if (submit.disabled) event.preventDefault(); };
  form.onsubmit = async event => {
    event.preventDefault();
    submit.disabled = cancel.disabled = true;
    try {
      await save();
    } catch (error) {
      feedback.textContent = error.message;
      submit.disabled = cancel.disabled = false;
      return;
    }
    dialog.close();
    if (nextTab) selected = nextTab;
    notice.textContent = "Alteração salva.";
    await refresh();
  };
  dialog.showModal();
}

function request() {
  const title = element("input", "", { required: "", maxlength: "180" });
  const description = element("textarea", "", { required: "", maxlength: "5000" });
  const category = select(Object.entries(categories), "Escolha o tipo");
  const receiver = select(data.people.filter(p => p.active && p.has_account).map(p => [p.id, p.name]), "Escolha quem recebe");
  edit("Solicitar demanda", [field("Título", title), field("Tipo", category), field("Enviar para", receiver),
    field("O que precisa ser feito?", description)], "Enviar solicitação", () => api("tasks", "POST", {
    title: title.value, description: description.value, request_category: category.value, person_id: receiver.value,
    approval: true,
  }), "sent");
}

function assign(task) {
  const candidates = data.people.filter(p => p.active && p.has_account && (p.shared || p.owner === task.owner));
  const person = select(candidates.map(p => [p.id, p.name]), "Escolha o responsável");
  person.value = task.person_id;
  edit("Atribuir solicitação", [field("Responsável", person)], "Atribuir",
    () => update(task, { assign: person.value }));
}

function update(task, changes) {
  return api("tasks/" + encodeURIComponent(task.id), "PATCH", { version: task.version, ...changes });
}

async function openEvidence(file) {
  try {
    const response = await api("files/" + encodeURIComponent(file.id));
    const url = URL.createObjectURL(await response.blob());
    const preview = element("div", "", { class: "demand-preview" });
    if (/^image\/(png|jpeg|webp|gif)$/.test(file.type))
      preview.append(element("img", "", { src: url, alt: file.name }));
    preview.append(element("a", "Baixar " + file.name, { href: url, download: file.name }));
    form.replaceChildren(element("h2", file.name, { id: "demand-dialog-title" }), preview, action("Fechar", () => dialog.close()));
    form.onsubmit = null;
    dialog.oncancel = null;
    dialog.setAttribute("aria-labelledby", "demand-dialog-title");
    dialog.addEventListener("close", () => URL.revokeObjectURL(url), { once: true });
    if (!dialog.open) dialog.showModal();
  } catch (error) {
    notice.textContent = error.message;
  }
}

function render() {
  const owned = task => task.owner === user.userId;
  const groups = {
    review: data.tasks.filter(task => task.status === "review" && owned(task)),
    inbox: data.tasks.filter(task => task.request_category && !task.triaged_at),
    sent: data.tasks.filter(task => task.request_category && owned(task)),
  };
  tabs.replaceChildren(...Object.entries({ review: "Para aprovar", inbox: "Triagem", sent: "Enviadas" }).map(([key, label]) => {
    const tab = action(label + " · " + groups[key].length, () => { selected = key; render(); });
    tab.setAttribute("aria-pressed", String(selected === key));
    return tab;
  }));
  list.replaceChildren();
  for (const task of groups[selected]) {
    const card = element("article", "", { class: "surface demand-card" });
    const person = data.people.find(p => p.id === task.person_id);
    const due = task.due ? task.due.split("-").reverse().join("/") : "Sem prazo";
    card.append(element("h2", task.title), element("small", [
      categories[task.request_category], person?.name || "Sem responsável", due,
      task.request_category && !task.triaged_at ? "Em triagem" : stages[task.status],
    ].filter(Boolean).join(" · ")));
    if (task.description) card.append(element("p", task.description));
    const files = data.files.filter(file => file.task_id === task.id);
    if (files.length) {
      const evidence = element("div", "", { class: "demand-evidence", "aria-label": "Evidências" });
      evidence.append(...files.map(file => action("Ver " + file.name, () => openEvidence(file))));
      card.append(evidence);
    } else if (selected === "review") card.append(element("small", "Sem evidências anexadas."));
    const controls = element("div", "", { class: "demand-actions" });
    controls.append(element("a", "Abrir tarefa e histórico", { href: "./?tarefa=" + encodeURIComponent(task.id) }));
    if (selected === "inbox") controls.append(action("Atribuir", () => assign(task)));
    if (selected === "review") {
      controls.append(action("Aprovar", () => edit("Aprovar entrega", [element("p", task.title)], "Confirmar aprovação",
        () => update(task, { approve: true, status: "done" }))));
      controls.append(action("Pedir ajuste", () => {
        const reason = element("textarea", "", { required: "", maxlength: "1000" });
        edit("Pedir ajuste", [field("O que precisa ser corrigido?", reason)], "Enviar ajuste",
          () => update(task, { adjustment: reason.value }));
      }));
    }
    card.append(controls);
    list.append(card);
  }
  if (!groups[selected].length) list.append(element("p", "Nenhuma demanda nesta fila.", { class: "surface muted" }));
}

async function refresh() {
  try {
    data = await (await api("data")).json();
    render();
    create.disabled = false;
  } catch (error) {
    notice.textContent = error.message;
    list.replaceChildren(action("Atualizar lista", refresh));
  }
}

try {
  ({ user } = await (await api("auth/me")).json());
  await refresh();
  create.disabled = !data;
  create.onclick = request;
} catch (error) {
  notice.textContent = error.message;
}
