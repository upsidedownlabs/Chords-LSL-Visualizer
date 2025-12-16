#  Chords LSL Visualizer

**Rust + Next.js + Tauri** application to discover **Lab Streaming Layer (LSL)** streams and visualize **multi‑channel biopotential signals**.


## System Requirements

### Supported Operating Systems

* Windows 10 / 11
* macOS
* Linux

### Important Note About LSL

This application **does not generate data**.

You must already have **an LSL stream running** (e.g. EEG, EMG, ECG, or any custom LSL producer) on your local machine or network.

---

## 3. Prerequisites & Installation

### 3.1 Node.js (Required)

* Version **20 or higher**
* Download: [https://nodejs.org](https://nodejs.org)

Verify installation:

```bash
node -v
npm -v
```

---

### 3.2 Rust Toolchain (Required)

Install Rust using `rustup`:

[https://rustup.rs](https://rustup.rs)

Verify installation:

```bash
rustc --version
cargo --version
```

---

### 3.3 Tauri CLI (Required)

Install Tauri CLI version 2:

```bash
cargo install tauri-cli --locked
```

Verify:

```bash
tauri --version
```

---

### 3.4 CMake (Required on Windows)

LSL builds native C++ libraries on Windows. **CMake is mandatory**.

1. Download from: [https://cmake.org/download/](https://cmake.org/download/)
2. Run the installer
3. **Select**: "Add CMake to system PATH"
4. Restart your terminal (or PC)

Verify:

```bash
cmake --version
```

---

### 3.5 Visual Studio Build Tools (Windows Only)

Install from:
[https://visualstudio.microsoft.com/visual-cpp-build-tools/](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

During installation select:

* Desktop development with C++
* MSVC toolset (v142 or v143)
* Windows 10/11 SDK
* CMake tools

Verify compiler:

```cmd
cl
```

---

## 4. Project Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/upsidedownlabs/Chords-LSL-Visualizer.git
cd Chords-LSL-Visualizer
npm install
```

---

## 5. Running the App

You can run the app in **two modes**.

---

### Desktop App 

Runs **Next.js + Tauri + Rust backend** together.

```bash
npm run tauri dev
```

Alternative command:
```bash
cargo tauri dev
```


This will:

* Start the frontend dev server
* Compile the Rust backend
* Launch a native desktop window

The first build may take several minutes.

---

## 6. Building Desktop Installers

### Build Installers

```bash
npm run tauri build
```

Generated installers can be found in:

```
src-tauri/target/release/bundle/
```

Output formats depend on OS:

* Windows: `.msi`
* macOS: `.dmg`
* Linux: `.deb`, `.rpm`

---

## 7. Using the App

### 7.1 Launch

Open the app using:

* Web preview **or**
* Desktop application

---

### 7.2 Scan for LSL Streams

1. Click **Scan LSL Stream**
2. Wait for available streams to appear
3. Select a stream
4. Click **Visualize**

---

### 7.3 Filters

Open the **Filter** panel to:

* Enable **Notch filter** (50 Hz or 60 Hz)
* Apply **EXG presets**
* Apply filters per channel or to all channels

---

### 7.4 Channel Control

* Click the **⚙️ Gear icon**
* Enable / disable individual channels
* Use **Select All** to enable all channels

---

### 7.5 Zoom Control

* Slider range: **1× – 10×**
* Adjusts signal amplitude scaling

---

### 7.6 Time Base Control

* Window range: **1 – 10 seconds**
* Controls how much signal history is visible

---

### 7.7 Disconnect

Click **Disconnect** to safely stop the stream.

---

## 8. Helpful Scripts

| Command               | Description                 |
| --------------------- | --------------------------- |
| `npm run dev`         | Run web preview             |
| `npm run tauri dev`   | Run desktop app in dev mode |
| `npm run build`       | Build frontend              |
| `npm run tauri build` | Build desktop installers    |

---

## 9. Troubleshooting

### No LSL Streams Found

* Ensure LSL source is running
* Ensure same network / subnet
* Click **Refresh** and scan again

---

### Connected but No Data

* Disconnect and reconnect
* Verify sample rate and channel count
* Confirm source is actively sending data

---

### CMake or `lsl-sys` Build Errors (Windows)

Verify:

```bash
cmake --version
```

If missing:

* Reinstall CMake
* Ensure PATH option is selected
* Restart terminal or system

---

## 12. Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test locally
5. Open a Pull Request

---

## 13. License
