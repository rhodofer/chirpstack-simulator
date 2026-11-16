#!/usr/bin/env bash
# ikincil-pc (WSL2 Ubuntu) dağıtım betiği.
# GitHub Actions self-hosted runner ("ikincil-pc" etiketi) tarafından çalıştırılır.
#
# Kullanım (workflow içinden):  APP=backend|frontend|simulator  bash .github/deploy/ikincil-pc.sh
#   DRY_RUN=true  -> yalnızca ne yapılacağını yazar; kod değiştirmez, hiçbir şeyi yeniden başlatmaz.
#
# Ne yapar:
#   1) Runner'ın çıkış (checkout) kopyasından commit'i ~/falt-workspace/<uygulama> deposuna alır (git fetch, yerel yol; kimlik bilgisi gerekmez)
#   2) Yalnızca değişen bağımlılıkları kurar (pip / npm ci), backend'de alembic migration varsa çalıştırır
#   3) Servisi yeniden başlatır (systemd: falt-backend, falt-frontend; simülatör: docker compose)
#   4) Sağlık denetimi yapar; başarısızsa kodu önceki commit'e döndürüp servisi yeniden başlatır
#
# Güvenlik: izlenen dosyalarda yeni sürümden FARKLI yerel değişiklik varsa dağıtım iptal edilir (sessizce ezmez).
# Yeni sürümle aynı olan yerel değişiklikler (ör. önceden elle yapılmış düzeltmeler) atılır.
# Ortama özel dosyalar (.env, .env.local, simulator.toml, *.db, .venv, node_modules) git dışıdır ve dokunulmaz.
set -euo pipefail

APP="${APP:?APP gerekli (backend|frontend|simulator)}"
SRC="${GITHUB_WORKSPACE:?GITHUB_WORKSPACE gerekli (runner dışında çalıştırmayın)}"
SHA="${GITHUB_SHA:?GITHUB_SHA gerekli}"
DRY="${DRY_RUN:-false}"
BASE="$HOME/falt-workspace"

case "$APP" in
  backend)   DIR="$BASE/backend";              SERVICE="falt-backend";  HEALTH="http://127.0.0.1:8000/docs"; WAIT=90  ;;
  frontend)  DIR="$BASE/frontend";             SERVICE="falt-frontend"; HEALTH="http://127.0.0.1:3000/";     WAIT=240 ;;
  simulator) DIR="$BASE/chirpstack-simulator"; SERVICE="";              HEALTH="http://127.0.0.1:9002/";     WAIT=900 ;;
  *) echo "Bilinmeyen APP: $APP" >&2; exit 2 ;;
esac

log() { printf '[%s] %s\n' "$(date +%T)" "$*"; }

[ -d "$DIR/.git" ] || { log "HATA: $DIR bir git deposu değil"; exit 1; }
cd "$DIR"

PREV="$(git rev-parse HEAD)"
git fetch --quiet "$SRC" "$SHA"
NEW="$(git rev-parse FETCH_HEAD)"
[ "$NEW" = "$SHA" ] || { log "HATA: alınan commit ($NEW) beklenenle ($SHA) aynı değil"; exit 1; }
log "$APP: ${PREV:0:7} -> ${NEW:0:7}"

# ---- Yerel (izlenen) değişiklik denetimi
dirty=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if git cat-file -e "$NEW:$f" 2>/dev/null && [ "$(git hash-object "$f")" = "$(git rev-parse "$NEW:$f")" ]; then
    log "yerel değişiklik yeni sürümle aynı, atılacak: $f"
    [ "$DRY" = true ] || git checkout -- "$f"
  else
    log "HATA: yerel değişiklik var ve yeni sürümden farklı: $f"
    dirty=1
  fi
done < <(git diff --name-only HEAD)
[ "$dirty" = 0 ] || { log "Dağıtım iptal edildi. Önce yerel değişiklikleri depoya aktarın."; exit 1; }

changed() { ! git diff --quiet "$PREV" "$NEW" -- "$@"; }

# ---- DRY_RUN
if [ "$DRY" = true ]; then
  log "DRY_RUN: $(git diff --name-only "$PREV" "$NEW" | wc -l) dosya değişecek"
  git diff --stat "$PREV" "$NEW" | tail -n 8 || true
  if [ -n "$SERVICE" ]; then
    sudo -n -l "/usr/bin/systemctl" restart "$SERVICE" >/dev/null && log "sudo izni tamam: systemctl restart $SERVICE"
  else
    docker compose version >/dev/null && log "docker compose tamam"
  fi
  code="$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$HEALTH" || true)"
  log "sağlık denetimi şu an: HTTP $code ($HEALTH)"
  log "DRY_RUN bitti; hiçbir şey değiştirilmedi, yeniden başlatılmadı."
  exit 0
fi

# ---- Yardımcılar
wait_health() {
  local t=0 code
  while [ "$t" -lt "$WAIT" ]; do
    code="$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$HEALTH" || true)"
    [ "$code" = 200 ] && return 0
    sleep 5; t=$((t + 5))
  done
  return 1
}
install_deps() {
  case "$APP" in
    backend)  if changed requirements.txt;               then log "pip install -r requirements.txt"; .venv/bin/pip install -q -r requirements.txt; fi ;;
    frontend) if changed package.json package-lock.json; then log "npm ci";                          npm ci --no-audit --no-fund --loglevel=error; fi ;;
  esac
}
restart_app() {
  case "$APP" in
    simulator)
      if changed Dockerfile Dockerfile-devel; then log "docker compose up -d --build"; docker compose up -d --build chirpstack-simulator
      else log "docker compose restart"; docker compose restart chirpstack-simulator; fi ;;
    *) log "systemctl restart $SERVICE"; sudo -n systemctl restart "$SERVICE" ;;
  esac
}

# ---- Dağıtım
git reset --hard --quiet "$NEW"
install_deps
if [ "$APP" = backend ] && changed alembic.ini alembic/versions; then
  log "alembic upgrade head"
  .venv/bin/alembic upgrade head
fi
restart_app

if wait_health; then
  log "dağıtım BAŞARILI: $APP ${NEW:0:7}"
  exit 0
fi

# ---- Geri alma (yalnızca kod/bağımlılık; veritabanı migration'ları geri alınmaz)
log "HATA: sağlık denetimi başarısız ($HEALTH). Önceki sürüme dönülüyor: ${PREV:0:7}"
git reset --hard --quiet "$PREV"
install_deps
restart_app
if wait_health; then log "geri alma tamam, $APP ${PREV:0:7} çalışıyor"; else log "UYARI: geri almadan sonra da servis yanıt vermiyor"; fi
exit 1
