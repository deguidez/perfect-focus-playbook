#!/usr/bin/env bash
# Read-only checks. Does not install packages, change sites, or read credentials.
set -u
printf 'FocoAI — verificação da VPS (sem alterações)\n'
printf '\nSistema: '
uname -srm
printf '\nNode.js: '
if command -v node >/dev/null 2>&1; then node --version; else printf 'não encontrado no terminal\n'; fi
printf '\nnpm: '
if command -v npm >/dev/null 2>&1; then npm --version; else printf 'não encontrado no terminal\n'; fi
printf '\nNginx: '
if command -v nginx >/dev/null 2>&1; then
  nginx -v 2>&1
elif test -x /www/server/nginx/sbin/nginx; then
  /www/server/nginx/sbin/nginx -v 2>&1
else
  printf 'não encontrado nos caminhos padrão\n'
fi
printf '\nEspaço disponível em /www (ou /):\n'
if test -d /www; then df -h /www; else df -h /; fi
printf '\nMemória:\n'
if command -v free >/dev/null 2>&1; then free -h; else printf 'consulta indisponível\n'; fi
printf '\nIPv4 do domínio ia.fotogrer.com.br:\n'
if command -v getent >/dev/null 2>&1; then
  getent ahostsv4 ia.fotogrer.com.br | awk '{print $1}' | sort -u
else
  printf 'consulta DNS indisponível\n'
fi
printf '\nConcluído. Nenhuma senha ou configuração privada foi consultada.\n'