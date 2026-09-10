# Hybrid Haven Web

Hybrid Haven is a hybrid-work coordination tool for an office. Employees sign in with GitHub, book a desk in a named office zone for a given day, mark themselves on vacation, and join company events. This repository holds the web client, a single-page frontend written in plain JavaScript with no framework and no build step.

It was deployed to an AWS EC2 instance behind nginx and a real domain, served alongside the API it calls.

## The four repositories

| Repository | Role |
| --- | --- |
| [Hybrid-Haven-Web](https://github.com/Umang-Vadadoriya/Hybrid-Haven-Web) | This repo. The frontend, plus the nginx and Node config that serve it. |
| [Hybrid-Haven-API](https://github.com/Umang-Vadadoriya/Hybrid-Haven-API) | Spring Boot REST service. Everything on screen comes from it. |
| [Hybrid-Haven-DB](https://github.com/Umang-Vadadoriya/Hybrid-Haven-DB) | SQL Server schema and Liquibase migrations behind the API. |
| [Hybrid-Haven-DOCS](https://github.com/Umang-Vadadoriya/Hybrid-Haven-DOCS) | UML design artifacts. The use case and robustness diagrams describe these flows. |

In production both this client and the API sit on the same EC2 instance behind one nginx server block, the client under `/web` and the API under `/api`.

## Tech stack

- Plain JavaScript, ES modules loaded natively by the browser
- Hand-written CSS, no preprocessor
- No framework, no bundler, no `package.json`, no dependencies
- GitHub OAuth for sign-in, using the GitHub REST API directly for profile and email
- Node's built-in `http` module for the static server in production
- nginx for TLS termination and path routing
- GitHub Actions for deployment

## How it is structured

`index.html` is the only HTML file, and it is almost empty. It carries a loading spinner, an empty `<main id="main-container">`, and one generic modal shell. Every screen is built at runtime by JavaScript that constructs DOM nodes and swaps them into that container, so there is no client-side router and no templating. Navigation replaces the content panel in place.

`JS/` holds one module per screen or concern:

| Module | Responsibility |
| --- | --- |
| `script.js` | Entry point, loaded as `type="module"` from `index.html`. On `DOMContentLoaded` it renders the login screen, checks for an OAuth `code` in the URL, exchanges it for a token if one is present, and otherwise renders the dashboard if a token is already stored. |
| `login.js` | Builds the GitHub authorize URL and redirects to it, reads the `code` back off the URL, and exchanges it for an access token through the API's `/auth/code` endpoint. |
| `scriptlogin.js` | The login screen. A welcome heading, a "SignIn with GitHub" button, and a three second countdown before the redirect. |
| `homepage.js` | The dashboard. Fetches the GitHub profile and email, registers the employee against the API if they are new, and renders today's view of who is in the office, who is at home, and who is on vacation. Also builds the page shell and the right-hand panel every other screen renders into. |
| `deskBook.js` | The desk booking screen. The largest module. Shows tomorrow's occupancy per zone, handles booking and cancelling, advance booking for a chosen date, and an upcoming bookings view. |
| `eventspage.js` | The events screen. Lists events, joining an event, and creating one. |
| `vacation.js` | The vacation screen. Lists vacations, booking a date range, and cancelling. |
| `modal.js` | Shared UI pieces built at runtime: the message modal, the profile modal with logout, the employee list modal, and the mobile side navigation. |
| `common.js` | Everything shared. The API fetch helpers, the `Authorization` header built from the stored token, date formatting, the loader toggles, the responsive layout toggle, and logout. |
| `URLCollection.js` | The frozen set of base URLs for local and live API and web, and the two exported constants that select which pair is in use. |

`CSS/` splits into `style.css` for the application, `login.css` for the sign-in screen, and `modal.css` for the modals. `image/` holds the logos and the zone icons. `json/` holds sample API response payloads captured during development, used for building screens before the endpoints were ready. Nothing in `json/` is read at runtime.

## Authentication flow

1. The login screen sends the browser to GitHub's `login/oauth/select_account` with the OAuth app client id, the deployed web URL as the redirect, and the `user:email` scope.
2. GitHub redirects back with a `code` in the query string. `script.js` picks it up on load.
3. The code is sent to the API's public `GET /auth/code` endpoint, which does the client secret exchange server side and returns an access token. The secret never reaches the browser.
4. The token goes into `localStorage` and the page reloads to the clean web URL.
5. Every subsequent API call sends it as `Authorization: Bearer <token>`. The API validates it against GitHub on each request.
6. `homepage.js` then calls `https://api.github.com/user` and `https://api.github.com/user/emails` directly with the same token to get the display name, avatar, and primary email, and uses the email to find or create the matching employee record through the API.

Two things follow from this. The GitHub access token is held in `localStorage`, so it is readable by any script on the origin. And the same token is used both against the API and directly against GitHub, which is why the profile picture and name come from GitHub rather than from the database.

## Running it locally

There is nothing to install and nothing to build. You need a static file server, because the modules will not load over `file://`.

1. Point the client at a local API. In `JS/URLCollection.js`, change the two exports to the local pair:

```
export const API_RUN = URLS.API_LOCAL
export const WEB_RUN = URLS.WEB_LOCAL
```

2. Serve the repository root on port 5500. The VS Code Live Server extension defaults to this port, which is why `127.0.0.1:5500` is the local URL throughout. Any static server works.

3. Start the [API](https://github.com/Umang-Vadadoriya/Hybrid-Haven-API) on port 8080, with a migrated database behind it. Its CORS configuration already allows `http://127.0.0.1:5500`.

4. For sign-in to work you need a GitHub OAuth app whose callback URL matches whatever `WEB_RUN` is set to, and its client id has to be set as `clientId` in `JS/login.js`. Without that, GitHub will reject the redirect.

Note that the port and host matter more than usual here. They appear in three places that all have to agree: `URLCollection.js`, the API's allowed CORS origins, and the OAuth app's callback URL.

## How it is served and deployed

In production, two files in `AWS_Resources/` do the serving. Neither is used in local development.

`server.js` is a static file server in about forty lines on Node's `http` module. It listens on port 5500, maps the request path onto a file under the checked-out repository, sets a content type from a small extension map, and returns 404 or 500 on a read failure. There is no dependency and no framework. The served path is hardcoded to the deployment location on the instance.

`hybrid-haven.projects.bbdgrad.com.conf` is the nginx server block. It terminates TLS with a Let's Encrypt certificate managed by Certbot, redirects port 80 to HTTPS, and proxies two paths on the one hostname:

- `/web` to `localhost:5500`, this client
- `/api` to `localhost:8080`, the Spring Boot service

Both use a `rewrite` to strip the prefix before proxying, so neither application knows it is mounted under a path. This is why the live API base URL in `URLCollection.js` ends in `/api/` while the local one does not.

`.github/workflows/Automation.yml` deploys on every push to `main`. It SSHes into the EC2 instance and, checking the exit status at each step, kills whatever is listening on port 5500, deletes the previous checkout, clones the repository fresh, and restarts the Node server under `nohup`. It is a clone-and-restart deployment rather than an artifact upload, which suits a repository with no build output.

One thing to know if you are reading the workflow: it runs `node server.js` from the home directory, while `server.js` lives in `AWS_Resources/` inside the clone. The instance was set up with a copy of the file at that location.

## Contributions

Built by two developers over roughly three months in 2024, tracked in Jira with one branch per ticket and merged through pull requests. The branch names in this repository still show that ticket by ticket history.

**Krunal Rana** ([@krunal-BBD](https://github.com/krunal-BBD)) wrote most of this frontend. By current line attribution he owns the great majority of `homepage.js`, `deskBook.js`, `eventspage.js`, `common.js`, and `modal.js`, all of `scriptlogin.js`, and the larger share of `style.css`. Across `JS/`, `CSS/`, and `index.html` the split is roughly 2364 lines to Krunal and 800 to Umang.

**Umang Vadadoriya** ([@Umang-Vadadoriya](https://github.com/Umang-Vadadoriya)) wrote the GitHub OAuth flow (`login.js` in full, and the token handling in `script.js`), the majority of `vacation.js`, part of the dashboard and about 309 lines of `style.css`, and all of the serving and deployment layer, meaning `server.js`, the nginx configuration, and the deploy workflow.

The commit counts (59 non-merge commits to Umang against 28 to Krunal) point the other way from the line counts, because they include the merges and the deployment work. On the frontend code itself Krunal did the larger share.
