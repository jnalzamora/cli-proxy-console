# CLI Proxy Console fork

This is a fork of router-for-me/Cli-Proxy-API-Management-Center, the real React management frontend. The quota screen adds a provider summary, grouped account ledger, email masking, and a cards view. Dark mode is the initial theme; existing saved theme preferences still apply.

## Run and connect

```sh
bun install --frozen-lockfile
bun run dev --host 0.0.0.0 --port 5179
```

- `http://localhost:5179/#/preview`: interactive, fictional sample data. It never authenticates or calls a backend. Navigation to other management tools opens login.
- `http://localhost:5179/#/login`: enter your backend address and management key, then open Quota Management. Account details expose the upstream reset and advanced provider controls.
- This upstream revision requires the backend v8 Management API (`/v8/management`). Older v6 backends need a compatible frontend revision; no legacy API fallback is added.

The local preview is exposed privately through Tailscale Serve. Vite permits this machine's Tailscale hostname in `vite.config.ts`; change that hostname when developing on another machine. Check existing Serve routes before adding your own.

## Single-file build

```sh
bun run verify
bun run build
```

`dist/index.html` contains all assets. Use it as `management.html` with a compatible CLI Proxy backend, preserving the backend's existing panel configuration. Build output is intentionally not committed.

## Validation

Bun unit tests cover unknown capacity, percentage conversion, zero-limit accounts, email masking, and summary window selection. The full upstream tests, ESLint, and production build pass. Browser checks cover desktop/mobile layout, filtering, search, email visibility, cards view, and refresh feedback. Live API integration requires a running backend and is not verified with sample data.
