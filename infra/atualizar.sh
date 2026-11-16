#!/usr/bin/env bash
# Sobe ou atualiza o Pente Fino na VPS, dentro de /opt/barbearia:
#   ./atualizar.sh            versão gravada no .env (TAG; padrão latest)
#   ./atualizar.sh <sha>      versão de um commit da main (sha completo, como no GitHub)
#   ./atualizar.sh anterior   volta para a versão que estava antes da última atualização
# As migrações rodam antes da API subir (serviço "migracoes"). Migração não se desfaz sozinha:
# voltar uma versão só funciona se o banco novo ainda servir para o código antigo.
set -euo pipefail
cd "$(dirname "$0")"
[[ -f .env ]] || { echo "Falta o .env: rode ./instalar.sh primeiro." >&2; exit 1; }

# Valor do .env com "$" (a chave do Asaas começa com "$aact_") vira uma variável para o Compose:
# ele troca por vazio e escreve o valor inteiro no aviso, que vai para o log público do deploy.
# Aqui o aviso sai sem o valor, e a conferência abaixo diz qual variável corrigir. O aviso vem
# como msg="The \"<valor>\" variable is not set...", com as aspas escapadas.
esconder_valor() {
  sed -E 's/The \\?"[^"\\]*\\?" variable is not set\. Defaulting to a blank string\./Um valor do .env tem "$" sem aspas simples: o Compose leu vazio (valor escondido)./'
}
compose() {
  docker compose --env-file .env -f docker-compose.prod.yml "$@" 2> >(esconder_valor >&2)
}
# Nomes (nunca os valores) das variáveis com "$" fora de aspas simples e sem "$$".
cifroes="$(grep -E '^[A-Z0-9_]+=' .env | grep -vE "^[A-Z0-9_]+='.*'$" | awk -F= '{ v = substr($0, index($0, "=") + 1); gsub(/\$\$/, "", v); if (v ~ /\$/) print $1 }' || true)"
if [[ -n "$cifroes" ]]; then
  echo "ATENÇÃO: no .env, o valor de $(echo "$cifroes" | paste -sd, -) tem \"\$\" e o Compose lê vazio." >&2
  echo "Ponha o valor entre aspas simples (VAR='valor') e rode ./atualizar.sh de novo." >&2
fi
atual="$(sed -n 's/^TAG=//p' .env)"
nova="${1:-$atual}"
if [[ "$nova" == "anterior" ]]; then
  [[ -f .tag-anterior ]] || { echo "Não há versão anterior registrada." >&2; exit 1; }
  nova="$(cat .tag-anterior)"
fi

if [[ "$nova" != "$atual" ]]; then
  printf '%s\n' "$atual" > .tag-anterior
  sed -i "s/^TAG=.*/TAG=$nova/" .env
fi

echo "Versão: $nova"
compose pull --quiet
compose up -d --remove-orphans
# Espera a API, o painel e o worker (bot, lembretes e rotinas) ficarem saudáveis (até 3 minutos).
# Antes só o painel era esperado: em 16/11/2026 o worker caiu ao iniciar e o deploy saiu verde.
saudavel() { [[ "$(docker inspect -f '{{.State.Health.Status}}' "pente-fino-$1-1" 2>/dev/null)" == healthy ]]; }
for _ in $(seq 1 36); do
  if saudavel api && saudavel web && saudavel worker; then
    compose ps --format 'table {{.Service}}\t{{.Status}}'
    docker image prune -f >/dev/null
    echo "No ar: versão $nova"
    exit 0
  fi
  sleep 5
done
compose ps --format 'table {{.Service}}\t{{.Status}}'
compose logs --tail 40 migracoes api web worker
echo "API, painel ou worker não ficou saudável em 3 minutos. Para voltar: ./atualizar.sh anterior" >&2
exit 1
