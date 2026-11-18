const panel = document.querySelector("#apple-sync");
const status = panel.querySelector("[role=status]");
const links = panel.querySelector("#sync-links");
const api = (await (await fetch("./app-config.json")).json()).apiBaseUrl;
const session = sessionStorage.getItem("house-tasks-session");
let reminders;
async function change(method) {
  if (!session) { location.assign("./"); return; }
  if (method === "POST" && !confirm("Gerar novos links pessoais? Os links anteriores deixarão de funcionar.")) return;
  const buttons = panel.querySelectorAll("button");
  buttons.forEach(b => b.disabled = true);
  try {
    const response = await fetch(api+"/api/notifications/apple",{method,headers:{Authorization:"Bearer "+session}});
    if (!response.ok) throw Error(response.status===401?"Entre novamente no House Tasks.":"Não foi possível alterar a assinatura.");
    const result = await response.json();
    links.hidden = method === "DELETE";
    reminders = result.reminders;
    panel.querySelector("#subscribe").href = result.calendar?.replace(/^https:/,"webcal:") || "";
    status.textContent = method === "DELETE" ? "Acesso dos links revogado." : "Links gerados. Use-os somente nos seus aparelhos.";
  } catch (error) { status.textContent = error.message; }
  finally { buttons.forEach(b => b.disabled = false); }
}
panel.querySelector("#generate").onclick = () => change("POST");
panel.querySelector("#revoke").onclick = () => change("DELETE");
panel.querySelector("#copy-reminders").onclick = async () => {
  try { await navigator.clipboard.writeText(reminders); status.textContent = "Link copiado para configurar o atalho."; }
  catch { prompt("Copie seu link pessoal",reminders); }
};
