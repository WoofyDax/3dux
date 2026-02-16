#!/bin/bash
# Run inside Cubic chroot (or live system) to install Chromium, create /opt/3dux,
# install kiosk autostart and optionally configure auto-login.
# Built app files (dist/*) must be copied to /opt/3dux/ before or after this script.

set -e

# Install Chromium (minimal deps for kiosk)
apt-get update -qq
apt-get install -y chromium-browser || apt-get install -y chromium

# Ensure /opt/3dux exists (contents copied separately from host dist/)
mkdir -p /opt/3dux
chmod 755 /opt/3dux

# Copy scripts into place (assumed run from chroot with files in /tmp)
if [ -f /tmp/disable-sleep.sh ]; then
  cp /tmp/disable-sleep.sh /opt/3dux/
  chmod 755 /opt/3dux/disable-sleep.sh
fi

# Autostart for all users (live session typically has one user)
if [ -f /tmp/kiosk.desktop ]; then
  mkdir -p /etc/xdg/autostart
  cp /tmp/kiosk.desktop /etc/xdg/autostart/
  chmod 644 /etc/xdg/autostart/kiosk.desktop
fi

# Optional: auto-login for live user (Ubuntu 22.04 live user is often "ubuntu")
# Uncomment and set USER to your live username if you want auto-login.
# USER=ubuntu
# mkdir -p /etc/gdm3
# printf '[daemon]\nAutomaticLogin=%s\nAutomaticLoginEnable=True\n' "$USER" > /etc/gdm3/custom.conf 2>/dev/null || true
# For lightdm (some Ubuntu flavours):
# echo "autologin-user=$USER" >> /etc/lightdm/lightdm.conf 2>/dev/null || true

echo "setup-kiosk.sh done. Ensure dist/ contents are in /opt/3dux/ (index.html, assets, mediapipe/)."
