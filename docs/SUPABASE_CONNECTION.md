# Supabase connection for Hidden

Project: `ulpfrfjthouoguwffsha`

The project-scoped Codex MCP server is configured in `.codex/config.toml`. It contains no credentials. Each computer must complete its own OAuth login.

From this repository, run:

```sh
codex mcp login supabase --scopes projects:read,database:read,database:write,secrets:read,environment:read,environment:write,storage:read,storage:write
```

Explicit scopes avoid a registration error from unsupported scopes advertised by this endpoint. Approve the provider authorization in your browser. Reload MCP servers in the desktop app after successful login if the tools are not available in the current task.

The supplied project URL and publishable key have been saved to this machine's ignored `.env.local`; they are not included in Git. The server-side service-role key and database migration still need setup. An MCP login connects the agent, not the application: it does not replace the application's runtime credentials.

See README.md for the migration and live test checklist. Supabase Auth responded successfully and email authentication was enabled during initial setup. No migration was applied before OAuth authorization.
