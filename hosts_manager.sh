#!/bin/bash
# Privileged script — only touches lines tagged "# laan-block"
# Sudoers entry: steven ALL = NOPASSWD: /full/path/to/hosts_manager.sh

HOSTS="/etc/hosts"
TAG="# laan-block"

case "$1" in
  block)
    shift
    for domain in "$@"; do
      domain="${domain#www.}"
      if ! grep -qF "0.0.0.0 $domain $TAG" "$HOSTS"; then
        printf "0.0.0.0 %s %s\n" "$domain" "$TAG" >> "$HOSTS"
        printf "0.0.0.0 www.%s %s\n" "$domain" "$TAG" >> "$HOSTS"
      fi
    done
    dscacheutil -flushcache
    killall -HUP mDNSResponder 2>/dev/null || true
    ;;
  restore)
    # Remove only laan-block tagged lines
    sed -i '' "/$TAG$/d" "$HOSTS"
    dscacheutil -flushcache
    killall -HUP mDNSResponder 2>/dev/null || true
    ;;
  status)
    grep "$TAG" "$HOSTS" || echo "(no laan-block entries)"
    ;;
  *)
    echo "Usage: $0 {block|restore|status} [domains...]"
    exit 1
    ;;
esac
