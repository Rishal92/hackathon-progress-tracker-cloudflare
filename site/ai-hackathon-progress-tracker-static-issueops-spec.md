# AI Hackathon Progress Tracker — Static Netlify + GitHub IssueOps Spec

## 1. Purpose

Build a small static website for the AI Hackathon that tracks participant progress through the event schedule.

The site must be hosted on Netlify and must use only:

- HTML
- CSS
- JavaScript
- A static JSON file in the repository
- GitHub Issues
- GitHub Actions

Do **not** use:

- Netlify Functions
- Express
- Node backend APIs
- Supabase
- Firebase
- External databases
- Authentication
- Event PINs
- GitHub OAuth
- Any frontend framework

The goal is to keep the participant-facing experience extremely simple while still allowing progress to be written back into the GitHub repository.

---

## 2. Important Technical Constraint

A static website running in the browser cannot safely write directly to a file in a GitHub repository.

Do **not** put a GitHub token in frontend JavaScript.

Instead, use this static-safe flow:

```text
Participant browser
  ↓
Static Netlify website
  ↓
Prefilled GitHub Issue URL
  ↓
Participant submits issue on GitHub
  ↓
GitHub Action reads issue body
  ↓
GitHub Action updates data/progress.json
  ↓
GitHub commits the updated file
  ↓
Netlify redeploys automatically from GitHub
  ↓
Leaderboard updates from data/progress.json
```

This is an IssueOps-style workflow.

The participant experience should still feel simple:

1. Enter GitHub username.
2. Tick progress.
3. Click `Submit progress`.
4. GitHub opens with a prefilled issue.
5. Participant clicks `Submit new issue`.
6. The GitHub Action processes it and updates the shared JSON file.

---

## 3. Recommended Repository Structure

```text
/
├── index.html
├── styles.css
├── app.js
├── data/
│   └── progress.json
├── scripts/
│   └── update-progress-from-issue.js
├── .github/
│   └── workflows/
│       └── update-progress.yml
├── netlify.toml
└── README.md
```

---

## 4. Core Requirements

The site must:

- Let a participant enter their GitHub username.
- Let a participant optionally enter their GitHub repository URL.
- Let a participant optionally enter their live GitHub pages site URL.
- Show the full hackathon schedule.
- Let a participant tick completed activities.
- Show their current progress count and percentage.
- Show a shared leaderboard based on `data/progress.json`.
- Show a room progress overview by activity.
- Generate a prefilled GitHub issue containing the participant's progress.
- Rely on GitHub Actions to update `data/progress.json`.
- Be beginner-friendly and projector-friendly.
- Work on desktop and mobile.

---

## 5. Hackathon Schedule

Use this schedule as the source of truth in `app.js`.

```js
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
```

---

## 6. Static Progress Data File

Create:

```text
data/progress.json
```

Initial contents:

```json
{
  "participants": []
}
```

Example populated file:

```json
{
  "participants": [
    {
      "username": "rishdev",
      "repoUrl": "https://github.com/example/hackathon-rishdev",
      "liveUrl": "https://rishdev-hackathon.pages.app",
      "completedSteps": [
        "intro",
        "setup-check",
        "publish-starter-site"
      ],
      "createdAt": "2026-05-27T10:00:00.000Z",
      "updatedAt": "2026-05-27T11:15:00.000Z"
    }
  ]
}
```

---

## 7. Frontend Page Requirements

### 7.1 Page sections

The page should contain:

1. Hero section
2. Participant details form
3. Progress checklist
4. Progress summary
5. Submit progress section
6. Leaderboard
7. Room progress overview
8. Footer

---

### 7.2 Hero section

Content:

```text
AI Hackathon Progress Tracker
Track your progress, publish early, and keep building with AI.
```

Add a small badge:

```text
Hosted on GitHub Pages
```

---

### 7.3 Participant form

Fields:

| Field | Required | Notes |
|---|---:|---|
| GitHub username | Yes | Used as the participant identifier |
| GitHub repository URL | No | Link to their GitHub repo |
| Live site URL | No | Link to their deployed site on github pages |

Validation rules:

- GitHub username is required.
- Trim whitespace.
- Convert to lowercase.
- Remove a leading `@` if supplied.
- Only allow letters, numbers, and hyphens.
- Optional URLs may be blank.
- If optional URLs are supplied, they must start with `http://` or `https://`.

---

### 7.4 Progress checklist

For each schedule item, show:

- Checkbox
- Activity name
- Time
- Outcome
- Completion state

When a checkbox changes:

- Update progress count immediately.
- Update progress percentage immediately.
- Save the current participant state to `localStorage`.
- Do not update the shared JSON file directly.

Example display:

```text
Progress: 4 / 10 complete
40% complete
```

---

### 7.5 Local persistence

Use `localStorage` so a participant does not lose their ticked progress when refreshing the page.

Suggested localStorage key:

```text
ai-hackathon-progress-current-user
```

Store:

```json
{
  "username": "rishdev",
  "repoUrl": "https://github.com/example/hackathon-rishdev",
  "liveUrl": "https://rishdev-hackathon.pages.app",
  "completedSteps": ["intro", "setup-check"]
}
```

---

## 8. Submitting Progress Without Netlify Functions

Because there is no backend, the frontend must not attempt to update `data/progress.json` directly.

Instead, create a prefilled GitHub Issue URL.

### 8.1 Required button

Use this button label:

```text
Submit progress to leaderboard
```

### 8.2 Button behaviour

When clicked:

1. Validate the participant form.
2. Build a progress payload object.
3. Encode the payload inside the GitHub issue body.
4. Open a new browser tab to create a GitHub issue.
5. The participant manually clicks `Submit new issue` on GitHub.
6. A GitHub Action processes the issue.

---

## 9. GitHub Issue Format

The frontend must generate a GitHub issue with:

### Issue title

```text
Progress update: @<username>
```

Example:

```text
Progress update: @rishdev
```

### Issue body

Use this exact structure so the GitHub Action can parse it reliably:

```md
## AI Hackathon Progress Update

Participant progress submitted from the static Netlify tracker.

<!-- progress-payload:start -->
```json
{
  "username": "rishdev",
  "repoUrl": "https://github.com/example/hackathon-rishdev",
  "liveUrl": "https://rishdev-hackathon.page.app",
  "completedSteps": [
    "intro",
    "setup-check"
  ]
}
```
<!-- progress-payload:end -->

Please do not edit the JSON block manually unless you know what you are doing.
```

Important:

- The action should parse only the JSON between:
  - `<!-- progress-payload:start -->`
  - `<!-- progress-payload:end -->`
- The action should ignore all other issue content.

---

## 10. GitHub Issue URL Generation

In `app.js`, add a function like:

```js
function buildGitHubIssueUrl(payload) {
  const owner = "REPLACE_WITH_GITHUB_OWNER_OR_ORG";
  const repo = "REPLACE_WITH_REPO_NAME";

  const title = `Progress update: @${payload.username}`;

  const body = [
    "## AI Hackathon Progress Update",
    "",
    "Participant progress submitted from the static Netlify tracker.",
    "",
    "<!-- progress-payload:start -->",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
    "<!-- progress-payload:end -->",
    "",
    "Please do not edit the JSON block manually unless you know what you are doing."
  ].join("\n");

  const params = new URLSearchParams({
    title,
    body,
    labels: "progress-update"
  });

  return `https://github.com/${owner}/${repo}/issues/new?${params.toString()}`;
}
```

When the user clicks submit:

```js
const issueUrl = buildGitHubIssueUrl(payload);
window.open(issueUrl, "_blank", "noopener,noreferrer");
```

Also show an instruction message:

```text
GitHub has opened in a new tab. Please click "Submit new issue" to send your progress to the leaderboard.
```

---

## 11. Loading Shared Progress

The frontend should load shared progress from:

```text
/data/progress.json
```

Use cache-busting to reduce stale reads:

```js
async function loadProgress() {
  const response = await fetch(`/data/progress.json?cacheBust=${Date.now()}`);

  if (!response.ok) {
    throw new Error("Could not load progress data.");
  }

  return response.json();
}
```

Note:

- The leaderboard updates after GitHub Action commits the file and Netlify redeploys.
- This may not be instant.
- Show a note in the UI explaining that leaderboard updates may take a short while after submitting.

Suggested UI note:

```text
Leaderboard updates after GitHub processes your progress and Netlify redeploys the site.
```

---

## 12. Leaderboard Requirements

Render participants from `data/progress.json`.

Sort participants by:

1. Most completed steps first
2. Most recently updated second
3. Username alphabetically third

Display:

| Rank | Participant | Progress | Repo | Live Site | Last Updated |
|---:|---|---:|---|---|---|

Rules:

- Display usernames as `@username`.
- Display progress as `x / 10`.
- If repo URL exists, show link text `Repo`.
- If live URL exists, show link text `Live`.
- If a URL does not exist, show `—`.
- Show a readable updated date.
- Highlight the top 3 participants visually.

---

## 13. Room Progress Overview

Add a section that shows completion counts per activity.

Example:

| Activity | Completed By |
|---|---:|
| AI Hackathon introduction | 6 / 6 |
| Setup check | 5 / 6 |
| Publish starter site | 4 / 6 |

Implementation:

- Count total participants from `data.progress.json`.
- For each schedule item, count how many participants have that step ID in `completedSteps`.

If there are no participants yet, show:

```text
No participant progress has been submitted yet.
```

---

## 14. GitHub Action Workflow

Create:

```text
.github/workflows/update-progress.yml
```

Workflow:

```yaml
name: Update hackathon progress

on:
  issues:
    types:
      - opened
      - edited

permissions:
  contents: write
  issues: write

jobs:
  update-progress:
    if: contains(github.event.issue.labels.*.name, 'progress-update')
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Update progress JSON from issue
        env:
          ISSUE_BODY: ${{ github.event.issue.body }}
          ISSUE_NUMBER: ${{ github.event.issue.number }}
          ISSUE_AUTHOR: ${{ github.event.issue.user.login }}
        run: node scripts/update-progress-from-issue.js

      - name: Commit progress update
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

          if git diff --quiet; then
            echo "No progress changes to commit."
            exit 0
          fi

          git add data/progress.json
          git commit -m "Update hackathon progress from issue #${{ github.event.issue.number }}"
          git push

      - name: Comment on issue
        if: success()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: "✅ Progress has been processed and committed to `data/progress.json`. The Netlify leaderboard should update after the next deploy."
            })

      - name: Close issue
        if: success()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.update({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              state: "closed"
            })
```

---

## 15. Progress Update Script

Create:

```text
scripts/update-progress-from-issue.js
```

Script:

```js
const fs = require("fs");
const path = require("path");

const progressFilePath = path.join(process.cwd(), "data", "progress.json");

const allowedStepIds = new Set([
  "intro",
  "setup-check",
  "publish-starter-site",
  "analyse-brief",
  "ai-plan-mode",
  "requirements",
  "ux-ci-direction",
  "build-with-ai",
  "clean-up-test",
  "founder-judging"
]);

function main() {
  const issueBody = process.env.ISSUE_BODY || "";

  const payload = extractPayload(issueBody);
  const validatedPayload = validatePayload(payload);

  const currentData = readProgressFile();
  const updatedData = upsertParticipant(currentData, validatedPayload);

  writeProgressFile(updatedData);

  console.log(`Updated progress for @${validatedPayload.username}`);
}

function extractPayload(issueBody) {
  const startMarker = "<!-- progress-payload:start -->";
  const endMarker = "<!-- progress-payload:end -->";

  const startIndex = issueBody.indexOf(startMarker);
  const endIndex = issueBody.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("Could not find progress payload markers in issue body.");
  }

  const rawBlock = issueBody
    .slice(startIndex + startMarker.length, endIndex)
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(rawBlock);
  } catch (error) {
    throw new Error(`Invalid JSON payload: ${error.message}`);
  }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload must be an object.");
  }

  const username = normaliseUsername(payload.username);

  if (!username) {
    throw new Error("Username is required.");
  }

  const repoUrl = validateOptionalUrl(payload.repoUrl, "repoUrl");
  const liveUrl = validateOptionalUrl(payload.liveUrl, "liveUrl");

  const completedSteps = Array.isArray(payload.completedSteps)
    ? payload.completedSteps
    : [];

  const cleanCompletedSteps = [...new Set(completedSteps)]
    .filter(stepId => allowedStepIds.has(stepId));

  return {
    username,
    repoUrl,
    liveUrl,
    completedSteps: cleanCompletedSteps
  };
}

function normaliseUsername(username) {
  if (typeof username !== "string") {
    return "";
  }

  const clean = username.trim().toLowerCase().replace(/^@/, "");

  if (!/^[a-z0-9-]+$/.test(clean)) {
    throw new Error("Username may only contain letters, numbers, and hyphens.");
  }

  return clean;
}

function validateOptionalUrl(value, fieldName) {
  if (!value) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }

  const clean = value.trim();

  if (!clean) {
    return "";
  }

  if (!/^https?:\/\//i.test(clean)) {
    throw new Error(`${fieldName} must start with http:// or https://`);
  }

  return clean;
}

function readProgressFile() {
  if (!fs.existsSync(progressFilePath)) {
    return { participants: [] };
  }

  const raw = fs.readFileSync(progressFilePath, "utf8");

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.participants)) {
      return { participants: [] };
    }

    return parsed;
  } catch {
    return { participants: [] };
  }
}

function upsertParticipant(currentData, payload) {
  const now = new Date().toISOString();

  const participants = Array.isArray(currentData.participants)
    ? currentData.participants
    : [];

  const existingIndex = participants.findIndex(
    participant => participant.username === payload.username
  );

  if (existingIndex >= 0) {
    const existing = participants[existingIndex];

    participants[existingIndex] = {
      ...existing,
      username: payload.username,
      repoUrl: payload.repoUrl,
      liveUrl: payload.liveUrl,
      completedSteps: payload.completedSteps,
      createdAt: existing.createdAt || now,
      updatedAt: now
    };
  } else {
    participants.push({
      username: payload.username,
      repoUrl: payload.repoUrl,
      liveUrl: payload.liveUrl,
      completedSteps: payload.completedSteps,
      createdAt: now,
      updatedAt: now
    });
  }

  participants.sort((a, b) => a.username.localeCompare(b.username));

  return {
    participants
  };
}

function writeProgressFile(data) {
  fs.writeFileSync(progressFilePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

main();
```

---

## 16. Netlify Configuration

Create:

```text
netlify.toml
```

Use:

```toml
[build]
  publish = "."
```

There are no Netlify Functions in this project.

---

## 17. Frontend JavaScript Structure

In `app.js`, use clear, beginner-friendly functions.

Suggested structure:

```js
const schedule = [];

const githubConfig = {
  owner: "REPLACE_WITH_GITHUB_OWNER_OR_ORG",
  repo: "REPLACE_WITH_REPO_NAME"
};

async function init() {}

async function loadProgress() {}

function renderSchedule() {}

function renderLeaderboard(participants) {}

function renderRoomProgressOverview(participants) {}

function handleChecklistChange() {}

function handleSubmitProgress() {}

function buildProgressPayload() {}

function buildGitHubIssueUrl(payload) {}

function validateFormState(formState) {}

function normaliseUsername(username) {}

function validateOptionalUrl(value) {}

function saveCurrentUserToLocalStorage(payload) {}

function loadCurrentUserFromLocalStorage() {}

function calculateProgress(completedSteps) {}

function formatDate(dateString) {}

function showStatus(message, type) {}
```

Call `init()` on page load.

---

## 18. HTML Requirements

The `index.html` file should include:

- Semantic HTML
- A clear page title
- A form for participant details
- A progress checklist container
- A leaderboard container
- A room progress overview container
- A noscript warning
- Links to `styles.css` and `app.js`

Suggested containers:

```html
<header class="hero"></header>

<main>
  <section id="participant-section"></section>
  <section id="progress-section"></section>
  <section id="leaderboard-section"></section>
  <section id="room-progress-section"></section>
</main>

<footer></footer>
```

---

## 19. CSS Requirements

Use plain CSS.

Style direction:

- Light, modern theme
- Large readable text
- Rounded cards
- Soft shadows
- Mobile-first
- Projector-friendly
- Clear buttons
- Clear completion states
- Good spacing

Use CSS variables:

```css
:root {
  --color-bg: #f7f8fb;
  --color-surface: #ffffff;
  --color-text: #172033;
  --color-muted: #667085;
  --color-primary: #ed3266;
  --color-primary-dark: #c91f52;
  --color-border: #e4e7ec;
  --color-success: #16a34a;
  --color-warning: #f59e0b;
  --radius-lg: 18px;
  --shadow-soft: 0 16px 40px rgba(15, 23, 42, 0.08);
}
```

---

## 20. UX Copy

Use friendly copy.

### Submit helper copy

```text
When you submit your progress, GitHub will open in a new tab with a prefilled progress issue. Click "Submit new issue" on GitHub to send your update to the leaderboard.
```

### Leaderboard update note

```text
Leaderboard updates after GitHub processes your progress and Netlify redeploys the site.
```

### Empty leaderboard

```text
No participant progress has been submitted yet.
```

### Successful issue open message

```text
GitHub opened in a new tab. Submit the issue there to update the shared leaderboard.
```

---

## 21. README Requirements

Update `README.md` with:

1. Project overview
2. How the static tracker works
3. Why there are no Netlify Functions
4. How progress submission works through GitHub Issues
5. How GitHub Actions updates `data/progress.json`
6. How to deploy the site to Netlify
7. How to connect a custom domain
8. How to test locally
9. Known limitations

---

## 22. GitHub Repository Settings

Document these setup requirements in the README:

### 22.1 Enable GitHub Actions

GitHub Actions must be enabled for the repository.

### 22.2 Allow workflow write permissions

In the repository:

```text
Settings → Actions → General → Workflow permissions
```

Select:

```text
Read and write permissions
```

This allows the workflow to commit updates to `data/progress.json`.

### 22.3 Issue labels

Create a GitHub issue label:

```text
progress-update
```

The frontend adds this label in the prefilled issue URL.

The workflow only processes issues with this label.

---

## 23. Known Limitations

Document these clearly:

- The site has no login.
- Anyone can submit progress for any username.
- The participant must click `Submit new issue` on GitHub.
- Leaderboard updates are not instant.
- Netlify must redeploy before the public leaderboard reflects the latest JSON file.
- Every progress update creates a Git commit.
- This is suitable for a small internal hackathon.
- For larger events, use a proper backend or database.

---

## 24. Acceptance Criteria

The implementation is complete when:

- The site is static and deploys to Netlify.
- No Netlify Functions exist.
- No GitHub token is exposed in frontend JavaScript.
- `data/progress.json` exists and starts with an empty participants array.
- The page loads `data/progress.json`.
- The leaderboard renders correctly.
- The participant can enter a GitHub username.
- The participant can tick completed schedule items.
- The participant can generate a prefilled GitHub issue.
- GitHub Actions processes the issue.
- GitHub Actions updates `data/progress.json`.
- GitHub Actions commits the change.
- Netlify redeploys from the GitHub commit.
- The updated leaderboard appears after redeploy.
- The site works on mobile and desktop.
- The code is plain HTML, CSS, and JavaScript.

---

## 25. Stretch Goals

Only implement these after the MVP works:

- Confetti when all activities are complete
- Top 3 podium styling
- GitHub avatar display using public avatar URL pattern
- Recently updated participant feed
- CSV export
- Dark mode
- Fuse Digital branding
- QR code to open the tracker
- Facilitator instructions panel
- Manual fallback instructions if GitHub Actions fail

---

## 26. Manual Fallback Plan

If GitHub Actions fails during the hackathon:

1. Participants can still use the tracker locally.
2. Participants can still submit progress issues.
3. The facilitator can manually copy progress from the issues into `data/progress.json`.
4. Commit the updated file.
5. Netlify redeploys.
6. The leaderboard updates.

This keeps the event moving even if automation breaks.

---

## 27. Instruction to Copilot

Please implement this as a simple, robust MVP.

Prioritise:

1. Working static site
2. Clear participant UX
3. Safe progress submission without exposing secrets
4. Reliable GitHub Action parsing
5. Clean, beginner-readable code

Do not add unnecessary dependencies.

Do not use frontend frameworks.

Do not use Netlify Functions.

Do not use a database.

Keep the code easy for non-technical hackathon participants and beginner developers to understand.
