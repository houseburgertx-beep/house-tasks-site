const $ = id => document.getElementById(id);
const uid = () => crypto.randomUUID();
const clone = value => structuredClone(value);
const svgNS = "http://www.w3.org/2000/svg";
const base = new URL("./", location.href);
const apiBase = await fetch(new URL("app-config.json", base))
  .then(response => response.json()).then(config => config.apiBaseUrl)
  .catch(() => "https://house-tasks-api.brunohouse.workers.dev");
const sessionKey = "house-tasks-session";
const canvas = $("canvas");
const scene = $("scene");
const emptyDocument = () => ({ elements: [], edges: [] });
const colors = ["#d9c7ff", "#ffdf78", "#bceaa4", "#b8e1ff", "#ffc1a9", "#ffc6dc", "#ffffff"];
const tools = [
  ["select", "Selecionar", "M5 3l14 9-7 1-3 7z", "V"],
  ["hand", "Mover tela", "M8 13V5a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-13 4l-3-5a1.6 1.6 0 0 1 2-2z", "H"],
  ["topic", "Mapa mental", "M5 6h4v4H5z M16 2h4v4h-4z M16 10h4v4h-4z M16 18h4v4h-4z M9 8h3v12h4 M12 4h4 M12 12h4", "M"],
  ["sticky", "Nota adesiva", "M4 3h16v12l-6 6H4z M14 21v-6h6", "N"],
  ["text", "Texto", "M4 6V3h16v3 M12 3v17 M8 20h8", "T"],
  ["rect", "Retângulo", "M4 5h16v14H4z", "R"],
  ["ellipse", "Elipse", "M3 12a9 7 0 1 0 18 0 9 7 0 1 0-18 0", "O"],
  ["diamond", "Losango", "M12 3l9 9-9 9-9-9z", "D"],
  ["edge", "Conector", "M3 18c8 0 9-12 17-12 M15 3l5 3-3 5", "C"],
  ["pen", "Desenhar", "M4 20l4-1L21 6l-3-3L5 16z M15 6l3 3", "P"],
  ["frame", "Moldura", "M3 8h18 M8 3v18 M16 3v18 M3 16h18", "F"],
];
let board;
let tool = "select";
let selected;
let edgeStart;
let gesture;
let pinch;
const folded = new Set();
const taskStatuses = { todo: "A fazer", doing: "Em execução", review: "Para aprovar", done: "Concluída" };
let linkedTasks = new Map();
let camera = { x: 0, y: 0, zoom: 1 };
let back = [], forward = [];
let sequence = 0, saved = 0, saving, saveTimer, saveError, opening = false;
const pointers = new Map();

function signIn() {
  sessionStorage.removeItem(sessionKey);
  sessionStorage.setItem("house-whiteboard-return", location.pathname + location.search);
  location.replace(base);
}

async function api(path = "", method = "GET", payload, prefix = "/api/whiteboards") {
  const token = sessionStorage.getItem(sessionKey);
  if (!token) {
    signIn();
    throw new Error("Entre para acessar seus quadros.");
  }
  const response = await fetch(apiBase + prefix + path, {
    method, cache: "no-store",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const result = await response.json();
  if (response.status === 401) signIn();
  if (!response.ok) throw Object.assign(new Error(result.error || "Não foi possível completar a ação."), { status: response.status });
  return result;
}

function node(name, text, attrs = {}) {
  const element = document.createElement(name);
  if (text !== undefined) element.textContent = text;
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function svg(name, attrs = {}) {
  const element = document.createElementNS(svgNS, name);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function button(text, action, className = "quiet") {
  const result = node("button", text, { type: "button", class: className });
  result.addEventListener("click", action);
  return result;
}

function dialog(title, ...children) {
  $("dialog-body").replaceChildren(node("h2", title), ...children);
  if (!$("studio-dialog").open) $("studio-dialog").showModal();
}

function item(type, x, y, text = "") {
  const size = { topic: [178, 54], sticky: [170, 140], text: [200, 65], rect: [160, 95], ellipse: [160, 95], diamond: [160, 105], frame: [420, 290], pen: [10, 10] }[type];
  return { id: uid(), type, x, y, w: size[0], h: size[1], text, color: type === "sticky" ? colors[1] : type === "pen" || type === "text" ? "#4f388c" : colors[0] };
}

function template(name) {
  const document = emptyDocument();
  if (name === "mind") {
    const root = item("topic", 0, 0, "Tema central");
    document.elements.push(root);
    ["Ideias", "Prioridades", "Próximos passos"].forEach((label, index) => {
      const branch = item("topic", 265, -105 + index * 105, label);
      branch.color = colors[index + 2];
      document.elements.push(branch);
      document.edges.push({ id: uid(), from: root.id, to: branch.id, branch: true });
    });
  }
  if (name === "process") {
    ["Entrada", "Execução", "Entrega"].forEach((label, index) => {
      const stage = item("rect", index * 240, 0, label);
      stage.color = colors[index + 2];
      if (index) document.edges.push({ id: uid(), from: document.elements[index - 1].id, to: stage.id, branch: false });
      document.elements.push(stage);
    });
  }
  return document;
}

function askNew() {
  const form = node("form");
  const name = node("input", undefined, { required: "", maxlength: "100", value: "Novo quadro" });
  const mode = node("select");
  [["blank", "Quadro em branco"], ["mind", "Mapa mental"], ["process", "Fluxograma"]].forEach(([value, text]) => mode.append(node("option", text, { value })));
  const nameLabel = node("label", "Nome");
  nameLabel.append(name);
  const templateLabel = node("label", "Modelo");
  templateLabel.append(mode);
  const submit = node("button", "Criar quadro", { class: "primary", type: "submit" });
  const error = node("p", "", { role: "alert" });
  form.append(nameLabel, templateLabel, submit, error);
  form.onsubmit = async event => {
    event.preventDefault();
    submit.disabled = true;
    try {
      const created = await api("", "POST", { title: name.value, document: template(mode.value) });
      $("studio-dialog").close();
      display(created);
    } catch (failure) { error.textContent = failure.message; }
    finally { submit.disabled = false; }
  };
  dialog("Novo quadro", form);
}

async function library() {
  if (board && sequence !== saved && !await save()) return;
  board = null;
  history.replaceState(null, "", base.pathname + "whiteboards.html");
  $("library").hidden = false;
  $("editor").hidden = true;
  ["board-title", "library-link", "export", "comments", "share"].forEach(id => $(id).hidden = true);
  $("save-status").textContent = "";
  $("library-status").textContent = "Carregando quadros…";
  $("board-list").replaceChildren();
  try {
    const { boards } = await api();
    $("library-status").textContent = boards.length ? "" : "Nenhum quadro criado.";
    for (const info of boards) {
      const tile = button(undefined, () => loadBoard(info.id), "board-tile");
      const preview = svg("svg", { class: "board-preview", viewBox: "0 0 250 130", "aria-hidden": "true" });
      preview.append(
        svg("path", { d: "M75 65C130 65 116 31 165 31M75 65H165M75 65C130 65 116 100 165 100", fill: "none", stroke: "#ac95dc", "stroke-width": 2 }),
        svg("rect", { x: 25, y: 52, width: 66, height: 27, rx: 10, fill: "#7252b8" }),
        ...[31, 65, 100].map((y, index) => svg("rect", { x: 154, y: y - 10, width: 66, height: 20, rx: 8, fill: colors[index + 2] })),
      );
      tile.append(preview, node("strong", info.title), node("small", new Date(info.updated).toLocaleDateString("pt-BR") + (info.role === "owner" ? "" : " · Compartilhado")));
      $("board-list").append(tile);
    }
  } catch (error) { $("library-status").textContent = error.message; }
}

async function loadBoard(id) {
  if (opening) return;
  opening = true;
  try { display(await api("/" + encodeURIComponent(id))); }
  catch (error) { $("library-status").textContent = error.message; }
  finally { opening = false; }
}

function display(data) {
  board = data;
  folded.clear();
  linkedTasks = new Map((data.linkedTasks || []).map(task => [task.id, task]));
  selected = edgeStart = null;
  back = []; forward = [];
  sequence = saved = 0;
  saveError = null;
  history.replaceState(null, "", "?quadro=" + encodeURIComponent(board.id));
  $("library").hidden = true;
  $("editor").hidden = false;
  ["board-title", "library-link", "export", "comments"].forEach(id => $(id).hidden = false);
  $("share").hidden = board.role !== "owner";
  $("board-title").readOnly = !editable();
  $("board-title").value = board.title;
  $("notice").hidden = true;
  setTool("select");
  fit();
  render();
  status();
}

function editable() { return board && board.role !== "view"; }
function status() {
  $("save-status").textContent = saveError ? "Alterações pendentes" : !editable() ? "Somente leitura" : sequence !== saved ? "Salvando…" : "Salvo";
}

function changed(previous) {
  back.push(previous);
  if (back.length > 40) back.shift();
  forward = [];
  dirty();
}

function snapshot() { return clone({ title: board.title, document: board.document }); }

function dirty() {
  sequence += 1;
  status();
  clearTimeout(saveTimer);
  if (!saveError) saveTimer = setTimeout(save, 450);
}

async function save() {
  clearTimeout(saveTimer);
  if (saving) return saving;
  if (gesture?.previous) {
    saveTimer = setTimeout(save, 250);
    return false;
  }
  if (!editable() || sequence === saved) return true;
  if (saveError?.status === 409) return false;
  const current = board;
  saving = (async () => {
    try {
      while (sequence !== saved && !gesture?.previous) {
        const target = sequence;
        const next = await api("/" + current.id, "PATCH", { ...snapshot(), version: current.version });
        Object.assign(current, next);
        saved = target;
      }
      saveError = null;
      $("notice").hidden = true;
      if (sequence !== saved) saveTimer = setTimeout(save, 250);
      return sequence === saved;
    } catch (error) {
      saveError = error;
      const notice = $("notice");
      notice.replaceChildren(node("div", error.message), button("Baixar minha versão", exportJSON));
      if (error.status === 409) notice.append(button("Recarregar quadro", async () => {
        if (confirm("Descartar as alterações locais e carregar a versão salva?")) await loadBoard(current.id);
      }));
      else notice.append(button("Tentar salvar", save));
      notice.hidden = false;
      return false;
    } finally {
      saving = null;
      status();
    }
  })();
  return saving;
}

function edit(action) {
  if (!editable()) return;
  const previous = snapshot();
  action();
  changed(previous);
  render();
}

function undo(redo = false) {
  if (!editable()) return;
  const source = redo ? forward : back;
  if (!source.length) return;
  (redo ? back : forward).push(snapshot());
  Object.assign(board, source.pop());
  $("board-title").value = board.title;
  if (!board.document.elements.some(element => element.id === selected)) selected = null;
  dirty();
  render();
}

function icon(label, path, action, pressed) {
  const result = button(undefined, action, "icon-tool");
  result.setAttribute("aria-label", label);
  result.title = label;
  if (pressed !== undefined) result.setAttribute("aria-pressed", String(pressed));
  const mark = svg("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" });
  mark.append(svg("path", { d: path, fill: "none", stroke: "currentColor", "stroke-width": 1.7, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  result.append(mark);
  return result;
}

function setTool(value) {
  tool = value;
  edgeStart = null;
  canvas.dataset.tool = value;
  for (const control of document.querySelectorAll("#tools [data-tool], #mobile-tools [data-tool]")) {
    control.setAttribute("aria-pressed", String(control.dataset.tool === value));
  }
  $("mobile-add").textContent = tools.find(([type]) => type === value && !["select", "hand"].includes(type))?.[1] || "Adicionar";
}

function elementShape(element) {
  const { type, w, h, color } = element;
  if (type === "pen") {
    const d = (element.points || []).map(([x, y], index) => (index ? "L" : "M") + x + " " + y).join(" ");
    return svg("path", { d, fill: "none", stroke: color, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round", "pointer-events": "stroke" });
  }
  if (type === "ellipse") return svg("ellipse", { cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2, fill: color, stroke: "#9b8caf" });
  if (type === "diamond") return svg("path", { d: `M${w / 2} 0L${w} ${h / 2} ${w / 2} ${h} 0 ${h / 2}Z`, fill: color, stroke: "#9b8caf" });
  return svg("rect", {
    width: w, height: h, rx: type === "topic" ? Math.min(24, h / 2) : type === "frame" ? 3 : 7,
    fill: type === "text" ? "transparent" : type === "frame" ? "#ffffffa3" : color,
    stroke: type === "frame" ? color : type === "text" ? "transparent" : "#00000018",
    "stroke-width": type === "frame" ? 2 : 1,
  });
}

function textLines(text, width, maxLines) {
  const limit = Math.max(5, Math.floor(width / 8));
  const lines = text.split("\n").flatMap(paragraph => {
    const result = [];
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (line && (line + " " + word).length > limit) { result.push(line); line = ""; }
      if (word.length > limit) {
        const chars = Array.from(word);
        while (chars.length > limit) result.push(chars.splice(0, limit).join(""));
        line = chars.join("");
      } else line += (line ? " " : "") + word;
    }
    result.push(line);
    return result;
  });
  if (lines.length <= maxLines) return lines;
  return [...lines.slice(0, maxLines - 1), lines[maxLines - 1].slice(0, -1) + "…"];
}

function renderElement(element, showSelection) {
  const group = svg("g", { transform: `translate(${element.x} ${element.y})`, "data-element": element.id });
  group.append(elementShape(element));
  if (element.type !== "pen") {
    const isFrame = element.type === "frame";
    const x = isFrame ? 0 : element.w / 2;
    const lines = textLines(element.text, element.w - 24, isFrame ? 1 : Math.max(1, Math.floor((element.h - 16) / 18)));
    const text = svg("text", { x, y: isFrame ? -9 : element.h / 2 - (lines.length - 1) * 9 + 5, fill: element.type === "text" ? element.color : "#2d2341", "text-anchor": isFrame ? "start" : "middle", "font-family": "system-ui, sans-serif", "font-size": 15, "font-weight": element.type === "topic" ? 650 : 500 });
    lines.forEach((line, index) => {
      const span = svg("tspan", { x, dy: index ? 18 : 0 });
      span.textContent = line;
      text.append(span);
    });
    group.append(text);
  }
  if (showSelection && element.taskId) {
    const task = linkedTasks.get(element.taskId);
    const status = svg("text", { x: 0, y: element.h + 17, class: "board-task-status", "pointer-events": "none" });
    status.textContent = task ? taskStatuses[task.status] : "Tarefa vinculada";
    group.append(status);
  }
  if (showSelection && element.type === "topic" && board.document.edges.some(edge => edge.branch && edge.from === element.id)) {
    const collapsed = folded.has(element.id);
    const label = collapsed ? "Expandir ramos" : "Recolher ramos";
    const toggle = svg("g", { transform: `translate(${element.w - 6} -6)`, "data-fold": element.id,
      role: "button", tabindex: 0, "aria-label": label, "aria-expanded": String(!collapsed), class: "branch-toggle" });
    toggle.append(svg("circle", { r: 14 }), svg("path", { d: collapsed ? "M-5 0H5 M0 -5V5" : "M-5 0H5" }));
    toggle.addEventListener("keydown", event => {
      if (![" ", "Enter"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      toggleBranch(element.id, true);
    });
    group.append(toggle);
  }
  if (showSelection && (element.id === selected || element.id === edgeStart)) {
    group.append(svg("rect", { x: -4, y: -4, width: element.w + 8, height: element.h + 8, rx: 6, fill: "none", stroke: "#774bd1", "stroke-width": 2, "pointer-events": "none" }));
    if (element.id === selected && editable() && element.type !== "pen") {
      group.append(svg("rect", { x: element.w - 5, y: element.h - 5, width: 12, height: 12, rx: 2, fill: "#774bd1", stroke: "white", "data-resize": "true" }));
    }
  }
  return group;
}

function visibleElements() {
  const { elements, edges } = board.document;
  if (!folded.size) return elements;
  const children = new Map();
  for (const { from, to, branch } of edges) {
    if (!branch) continue;
    if (!children.has(from)) children.set(from, []);
    children.get(from).push(to);
  }
  const hidden = new Set();
  for (const id of folded) {
    const visited = new Set([id]);
    const pending = [...(children.get(id) || [])];
    while (pending.length) {
      const child = pending.pop();
      if (visited.has(child)) continue;
      visited.add(child);
      hidden.add(child);
      pending.push(...(children.get(child) || []));
    }
  }
  return elements.filter(element => !hidden.has(element.id));
}

function toggleBranch(id, restoreFocus = false) {
  if (folded.has(id)) folded.delete(id);
  else folded.add(id);
  if (selected && !visibleElements().some(element => element.id === selected)) selected = null;
  render();
  if (restoreFocus) scene.querySelector(`[data-fold="${CSS.escape(id)}"]`)?.focus();
}

function renderScene(target, showSelection = true) {
  const elements = showSelection ? visibleElements() : board.document.elements;
  const { edges } = board.document;
  const byId = new Map(elements.map(element => [element.id, element]));
  const shapes = elements.filter(element => element.type === "frame").map(element => renderElement(element, showSelection));
  for (const edge of edges) {
    const a = byId.get(edge.from), b = byId.get(edge.to);
    if (!a || !b) continue;
    const right = a.x + a.w / 2 <= b.x + b.w / 2;
    const ax = right ? a.x + a.w : a.x, bx = right ? b.x : b.x + b.w;
    const ay = a.y + a.h / 2, by = b.y + b.h / 2;
    const middle = (ax + bx) / 2;
    const d = `M${ax} ${ay}C${middle} ${ay} ${middle} ${by} ${bx} ${by}`;
    shapes.push(svg("path", { d, fill: "none", stroke: edge.branch ? b.color : "#6d6782", "stroke-width": edge.id === selected && showSelection ? 4 : 2.5, ...(!edge.branch && { "marker-end": "url(#arrow)" }), "data-edge": edge.id, "pointer-events": "stroke" }));
    if (showSelection) shapes.push(svg("path", { d, fill: "none", stroke: "transparent", "stroke-width": 14, "data-edge": edge.id, "pointer-events": "stroke" }));
  }
  shapes.push(...elements.filter(element => element.type !== "frame").map(element => renderElement(element, showSelection)));
  target.replaceChildren(...shapes);
}

function view() {
  scene.setAttribute("transform", `translate(${camera.x} ${camera.y}) scale(${camera.zoom})`);
  $("dots").setAttribute("patternTransform", `translate(${camera.x} ${camera.y}) scale(${camera.zoom})`);
  $("zoom-value").textContent = Math.round(camera.zoom * 100) + "%";
}

function bounds(full = false) {
  const items = full ? board.document.elements : visibleElements();
  if (!items.length) return { x: 0, y: 0, w: 300, h: 200 };
  const x = Math.min(...items.map(e => e.x)), y = Math.min(...items.map(e => e.y - (e.type === "frame" ? 25 : 0)));
  return { x, y, w: Math.max(...items.map(e => e.x + e.w)) - x, h: Math.max(...items.map(e => e.y + e.h)) - y };
}

function fit() {
  const { width, height } = canvas.getBoundingClientRect();
  const area = bounds();
  const zoom = Math.max(.08, Math.min(1.2, (width - 105) / (area.w + 30), (height - 85) / (area.h + 30)));
  camera = { zoom, x: (width - area.w * zoom) / 2 - area.x * zoom, y: (height - area.h * zoom) / 2 - area.y * zoom };
  view();
}

function render() {
  if (!board) return;
  renderScene(scene);
  $("empty").hidden = board.document.elements.length !== 0 || !editable() || tool !== "select";
  for (const control of $("tools").children) control.disabled = !editable() && !["select", "hand"].includes(control.dataset.tool);
  $("mobile-add").disabled = !editable();
  $("undo").disabled = !editable() || !back.length;
  $("redo").disabled = !editable() || !forward.length;
  renderSelection();
}

function choose(id) {
  selected = id;
  render();
}

function renderSelection() {
  const panel = $("selection");
  const element = board.document.elements.find(entry => entry.id === selected);
  const edge = board.document.edges.find(entry => entry.id === selected);
  panel.hidden = !editable() || (!element && !edge) || tool !== "select";
  if (panel.hidden) return;
  const actions = node("div", undefined, { class: "selection-actions" });
  panel.replaceChildren();
  if (element && element.type !== "pen") {
    const input = node("textarea", undefined, { maxlength: "3000", "aria-label": "Texto do objeto" });
    input.value = element.text;
    let previous;
    input.oninput = () => {
      if (!previous) {
        previous = snapshot();
        back.push(previous);
        if (back.length > 40) back.shift();
        forward = [];
        $("undo").disabled = false;
        $("redo").disabled = true;
      }
      element.text = input.value;
      dirty();
      renderScene(scene);
    };
    panel.append(input);
  }
  if (element) {
    const color = node("input", undefined, { type: "color", value: element.color, "aria-label": "Cor do objeto" });
    color.onchange = () => edit(() => element.color = color.value);
    actions.append(color, button("Duplicar", duplicate));
    if (element.type === "topic") actions.append(button("+ Ramo", () => branch(false)), button("Organizar mapa", organizeMap));
    if (element.type !== "pen") {
      const task = linkedTasks.get(element.taskId);
      if (task) {
        const url = new URL("./", base);
        url.searchParams.set("tarefa", task.id);
        const open = node("a", "Abrir tarefa", { href: url.href, class: "quiet" });
        open.addEventListener("click", async event => {
          event.preventDefault();
          if (await save()) location.assign(url);
        });
        actions.append(open);
      }
      if (!element.taskId) actions.append(button("Vincular tarefa", () => askTask(element)));
      else actions.append(button("Desvincular", () => edit(() => delete element.taskId)));
    }
  }
  actions.append(button("Excluir", removeSelected));
  panel.append(actions);
}

async function askTask(element) {
  const current = board;
  const message = node("p", "Carregando tarefas…", { role: "status" });
  dialog("Vincular tarefa", message);
  const dialogBody = $("dialog-body");
  const studioDialog = $("studio-dialog");
  try {
    const { tasks, units, people } = await api("/data", "GET", undefined, "/api");
    if (board !== current || !studioDialog.open || !dialogBody.contains(message)) return;
    const select = (label, list, empty) => {
      const input = node("select", undefined, { "aria-label": label });
      input.append(node("option", empty, { value: "" }));
      for (const entry of list) input.append(node("option", entry.name || entry.title, { value: entry.id }));
      return input;
    };
    const existing = select("Tarefa existente", tasks, "Selecione uma tarefa");
    const title = node("input", undefined, { maxlength: "180", required: "", placeholder: "Nome da tarefa" });
    title.value = element.text.trim().slice(0, 180);
    const unit = select("Unidade", units.filter(entry => entry.active), "Sem unidade");
    const person = select("Responsável", people.filter(entry => entry.active), "Sem responsável");
    const due = node("input", undefined, { type: "date" });
    const wrap = (label, input) => {
      const field = node("label", label);
      field.append(input);
      return field;
    };
    const valid = () => board === current && editable() && current.document.elements.includes(element) && !element.taskId;
    const link = task => {
      if (!valid()) throw new Error("O bloco mudou. Abra novamente para vincular a tarefa.");
      linkedTasks.set(task.id, task);
      edit(() => { element.taskId = task.id; });
      studioDialog.close();
    };
    const useExisting = button("Vincular existente", () => {
      try {
        const task = tasks.find(entry => entry.id === existing.value);
        if (!task) throw new Error("Selecione uma tarefa.");
        link(task);
      } catch (error) { message.textContent = error.message; }
    });
    const form = node("form");
    const create = node("button", "Criar e vincular", { type: "submit", class: "primary" });
    form.append(wrap("Nome", title), wrap("Unidade", unit), wrap("Responsável", person), wrap("Prazo", due), create);
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!valid() || create.disabled) return;
      create.disabled = useExisting.disabled = true;
      const preventClose = event => event.preventDefault();
      const close = studioDialog.querySelector(".dialog-close");
      close.disabled = true;
      studioDialog.addEventListener("cancel", preventClose);
      try {
        const name = title.value.trim();
        const { id } = await api("/tasks", "POST", { title: name, unit_id: unit.value || null,
          person_id: person.value || null, due: due.value || null }, "/api");
        link({ id, title: name, status: "todo" });
      } catch (error) { message.textContent = error.message; }
      finally {
        create.disabled = useExisting.disabled = close.disabled = false;
        studioDialog.removeEventListener("cancel", preventClose);
      }
    });
    message.textContent = "";
    dialogBody.append(wrap("Tarefa existente", existing), useExisting, node("h3", "Nova tarefa"), form);
  } catch (error) { message.textContent = error.message; }
}

function duplicate() {
  const element = board.document.elements.find(entry => entry.id === selected);
  if (!element || board.document.elements.length >= 500) return;
  edit(() => {
    const copy = { ...clone(element), id: uid(), x: element.x + 24, y: element.y + 24 };
    board.document.elements.push(copy);
    selected = copy.id;
  });
}

function removeSelected() {
  if (!selected) return;
  edit(() => {
    board.document.elements = board.document.elements.filter(element => element.id !== selected);
    board.document.edges = board.document.edges.filter(edge => ![edge.id, edge.from, edge.to].includes(selected));
    selected = null;
  });
}

function branch(sibling) {
  if (!editable() || board.document.elements.length >= 500 || board.document.edges.length >= 1000) return;
  const target = board.document.elements.find(entry => entry.id === selected && entry.type === "topic");
  if (!target) return;
  const parentEdge = sibling && board.document.edges.find(edge => edge.branch && edge.to === target.id);
  const root = parentEdge ? board.document.elements.find(entry => entry.id === parentEdge.from) : target;
  const children = board.document.edges.filter(edge => edge.branch && edge.from === root.id);
  const child = item("topic", root.x + root.w + 75, root.y + (children.length ? children.length * 76 : 0), "Novo tópico");
  child.color = parentEdge || board.document.edges.some(edge => edge.branch && edge.to === root.id) ? root.color : colors[children.length % colors.length];
  edit(() => {
    folded.delete(root.id);
    board.document.elements.push(child);
    board.document.edges.push({ id: uid(), from: root.id, to: child.id, branch: true });
    selected = child.id;
  });
  $("selection").querySelector("textarea")?.select();
}

function organizeMap() {
  const byId = new Map(board.document.elements.map(entry => [entry.id, entry]));
  const links = board.document.edges.filter(edge => edge.branch);
  let root = byId.get(selected);
  const visited = new Set();
  while (root && !visited.has(root.id)) {
    visited.add(root.id);
    const parent = links.find(edge => edge.to === root.id);
    if (!parent) break;
    root = byId.get(parent.from);
  }
  if (!root) return;
  edit(() => {
    const positioned = new Set();
    let row = root.y;
    function layout(element) {
      positioned.add(element.id);
      const children = links.filter(edge => edge.from === element.id && !positioned.has(edge.to)).map(edge => byId.get(edge.to)).filter(Boolean);
      if (!children.length) {
        element.y = row;
        row += Math.max(76, element.h + 22);
        return;
      }
      for (const child of children) {
        if (positioned.has(child.id)) continue;
        child.x = element.x + element.w + 80;
        layout(child);
      }
      element.y = (children[0].y + children.at(-1).y) / 2;
    }
    layout(root);
  });
  fit();
}

function screen(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function world(point) {
  return { x: (point.x - camera.x) / camera.zoom, y: (point.y - camera.y) / camera.zoom };
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const coordinate = value => Math.round(clamp(value, -99000, 99000));
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

function zoomAt(next, point) {
  const center = world(point);
  camera.zoom = clamp(next, .08, 4);
  camera.x = point.x - center.x * camera.zoom;
  camera.y = point.y - center.y * camera.zoom;
  view();
}

function zoomStep(factor) {
  const { width, height } = canvas.getBoundingClientRect();
  zoomAt(camera.zoom * factor, { x: width / 2, y: height / 2 });
}

function createAt(type, point) {
  if (!editable() || board.document.elements.length >= 500) return;
  const labels = { topic: "Tema central", sticky: "Nova nota", text: "Novo texto", frame: "Nova moldura" };
  const element = item(type, coordinate(point.x), coordinate(point.y), labels[type] || "");
  setTool("select");
  edit(() => {
    board.document.elements.push(element);
    selected = element.id;
  });
}

function finishGesture(cancel = false) {
  if (!gesture) return;
  const current = gesture;
  gesture = null;
  if (current.previous && (cancel || current.kind === "pen" && current.element.points.length < 2)) {
    Object.assign(board, current.previous);
    if (current.kind === "pen") selected = null;
  } else if (current.previous && current.moved) {
    changed(current.previous);
  }
  if (current.kind !== "pan") render();
}

canvas.addEventListener("pointerdown", event => {
  if (!board || event.button === 2 || event.target.closest("[data-fold]")) return;
  const local = screen(event);
  pointers.set(event.pointerId, local);
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(event.pointerId);
  if (pointers.size === 2) {
    finishGesture(true);
    const [first, second] = pointers.values();
    pinch = { distance: Math.max(1, distance(first, second)), zoom: camera.zoom,
      anchor: world({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }) };
    return;
  }
  if (pointers.size > 1 || pinch) return;

  const point = world(local);
  const hit = event.target.closest("[data-element]")?.dataset.element;
  const connection = event.target.closest("[data-edge]")?.dataset.edge;
  const target = board.document.elements.find(element => element.id === hit);
  if (tool === "hand" || event.button === 1 || (!hit && !connection && tool === "select")) {
    if (tool === "select") choose(null);
    gesture = { kind: "pan", pointer: event.pointerId, start: local, x: camera.x, y: camera.y };
    return;
  }
  if (tool === "select") {
    choose(hit || connection);
    if (target && editable()) gesture = {
      kind: event.target.hasAttribute("data-resize") ? "resize" : "move",
      pointer: event.pointerId, start: point, element: target, previous: snapshot(), origin: { ...target },
    };
    return;
  }
  if (!editable()) return;
  if (tool === "edge") {
    if (!hit) { edgeStart = null; render(); return; }
    if (!edgeStart || edgeStart === hit) { edgeStart = hit; render(); return; }
    const from = edgeStart;
    setTool("select");
    if (board.document.edges.length >= 1000) return;
    edit(() => board.document.edges.push({ id: uid(), from, to: hit, branch: false }));
    return;
  }
  if (tool === "pen") {
    if (board.document.elements.length >= 500) return;
    const previous = snapshot();
    const element = item("pen", coordinate(point.x), coordinate(point.y));
    element.points = [[0, 0]];
    board.document.elements.push(element);
    selected = element.id;
    gesture = { kind: "pen", pointer: event.pointerId, previous, element };
    renderScene(scene);
    return;
  }
  createAt(tool, point);
});

canvas.addEventListener("click", event => {
  const toggle = event.target.closest("[data-fold]");
  if (toggle) toggleBranch(toggle.dataset.fold, document.activeElement === toggle);
});

canvas.addEventListener("pointermove", event => {
  if (!pointers.has(event.pointerId)) return;
  const local = screen(event);
  pointers.set(event.pointerId, local);
  if (pinch && pointers.size === 2) {
    const [first, second] = pointers.values();
    camera.zoom = clamp(pinch.zoom * distance(first, second) / pinch.distance, .08, 4);
    camera.x = (first.x + second.x) / 2 - pinch.anchor.x * camera.zoom;
    camera.y = (first.y + second.y) / 2 - pinch.anchor.y * camera.zoom;
    view();
    return;
  }
  if (!gesture || gesture.pointer !== event.pointerId) return;
  const { kind, element, start, origin } = gesture;
  if (kind === "pan") {
    camera.x = gesture.x + local.x - start.x;
    camera.y = gesture.y + local.y - start.y;
    view();
    return;
  }
  const point = world(local);
  if (kind === "pen") {
    const next = [coordinate(point.x - element.x), coordinate(point.y - element.y)];
    const last = element.points.at(-1);
    if (Math.hypot(next[0] - last[0], next[1] - last[1]) < 2 || element.points.length >= 2000) return;
    element.points.push(next);
  } else {
    const dx = point.x - start.x, dy = point.y - start.y;
    if (!gesture.moved && Math.hypot(dx, dy) * camera.zoom < 3) return;
    if (kind === "resize") {
      element.w = clamp(Math.round(origin.w + dx), 35, 4000);
      element.h = clamp(Math.round(origin.h + dy), 32, 4000);
    } else {
      element.x = coordinate(origin.x + dx);
      element.y = coordinate(origin.y + dy);
    }
  }
  gesture.moved = true;
  renderScene(scene);
});

for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
  canvas.addEventListener(name, event => {
    if (!pointers.delete(event.pointerId)) return;
    if (pointers.size === 0) pinch = null;
    if (gesture?.pointer === event.pointerId) {
      if (gesture.kind === "pen" && gesture.moved && name === "pointerup") {
        const { element } = gesture;
        const minX = Math.min(...element.points.map(([x]) => x));
        const minY = Math.min(...element.points.map(([, y]) => y));
        element.x = coordinate(element.x + minX);
        element.y = coordinate(element.y + minY);
        element.points = element.points.map(([x, y]) => [x - minX, y - minY]);
        element.w = clamp(Math.max(...element.points.map(([x]) => x)), 10, 4000);
        element.h = clamp(Math.max(...element.points.map(([, y]) => y)), 10, 4000);
        element.points = element.points.map(([x, y]) => [Math.min(x, 100000), Math.min(y, 100000)]);
      }
      finishGesture(name !== "pointerup");
    }
  });
}

canvas.addEventListener("wheel", event => {
  if (!board) return;
  event.preventDefault();
  if (event.ctrlKey || event.metaKey) zoomAt(camera.zoom * Math.exp(-event.deltaY * .008), screen(event));
  else if (event.shiftKey || Math.abs(event.deltaX) > 0) {
    camera.x -= event.deltaX || event.deltaY;
    camera.y -= event.shiftKey ? 0 : event.deltaY;
    view();
  } else zoomAt(camera.zoom * Math.exp(-event.deltaY * .002), screen(event));
}, { passive: false });

canvas.addEventListener("dblclick", event => {
  if (!editable() || tool !== "select") return;
  if (!event.target.closest("[data-element]")) createAt("topic", world(screen(event)));
  const field = $("selection").querySelector("textarea");
  if (field) field.select();
});

document.addEventListener("keydown", event => {
  if (!board || $("studio-dialog").open || event.target.closest("[data-fold]")) return;
  const input = event.target.matches("input,textarea,select,[contenteditable]");
  if (input && event.key === "Escape" && $("selection").contains(event.target)) { canvas.focus(); return; }
  if (input || event.altKey) return;
  const key = event.key.toUpperCase();
  if ((event.ctrlKey || event.metaKey) && ["Z", "Y", "D"].includes(key)) {
    event.preventDefault();
    if (key === "D") duplicate();
    else undo(key === "Y" || event.shiftKey);
    return;
  }
  if (event.ctrlKey || event.metaKey) return;
  if (event.key === "Escape") { setTool("select"); choose(null); return; }
  if (editable() && ["Delete", "Backspace"].includes(event.key) && selected) { event.preventDefault(); removeSelected(); return; }
  if (editable() && ["Tab", "Enter"].includes(event.key) && event.target === canvas &&
      board.document.elements.some(item => item.id === selected && item.type === "topic")) {
    event.preventDefault();
    branch(event.key === "Enter");
    return;
  }
  const next = tools.find(entry => entry[3] === key);
  if (next && (editable() || ["select", "hand"].includes(next[0]))) { setTool(next[0]); render(); }
});

function exportFile(content, type, extension) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = node("a", undefined, { href: url, download: board.title + "." + extension });
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function exportJSON() {
  exportFile(JSON.stringify(snapshot(), null, 2), "application/json", "json");
}

function exportSVG() {
  const area = bounds(true);
  const picture = svg("svg", { viewBox: `${area.x - 30} ${area.y - 30} ${area.w + 60} ${area.h + 60}`,
    width: area.w + 60, height: area.h + 60 });
  const layer = svg("g");
  picture.append(canvas.querySelector("defs").cloneNode(true), svg("rect", { x: area.x - 30, y: area.y - 30, width: area.w + 60, height: area.h + 60, fill: "#f6f5f9" }), layer);
  renderScene(layer, false);
  exportFile(new XMLSerializer().serializeToString(picture), "image/svg+xml", "svg");
}

function askExport() {
  const options = node("div", undefined, { class: "dialog-options" });
  options.append(button("Baixar imagem SVG", exportSVG), button("Baixar cópia JSON", exportJSON));
  dialog("Exportar quadro", options);
}

async function askShare() {
  const boardId = board.id;
  const feedback = node("p", "", { role: "status" });
  const list = node("ul", undefined, { class: "member-list" });
  const form = node("form");
  const email = node("input", undefined, { type: "email", required: "", maxlength: "254", placeholder: "pessoa@empresa.com" });
  const role = node("select");
  role.append(node("option", "Pode visualizar", { value: "view" }), node("option", "Pode editar", { value: "edit" }));
  const emailLabel = node("label", "E-mail da conta HOUSE TASKS");
  const roleLabel = node("label", "Permissão");
  emailLabel.append(email); roleLabel.append(role);
  const submit = node("button", "Conceder acesso", { type: "submit", class: "primary" });
  form.append(emailLabel, roleLabel, submit);
  const copy = button("Copiar link do quadro", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      feedback.textContent = "Link copiado.";
    } catch { feedback.textContent = location.href; }
  });
  dialog("Compartilhar quadro", form, list, copy, feedback);
  async function refresh() {
    const { members } = await api("/" + boardId + "/members");
    list.replaceChildren(...members.map(member => {
      const row = node("li", member.email + " · " + (member.role === "edit" ? "Editor" : "Leitor"));
      row.append(button("Remover", () => update(member.email, "remove")));
      return row;
    }));
  }
  async function update(address, access) {
    submit.disabled = true;
    feedback.textContent = "";
    try {
      await api("/" + boardId + "/members", "POST", { email: address, role: access });
      email.value = "";
      await refresh();
      feedback.textContent = access === "remove" ? "Acesso removido." : "Acesso atualizado.";
    } catch (error) { feedback.textContent = error.message; }
    finally { submit.disabled = false; }
  }
  form.onsubmit = event => { event.preventDefault(); update(email.value, role.value); };
  try { await refresh(); } catch (error) { feedback.textContent = error.message; }
}

async function askComments() {
  const boardId = board.id;
  const list = node("ul", undefined, { class: "member-list comment-list" });
  const feedback = node("p", "", { role: "status" });
  const form = node("form");
  const input = node("textarea", undefined, { required: "", maxlength: "2000", "aria-label": "Novo comentário" });
  const submit = node("button", "Publicar comentário", { type: "submit", class: "primary" });
  form.append(input, submit);
  form.hidden = !editable();
  dialog("Comentários do quadro", form, feedback, list);
  async function refresh() {
    const { comments } = await api("/" + boardId + "/comments");
    feedback.textContent = comments.length ? "" : "Ainda não há comentários.";
    list.replaceChildren(...comments.map(comment => {
      const row = node("li");
      row.append(node("strong", comment.author || "Colaborador"), node("span", comment.text), node("small", new Date(comment.created).toLocaleString("pt-BR")));
      return row;
    }));
  }
  form.onsubmit = async event => {
    event.preventDefault();
    submit.disabled = true;
    try {
      await api("/" + boardId + "/comments", "POST", { text: input.value });
      input.value = "";
      await refresh();
    } catch (error) { feedback.textContent = error.message; }
    finally { submit.disabled = false; }
  };
  try { await refresh(); } catch (error) { feedback.textContent = error.message; }
}

function askImport() {
  const input = node("input", undefined, { type: "file", accept: ".json,application/json", "aria-label": "Arquivo JSON do quadro" });
  const feedback = node("p", "", { role: "alert" });
  const submit = button("Criar cópia", async () => {
    const file = input.files[0];
    if (!file || file.size > 750000) { feedback.textContent = "Escolha um arquivo JSON de até 750 KB."; return; }
    submit.disabled = true;
    try {
      const source = JSON.parse(await file.text());
      const created = await api("", "POST", { title: source.title, document: source.document });
      $("studio-dialog").close();
      display(created);
    } catch (error) {
      feedback.textContent = error instanceof SyntaxError ? "O arquivo não contém JSON válido." : error.message;
    } finally { submit.disabled = false; }
  }, "primary");
  dialog("Importar quadro", input, node("div", "", { class: "dialog-options" }), feedback);
  $("dialog-body").querySelector(".dialog-options").append(submit);
}

for (const [type, label, path, key] of tools) {
  const control = icon(label, path, () => { setTool(type); render(); }, type === tool);
  control.dataset.tool = type;
  control.title = label + " (" + key + ")";
  $("tools").append(control);
}
for (const [type, label, path] of tools.slice(0, 2)) {
  const control = icon(label, path, () => { setTool(type); render(); }, false);
  control.dataset.tool = type;
  control.append(node("span", type === "hand" ? "Mover" : label));
  $("mobile-tools").append(control);
}
const mobileAdd = button("Adicionar", () => {
  const options = node("div", undefined, { class: "mobile-tool-options" });
  for (const [type, label] of tools.slice(2)) {
    options.append(button(label, () => {
      $("studio-dialog").close();
      setTool(type);
      render();
    }));
  }
  dialog("Adicionar ao quadro", options);
});
mobileAdd.id = "mobile-add";
$("mobile-tools").append(mobileAdd, button("Enquadrar", fit));
const undoButton = icon("Desfazer", "M9 14 4 9l5-5 M4 9h10a5 5 0 0 1 0 10h-2", () => undo());
undoButton.id = "undo";
const redoButton = icon("Refazer", "M15 14l5-5-5-5 M20 9H10a5 5 0 0 0 0 10h2", () => undo(true));
redoButton.id = "redo";
$("history").append(undoButton, redoButton);
$("zoom").append(
  icon("Ajustar à tela", "M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5", fit),
  icon("Diminuir zoom", "M5 12h14", () => zoomStep(1 / 1.25)),
  node("span", "100%", { id: "zoom-value" }),
  icon("Aumentar zoom", "M5 12h14 M12 5v14", () => zoomStep(1.25)),
);
$("new-board").onclick = askNew;
$("import").onclick = askImport;
$("comments").onclick = askComments;
$("library-link").onclick = library;
$("export").onclick = askExport;
$("share").onclick = askShare;
$("empty-map").onclick = () => {
  edit(() => board.document = template("mind"));
  fit();
};
$("board-title").onchange = event => {
  const title = event.target.value.trim();
  if (editable() && title && title !== board.title) edit(() => board.title = title);
  event.target.value = board.title;
};
window.addEventListener("beforeunload", event => {
  if (board && sequence !== saved) {
    event.preventDefault();
    event.returnValue = true;
  }
});

async function syncBoard() {
  if (!board || gesture || sequence !== saved || document.hidden ||
      $("studio-dialog").open || document.activeElement?.matches("input,textarea,select")) return;
  const current = board;
  try {
    const updated = await api("/" + current.id);
    if (board !== current || sequence !== saved || gesture) return;
    const roleChanged = updated.role !== current.role;
    const tasks = updated.linkedTasks || [];
    if (JSON.stringify(tasks) !== JSON.stringify([...linkedTasks.values()])) {
      linkedTasks = new Map(tasks.map(task => [task.id, task]));
      renderScene(scene);
    }
    if (updated.version > current.version) {
      Object.assign(board, updated);
      $("board-title").value = board.title;
      back = []; forward = [];
      render();
    }
    if (roleChanged) {
      board.role = updated.role;
      if (!editable()) setTool("select");
      $("board-title").readOnly = !editable();
      $("share").hidden = board.role !== "owner";
      render();
    }
    status();
  } catch (error) {
    if (error.status === 404 && board === current) {
      board.role = "view";
      setTool("select");
      render();
      $("board-title").readOnly = true;
      $("notice").textContent = "O acesso a este quadro foi removido.";
      $("notice").hidden = false;
      status();
    }
  }
}
setInterval(syncBoard, 5000);
const id = new URLSearchParams(location.search).get("quadro");
if (!sessionStorage.getItem(sessionKey)) signIn();
else if (id && /^[0-9a-f-]{36}$/i.test(id)) loadBoard(id);
else library();
