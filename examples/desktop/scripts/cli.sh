#!/bin/sh
# Drive the desktop example's CLI surfaces. Both entries open the same SQLite file the
# window uses, so they work whether or not a window is running; a running window shows
# the change on its next poll.
#
# Usage:
#   scripts/cli.sh <command> [--options]   # one command, through the Node entry
#   scripts/cli.sh demo                     # both entries against the same counter

NODE_ENTRY="$HOME/.local/bin/caelus-desktop-cli"
ELECTRON_ENTRY="$HOME/.local/bin/caelus-desktop"

if [ ! -x "$NODE_ENTRY" ] || [ ! -x "$ELECTRON_ENTRY" ]; then
  echo "launchers not installed. Run scripts/build.sh first." >&2
  exit 1
fi

case "$1" in
  demo)
    echo "== through the Node entry =="
    "$NODE_ENTRY" increment
    "$NODE_ENTRY" increment
    echo "== through the Electron entry, same counter =="
    "$ELECTRON_ENTRY" --cli increment
    echo "== decrement, then reset =="
    "$NODE_ENTRY" decrement
    "$NODE_ENTRY" reset
    echo "== a failure (unknown command) =="
    "$NODE_ENTRY" nope || echo "  (exited nonzero, as expected)"
    echo "== help, derived from the registry =="
    "$NODE_ENTRY" --help
    ;;
  *)
    "$NODE_ENTRY" "$@"
    ;;
esac
