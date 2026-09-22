# Supabase connection for Hidden

Project: `ulpfrfjthouoguwffsha`

The project-scoped Codex MCP server is configured in `.codex/config.toml`. It contains no credentials. Each computer must complete its own OAuth login.

From this repository, run:

```sh
codex mcp login supabase --scopes projects:read,database:read,database:write,secrets:read,environment:read,environment:write,storage:read,storage:write
```

Explicit scopes avoid a registration error from unsupported scopes advertised by this endpoint. Approve the provider authorization in your browser. Reload MCP servers in the desktop app after successful login if the tools are not available in the current task.

## Applied setup — September 22, 2026

Migration `20260922192409_initial.sql` is applied to the linked project. The local migration filename matches remote history; do not run the initial SQL again on this project.

Six tables, server-only functions, ownership RLS, private originals bucket and public preview bucket are configured. Security adviser reported only informational notices for intentionally policy-free, server-only tables (purchases, payment_events, rate_limits).

The public configuration and service-role key are saved in ignored `.env.local`. Copy runtime secrets securely to another laptop or Vercel; they are not in Git. OAuth connects the agent and does not replace app credentials.

Auth URL configuration is complete and was verified in the Supabase dashboard: Site URL is `http://127.0.0.1:3000`; allowed callbacks are `http://127.0.0.1:3000/auth/callback` and `http://localhost:3000/auth/callback`. The dashboard was used because the MCP OAuth grant cannot access Auth configuration. Add the deployed site's callback when deploying. Stripe credentials and webhook configuration remain pending; the Stripe dashboard currently requires user sign-in.

Live verification passed against the real Supabase project and local production server: temporary creator authentication, create drop, two signed uploads, preview generation, publish, public preview access, rejection of public original access, and HTTP 403 for unpaid downloads. Temporary test user, drop and files were removed. No live payment was attempted without Stripe credentials.

`npm run build` passed. The app runs at http://127.0.0.1:3000 using `npm start`; development mode encountered the machine's file-watcher limit.

## Payment setup completed

Sandbox API credentials and the local webhook listener are now configured. Checkout, webhook-driven unlock, original downloads, duplicate-event handling and full-refund revocation passed. See `docs/STRIPE_VERIFICATION.md` for results and restart instructions. Production deployment and creator payouts remain outside this completed sandbox setup.
