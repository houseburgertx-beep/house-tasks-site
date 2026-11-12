const id = new URLSearchParams(location.search).get("tarefa");
const token = sessionStorage.getItem("house-tasks-session");
const status = document.getElementById("task-status");

function signIn() {
  sessionStorage.removeItem("house-tasks-session");
  sessionStorage.setItem("house-notification-return", location.pathname + "?tarefa=" + id);
  location.replace("./");
}

if (!id || !/^[a-f0-9-]{36}$/i.test(id)) {
  status.textContent = "Link de tarefa inválido.";
} else if (!token) {
  signIn();
} else {
  try {
    const config = await fetch("./app-config.json").then(response => response.json());
    const result = await fetch(config.apiBaseUrl + "/api/notifications/tasks/" + encodeURIComponent(id), {
      headers: { Authorization: "Bearer " + token }, cache: "no-store",
    });
    if (result.status === 401) signIn();
    else {
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || "Não foi possível abrir a tarefa.");
      const { task } = data;
      document.getElementById("task-title").textContent = task.title;
      status.textContent = { todo: "A fazer", doing: "Em andamento", review: "Para aprovar", done: "Concluída" }[task.status] || "Tarefa atribuída";
      document.getElementById("task-due").textContent = task.due
        ? "Prazo " + task.due.split("-").reverse().join("/") : "Sem prazo definido";
    }
  } catch (error) {
    status.textContent = error.message || "Não foi possível abrir a tarefa.";
  }
}
