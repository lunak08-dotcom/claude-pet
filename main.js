const { app, BrowserWindow, Menu, Tray, ipcMain, screen, nativeImage } = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");

const STATUS_FILE = path.join(os.homedir(), ".claude", "pet-status.json");
const ICON = path.join(__dirname, "assets", "character.png");

const WIN_W = 100;
const WIN_H = 150;

let win = null;
let tray = null;
let lastState = "";

function readState() {
  try {
    const raw = fs.readFileSync(STATUS_FILE, "utf8");
    const data = JSON.parse(raw);
    // 마지막 갱신이 너무 오래되면(예: 6시간) sleeping 처리
    if (data.ts && Date.now() - data.ts > 6 * 60 * 60 * 1000) return "sleeping";
    return data.state || "idle";
  } catch {
    return "idle";
  }
}

function pushState(force) {
  const s = readState();
  if (!force && s === lastState) return;
  lastState = s;
  if (win && !win.isDestroyed()) win.webContents.send("pet-state", s);
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x: width - WIN_W - 24,
    y: height - WIN_H - 16,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile(path.join(__dirname, "index.html"));

  win.webContents.on("did-finish-load", () => pushState(true));

  // 상태 파일 폴링 (OneDrive/네트워크 경로에서도 안정적)
  setInterval(() => pushState(false), 600);
}

function buildTray() {
  let img = nativeImage.createFromPath(ICON);
  if (!img.isEmpty()) img = img.resize({ width: 20, height: 20 });
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img);
  tray.setToolTip("Claude 펫");

  const menu = Menu.buildFromTemplate([
    {
      label: "보이기 / 숨기기",
      click: () => {
        if (!win) return;
        win.isVisible() ? win.hide() : win.show();
      }
    },
    {
      label: "구석으로 보내기",
      click: () => {
        if (!win) return;
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        win.setPosition(width - WIN_W - 24, height - WIN_H - 16);
      }
    },
    { type: "separator" },
    { label: "종료", click: () => app.quit() }
  ]);

  tray.setContextMenu(menu);
  tray.on("click", () => {
    if (win) win.isVisible() ? win.hide() : win.show();
  });
}

// 렌더러에서 드래그로 창 이동
ipcMain.on("pet-drag", (_e, { dx, dy }) => {
  if (!win) return;
  const [x, y] = win.getPosition();
  win.setPosition(Math.round(x + dx), Math.round(y + dy));
});

ipcMain.on("pet-quit", () => app.quit());

app.whenReady().then(() => {
  createWindow();
  buildTray();
});

app.on("window-all-closed", (e) => {
  // 트레이로 계속 살아있게 함
});
