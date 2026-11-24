#!/usr/bin/env bash
# ============================================================================
#  Deploy de dmbestudio.com
#
#  Se ejecuta FORZADO desde /home/deploy/.ssh/authorized_keys mediante
#  command="/usr/local/bin/deploy-dmbestudio". El cliente SSH no puede pedir
#  ningún otro comando: aunque la clave privada se filtre, lo único que un
#  atacante puede hacer es desplegar el repositorio público del sitio.
#
#  Instalado el 22/08/2026 (auditoría X-03: el deploy entraba como root).
# ============================================================================
set -euo pipefail

REPO=/var/www/dmbestudio

if [ ! -d "$REPO/.git" ]; then
  echo "❌ $REPO no es un repositorio git. Abortando." >&2
  exit 1
fi

cd "$REPO"

echo "📦 Deploy dmbestudio — $(date -Is)"
echo "   commit actual: $(git log -1 --format='%h %s')"

git fetch --quiet origin main

# -B fuerza que el working tree quede EN main, no en la rama que hubiera
# quedado apuntada de antes (auditoría A-01).
git checkout -B main origin/main --quiet
git reset --hard origin/main --quiet

echo "✅ rama:   $(git rev-parse --abbrev-ref HEAD)"
echo "✅ commit: $(git log -1 --format='%h %s')"
echo "🎉 Deploy completado"
