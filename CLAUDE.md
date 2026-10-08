@AGENTS.md

## Deploy

- **Este panel NO está conectado a Netlify** (confirmado por Claudio, 08/10/2026). Un push a
  cualquier rama, `main` incluida, no publica nada.
- El deploy es manual: `npm run build && npm run zip`, y el zip de `out/` se sube a mano en
  Netlify. No hace falta preguntar si un push deploya.
- Este es el **único panel en producción** (`https://cot-driver-admin.netlify.app`). El panel
  viejo (`cot-driver-admin-viejo`, repo JS, rama `dev-rebuild-core`) fue desvinculado del repo y
  **eliminado** de Netlify el 08/10/2026 (frente "Retiro del repo JS", cerrado).
