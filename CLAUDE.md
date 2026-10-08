@AGENTS.md

## Deploy

- **Este panel NO está conectado a Netlify** (confirmado por Claudio, 08/10/2026). Un push a
  cualquier rama, `main` incluida, no publica nada.
- El deploy es manual: `npm run build && npm run zip`, y el zip de `out/` se sube a mano en
  Netlify. No hace falta preguntar si un push deploya.
- El panel viejo (`cot-driver-admin-viejo`, repo JS, rama `dev-rebuild-core`) **sí** está
  conectado a Netlify; desvincularlo es parte del frente "Retiro del repo JS" (cola en
  `.claude/Estado_actual.md` del repo de la app).
