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

function personalDemandEditor(selected, demand, onSaved) {
  const dialog = element("dialog", null, { "aria-labelledby": "personal-editor-title" });
  const form = element("form", null, { class: "personal-editor" });
  const title = element("input", null, { required: "", maxlength: "120", placeholder: "Ex. Preparar a abertura" });
  title.value = demand?.title || "";
  const date = element("input", null, { type: "date", required: "" });
  date.value = demand?.day || selected;
  const rows = element("div", null, { class: "personal-editor-rows" });
  const status = element("p", null, { role: "status", class: "personal-message" });
  const add = button("Adicionar item", () => appendItem("", false, true));
  const submit = element("button", "Salvar demanda", { type: "submit", class: "primary" });
  const cancel = button("Cancelar", () => dialog.close());

  function syncRows() {
    const items = [...rows.children];
    items.forEach((row, index) => {
      row.firstElementChild.setAttribute("aria-label", "Item " + (index + 1));
      row.lastElementChild.setAttribute("aria-label", "Remover item " + (index + 1));
      row.lastElementChild.disabled = items.length === 1;
    });
    add.disabled = items.length >= 50;
  }
  function appendItem(text, done, focus = false) {
    const row = element("div", null, { class: "personal-editor-row" });
    const input = element("input", null, { maxlength: "300", placeholder: "O que precisa ser feito?" });
    input.defaultValue = text;
    row.dataset.done = String(done);
    const remove = button("Remover", () => {
      row.remove();
      syncRows();
      add.focus();
    });
    row.append(input, remove);
    rows.append(row);
    syncRows();
    if (focus) input.focus();
  }
  for (const item of demand?.checklist || [{ text: "", done: false }]) appendItem(item.text, item.done);
  const actions = element("div", null, { class: "personal-editor-actions" });
  actions.append(cancel, submit);
  form.append(element("h2", demand ? "Editar demanda pessoal" : "Nova demanda pessoal", { id: "personal-editor-title" }),
    field("Nome da demanda", title), field("Data", date),
    element("h3", "Checklist"), rows, add, status, actions);
  form.onsubmit = async event => {
    event.preventDefault();
    const checklist = [...rows.children].map(row => {
      const text = row.firstElementChild.value.trim();
      return { text, done: row.dataset.done === "true" && row.firstElementChild.defaultValue === text };
    }).filter(item => item.text);
    if (!title.value.trim() || !checklist.length) {
      status.textContent = "Informe um nome e pelo menos um item do checklist.";
      return;
    }
    const payload = { title: title.value.trim(), day: date.value, checklist };
    const controls = [...form.querySelectorAll("input,button")].filter(control => !control.disabled);
    controls.forEach(control => { control.disabled = true; });
    status.textContent = "Salvando…";
    try {
      await api(demand ? "personal-demands/" + demand.id : "personal-demands", demand ? "PATCH" : "POST",
        demand ? { ...payload, version: demand.version } : payload);
      dialog.close();
      onSaved(payload.day);
    } catch (error) {
      status.textContent = error.message;
    } finally {
      controls.forEach(control => { control.disabled = false; });
    }
  };
  dialog.addEventListener("cancel", event => { if (submit.disabled) event.preventDefault(); });
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.append(form);
  document.body.append(dialog);
  dialog.showModal();
}

function renderPersonalDemands(panel, selected, onSaved) {
  const header = element("div", null, { class: "personal-header" });
  const progress = element("p", null, { class: "muted", "aria-live": "polite" });
  const title = element("div");
  title.append(element("h2", "Minhas demandas"), element("small", dayFormat.format(dateFromKey(selected))));
  header.append(title, button("+ Demanda pessoal", () => personalDemandEditor(selected, null, onSaved), { class: "primary" }));
  const content = element("div", null, { class: "personal-list" });
  panel.replaceChildren(header, progress, content);

  function show(demands) {
    const items = demands.flatMap(demand => demand.checklist);
    progress.textContent = items.length ? items.filter(item => item.done).length + " de " + items.length + " itens concluídos" : "";
    content.replaceChildren();
    if (!demands.length) content.append(element("p", "Nenhuma demanda pessoal nesta data.", { class: "muted" }));
    for (const demand of demands) {
      const card = element("article", null, { class: "personal-demand" });
      const heading = element("div", null, { class: "personal-header" });
      heading.append(element("h3", demand.title));
      const actions = element("div", null, { class: "personal-editor-actions" });
      actions.append(
        button("Editar", () => personalDemandEditor(selected, demand, onSaved), { "aria-label": "Editar " + demand.title }),
        button("Excluir", async () => {
          if (!confirm("Excluir a demanda “" + demand.title + "”?")) return;
          await save("DELETE", { version: demand.version });
        }, { "aria-label": "Excluir " + demand.title }),
      );
      heading.append(actions);
      const list = element("ul", null, { class: "personal-checklist" });
      const status = element("p", null, { role: "status", class: "personal-message" });
      async function save(method, payload, checkboxIndex) {
        const controls = [...panel.querySelectorAll("input,button")];
        controls.forEach(control => { control.disabled = true; });
        status.textContent = "Salvando…";
        try {
          const result = await api("personal-demands/" + demand.id, method, payload);
          if (!card.isConnected) return;
          controls.forEach(control => { control.disabled = false; });
          show(method === "DELETE" ? demands.filter(item => item.id !== demand.id) :
            demands.map(item => item.id === demand.id ? result : item));
          if (checkboxIndex !== undefined) content.querySelectorAll("article")[
            demands.findIndex(item => item.id === demand.id)
          ]?.querySelectorAll("input")[checkboxIndex]?.focus();
        } catch (error) {
          status.textContent = error.message;
          controls.forEach(control => { control.disabled = false; });
        }
      }
      demand.checklist.forEach((item, index) => {
        const checkbox = element("input", null, { type: "checkbox" });
        checkbox.checked = item.done;
        checkbox.onchange = () => {
          const done = checkbox.checked;
          checkbox.checked = item.done;
          const checklist = demand.checklist.map((entry, position) => position === index ? { ...entry, done } : entry);
          void save("PATCH", { day: demand.day, title: demand.title, version: demand.version, checklist }, index);
        };
        const row = element("li");
        const label = element("label");
        label.append(checkbox, element("span", item.text));
        row.append(label);
        list.append(row);
      });
      card.append(heading, list, status);
      content.append(card);
    }
  }

  async function load() {
    content.replaceChildren(element("p", "Carregando demandas pessoais…", { role: "status" }));
    try {
      const { demands } = await api("personal-demands?day=" + encodeURIComponent(selected));
      if (content.isConnected) show(demands);
    } catch (error) {
      content.replaceChildren(element("p", error.message, { role: "alert" }), button("Tentar novamente", load));
    }
  }
  void load();
}

function renderCalendar() {
  let selected = today(), month = dateFromKey(selected);
  const person = select([["", "Todos os responsáveis"], ["none", "Sem responsável"],
    ...data.people.map(item => [item.id, item.name])], "Filtrar responsável");
  const unit = select([["", "Todas as unidades"], ...data.units.map(item => [item.id, item.name])], "Filtrar unidade");
  const filters = element("div", null, { class: "filters" });
  filters.append(person, unit);
  const section = element("section", null, { class: "surface" });
  const personal = element("section", null, { class: "surface personal-demands", "aria-label": "Minhas demandas" });
  let loadedPersonalDay;
  const agenda = element("section", null, { class: "surface", "aria-live": "polite" });
  const undated = element("details", null, { class: "surface" });
  root.replaceChildren(element("h1", "Meu dia"), filters, section, personal, agenda, undated);

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
    if (loadedPersonalDay !== selected) {
      loadedPersonalDay = selected;
      renderPersonalDemands(personal, selected, day => {
        selected = day;
        month = dateFromKey(day);
        loadedPersonalDay = null;
        draw();
        personal.querySelector("button")?.focus({ preventScroll: true });
      });
    }
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

let notes = [];
let activeNote;
let saveActiveNote;
let currentPanel;
let search;
let list;

function drawNotes() {
  const term = search.value.trim().toLocaleLowerCase("pt-BR");
  const filtered = notes.filter(note => (note.title + " " + (note.preview || "")).toLocaleLowerCase("pt-BR").includes(term));
  list.replaceChildren();
  for (const note of filtered) {
    const row = element("a", null, { class: "note-row", href: pageUrl(note.id) });
    if (note.id === activeNote?.id) row.setAttribute("aria-current", "page");
    const date = new Date(note.updated).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    row.append(element("strong", note.title), element("small", date + (note.role === "owner" ? "" : " · Compartilhada")));
    if (note.preview?.trim()) row.append(element("span", note.preview.trim()));
    list.append(row);
  }
  if (!filtered.length) list.append(element("p", term ? "Nenhuma nota encontrada." : "Nenhuma nota ainda.", { class: "note-list-empty" }));
}

function notesLayout() {
  const workspace = element("div", null, { class: "notes-workspace" });
  const sidebar = element("section", null, { class: "notes-sidebar", "aria-label": "Lista de notas" });
  const bar = element("div", null, { class: "section-header" });
  const create = element("a", "+", { href: pageUrl() + "&new=1", class: "note-create", "aria-label": "Nova nota", title: "Nova nota" });
  bar.append(element("h1", "Notas"), create);
  search = element("input", null, { type: "search", placeholder: "Buscar notas", "aria-label": "Buscar notas" });
  search.oninput = drawNotes;
  list = element("div", null, { class: "notes-list" });
  sidebar.append(bar, search, list);
  currentPanel = element("section", null, { class: "note-editor-pane", "aria-label": "Editor de nota" });
  workspace.append(sidebar, currentPanel);
  root.classList.add("notes-mode");
  root.replaceChildren(workspace);
  drawNotes();
  return workspace;
}

function blankNote() {
  return { title: "", body: "", checklist: [], taskIds: [], role: "owner" };
}

function pageEditor(page) {
  const editable = page.role !== "view";
  activeNote = page;
  drawNotes();
  const form = element("form", null, { class: "note-form" });
  const title = element("input", null, { "aria-label": "Título", class: "note-title", placeholder: "Título", maxlength: "120" });
  const body = element("textarea", null, { "aria-label": "Conteúdo da nota", class: "note-body", placeholder: "Escreva uma nota…", rows: "5", maxlength: "30000" });
  title.value = page.title;
  body.value = page.body;
  title.readOnly = body.readOnly = !editable;
  const taskIds = new Set(page.taskIds);
  const checklist = structuredClone(page.checklist);
  const status = element("p", editable ? "" : "Somente leitura", { role: "status", class: "note-save-status" });
  let revision = 0, savedRevision = 0, saveTimer, inFlight, saveError;
  const checks = element("ul", null, { class: "task-list" });
  const tasks = element("ul", null, { class: "task-list" });
  const knownTasks = new Map(data.tasks.map(task => [task.id, task]));
  const mark = () => {
    revision++;
    draftDirty = true;
    status.textContent = "Alterações pendentes";
    clearTimeout(saveTimer);
    if (!saveError) saveTimer = setTimeout(saveNote, 650);
  };
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

  form.append(title, body);
  const checkSection = element("details", null, { class: "note-extra" });
  checkSection.open = !!checklist.length;
  checkSection.hidden = !editable && !checklist.length;
  checkSection.append(element("summary", "Checklist"), checks);
  form.append(checkSection);
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
    checkSection.append(controls);
  }

  const linksSection = element("details", null, { class: "note-extra" });
  linksSection.hidden = !editable && !taskIds.size;
  linksSection.append(element("summary", "Tarefas vinculadas"), tasks);
  form.append(linksSection);
  if (editable) {
    const link = select([["", "Selecione uma tarefa"], ...data.tasks.map(task => [task.id, task.title])], "Selecionar tarefa");
    const controls = element("div", null, { class: "inline" });
    controls.append(link, button("Vincular", () => {
      if (link.value && taskIds.size < 100) { taskIds.add(link.value); link.value = ""; mark(); drawTasks(); }
    }));
    linksSection.append(controls);
  }
  const actions = element("div", null, { class: "note-actions" });
  const retry = button("Tentar salvar", () => { saveError = null; void saveNote(); });
  retry.hidden = true;
  const menu = element("details", null, { class: "note-menu" });
  menu.hidden = !page.id || page.role !== "owner";
  const summary = element("summary", "•••", { "aria-label": "Opções da nota", title: "Opções da nota" });
  const menuActions = element("div");
  menuActions.append(button("Compartilhar", async () => {
    menu.open = false;
    if (await saveNote()) await share(page.id);
  }), button("Excluir nota", async () => {
    if (!confirm("Excluir esta nota?")) return;
    if (inFlight) await inFlight;
    clearTimeout(saveTimer);
    try { await api("pages/" + page.id, "DELETE"); draftDirty = false; location.replace(pageUrl()); }
    catch (error) { status.textContent = error.message; retry.hidden = false; }
  }, { class: "danger" }));
  menu.append(summary, menuActions);
  const back = element("a", "‹ Notas", { href: pageUrl(), class: "notes-back" });
  const noteDate = element("small", page.updated ? new Date(page.updated).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }) : "", { class: "note-date" });
  actions.append(back, status, retry, menu);
  currentPanel.replaceChildren(actions, noteDate, form);
  currentPanel.closest(".notes-workspace").classList.add("has-note");
  drawChecks();
  drawTasks();

  async function saveNote() {
    clearTimeout(saveTimer);
    if (!editable) return true;
    if (inFlight) return inFlight;
    if (saveError?.status === 409) return false;
    if (revision === savedRevision) return true;
    inFlight = (async () => {
      try {
        retry.hidden = true;
        while (revision !== savedRevision) {
          const saving = revision;
          const text = title.value.trim(), content = body.value;
          if (!page.id && !text && !content.trim() && !checklist.length && !taskIds.size) {
            savedRevision = saving;
            break;
          }
          const payload = { title: text || "Nova nota", body: content, checklist, taskIds: [...taskIds], version: page.version };
          status.textContent = "Salvando…";
          const existing = !!page.id;
          const result = await api(existing ? "pages/" + page.id : "pages", existing ? "PATCH" : "POST", payload);
          Object.assign(page, { id: result.id || page.id, version: result.version, updated: result.updated, title: payload.title });
          if (!existing) history.replaceState(null, "", pageUrl(page.id));
          menu.hidden = page.role !== "owner";
          noteDate.textContent = new Date(page.updated).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
          notes = [{ id: page.id, title: payload.title, updated: page.updated, role: page.role, preview: content.slice(0, 180) },
            ...notes.filter(note => note.id !== page.id)];
          drawNotes();
          savedRevision = saving;
        }
        draftDirty = false;
        status.textContent = page.id ? "Salvo" : "";
        return true;
      } catch (error) {
        saveError = error;
        status.textContent = error.status === 409 ? "A nota mudou em outra sessão. Copie suas alterações antes de reabrir." : error.message;
        retry.hidden = error.status === 409;
        return false;
      }
    })();
    try { return await inFlight; }
    finally { inFlight = null; }
  }
  saveActiveNote = saveNote;
  form.onsubmit = event => { event.preventDefault(); void saveNote(); };
  form.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void saveNote();
    }
  });
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
    const requests = [api("data"), api("pages")];
    if (id) requests.push(api("pages/" + encodeURIComponent(id)));
    const [taskData, library, page] = await Promise.all(requests);
    data = taskData;
    notes = library.pages;
    notesLayout();
    if (page || params.get("new") === "1") pageEditor(page || blankNote());
    else currentPanel.append(element("p", "Selecione uma nota ou crie uma nova.", { class: "notes-empty" }));
    document.addEventListener("click", async event => {
      const link = event.target.closest("a[href]");
      if (!link || !draftDirty || event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (await saveActiveNote?.()) location.assign(link.href);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && draftDirty) void saveActiveNote?.();
    });
  } else {
    data = await api("data");
    renderCalendar();
  }
} catch (error) {
  root.replaceChildren(element("p", error.message, { role: "alert" }));
  if (pagesMode) root.append(element("a", "Todas as notas", { href: pageUrl() }));
} finally {
  root.setAttribute("aria-busy", "false");
}
