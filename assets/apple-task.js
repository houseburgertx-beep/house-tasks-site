const shortcutName = "House Tasks — Lembrete";
const encoder = new TextEncoder();

function taskLink(task) {
  const url = new URL("../", import.meta.url);
  url.searchParams.set("tarefa", task.id);
  return url.href;
}

function calendarText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\r\n?|\n/g, "\\n").replace(/[,;]/g, "\\$&");
}

function foldLine(line) {
  const parts = [""];
  let bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      parts.push(" ");
      bytes = 1;
    }
    parts[parts.length - 1] += character;
    bytes += size;
  }
  return parts.join("\r\n");
}

export function taskCalendar(task, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(task.due ?? "")) return null;
  const day = new Date(task.due + "T00:00:00Z");
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== task.due) return null;
  day.setUTCDate(day.getUTCDate() + 1);
  const next = day.toISOString().slice(0, 10).replaceAll("-", "");
  const url = taskLink(task);
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Grupo House190//House Tasks//PT",
    "BEGIN:VEVENT",
    "UID:" + encodeURIComponent(task.id) + "@house-tasks",
    "DTSTAMP:" + now.toISOString().replace(/[-:]|\.\d{3}/g, ""),
    "DTSTART;VALUE=DATE:" + task.due.replaceAll("-", ""),
    "DTEND;VALUE=DATE:" + next,
    "SUMMARY:" + calendarText(task.title),
    "DESCRIPTION:" + calendarText(url),
    "URL:" + url,
    "END:VEVENT", "END:VCALENDAR", ""
  ].map(foldLine).join("\r\n");
}

export function downloadTaskCalendar(task) {
  const content = taskCalendar(task);
  if (!content) return;
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "house-task.ics";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function taskReminderLink(task, time) {
  const payload = JSON.stringify({
    titulo: task.title,
    quando: task.due + "T" + time + ":00",
    link: taskLink(task)
  });
  return "shortcuts://run-shortcut?name=" + encodeURIComponent(shortcutName)
    + "&input=text&text=" + encodeURIComponent(payload);
}
