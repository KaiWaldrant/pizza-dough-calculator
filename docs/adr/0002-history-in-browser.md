# Bake history lives in the browser, not on the server

Even though the app is self-hosted in a container, Bakes and their Comments are stored in the browser's IndexedDB, with JSON export/import as a backup. The container is only a static file server. We chose this to avoid running an API, a database, a data volume and backups for a single-user hobby tool.

## Consequences

- History doesn't sync between devices or browsers.
- Browser storage is kept separately for each address, so the app must be used through one canonical address: the DNS name behind the reverse proxy, never the IP and port.
- Moving to server-side storage later (e.g. SQLite behind a small API) means migrating existing browser data through the JSON export.
