# Hackathon Progress Tracker

This project hosts a static participant tracker on GitHub Pages and sends progress updates to a Cloudflare Worker API backed by Cloudflare D1.

## Stack

- GitHub Pages for the static site
- Vanilla HTML, CSS, and JavaScript for the frontend
- Cloudflare Workers for the API
- Cloudflare D1 for progress storage

## Project Structure

- `docs/` GitHub Pages frontend
- `worker/` Cloudflare Worker API and D1 schema

## What The App Does

- Collects participant details
- Saves in-progress state to localStorage
- Submits progress directly to the Worker API
- Loads the shared leaderboard from the Worker API
- Shows room-wide completion totals per activity

## Local Development

### 1. Install dependencies

```powershell
npm install
```

### 2. Start the static site locally

From the project root:

```powershell
py -m http.server 5500 -d docs
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

Update `productionApiBaseUrl` in `docs/app.js` to your deployed Worker URL.

Example:

```js
const productionApiBaseUrl = "https://hackathon-progress-api.your-subdomain.workers.dev";
```

## GitHub Pages Setup

### 1. Create a new GitHub repository

Create a new empty repository in GitHub and push this folder to it.

### 2. Publish from the `docs/` folder

In the repository settings:

- Open `Settings -> Pages`
- Choose `Deploy from a branch`
- Select `main`
- Select `/docs`

Your site will then be served from GitHub Pages.

## Deployment Order

1. Create the GitHub repo and push the code.
2. Create the D1 database.
3. Update `worker/wrangler.toml` with the real database ID and allowed origin.
4. Deploy the Worker.
5. Update `docs/app.js` with the deployed Worker URL.
6. Push the final frontend change.
7. Enable GitHub Pages from `/docs`.

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
