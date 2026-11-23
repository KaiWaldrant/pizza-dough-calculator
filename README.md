# Pizza Dough Calculator

A web app for calculating pizza dough ingredient quantities.

## Self-hosting

Images are published to `ghcr.io/kaiwaldrant/pizza-dough-calculator`:

- `vX.Y.Z` for each release tag. Pin one of these.
- `latest` and `sha-<short sha>` for every push to `main`.

Example `compose.yaml`:

```yaml
services:
  pizza-dough-calculator:
    image: ghcr.io/kaiwaldrant/pizza-dough-calculator:v0.1.0
    ports:
      - "8080:8080"
    restart: unless-stopped
```

- **HTTPS** is not handled by the container. Put a reverse proxy in front of it.
- **Use one address.** Bake history is stored in the browser, separately for each address, so history saved at `http://192.168.1.10:8080` doesn't show up at `https://pizza.example.com`. Always open the app through its one DNS name, never the IP and port.
- **Backups:** history lives only in the browser. Export a Backup (a JSON file) from the app, and import it to restore.
