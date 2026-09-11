#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if [[ -x /Applications/Godot.app/Contents/MacOS/Godot ]]; then
  exec /Applications/Godot.app/Contents/MacOS/Godot --path "$PWD"
elif command -v godot >/dev/null 2>&1; then
  exec godot --path "$PWD"
else
  echo 'Open project.godot in Godot 4.6 or newer, then press F5 to play.'
  read -r '?Press Enter to close.'
fi
