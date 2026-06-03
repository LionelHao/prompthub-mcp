#!/usr/bin/env node
import { main } from "./server.js";

// Log only the message (never the raw error object) so a token can't ride along in a stack/cause.
main().catch((err) => {
  console.error(`[prompthub-mcp] fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
