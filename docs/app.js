const schedule = [
  {
    id: "intro",
    time: "15 min",
    activity: "AI Hackathon introduction",
    outcome: "Shared mindset and rules of the game"
  },
  {
    id: "setup-check",
    time: "20 min",
    activity: "Setup check",
    outcome: "GitHub, Claude, ChatGPT and Copilot access checked"
  },
  {
    id: "publish-starter-site",
    time: "30 min",
    activity: "Publish starter site",
    outcome: "Everyone gets a basic live URL early"
  },
  {
    id: "analyse-brief",
    time: "30 min",
    activity: "Analyse the brief",
    outcome: "Participants understand audience, goal and scope"
  },
  {
    id: "ai-plan-mode",
    time: "30 min",
    activity: "AI plan mode",
    outcome: "AI helps create a practical build plan"
  },
  {
    id: "requirements",
    time: "30 min",
    activity: "Requirements",
    outcome: "AI helps create lightweight requirements and acceptance criteria"
  },
  {
    id: "ux-ci-direction",
    time: "30 min",
    activity: "UX and CI direction",
    outcome: "Participants shape the design using brand/CI material"
  },
  {
    id: "build-with-ai",
    time: "60 min",
    activity: "Build with AI",
    outcome: "AI generates code; participants review, copy, edit and publish"
  },
  {
    id: "clean-up-test",
    time: "30 min",
    activity: "Clean up and test",
    outcome: "Mobile check, copy check, SEO basics, Lighthouse quick check"
  },
  {
    id: "founder-judging",
    time: "30 min",
    activity: "Founder judging",
    outcome: "L and G review demos and choose standouts"
  }
];

const localStorageKey = "ai-hackathon-progress-current-user";
const productionApiBaseUrl = "https://REPLACE_WITH_YOUR_WORKER_URL";
const localApiBaseUrl = "http://127.0.0.1:8787";
const leaderboardRefreshMs = 30 * 60 * 1000;

const apiBaseUrl = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? localApiBaseUrl
  : productionApiBaseUrl;

const elements = {
  form: document.getElementById("participant-form"),
  username: document.getElementById("username"),
  repoUrl: document.getElementById("repoUrl"),
  liveUrl: document.getElementById("liveUrl"),
  checklist: document.getElementById("checklist"),
  progressSummary: document.getElementById("progress-summary"),
  submitButton: document.getElementById("submit-progress"),
  refreshButton: document.getElementById("refresh-progress"),
  statusMessage: document.getElementById("status-message"),
  syncStatus: document.getElementById("sync-status"),
  leaderboardBody: document.getElementById("leaderboard-body"),
  leaderboardEmpty: document.getElementById("leaderboard-empty"),
  roomProgressBody: document.getElementById("room-progress-body"),
  roomProgressEmpty: document.getElementById("room-progress-empty")
};

const state = {
  completedSteps: [],
  participants: []
};

document.addEventListener("DOMContentLoaded", () => {
  init().catch(error => {
    showStatus(`Could not initialize tracker: ${error.message}`, "error");
  });
});

async function init() {
  renderSchedule();
  hydrateFromLocalStorage();
  renderProgressSummary();

  elements.form.addEventListener("input", () => {
    saveCurrentUserToLocalStorage(buildProgressPayload());
  });

  elements.submitButton.addEventListener("click", handleSubmitProgress);
  elements.refreshButton.addEventListener("click", () => {
    refreshSharedProgress();
  });

  await refreshSharedProgress();
  window.setInterval(() => {
    refreshSharedProgress({ quiet: true });
  }, leaderboardRefreshMs);
}

async function refreshSharedProgress(options = {}) {
  const quiet = Boolean(options.quiet);

  try {
    const data = await loadProgress();
    state.participants = Array.isArray(data.participants) ? data.participants : [];
    renderLeaderboard(state.participants);
    renderRoomProgressOverview(state.participants);
    showSyncStatus(`Live sync active. Last updated ${new Date().toLocaleTimeString()}.`, "ok");
  } catch (error) {
    if (!quiet) {
      showStatus(`Could not load shared leaderboard data: ${error.message}`, "error");
    }

    showSyncStatus(`Live sync unavailable: ${error.message}`, "error");
  }
}

async function loadProgress() {
  if (productionApiBaseUrl.includes("REPLACE") && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    throw new Error("Set productionApiBaseUrl in docs/app.js before deploying the frontend.");
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
    throw new Error(data.error || "Could not load progress data.");
  }

  return data;
}

function renderSchedule() {
  elements.checklist.innerHTML = "";

  schedule.forEach(item => {
    const listItem = document.createElement("li");
    listItem.className = "checklist-item";
    listItem.dataset.stepId = item.id;

    const isComplete = state.completedSteps.includes(item.id);

    listItem.innerHTML = `
      <div class="checklist-row">
        <input
          id="step-${item.id}"
          type="checkbox"
          data-step-id="${item.id}"
          ${isComplete ? "checked" : ""}
          aria-label="Mark ${item.activity} as complete"
        />
        <div>
          <p class="item-title">${item.activity}</p>
          <p class="item-meta">${item.time}</p>
          <p class="item-outcome">${item.outcome}</p>
          <p class="item-state">${isComplete ? "Complete" : "Not complete"}</p>
        </div>
      </div>
    `;

    if (isComplete) {
      listItem.classList.add("is-complete");
    }

    const checkbox = listItem.querySelector("input[type='checkbox']");
    checkbox.addEventListener("change", handleChecklistChange);
    elements.checklist.appendChild(listItem);
  });
}

function renderLeaderboard(participants) {
  elements.leaderboardBody.innerHTML = "";

  if (!participants.length) {
    elements.leaderboardEmpty.hidden = false;
    return;
  }

  elements.leaderboardEmpty.hidden = true;

  participants.forEach((participant, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>@${participant.username}</td>
      <td>${participant.completedSteps.length} / ${schedule.length}</td>
      <td>${renderLinkOrDash(participant.repoUrl, "Repo")}</td>
      <td>${renderLinkOrDash(participant.liveUrl, "Live")}</td>
      <td>${formatDate(participant.updatedAt)}</td>
    `;
    elements.leaderboardBody.appendChild(row);
  });
}

function renderRoomProgressOverview(participants) {
  elements.roomProgressBody.innerHTML = "";

  if (!participants.length) {
    elements.roomProgressEmpty.hidden = false;
    return;
  }

  elements.roomProgressEmpty.hidden = true;

  schedule.forEach(item => {
    const completedBy = participants.filter(participant => participant.completedSteps.includes(item.id)).length;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.activity}</td>
      <td>${completedBy} / ${participants.length}</td>
    `;
    elements.roomProgressBody.appendChild(row);
  });
}

function handleChecklistChange(event) {
  const stepId = event.target.dataset.stepId;

  if (!stepId) {
    return;
  }

  if (event.target.checked) {
    if (!state.completedSteps.includes(stepId)) {
      state.completedSteps.push(stepId);
    }
  } else {
    state.completedSteps = state.completedSteps.filter(id => id !== stepId);
  }

  state.completedSteps = [...new Set(state.completedSteps)];
  renderSchedule();
  renderProgressSummary();
  saveCurrentUserToLocalStorage(buildProgressPayload());
}

async function handleSubmitProgress() {
  const payload = buildProgressPayload();
  const validation = validateFormState(payload);

  if (!validation.isValid) {
    showStatus(validation.message, "error");
    return;
  }

  try {
    elements.submitButton.disabled = true;

    const response = await fetch(`${apiBaseUrl}/api/progress`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(validation.payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not save progress.");
    }

    state.participants = Array.isArray(data.participants) ? data.participants : [];
    renderLeaderboard(state.participants);
    renderRoomProgressOverview(state.participants);
    saveCurrentUserToLocalStorage(validation.payload);
    showStatus("Progress saved to the shared leaderboard.", "success");
    showSyncStatus(`Live sync active. Last updated ${new Date().toLocaleTimeString()}.`, "ok");
  } catch (error) {
    showStatus(`Could not save progress: ${error.message}`, "error");
  } finally {
    elements.submitButton.disabled = false;
  }
}

function buildProgressPayload() {
  return {
    username: elements.username.value,
    repoUrl: elements.repoUrl.value,
    liveUrl: elements.liveUrl.value,
    completedSteps: [...state.completedSteps]
  };
}

function validateFormState(formState) {
  try {
    const username = normaliseUsername(formState.username);
    const repoUrl = validateOptionalUrl(formState.repoUrl);
    const liveUrl = validateOptionalUrl(formState.liveUrl);
    const validSteps = new Set(schedule.map(item => item.id));
    const completedSteps = Array.isArray(formState.completedSteps)
      ? [...new Set(formState.completedSteps)].filter(stepId => validSteps.has(stepId))
      : [];

    return {
      isValid: true,
      payload: {
        username,
        repoUrl,
        liveUrl,
        completedSteps
      }
    };
  } catch (error) {
    return {
      isValid: false,
      message: error.message,
      payload: null
    };
  }
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

function validateOptionalUrl(value) {
  if (!value) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error("Optional URLs must be text values.");
  }

  const clean = value.trim();

  if (!clean) {
    return "";
  }

  if (!/^https?:\/\//i.test(clean)) {
    throw new Error("Optional URLs must start with http:// or https://");
  }

  return clean;
}

function saveCurrentUserToLocalStorage(payload) {
  const validation = validateFormState(payload);

  if (!validation.isValid) {
    return;
  }

  localStorage.setItem(localStorageKey, JSON.stringify(validation.payload));
}

function loadCurrentUserFromLocalStorage() {
  const raw = localStorage.getItem(localStorageKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    const validation = validateFormState(parsed);
    return validation.isValid ? validation.payload : null;
  } catch {
    return null;
  }
}

function hydrateFromLocalStorage() {
  const saved = loadCurrentUserFromLocalStorage();

  if (!saved) {
    return;
  }

  elements.username.value = saved.username;
  elements.repoUrl.value = saved.repoUrl;
  elements.liveUrl.value = saved.liveUrl;
  state.completedSteps = [...saved.completedSteps];
  renderSchedule();
}

function calculateProgress(completedSteps) {
  const completedCount = completedSteps.length;
  const total = schedule.length;
  const percent = total ? Math.round((completedCount / total) * 100) : 0;

  return {
    completedCount,
    total,
    percent
  };
}

function renderProgressSummary() {
  const progress = calculateProgress(state.completedSteps);
  elements.progressSummary.textContent = `Progress: ${progress.completedCount} / ${progress.total} complete (${progress.percent}% complete)`;
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

function showStatus(message, type) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.remove("status-success", "status-error");

  if (type === "success") {
    elements.statusMessage.classList.add("status-success");
  }

  if (type === "error") {
    elements.statusMessage.classList.add("status-error");
  }
}

function showSyncStatus(message, type) {
  if (!elements.syncStatus) {
    return;
  }

  elements.syncStatus.textContent = message;
  elements.syncStatus.classList.remove("is-ok", "is-error");

  if (type === "ok") {
    elements.syncStatus.classList.add("is-ok");
  }

  if (type === "error") {
    elements.syncStatus.classList.add("is-error");
  }
}

function renderLinkOrDash(url, label) {
  if (!url) {
    return "-";
  }

  return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}
