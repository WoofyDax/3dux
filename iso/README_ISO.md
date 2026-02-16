# 3dux OS Demo — Ubuntu Live ISO

This folder contains scripts and config to build a **bootable Ubuntu 22.04 LTS Live ISO** that starts the 3dux web app in fullscreen Chromium kiosk mode.

**Entry point in the live system:** `file:///opt/3dux/index.html`  
**No CDN at runtime:** The app and MediaPipe WASM/models are under `/opt/3dux/` for offline use.

---

## Prerequisites

- **Build the app (offline) on your dev machine:**
  ```bash
  npm install
  npm run setup-mediapipe   # copies WASM to public/mediapipe/wasm, downloads .task models
  npm run build
  ```
  Output: `dist/` with `index.html`, JS/CSS assets, and `mediapipe/` (WASM + models). The build uses `base: './'` so it works from `file://` (e.g. on the Live ISO). **No CDN** at runtime.

- **Ubuntu 22.04 Desktop ISO:**  
  Download: https://releases.ubuntu.com/22.04/ubuntu-22.04.x-desktop-amd64.iso

- **For scripted/CLI method:** A Linux host (or WSL2 / VM) with:
  - `cubic` (for Cubic GUI method), or
  - `xorriso`, `squashfs-tools`, `casper`-style chroot (for CLI repack).

---

## What Gets Packaged

| Item | Location in live system |
|------|---------------------------|
| Built web app | `/opt/3dux/` (contents of `dist/`: `index.html`, JS/CSS, `mediapipe/`) |
| Kiosk autostart | `/etc/xdg/autostart/kiosk.desktop` (or user autostart) |
| Disable sleep script | `/opt/3dux/disable-sleep.sh` (run at session start) |

---

## Method A — Cubic (GUI, step-by-step)

1. **Install Cubic** (on Ubuntu):
   ```bash
   sudo add-apt-repository ppa:cubic-wizard/release
   sudo apt update
   sudo apt install cubic
   ```

2. **Start Cubic:** Choose “Next” to create a new project; select your **Ubuntu 22.04 Desktop ISO** and a project directory.

3. **First chroot (customize live system):**
   - When Cubic opens the chroot shell, run the setup script.  
     First copy `iso/setup-kiosk.sh` and `iso/disable-sleep.sh` and `iso/kiosk.desktop` into the chroot (e.g. mount the project folder or copy from host):
     ```bash
     # From host, copy into Cubic's chroot (path shown in Cubic):
     # e.g. /path/to/cubic/chroot
     sudo cp iso/setup-kiosk.sh /path/to/cubic/chroot/tmp/
     sudo cp iso/disable-sleep.sh /path/to/cubic/chroot/tmp/
     sudo cp iso/kiosk.desktop /path/to/cubic/chroot/tmp/
     ```
   - In the **chroot terminal** (inside Cubic):
     ```bash
     chmod +x /tmp/setup-kiosk.sh /tmp/disable-sleep.sh
     /tmp/setup-kiosk.sh
     ```
   - **Copy built app into chroot** (from host, adjust paths):
     ```bash
     sudo cp -r dist/* /path/to/cubic/chroot/opt/3dux/
     ```
   - Then in chroot ensure ownership:
     ```bash
     chown -R 999:999 /opt/3dux
     ```
     (999 is often the live user; or use the username Cubic shows for the live user.)

4. **Exit chroot** (Cubic will repack the squashfs).

5. **Second chroot (optional):** If Cubic prompts again, you can skip or add more packages.

6. **Generate ISO:** In Cubic, click “Generate” to produce the new ISO.

Result: Boot the new ISO → auto-login → kiosk starts with `file:///opt/3dux/index.html`.

---

## Method B — Scripted / CLI (reproducible)

Cubic does not provide a pure CLI; the reproducible approach is to use the same idea with a **manual chroot** or a **small script** that:

1. Mounts the original ISO and the squashfs.
2. Unsquashfs, chroot, runs `setup-kiosk.sh`, copies `dist/` → `/opt/3dux/`, copies `kiosk.desktop` and `disable-sleep.sh`.
3. Resquashfs and rebuilds the ISO with `xorriso`.

**Minimal CLI-style steps (run on a Linux host):**

```bash
# 1) Build app (on your machine)
npm run setup-mediapipe && npm run build

# 2) Prepare workspace
ISO=ubuntu-22.04.x-desktop-amd64.iso
WORK=./iso-work
mkdir -p "$WORK"/{iso,sq,mnt}
sudo mount -o loop "$ISO" "$WORK/mnt"
cp -r "$WORK/mnt/"* "$WORK/iso/"
sudo umount "$WORK/mnt"

# 3) Unpack squashfs (path may vary; check iso/casper/filesystem.squashfs)
sudo unsquashfs -d "$WORK/chroot" "$WORK/iso/casper/filesystem.squashfs"

# 4) Copy into chroot and run setup
sudo cp -r dist/* "$WORK/chroot/opt/3dux/"
sudo cp iso/setup-kiosk.sh iso/disable-sleep.sh iso/kiosk.desktop "$WORK/chroot/tmp/"
sudo chmod +x "$WORK/chroot/tmp/"*.sh
sudo chroot "$WORK/chroot" /tmp/setup-kiosk.sh

# 5) Repack squashfs and ISO (simplified; real repack needs xorriso and correct boot)
sudo mksquashfs "$WORK/chroot" "$WORK/iso/casper/filesystem.squashfs" -noappend
# Then use xorriso to build final ISO (see Cubic or casper docs for exact xorriso command).
```

For a **full, reproducible CLI** you’d script the exact xorriso command and any EFI/boot updates. The **recommended reproducible path** is still to use **Cubic once** and keep the same ISO generation steps (or export Cubic’s script if it generates one). See `notes.md` for VirtualBox and webcam gotchas.

---

## Autostart and kiosk behavior

- **kiosk.desktop** runs Chromium with:
  - `file:///opt/3dux/index.html`
  - `--kiosk --no-first-run --disable-infobars`
- **disable-sleep.sh** disables screen blanking and sleep (run by kiosk.desktop or session startup).
- **Optional:** To hide the cursor, add `--cursor=none` to the Chromium command in `kiosk.desktop` (if supported) or use a small fullscreen overlay; see `notes.md`.

---

## VirtualBox

- Use **EFI** if the ISO is EFI-bootable.
- Enable **3D acceleration** (Settings → Display → Enable 3D) for WebGL.
- For camera: **Devices → Webcams →** attach host webcam; grant camera to Chromium in the guest.
- See **iso/notes.md** for more VirtualBox and webcam notes.

---

## Files in this folder

| File | Purpose |
|------|--------|
| **README_ISO.md** | This file — full instructions |
| **kiosk.desktop** | Autostart entry: Chromium kiosk + disable-sleep |
| **setup-kiosk.sh** | Installs Chromium, creates `/opt/3dux`, configures autostart and optional auto-login |
| **disable-sleep.sh** | Disables screen blanking and sleep |
| **notes.md** | VirtualBox 3D, webcam, cursor, gotchas |

---

## Summary

1. Build app: `npm run setup-mediapipe && npm run build` → `dist/`.
2. Build ISO with **Cubic** (GUI) or **CLI** (unsquashfs + chroot + repack).
3. Inside live system: app at `/opt/3dux/`, kiosk autostart and no sleep.
4. Test in VirtualBox with 3D acceleration and webcam attached.
