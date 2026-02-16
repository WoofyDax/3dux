#!/bin/bash
# Disable screen blanking and sleep for kiosk. Safe to run as live user.

# GSettings (GNOME / Ubuntu desktop)
for schema in org.gnome.desktop.screensaver org.gnome.settings-daemon.plugins.power; do
  gsettings set "$schema" idle-dim false 2>/dev/null || true
  gsettings set "$schema" sleep-inactive-ac-timeout 0 2>/dev/null || true
  gsettings set "$schema" sleep-inactive-battery-timeout 0 2>/dev/null || true
done
gsettings set org.gnome.desktop.session idle-delay 0 2>/dev/null || true

# X11: disable DPMS and screen blank
xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true
xset s noblank 2>/dev/null || true
