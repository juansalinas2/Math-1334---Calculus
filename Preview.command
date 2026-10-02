#!/bin/zsh
set -eu
cd -- "${0:A:h}"
if [[ -x .tools/quarto/bin/quarto ]]; then
  exec .tools/quarto/bin/quarto preview --host 127.0.0.1
elif command -v quarto >/dev/null 2>&1; then
  exec quarto preview --host 127.0.0.1
else
  print 'Install Quarto from https://quarto.org/docs/get-started/ to preview on this computer.'
  read '?Press Enter to close.'
fi
