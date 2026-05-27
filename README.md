# Hackathon Progress Tracker

This project hosts a static participant tracker on GitHub Pages and sends progress updates to a Cloudflare Worker API backed by Cloudflare D1.

This repository uses a live API model, not an IssueOps workflow.

## Stack

- GitHub Pages for the static site
- Vanilla HTML, CSS, and JavaScript for the frontend
- Cloudflare Workers for the API
- Cloudflare D1 for progress storage

## Project Structure

- `site/` GitHub Pages frontend
- `worker/` Cloudflare Worker API and D1 schema

## What The App Does

- Collects participant details
- Saves in-progress state to localStorage
- Submits progress directly to the Worker API
- Loads the shared leaderboard from the Worker API
- Refreshes leaderboard and room progress automatically from the API every 15 seconds
- Includes a manual "Refresh now" action for projector/demo use
- Shows room-wide completion totals per activity

## Local Development

### 1. Install dependencies

```powershell
npm install
```

### 2. Start the static site locally

From the project root:

```powershell
py -m http.server 5500 -d site
```

Open:

```text
http://localhost:5500
```

### 3. Start the Worker locally

From the project root:

```powershell
npx wrangler dev --config worker/wrangler.toml
```

By default the frontend uses `http://127.0.0.1:8787` while running on localhost.

## Cloudflare Setup

### 1. Create a D1 database

```powershell
npx wrangler d1 create hackathon-progress-db
```

Copy the returned database ID into `worker/wrangler.toml`.

### 2. Apply the schema

```powershell
npx wrangler d1 execute hackathon-progress-db --file=worker/schema.sql --remote
```

### 3. Set the allowed origin

In `worker/wrangler.toml`, set `ALLOWED_ORIGIN` to your GitHub Pages origin, for example:

```toml
ALLOWED_ORIGIN = "https://yourusername.github.io"
```

### 4. Deploy the Worker

```powershell
npx wrangler deploy --config worker/wrangler.toml
```

Copy the deployed Worker URL.

### 5. Point the frontend to the Worker

Update `productionApiBaseUrl` in `site/app.js` to your deployed Worker URL.

Example:

```js
const productionApiBaseUrl = "https://fuse-hackathon-api.your-subdomain.workers.dev";
```

## GitHub Pages Setup

### 1. Create a new GitHub repository

Create a new empty repository in GitHub and push this folder to it.

### 2. Publish with GitHub Actions

In the repository settings:

- Open `Settings -> Pages`
- Under `Build and deployment`, set `Source` to `GitHub Actions`

Your site will then be served from GitHub Pages.

## GitHub Actions Deployment Pipeline

The repository includes one workflow that deploys everything:

- `.github/workflows/deploy.yml`

On every push to `main` (or manual run), it does this in order:

1. Runs frontend and worker validation checks.
2. Applies `worker/schema.sql` to Cloudflare D1.
3. Deploys the Cloudflare Worker.
4. Builds the GitHub Pages artifact from `site/`.
5. Injects the Worker API URL into `site/app.js` for the deployed artifact.
6. Deploys the static site to GitHub Pages.

### Required GitHub repository secrets

Add these in `Settings -> Secrets and variables -> Actions`:

- `CLOUDFLARE_API_TOKEN`: API token with Worker and D1 permissions.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID.
- `CLOUDFLARE_D1_DATABASE_ID`: D1 database ID for `hackathon-progress-db`.
- `PAGES_ORIGIN_GITHUB`: Your Pages origin, for example `https://yourusername.github.io`.
- `WORKER_API_BASE_URL`: Deployed Worker URL, for example `https://fuse-hackathon-api.your-subdomain.workers.dev`.

### One-time prep before first pipeline run

1. Update `worker/wrangler.toml` with your real D1 `database_id`.
2. Confirm the D1 database name is `hackathon-progress-db` or adjust the workflow command accordingly.
3. Push to `main`.

## Deployment Order

1. Create the GitHub repo and push the code.
2. Create the D1 database.
3. Update `worker/wrangler.toml` with the real database ID.
4. Add the required GitHub Actions secrets.
5. Set GitHub Pages source to `GitHub Actions`.
6. Push to `main` to run the deployment workflow.

## Validation Commands

```powershell
npm run check:site
npm run check:worker
```

## Known Limitations

- There is no authentication.
- Anyone can submit progress for any username.
- CORS should be restricted to your GitHub Pages origin before production use.
- This is intended for a small hackathon, not a public leaderboard with abuse resistance.
