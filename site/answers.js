const localStorageKey = "ai-hackathon-progress-current-user";
const productionApiBaseUrl = "https://REPLACE_WITH_YOUR_WORKER_URL";
const localApiBaseUrl = "http://127.0.0.1:8787";

const apiBaseUrl = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? localApiBaseUrl
  : productionApiBaseUrl;

const answerFieldMap = {
  whatIChanged: "answers-what-changed",
  whyIChangedIt: "answers-why-changed",
  visitorExperienceImprovement: "answers-visitor-experience",
  seoOrClarityImprovement: "answers-seo-clarity",
  howIUsedAI: "answers-ai-usage",
  whatToImproveNext: "answers-next-improvement"
};

const elements = {
  username: document.getElementById("answers-username"),
  loadButton: document.getElementById("load-answers"),
  saveButton: document.getElementById("save-answers"),
  refreshButton: document.getElementById("refresh-answers"),
  status: document.getElementById("answers-status"),
  list: document.getElementById("answers-list"),
  empty: document.getElementById("answers-empty")
};

let participants = [];

document.addEventListener("DOMContentLoaded", () => {
  init().catch(error => {
    showStatus(`Could not initialize answers page: ${error.message}`, "error");
  });
});

async function init() {
  hydrateUsernameFromQueryParam();
  hydrateUsernameFromLocalStorage();

  elements.loadButton.addEventListener("click", handleLoadAnswers);
  elements.saveButton.addEventListener("click", handleSaveAnswers);
  elements.refreshButton.addEventListener("click", refreshParticipants);

  await refreshParticipants();

  if (elements.username.value.trim()) {
    loadAnswersForUsername(elements.username.value.trim());
  }
}

function hydrateUsernameFromQueryParam() {
  const url = new URL(window.location.href);
  const rawUser = url.searchParams.get("user");

  if (!rawUser) {
    return;
  }

  elements.username.value = rawUser;
}

async function refreshParticipants() {
  const data = await fetchProgress();
  participants = Array.isArray(data.participants) ? data.participants : [];
  renderAnswersList(participants);
}

async function handleLoadAnswers() {
  const username = normaliseUsername(elements.username.value);
  elements.username.value = username;
  loadAnswersForUsername(username);
}

function loadAnswersForUsername(username) {
  const participant = participants.find(item => item.username === username);

  if (!participant) {
    applyAnswersToForm(buildEmptyAnswers());
    showStatus(`No saved answers found for @${username} yet.`, "error");
    return;
  }

  applyAnswersToForm(participant.answers || buildEmptyAnswers());
  showStatus(`Loaded answers for @${username}.`, "success");
}

async function handleSaveAnswers() {
  const username = normaliseUsername(elements.username.value);
  elements.username.value = username;

  const existing = participants.find(item => item.username === username);

  if (!existing) {
    showStatus(`No progress record found for @${username}. Submit progress first, then save answers.`, "error");
    return;
  }

  const payload = {
    username,
    repoUrl: existing.repoUrl || "",
    liveUrl: existing.liveUrl || "",
    completedSteps: Array.isArray(existing.completedSteps) ? existing.completedSteps : [],
    answers: readAnswersFromForm()
  };

  const response = await fetch(`${apiBaseUrl}/api/progress`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not save answers.");
  }

  participants = Array.isArray(data.participants) ? data.participants : [];
  renderAnswersList(participants);
  showStatus(`Saved answers for @${username}. Existing answers were overwritten.`, "success");
}

function renderAnswersList(rows) {
  elements.list.innerHTML = "";

  if (!rows.length) {
    elements.empty.hidden = false;
    return;
  }

  const withAnswers = rows.filter(participant => hasAnyAnswer(participant.answers));

  if (!withAnswers.length) {
    elements.empty.hidden = false;
    return;
  }

  elements.empty.hidden = true;

  withAnswers.forEach(participant => {
    const card = document.createElement("article");
    card.className = "answer-card";

    card.innerHTML = `
      <h3>@${participant.username}</h3>
      <p class="answer-meta">Updated: ${formatDate(participant.updatedAt)}</p>
      ${renderAnswerLine("1. What I changed", participant.answers.whatIChanged)}
      ${renderAnswerLine("2. Why I changed it", participant.answers.whyIChangedIt)}
      ${renderAnswerLine("3. How this improves the visitor experience", participant.answers.visitorExperienceImprovement)}
      ${renderAnswerLine("4. How this improves SEO or content clarity", participant.answers.seoOrClarityImprovement)}
      ${renderAnswerLine("5. How I used AI during the process", participant.answers.howIUsedAI)}
      ${renderAnswerLine("6. What I would improve next with more time", participant.answers.whatToImproveNext)}
    `;

    elements.list.appendChild(card);
  });
}

function renderAnswerLine(label, value) {
  const safeValue = value && value.trim() ? escapeHtml(value) : "-";
  return `<p><strong>${label}:</strong> ${safeValue}</p>`;
}

function buildEmptyAnswers() {
  return {
    whatIChanged: "",
    whyIChangedIt: "",
    visitorExperienceImprovement: "",
    seoOrClarityImprovement: "",
    howIUsedAI: "",
    whatToImproveNext: ""
  };
}

function readAnswersFromForm() {
  const answers = {};

  Object.entries(answerFieldMap).forEach(([field, elementId]) => {
    const input = document.getElementById(elementId);
    answers[field] = input ? input.value.trim() : "";
  });

  return answers;
}

function applyAnswersToForm(answers) {
  Object.entries(answerFieldMap).forEach(([field, elementId]) => {
    const input = document.getElementById(elementId);

    if (!input) {
      return;
    }

    input.value = answers[field] || "";
  });
}

function hasAnyAnswer(answers) {
  if (!answers || typeof answers !== "object") {
    return false;
  }

  return Object.values(answers).some(value => typeof value === "string" && value.trim().length > 0);
}

function normaliseUsername(username) {
  if (typeof username !== "string") {
    throw new Error("GitHub username is required.");
  }

  const clean = username.trim().toLowerCase().replace(/^@/, "");

  if (!clean) {
    throw new Error("GitHub username is required.");
  }

  if (!/^[a-z0-9-]+$/.test(clean)) {
    throw new Error("GitHub username may only contain letters, numbers, and hyphens.");
  }

  return clean;
}

function hydrateUsernameFromLocalStorage() {
  const raw = localStorage.getItem(localStorageKey);

  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed.username === "string") {
      elements.username.value = parsed.username;
    }
  } catch {
    // Ignore invalid local storage data.
  }
}

async function fetchProgress() {
  if (productionApiBaseUrl.includes("REPLACE") && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    throw new Error("Set productionApiBaseUrl in site/answers.js before deploying the frontend.");
  }

  const response = await fetch(`${apiBaseUrl}/api/progress?cacheBust=${Date.now()}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load participant answers.");
  }

  return data;
}

function showStatus(message, type) {
  elements.status.textContent = `${message} (API: ${apiBaseUrl})`;
  elements.status.classList.remove("status-success", "status-error");

  if (type === "success") {
    elements.status.classList.add("status-success");
  }

  if (type === "error") {
    elements.status.classList.add("status-error");
  }
}

function formatDate(dateString) {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
