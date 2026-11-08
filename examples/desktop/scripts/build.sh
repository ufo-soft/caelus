#!/bin/sh
# Rebuild the desktop example and refresh the stable launchers on PATH
# (~/.local/bin/caelus-desktop and caelus-desktop-cli). Run after any code
# change so the window, the CLI entries and the MCP entries use the fresh build.
set -e
cd "$(dirname "$0")/.."
app="$(pwd)"
root="$(cd ../.. && pwd)"

(cd "$root" && npm run build)
npm run build

mkdir -p "$HOME/.local/bin"

# The window; or with --cli the CLI, or with --mcp the MCP server, through the Electron binary.
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
echo "  MCP via Electron: caelus-desktop --mcp            (a host spawns this; stdio)"
echo "  MCP via Node:     node $app/dist/mcp.js             (no launcher: a host is told the path once)"
echo "All of them share ~/.caelus-example.sqlite; a running window shows CLI and MCP changes on its next poll."
