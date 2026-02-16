# 3dux ISO — VirtualBox, Webcam, and Gotchas

## VirtualBox

### 3D acceleration (WebGL)
- **Settings → Display → Screen:** Enable **3D Acceleration**.
- Allocate enough **Video Memory** (e.g. 128 MB).
- Without 3D, Three.js may fall back to software rendering or fail; the box/parallax effect needs GPU.

### Boot and EFI
- If the Ubuntu 22.04 ISO is EFI-bootable, use **EFI** in VM settings (Settings → System → Enable EFI) for a smoother boot.
- Otherwise leave EFI off and use legacy boot.

### RAM and CPU
- Give the VM at least **2 GB RAM**; 4 GB is safer for Chromium + MediaPipe.
- **2+ CPUs** recommended for camera and ML.

---

## Webcam / camera

- **Devices → Webcams →** attach your host webcam to the guest.
- In the live session, **grant camera access** when Chromium prompts (or in Chromium settings).
- If the camera doesn’t open:
  - Confirm the webcam device is passed through (e.g. `/dev/video0` in guest).
  - Try starting Chromium from a terminal to see any permission or device errors.
- The app is designed to work **without camera** (mouse fallback); the ISO should still boot and show the UI if the camera is unavailable.

---

## Cursor (optional hide)

- To hide the cursor in kiosk, you can add to the Chromium command in `kiosk.desktop`:
  - `--cursor=none` (if your Chromium build supports it), or
  - Run a small fullscreen transparent window that captures the cursor (e.g. `unclutter` or a custom overlay).
- Default is cursor visible.

---

## Known gotchas

1. **file:// and CORS**
   - The app is loaded from `file:///opt/3dux/index.html`. All assets (JS, WASM, models) are under `/opt/3dux/` so same-origin is fine. No CORS issues if everything is local.

2. **MediaPipe models**
   - `face_landmarker.task` and `hand_landmarker.task` must be present in `/opt/3dux/mediapipe/`. They are included when you copy the full `dist/` (after `npm run setup-mediapipe && npm run build`) into the chroot.

3. **Chromium vs Chrome**
   - The script uses `chromium-browser` (or `chromium`). On Ubuntu 22.04 this is the snap or deb package. If you use a different Chromium/Chrome path in the chroot, update `kiosk.desktop` accordingly.

4. **Auto-login**
   - Ubuntu Live usually logs in automatically. If your custom ISO does not, uncomment and set the `USER` in `setup-kiosk.sh` and configure GDM or LightDM as in the script comments.

5. **First boot delay**
   - First boot may take a while (unpacking squashfs, generating locales). Wait for the desktop; then the kiosk autostart will run.

6. **Testing without building ISO**
   - To test the same stack: boot a normal Ubuntu 22.04 VM, copy `dist/` to `/opt/3dux/`, run `setup-kiosk.sh` (with scripts in place), then log out and back in (or run the `Exec` from `kiosk.desktop` manually).
