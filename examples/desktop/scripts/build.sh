#!/bin/sh
# Rebuild the desktop example and refresh the stable launchers on PATH
# (~/.local/bin/caelus-desktop and caelus-desktop-cli). Run after any code
# change so the window and the CLI entries use the fresh build.
set -e
cd "$(dirname "$0")/.."
app="$(pwd)"
root="$(cd ../.. && pwd)"

(cd "$root" && npm run build)
npm run build

mkdir -p "$HOME/.local/bin"

# The window, or with --cli the CLI entry through the Electron binary.
cat > "$HOME/.local/bin/caelus-desktop" <<EOF
#!/bin/sh
exec "$root/node_modules/.bin/electron" "$app" "\$@"
EOF

# The CLI entry through plain Node, no Electron boot.
cat > "$HOME/.local/bin/caelus-desktop-cli" <<EOF
#!/bin/sh
exec node "$app/dist/cli.js" "\$@"
EOF

chmod +x "$HOME/.local/bin/caelus-desktop" "$HOME/.local/bin/caelus-desktop-cli"

echo
echo "Ready. Launchers in ~/.local/bin (make sure it is on PATH)."
echo "  Window:          caelus-desktop"
echo "  CLI via Electron: caelus-desktop --cli <command>"
echo "  CLI via Node:     caelus-desktop-cli <command>   (try: scripts/cli.sh demo)"
echo "Both CLI entries talk to the running window over its socket."
