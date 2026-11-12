const root = document.getElementById("content");
const base = new URL("./", location.href);
const params = new URLSearchParams(location.search);
const pagesMode = params.get("view") === "pages";
const tab = document.getElementById(pagesMode ? "pages-tab" : "day-tab");
tab.setAttribute("aria-current", "page");
const sessionKey = "house-tasks-session";
const statuses = { todo: "A fazer", doing: "Em execução", review: "Para aprovar", done: "Concluída" };
const formatToday = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bahia", year: "numeric", month: "2-digit", day: "2-digit" });
const monthFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });
const dayFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", dateStyle: "full" });
const today = () => formatToday.format(new Date());
const dateFromKey = key => new Date(key + "T12:00:00Z");
const dateKey = date => date.toISOString().slice(0, 10);
const dayAt = (year, month, day) => new Date(Date.UTC(year, month, day, 12));
let data;
let draftDirty = false;

function signIn() {
  sessionStorage.removeItem(sessionKey);
  sessionStorage.setItem("house-productivity-return", location.pathname + location.search);
  location.replace(base);
}

async function api(path, method = "GET", payload) {
  const token = sessionStorage.getItem(sessionKey);
  if (!token) {
    signIn();
    throw new Error("Entre para continuar.");
  }
  const response = await fetch(apiOrigin + "/api/" + path, {
    method,
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  if (response.status === 401) signIn();
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || "Não foi possível carregar."), { status: response.status });
  return result;
}

function element(tag, text, attrs = {}) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function button(text, action, attrs = {}) {
  const control = element("button", text, { type: "button", ...attrs });
  control.onclick = action;
  return control;
}

function select(options, label) {
  const control = element("select", null, { "aria-label": label });
  for (const [value, text] of options) control.append(element("option", text, { value }));
  return control;
}

function field(label, control) {
  const wrapper = element("label", label);
  wrapper.append(control);
  return wrapper;
}

function taskLink(task) {
  const url = new URL(base);
  url.searchParams.set("tarefa", task.id);
  return element("a", task.title, { href: url.href });
}

function taskList(tasks) {
  if (!tasks.length) return element("p", "Nenhuma demanda nesta data.", { class: "muted" });
  const list = element("ul", null, { class: "task-list" });
  const people = new Map(data.people.map(person => [person.id, person.name]));
  const units = new Map(data.units.map(unit => [unit.id, unit.name]));
  for (const task of tasks) {
    const row = element("li");
    const info = element("div");
    info.append(taskLink(task));
    const context = [units.get(task.unit_id), people.get(task.person_id)].filter(Boolean).join(" · ");
    if (context) info.append(element("small", context));
    row.append(info, element("span", statuses[task.status], { class: "badge " + task.status }));
    list.append(row);
  }
  return list;
}

function renderCalendar() {
  let selected = today(), month = dateFromKey(selected);
  const person = select([["", "Todos os responsáveis"], ["none", "Sem responsável"],
    ...data.people.map(item => [item.id, item.name])], "Filtrar responsável");
  const unit = select([["", "Todas as unidades"], ...data.units.map(item => [item.id, item.name])], "Filtrar unidade");
  const filters = element("div", null, { class: "filters" });
  filters.append(person, unit);
  const section = element("section", null, { class: "surface" });
  const agenda = element("section", null, { class: "surface", "aria-live": "polite" });
  const undated = element("details", null, { class: "surface" });
  root.replaceChildren(element("h1", "Meu dia"), filters, section, agenda, undated);

  function draw() {
    const tasks = data.tasks.filter(task => (!unit.value || task.unit_id === unit.value)
      && (!person.value || (person.value === "none" ? !task.person_id : task.person_id === person.value)));
    const byDate = new Map();
    for (const task of tasks) {
      const due = task.due || null;
      if (!byDate.has(due)) byDate.set(due, []);
      byDate.get(due).push(task);
    }
    const year = month.getUTCFullYear(), index = month.getUTCMonth();
    const first = dayAt(year, index, 1);
    const offset = (first.getUTCDay() + 6) % 7;
    const days = dayAt(year, index + 1, 0).getUTCDate();
    const header = element("div", null, { class: "calendar-header" });
    const switchMonth = delta => {
      month = dayAt(year, index + delta, 1);
      selected = dateKey(month);
      draw();
      section.querySelector(delta < 0 ? "#previous-month" : "#next-month").focus();
    };
    header.append(element("h2", monthFormat.format(month)), button("‹", () => switchMonth(-1), { id: "previous-month", "aria-label": "Mês anterior" }),
      button("Hoje", () => { selected = today(); month = dateFromKey(selected); draw(); section.querySelector("#today").focus(); }, { id: "today" }),
      button("›", () => switchMonth(1), { id: "next-month", "aria-label": "Próximo mês" }));
    const grid = element("div", null, { class: "calendar-grid", "aria-label": "Calendário mensal" });
    for (const name of ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]) grid.append(element("span", name, { class: "weekday" }));
    for (let gap = 0; gap < offset; gap++) grid.append(element("span", null, { "aria-hidden": "true" }));
    const currentDay = today();
    for (let number = 1; number <= days; number++) {
      const date = dayAt(year, index, number), key = dateKey(date);
      const scheduled = byDate.get(key) || [];
      const cell = button(null, () => {
        selected = key;
        draw();
        section.querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
      }, { class: "day", "aria-pressed": String(key === selected),
        "aria-label": dayFormat.format(date) + ", " + scheduled.length + (scheduled.length === 1 ? " demanda" : " demandas"),
        ...(key === currentDay ? { "aria-current": "date" } : {}) });
      cell.append(element("strong", String(number)));
      if (scheduled.length) {
        cell.append(element("span", String(scheduled.length), { class: "day-count", "aria-hidden": "true" }));
        for (const task of scheduled.slice(0, 2)) {
          cell.append(element("span", task.title, { class: "day-task " + task.status, "aria-hidden": "true" }));
        }
      }
      grid.append(cell);
    }
    section.replaceChildren(header, grid);
    agenda.replaceChildren(element("h2", dayFormat.format(dateFromKey(selected))), taskList(byDate.get(selected) || []));
    const noDate = byDate.get(null) || [];
    undated.hidden = !noDate.length;
    undated.replaceChildren(element("summary", "Sem prazo (" + noDate.length + ")"), taskList(noDate));
  }

  person.onchange = unit.onchange = draw;
  draw();
}

function pageUrl(id) {
  const url = new URL("productivity.html", base);
  url.searchParams.set("view", "pages");
  if (id) url.searchParams.set("id", id);
  return url.href;
}

async function pageLibrary() {
  const title = element("h1", "Páginas");
  const bar = element("div", null, { class: "section-header" });
  const status = element("p", "Carregando páginas…", { role: "status" });
  const list = element("div", null, { class: "page-grid" });
  const create = button("Nova página", () => pageEditor({ title: "", body: "", checklist: [], taskIds: [], role: "owner" }), { class: "primary" });
  bar.append(title, create);
  root.replaceChildren(bar, status, list);
  const { pages } = await api("pages");
  status.textContent = pages.length ? "" : "Nenhuma página criada.";
  for (const page of pages) {
    const card = element("a", null, { class: "surface page-card", href: pageUrl(page.id) });
    card.append(element("strong", page.title), element("small", page.role === "owner" ? "Atualizada em " + new Date(page.updated).toLocaleDateString("pt-BR") : "Compartilhada"));
    list.append(card);
  }
}

function pageEditor(page) {
  const editable = page.role !== "view";
  const form = element("form", null, { class: "surface page-form" });
  const title = element("input", null, { required: "", maxlength: "120" });
  const body = element("textarea", null, { rows: "10", maxlength: "30000" });
  title.value = page.title;
  body.value = page.body;
  title.readOnly = body.readOnly = !editable;
  const taskIds = new Set(page.taskIds);
  const checklist = structuredClone(page.checklist);
  const status = element("p", "", { role: "status" });
  const checks = element("ul", null, { class: "task-list" });
  const tasks = element("ul", null, { class: "task-list" });
  const knownTasks = new Map(data.tasks.map(task => [task.id, task]));
  const mark = () => { draftDirty = true; status.textContent = "Alterações pendentes"; };
  title.oninput = body.oninput = mark;

  function drawChecks() {
    checks.replaceChildren();
    for (const item of checklist) {
      const row = element("li");
      const label = element("label", null, { class: "check-row" });
      const check = element("input", null, { type: "checkbox" });
      check.checked = item.done;
      check.disabled = !editable;
      check.onchange = () => { item.done = check.checked; mark(); };
      label.append(check, document.createTextNode(item.text));
      row.append(label);
      if (editable) row.append(button("Remover", () => { checklist.splice(checklist.indexOf(item), 1); mark(); drawChecks(); }, { "aria-label": "Remover " + item.text }));
      checks.append(row);
    }
  }

  function drawTasks() {
    tasks.replaceChildren();
    for (const id of taskIds) {
      const task = knownTasks.get(id);
      const row = element("li");
      row.append(task ? taskLink(task) : element("span", "Tarefa indisponível para esta conta", { class: "muted" }));
      if (editable) row.append(button("Desvincular", () => { taskIds.delete(id); mark(); drawTasks(); }));
      tasks.append(row);
    }
  }

  form.append(field("Título", title), field("Documento", body), element("h2", "Checklist"), checks);
  const add = element("input", null, { maxlength: "300", placeholder: "Novo item", "aria-label": "Novo item do checklist" });
  function addCheck() {
    const text = add.value.trim();
    if (!text || checklist.length >= 100) return false;
    checklist.push({ id: crypto.randomUUID(), text, done: false });
    add.value = "";
    drawChecks();
    mark();
    return true;
  }
  if (editable) {
    const controls = element("div", null, { class: "inline" });
    controls.append(add, button("Adicionar", () => { if (addCheck()) add.focus(); }));
    add.onkeydown = event => { if (event.key === "Enter") { event.preventDefault(); addCheck(); } };
    add.oninput = mark;
    form.append(controls);
  }

  form.append(element("h2", "Tarefas vinculadas"), tasks);
  if (editable) {
    const link = select([["", "Selecione uma tarefa"], ...data.tasks.map(task => [task.id, task.title])], "Selecionar tarefa");
    const controls = element("div", null, { class: "inline" });
    controls.append(link, button("Vincular", () => {
      if (link.value && taskIds.size < 100) { taskIds.add(link.value); link.value = ""; mark(); drawTasks(); }
    }));
    form.append(controls);
  }
  const actions = element("div", null, { class: "inline" });
  const save = element("button", "Salvar página", { type: "submit", class: "primary" });
  if (editable) actions.append(save);
  if (page.id && page.role === "owner") {
    actions.append(button("Compartilhar", () => share(page.id)), button("Excluir", async () => {
      if (!confirm("Excluir esta página?")) return;
      try { await api("pages/" + page.id, "DELETE"); draftDirty = false; location.replace(pageUrl()); }
      catch (error) { status.textContent = error.message; }
    }, { class: "danger" }));
  }
  form.append(actions, status);
  const heading = element("div", null, { class: "section-header" });
  heading.append(element("h1", page.id ? "Página" : "Nova página"), element("a", "Todas as páginas", { href: pageUrl() }));
  root.replaceChildren(heading, form);
  drawChecks();
  drawTasks();
  form.onsubmit = async event => {
    event.preventDefault();
    if (!editable || save.disabled) return;
    if (add.value.trim() && !addCheck()) { status.textContent = "O checklist pode ter até 100 itens."; return; }
    const fields = [...form.elements].filter(control => !control.disabled);
    for (const control of fields) control.disabled = true;
    try {
      const payload = { title: title.value, body: body.value, checklist, taskIds: [...taskIds] };
      const result = await api(page.id ? "pages/" + page.id : "pages", page.id ? "PATCH" : "POST", { ...payload, version: page.version });
      draftDirty = false;
      if (!page.id) { history.replaceState(null, "", pageUrl(result.id)); pageEditor(result); }
      else { page.version = result.version; status.textContent = "Página salva."; }
    } catch (error) { status.textContent = error.message; }
    finally { for (const control of fields) control.disabled = false; }
  };
}

async function share(id) {
  const modal = element("dialog");
  const exit = button("Fechar", () => modal.close());
  const form = element("form");
  const email = element("input", null, { type: "email", maxlength: "254", required: "" });
  const role = select([["view", "Pode ler"], ["edit", "Pode editar"]], "Permissão");
  const submit = element("button", "Dar acesso", { type: "submit", class: "primary" });
  const status = element("p", "", { role: "status" });
  const members = element("ul", null, { class: "task-list" });
  const path = "pages/" + id + "/members";
  async function refresh() {
    const result = await api(path);
    members.replaceChildren();
    for (const member of result.members) {
      const row = element("li");
      row.append(element("span", member.email + " · " + (member.role === "edit" ? "edição" : "leitura")),
        button("Remover", async event => {
          event.currentTarget.disabled = true;
          try { await api(path, "POST", { email: member.email, role: "remove" }); await refresh(); }
          catch (error) { status.textContent = error.message; await refresh().catch(() => {}); }
        }, { "aria-label": "Remover acesso de " + member.email }));
      members.append(row);
    }
  }
  form.append(field("E-mail da conta House Tasks", email), field("Permissão", role), submit);
  form.onsubmit = async event => {
    event.preventDefault();
    submit.disabled = true;
    try {
      await api(path, "POST", { email: email.value, role: role.value });
      email.value = "";
      status.textContent = "Acesso atualizado.";
      await refresh();
    } catch (error) { status.textContent = error.message; }
    finally { submit.disabled = false; }
  };
  modal.append(element("h2", "Compartilhar página"), form, status, members, exit);
  modal.addEventListener("close", () => modal.remove(), { once: true });
  document.body.append(modal);
  modal.showModal();
  try { await refresh(); }
  catch (error) { status.textContent = error.message; }
}

window.addEventListener("beforeunload", event => {
  if (draftDirty) { event.preventDefault(); event.returnValue = ""; }
});
window.addEventListener("pageshow", event => {
  if (event.persisted && !pagesMode) location.reload();
});

const apiOrigin = await fetch(new URL("app-config.json", base))
  .then(response => response.json()).then(config => config.apiBaseUrl.replace(/\/$/, ""))
  .catch(() => "https://house-tasks-api.brunohouse.workers.dev");
try {
  if (pagesMode) {
    const id = params.get("id");
    if (id) {
      let page;
      [data, page] = await Promise.all([api("data"), api("pages/" + encodeURIComponent(id))]);
      pageEditor(page);
    } else {
      data = await api("data");
      await pageLibrary();
    }
  } else {
    data = await api("data");
    renderCalendar();
  }
} catch (error) {
  root.replaceChildren(element("p", error.message, { role: "alert" }));
  if (pagesMode) root.append(element("a", "Todas as páginas", { href: pageUrl() }));
} finally {
  root.setAttribute("aria-busy", "false");
}
