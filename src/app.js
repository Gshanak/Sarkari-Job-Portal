// src/app.js

document.addEventListener("DOMContentLoaded", initApp);

let sources = [];
let savedJobs = [];

/* =========================
   INIT
========================= */
function initApp() {
  seedDefaultSource();
  loadState();
  wireUI();
  renderHome();
}

/* =========================
   STATE
========================= */
function seedDefaultSource() {
  if (!localStorage.getItem("sources")) {
    localStorage.setItem(
      "sources",
      JSON.stringify([
        {
          name: "Sarkari Result",
          url: "https://www.sarkariresult.com/rss.xml"
        }
      ])
    );
  }
}

function loadState() {
  sources = JSON.parse(localStorage.getItem("sources") || "[]");
  savedJobs = JSON.parse(localStorage.getItem("savedJobs") || "[]");
}

/* =========================
   UI WIRING
========================= */
function wireUI() {
  document.getElementById("addSourceBtn").onclick = addSourcePrompt;

  document.getElementById("tab-home").onclick = () => switchView("home");
  document.getElementById("tab-sources").onclick = () => switchView("sources");
  document.getElementById("tab-saved").onclick = () => switchView("saved");
  document.getElementById("tab-settings").onclick = () => switchView("settings");
}

/* =========================
   VIEW SWITCHING
========================= */
function switchView(view) {
  hideAllViews();
  deactivateTabs();

  document.getElementById(`view-${view}`).classList.remove("hidden");
  document.getElementById(`tab-${view}`).classList.add("active");

  if (view === "home") renderHome();
  if (view === "sources") renderSources();
  if (view === "saved") renderSaved();
}

function hideAllViews() {
  ["home", "sources", "saved", "settings"].forEach(v => {
    document.getElementById(`view-${v}`).classList.add("hidden");
  });
}

function deactivateTabs() {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
}

/* =========================
   HOME / JOBS
========================= */
function renderHome() {
  const loader = document.getElementById("loader");
  const jobList = document.getElementById("jobList");
  const empty = document.getElementById("emptyState");

  jobList.innerHTML = "";
  empty.classList.add("hidden");

  if (sources.length === 0) {
    empty.classList.remove("hidden");
    return;
  }

  loader.classList.remove("hidden");

  // Mock jobs (replace with real fetch later)
  setTimeout(() => {
    loader.classList.add("hidden");

    const jobs = [
      { title: "SSC GD Constable", source: "Sarkari Result" },
      { title: "UPSC Civil Services", source: "Sarkari Result" }
    ];

    jobs.forEach(job => {
      const div = document.createElement("div");
      div.innerHTML = `
        <strong>${job.title}</strong><br/>
        <small>${job.source}</small><br/>
        <button>Save</button>
        <hr/>
      `;
      div.querySelector("button").onclick = () => saveJob(job);
      jobList.appendChild(div);
    });
  }, 800);
}

/* =========================
   SOURCES
========================= */
function renderSources() {
  const list = document.getElementById("sourcesList");
  list.innerHTML = "";

  if (sources.length === 0) {
    list.innerHTML = "No sources added.";
    return;
  }

  sources.forEach((s, i) => {
    const div = document.createElement("div");
    div.innerHTML = `
      ${s.name}<br/>
      <small>${s.url}</small><br/>
      <button>Delete</button>
      <hr/>
    `;
    div.querySelector("button").onclick = () => deleteSource(i);
    list.appendChild(div);
  });
}

function addSourcePrompt() {
  const name = prompt("Source name:");
  const url = prompt("Source RSS URL:");

  if (!name || !url) return;

  sources.push({ name, url });
  localStorage.setItem("sources", JSON.stringify(sources));
  renderSources();
}

function deleteSource(index) {
  sources.splice(index, 1);
  localStorage.setItem("sources", JSON.stringify(sources));
  renderSources();
}

/* =========================
   SAVED JOBS
========================= */
function saveJob(job) {
  savedJobs.push(job);
  localStorage.setItem("savedJobs", JSON.stringify(savedJobs));
}

function renderSaved() {
  const list = document.getElementById("savedJobsList");
  list.innerHTML = "";

  if (savedJobs.length === 0) {
    list.innerHTML = "No saved jobs.";
    return;
  }

  savedJobs.forEach(j => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${j.title}</strong><br/>
      <small>${j.source}</small>
      <hr/>
    `;
    list.appendChild(div);
  });
}

/* =========================
   NOTIFICATIONS (INIT ONLY)
========================= */
if (window.Capacitor && Capacitor.Plugins) {
  const { PushNotifications } = Capacitor.Plugins;
  PushNotifications.requestPermissions();
  PushNotifications.register();
}
