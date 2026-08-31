const EMAIL_API_URL =
  "https://script.google.com/macros/s/AKfycbxQbrgEhVoGG8-V3tl6wZCAIgFewtix985ijIN-mrnVHlgsZnVSOtqLlGnY4pgAu31t/exec";

const STORAGE_KEY = "case_learning_hub_cases_v1";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function getCases() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setCases(cases) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  updateCaseCount();
}

function updateCaseCount() {
  $("#caseCount").textContent = getCases().length;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function setView(viewName) {
  $$(".view").forEach((view) => view.classList.remove("active"));
  $$(".tab").forEach((tab) => tab.classList.remove("active"));
  $(`#view-${viewName}`).classList.add("active");
  $(`.tab[data-view="${viewName}"]`).classList.add("active");

  if (viewName === "library") renderLibrary();
}

$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

$("#caseForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: new Date().toISOString(),
    title: $("#title").value.trim(),
    specialty: $("#specialty").value,
    ageBand: $("#ageBand").value,
    category: $("#category").value,
    summary: $("#summary").value.trim(),
    results: $("#results").value.trim(),
    learningPoint: $("#learningPoint").value.trim(),
    discussion: $("#discussion").value.trim()
  };

  const cases = getCases();
  cases.unshift(item);
  setCases(cases);
  event.target.reset();
  showToast("Case saved in this browser.");
});

$("#clearForm").addEventListener("click", () => {
  $("#caseForm").reset();
});

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function renderLibrary() {
  const cases = getCases();
  const container = $("#caseLibrary");

  if (!cases.length) {
    container.innerHTML = `<div class="empty">No cases saved yet.</div>`;
    return;
  }

  container.innerHTML = cases.map((item) => `
    <article class="case-item">
      <h4>${escapeHtml(item.title)}</h4>
      <div class="case-meta">
        ${escapeHtml(item.specialty || "Unspecified")}
        ${item.ageBand ? ` · ${escapeHtml(item.ageBand)}` : ""}
        · ${new Date(item.createdAt).toLocaleString()}
      </div>
      <p><strong>Clinical summary:</strong> ${escapeHtml(item.summary)}</p>
      ${item.results ? `<p><strong>Key results:</strong> ${escapeHtml(item.results)}</p>` : ""}
      <p><strong>Learning point:</strong> ${escapeHtml(item.learningPoint)}</p>
      ${item.discussion ? `<p><strong>Discussion:</strong> ${escapeHtml(item.discussion)}</p>` : ""}
      <div class="case-actions">
        <button class="ghost-button danger" data-delete="${item.id}" type="button">Delete</button>
      </div>
    </article>
  `).join("");

  $$("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const updated = getCases().filter((item) => item.id !== button.dataset.delete);
      setCases(updated);
      renderLibrary();
      showToast("Case deleted.");
    });
  });
}

$("#exportCases").addEventListener("click", () => {
  const data = JSON.stringify(getCases(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `case-learning-hub-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

function validInstitutionalEmail(email) {
  const value = email.trim().toLowerCase();
  return value.endsWith("@uct.ac.za") || value.endsWith("@myuct.ac.za");
}

$("#sendInvite").addEventListener("click", async () => {
  const email = $("#inviteEmail").value.trim();
  const subject = $("#inviteSubject").value.trim() || "Case Learning Hub";
  const message = $("#inviteMessage").value.trim();

  if (!validInstitutionalEmail(email)) {
    $("#emailStatus").textContent = "Please use a UCT or myUCT email address.";
    return;
  }

  if (!message) {
    $("#emailStatus").textContent = "Please enter a message.";
    return;
  }

  const button = $("#sendInvite");
  button.disabled = true;
  button.textContent = "Sending…";
  $("#emailStatus").textContent = "";

  try {
    const response = await fetch(EMAIL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({ email, subject, message })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Email failed to send.");
    }

    $("#emailStatus").textContent = "Email sent.";
    showToast("Email sent.");
  } catch (error) {
    console.error(error);
    $("#emailStatus").textContent = "Email could not be sent. Check the Apps Script deployment.";
  } finally {
    button.disabled = false;
    button.textContent = "Send email";
  }
});

$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("case_learning_hub_theme", document.body.classList.contains("dark") ? "dark" : "light");
});

if (localStorage.getItem("case_learning_hub_theme") === "dark") {
  document.body.classList.add("dark");
}

updateCaseCount();
