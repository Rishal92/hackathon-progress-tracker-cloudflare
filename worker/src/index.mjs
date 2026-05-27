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

const answerFields = [
  "whatIChanged",
  "whyIChangedIt",
  "visitorExperienceImprovement",
  "seoOrClarityImprovement",
  "howIUsedAI",
  "whatToImproveNext"
];

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(request, env)
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return jsonResponse({ ok: true }, 200, request, env);
    }

    if (url.pathname === "/api/progress" && request.method === "GET") {
      const participants = await listParticipants(env);
      return jsonResponse({ participants }, 200, request, env);
    }

    if (url.pathname === "/api/progress" && request.method === "POST") {
      try {
        const payload = await request.json();
        const validatedPayload = validatePayload(payload);
        await upsertParticipant(env, validatedPayload);
        const participants = await listParticipants(env);
        return jsonResponse({ participants }, 200, request, env);
      } catch (error) {
        return jsonResponse({ error: error.message || "Could not save progress." }, 400, request, env);
      }
    }

    return jsonResponse({ error: "Not found." }, 404, request, env);
  }
};

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload must be an object.");
  }

  const username = normaliseUsername(payload.username);
  const repoUrl = validateOptionalUrl(payload.repoUrl, "repoUrl");
  const liveUrl = validateOptionalUrl(payload.liveUrl, "liveUrl");
  const completedSteps = Array.isArray(payload.completedSteps) ? payload.completedSteps : [];
  const cleanCompletedSteps = [...new Set(completedSteps)].filter(stepId => allowedStepIds.has(stepId));
  const hasAnswers = Object.prototype.hasOwnProperty.call(payload, "answers");
  const answers = hasAnswers ? validateAnswers(payload.answers) : null;

  return {
    username,
    repoUrl,
    liveUrl,
    completedSteps: cleanCompletedSteps,
    answers,
    hasAnswers
  };
}

function validateAnswers(rawAnswers) {
  if (!rawAnswers || typeof rawAnswers !== "object") {
    return buildEmptyAnswers();
  }

  const answers = {};

  answerFields.forEach(field => {
    const value = rawAnswers[field];

    if (typeof value !== "string") {
      answers[field] = "";
      return;
    }

    answers[field] = value.trim().slice(0, 4000);
  });

  return answers;
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

function normaliseUsername(username) {
  if (typeof username !== "string") {
    throw new Error("Username is required.");
  }

  const clean = username.trim().toLowerCase().replace(/^@/, "");

  if (!clean) {
    throw new Error("Username is required.");
  }

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

async function upsertParticipant(env, payload) {
  const now = new Date().toISOString();
  const completedStepsJson = JSON.stringify(payload.completedSteps);

  await env.DB.prepare(
    `
      INSERT INTO participants (username, repo_url, live_url, completed_steps_json, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      ON CONFLICT(username) DO UPDATE SET
        repo_url = excluded.repo_url,
        live_url = excluded.live_url,
        completed_steps_json = excluded.completed_steps_json,
        updated_at = excluded.updated_at
    `
  )
    .bind(payload.username, payload.repoUrl, payload.liveUrl, completedStepsJson, now, now)
    .run();

  if (payload.hasAnswers) {
    const answersJson = JSON.stringify(payload.answers || buildEmptyAnswers());

    await env.DB.prepare(
      `
        INSERT INTO participant_answers (username, answers_json, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(username) DO UPDATE SET
          answers_json = excluded.answers_json,
          updated_at = excluded.updated_at
      `
    )
      .bind(payload.username, answersJson, now, now)
      .run();
  }
}

async function listParticipants(env) {
  const result = await env.DB.prepare(
    `
      SELECT p.username, p.repo_url, p.live_url, p.completed_steps_json, p.created_at, p.updated_at, a.answers_json
      FROM participants p
      LEFT JOIN participant_answers a ON a.username = p.username
    `
  ).all();

  const rows = Array.isArray(result.results) ? result.results : [];

  const participants = rows.map(row => ({
    username: row.username,
    repoUrl: row.repo_url,
    liveUrl: row.live_url,
    completedSteps: parseCompletedSteps(row.completed_steps_json),
    answers: parseAnswers(row.answers_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  participants.sort((a, b) => {
    const completedDiff = b.completedSteps.length - a.completedSteps.length;
    if (completedDiff !== 0) {
      return completedDiff;
    }

    const updatedAtDiff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (updatedAtDiff !== 0) {
      return updatedAtDiff;
    }

    return a.username.localeCompare(b.username);
  });

  return participants;
}

function parseCompletedSteps(rawValue) {
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter(stepId => allowedStepIds.has(stepId)) : [];
  } catch {
    return [];
  }
}

function jsonResponse(body, status, request, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...buildCorsHeaders(request, env)
    }
  });
}

function buildCorsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowedOrigin = normaliseAllowedOrigin(env.ALLOWED_ORIGIN);

  return {
    "Access-Control-Allow-Origin": origin && allowedOrigin !== "*" ? allowedOrigin : allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin"
  };
}

function normaliseAllowedOrigin(rawValue) {
  if (!rawValue || rawValue.includes("REPLACE")) {
    return "*";
  }

  const value = String(rawValue).trim();

  if (!value) {
    return "*";
  }

  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    return value.replace(/\/+$/, "");
  }
}

function parseAnswers(rawValue) {
  if (!rawValue) {
    return buildEmptyAnswers();
  }

  try {
    return validateAnswers(JSON.parse(rawValue));
  } catch {
    return buildEmptyAnswers();
  }
}