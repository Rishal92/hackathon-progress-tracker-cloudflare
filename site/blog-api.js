const productionApiBaseUrl = "https://REPLACE_WITH_YOUR_WORKER_URL";
const localApiBaseUrl = "http://127.0.0.1:8787";

const apiBaseUrl = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? localApiBaseUrl
  : productionApiBaseUrl;

const elements = {
  baseUrl: document.getElementById("api-base-url"),
  listEndpoint: document.getElementById("api-list-endpoint"),
  itemEndpoint: document.getElementById("api-item-endpoint"),
  status: document.getElementById("blog-api-status"),
  exampleResponse: document.getElementById("blog-example-response"),
  postsList: document.getElementById("blog-posts-list"),
  postsEmpty: document.getElementById("blog-posts-empty")
};

document.addEventListener("DOMContentLoaded", () => {
  init().catch(error => {
    showStatus(`Could not load blog API guide: ${error.message}`, "error");
  });
});

async function init() {
  const listEndpoint = `${apiBaseUrl}/api/blog`;

  elements.baseUrl.textContent = apiBaseUrl;
  elements.listEndpoint.textContent = listEndpoint;
  elements.itemEndpoint.textContent = `${apiBaseUrl}/api/blog/{id}`;

  const response = await fetch(listEndpoint, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load posts.");
  }

  const posts = Array.isArray(data.posts) ? data.posts : [];

  elements.exampleResponse.textContent = JSON.stringify(
    {
      posts: posts.slice(0, 2)
    },
    null,
    2
  );

  renderPosts(posts);
  showStatus("Blog API loaded successfully.", "success");
}

function renderPosts(posts) {
  elements.postsList.innerHTML = "";

  if (!posts.length) {
    elements.postsEmpty.hidden = false;
    return;
  }

  elements.postsEmpty.hidden = true;

  posts.forEach(post => {
    const card = document.createElement("article");
    card.className = "answer-card";

    const tags = Array.isArray(post.tags) && post.tags.length ? post.tags.join(", ") : "-";

    card.innerHTML = `
      <h3>${escapeHtml(post.title)}</h3>
      <p class="answer-meta">${escapeHtml(post.category || "General")} | ${escapeHtml(post.publishedDate || "-")}</p>
      <p>${escapeHtml(post.excerpt || "")}</p>
      <p><strong>Author:</strong> ${escapeHtml(post.author || "-")}</p>
      <p><strong>Tags:</strong> ${escapeHtml(tags)}</p>
      <p><strong>Post endpoint:</strong> <code>/api/blog/${escapeHtml(post.id || "")}</code></p>
    `;

    elements.postsList.appendChild(card);
  });
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
