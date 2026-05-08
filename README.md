# 🎥 Niyantran Stealth Recorder

Niyantran is a full-stack proof-of-concept application built with React Native (Android) and Go (Backend). It is designed to demonstrate true background "stealth" camera recording.

When the foreground service is activated, the app will run silently in the background and record 15-second video clips using the device's front-facing camera. These videos are then automatically and invisibly uploaded to the connected backend server.

---

## 🛠 Tech Stack
- **Frontend**: React Native (0.74+) / Native Android (Java)
- **Backend**: Go (Gin Framework)
- **Networking**: OkHttp (Android), ADB Reverse Proxy (USB)

---

## 🚀 How to Run

### 1. Start the Go Backend
The Go backend handles receiving and saving the video `.mp4` files.

1. Open a terminal and navigate to the `backend` folder.
2. Start the server:
   ```bash
   go run .
   ```
3. The server will run on port `8000`. By default, it temporarily bypasses PostgreSQL database requirements to allow for immediate testing of the `/uploads` route.
4. Uploaded videos will be saved locally inside the `backend/uploads/` directory with a unique timestamp.

> [!NOTE]
> *If you wish to re-enable database integration, uncomment the `InitDB()` function in `backend/main.go` and ensure you provide a valid `.env` file.*

### 2. Connect Your Phone via USB
This project uses **ADB Reverse Proxy** to completely bypass Wi-Fi configurations and Windows Firewall blocks. By forwarding the port over the USB cable, the connection is instantly secure and extremely fast.

1. Plug your Android phone into your PC via a USB cable.
2. Run the following ADB command to pipe the network connection:
   ```bash
   adb reverse tcp:8000 tcp:8000
   ```
*(This ensures that when the Android app hits `localhost:8000`, it actually hits your computer's `8000` port!)*

### 3. Run the Android App
1. Open a terminal and navigate to the `frontend` folder.
2. Compile and launch the app:
   ```bash
   npm run android
   ```
3. Once the app launches, grant the necessary Camera and Microphone permissions.
4. Click **START SERVICE** to initiate the stealth recorder.

---

## ⚙️ How Stealth Mode Works
Because Android 11+ heavily restricts background camera access, the app relies on a specialized `ForegroundService` combined with an invisible `SurfaceTexture`. 

1. **Start**: The user presses "Start Service" in the React Native UI.
2. **Elevate**: The app elevates itself using a `camera|microphone` Foreground Service, showing a persistent sticky notification.
3. **Record**: Every 10 minutes (configurable in `ForegroundService.java`), the app grabs the front-facing camera lens, attaches it to an invisible 1-pixel `SurfaceTexture`, and silently writes to a temporary MP4 file cache.
4. **Upload**: After 15 seconds of recording, the camera closes, and `OkHttp` streams the file over the USB cable directly to the Go server.
5. **Clean up**: The temporary cache file is automatically wiped from the phone.

All of this happens without the native Android camera app ever opening. Live execution logs will stream from the background Java threads directly into the React Native console UI via `DeviceEventEmitter`.
