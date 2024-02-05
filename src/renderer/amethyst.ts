import { Player } from "@/logic/player";
import { MediaSession } from "@/mediaSession";
import { Shortcuts } from "@/shortcuts";
import { Store } from "@/state";
import { MediaSourceManager } from "@/logic/mediaSources";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";
import {NavigationBar} from "@hugotomazi/capacitor-navigation-bar";
import { ALLOWED_AUDIO_EXTENSIONS } from "@shared/constants";
import { OpenDialogReturnValue, SaveDialogReturnValue } from "electron";
import { watch } from "vue";
import { flattenArray } from "./logic/math";
import { Track } from "./logic/track";
import { Directory } from "@capacitor/filesystem";
import { router } from "./router";
import "./logic/subsonic";
import { createI18n } from "vue-i18n";
import messages from "@intlify/unplugin-vue-i18n/messages";
import { tauriUtils } from "@/tauri-utils";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { useLocalStorage } from "@vueuse/core";

export const i18n = createI18n({
  fallbackLocale: "en-US", // set fallback locale
  locale: localStorage.getItem("settings") !== null ? JSON.parse(localStorage.getItem("settings")!).language : "en-US",
  messages,
});

export type AmethystPlatforms = ReturnType<typeof amethyst.getCurrentPlatform>;
export const favoriteTracks = useLocalStorage<string[]>("favoriteTracks", []);

/**
 * Handles interfacing with operating system and unifies methods 
 * to a simple form for all the platforms
 */
class AmethystBackend {
  public constructor() {
    if (AmethystBackend.isPlatformTauri) tauriUtils.init();
    console.log(`Current platform: ${this.getCurrentPlatform()}`);
    console.log(`Current operating system: ${this.getCurrentOperatingSystem()}`);
    console.log(`Current Runtime: ${AmethystBackend.isPlatformTauri ? 'Tauri' : AmethystBackend.isPlatformMobile ? 'Mobile' : 'Electron' }`)
  }

  private static isPlatformMobile = Capacitor.isNativePlatform();

  private static isPlatformTauri = window.__TAURI__ !== undefined; // check if "__TAURI__" is not undefined, then we are running through Tauri

  private static isPlatformDesktop = navigator.userAgent.indexOf("Electron") >= 0 || AmethystBackend.isPlatformTauri;

  private static isPlatformWeb = !AmethystBackend.isPlatformMobile && !AmethystBackend.isPlatformDesktop;

  private static isOperatingSystemLinux = this.isPlatformDesktop && AmethystBackend.isPlatformTauri ? window.navigator.userAgent.indexOf("Linux") >= 0 : window.electron.isLinux;

  private static isOperatingSystemWindows = this.isPlatformDesktop && AmethystBackend.isPlatformTauri ? window.navigator.userAgent.indexOf("Windows") >= 0 : window.electron.isWindows;

  private static isOperatingSystemMac = this.isPlatformDesktop && AmethystBackend.isPlatformTauri ? window.navigator.userAgent.indexOf("Macintosh") >= 0 : window.electron.isMac;

  public getCurrentPlatform() {
    if (Amethyst.isPlatformDesktop) return "desktop"; // aka Electron
    if (Amethyst.isPlatformMobile) return "mobile"; // aka Capacitor
    if (Amethyst.isPlatformWeb) return "web"; // aka Webapp
    throw new Error("Unknown platform");
  }

  public getCurrentRuntime() {
    if (Amethyst.isPlatformTauri) return "tauri";
    if (Amethyst.isPlatformMobile) return "mobile";
    if (Amethyst.isPlatformWeb) return "web";
    return "electron";
  }

  public getCurrentOperatingSystem() {
    if (Amethyst.isPlatformDesktop) {
      if (Amethyst.isOperatingSystemLinux) return "linux";
      if (Amethyst.isOperatingSystemWindows) return "windows";
      if (Amethyst.isOperatingSystemMac) return "mac";
      throw new Error("Unknown operating system");
    }
    if (Amethyst.isPlatformWeb) {
      if (window.navigator.userAgent.indexOf("Windows") != -1) return "windows";
      if (window.navigator.userAgent.indexOf("Mac") != -1) return "mac";
      if (window.navigator.userAgent.indexOf("X11") != -1) return "unix";
      if (window.navigator.userAgent.indexOf("Linux") != -1) return "linux";
      throw new Error("Unknown operating system");
    }
    if (Amethyst.isPlatformMobile) {
      return "android";
    }
    throw new Error("Unknown operating system");
  }

  public async openLink(url: string) {
    switch (this.getCurrentRuntime()) {
      case "electron":
        return window.electron.ipcRenderer.invoke("open-external", [url]);
      case "web":
        const openLinkInNewTab = (url: string) => {
          const newWindow = window.open(url, "_blank", "noopener,noreferrer");
          if (newWindow) {
            newWindow.opener = null;
          }
        };
        return openLinkInNewTab(url);
      default:
        return Promise.reject();
    }
  }

  public async showItem(path: string, showInExplorer: boolean = false) {
    switch (this.getCurrentRuntime()) {
      case "electron":
        return window.electron.ipcRenderer.invoke("show-item", [path]); 
      case "tauri":
        {
          if (showInExplorer)
          {
            const { invoke } = await import("@tauri-apps/api/tauri");
            return invoke('open_shell', { location: await tauriUtils.tauriGetRootDirectory(path) });
          }
          else
          {
            const { invoke } = await import("@tauri-apps/api/tauri");
            return invoke('open_shell', { location: path });
          }
        }
      default:
        return Promise.reject();
    }
  }

  private filesToBlobs(files: FileList): Promise<Blob>[] {
    const promises: Promise<Blob>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const promise = new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const blob = new Blob([reader.result as ArrayBuffer]);
          resolve(blob);
        };
        reader.onerror = () => {
          reject(new Error(`Failed to read file "${file.name}"`));
        };
        reader.readAsArrayBuffer(file);
      });
      promises.push(promise);
    }
    return promises;
  }

  public async showOpenFileDialog(options?: Electron.OpenDialogOptions): Promise<OpenDialogReturnValue> {
    switch (this.getCurrentRuntime()) {
      case "electron":
        return window.electron.ipcRenderer.invoke<OpenDialogReturnValue>("open-file-dialog", [options]);
      case "web":
        const fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.multiple = true;
          fileInput.click();

        // TODO: make a AmethystFile and AmethystAudioFile classes to manage this bullshit easily
        return new Promise((res, rej) => {
          fileInput.addEventListener("change", async event => {
            const files = (event.target as HTMLInputElement).files;
            if (!files) rej("no files");
            const blobs = await Promise.all(this.filesToBlobs(files!));
            const paths = blobs.map(blob => URL.createObjectURL(blob));
            files ? res({canceled: false, filePaths: paths}) : rej();
          });
        });
      case "mobile":
        return new Promise(async (res, rej) => {
          // use capacitor to implement getting a file path
          const {FilePicker} = await import("@capawesome/capacitor-file-picker");
          const result = await FilePicker.pickFiles({ readData: true, types: ["application/json", "text/comma-separated-values", "text/*"]});
          const path = result.files.map(file => file.path!)[0];
          path ? res({canceled: false, filePaths: [decodeURIComponent(path)]}) : rej();
        });
      case "tauri":
        const { invoke } = await import("@tauri-apps/api/tauri");
        return await invoke('pick_file', {});
      default:
        return Promise.reject();
    }
  }
  
  public async showOpenFolderDialog() {
    switch (this.getCurrentRuntime()) {
      case "electron":
        return window.electron.ipcRenderer.invoke<OpenDialogReturnValue>("open-folder-dialog");
      case "tauri":
        const { invoke } = await import("@tauri-apps/api/tauri");
        return await invoke('pick_folder', {});
      default:
        return Promise.reject();
    }
  }

  public async showSaveFileDialog(options?: Electron.SaveDialogOptions) {
    switch (this.getCurrentRuntime()) {
      case "electron":
        return window.electron.ipcRenderer.invoke<SaveDialogReturnValue>("show-save-dialog", [options]);
      case "tauri":
        const { save } = await import("@tauri-apps/api/dialog");
        // @ts-ignore
        return await save({ title: options?.title, filters: [{ name: 'Extension', extensions: options?.filters[0].extensions }] });
      default:
        return Promise.reject();
    }
  }

  public async writeFile(data: string | Buffer, path: string) {
    switch (this.getCurrentRuntime()) {
      case "electron":
        return window.fs.writeFile(path, data);
      case "tauri":
        if (data instanceof Buffer)
            return await tauriUtils.tauriWriteBuffer(path, data);
          return await tauriUtils.tauriWrite(path, data);
      default:
        return Promise.reject();
    }
  };

  public openAudioFilesAndAddToQueue = async () => {
    amethyst.showOpenFileDialog({filters: [{ name: "Audio", extensions: ALLOWED_AUDIO_EXTENSIONS }]}).then(result => {
      !result.canceled && amethyst.player.queue.add(result.filePaths);
    }).catch(error => console.error(error));
  };
  
  public openAudioFoldersAndAddToQueue = async () => {
    // amethyst.showOpenFolderDialog().then(result => {
    //   !result.canceled && amethyst.player.queue.add(flattenArray(result.filePaths));
    // }).catch(error => console.error(error));
  };
}

export class Amethyst extends AmethystBackend {
  public VERSION = APP_VERSION;
  // @ts-ignore
  public IS_DEV = import.meta.env.DEV;
  public APPDATA_PATH: string | undefined;

  public store: Store = new Store();
  public shortcuts: Shortcuts = new Shortcuts();
  public player = new Player();
  public mediaSession: MediaSession | undefined = this.getCurrentPlatform() === "desktop" ? new MediaSession(this.player) : undefined;
  public mediaSourceManager: MediaSourceManager = new MediaSourceManager(this.player, this.store, this);

  public constructor() {
    super();
    // Init zoom from store
    document.body.style.zoom = this.store.settings.value.zoomLevel;

    if (this.getCurrentPlatform() === "desktop") {

      if (this.getCurrentRuntime() == 'electron')
      {
        window.electron.ipcRenderer.invoke<string>("get-appdata-path").then(path => this.APPDATA_PATH = path);

        window.electron.ipcRenderer.on("maximize", () => this.store.state.isMaximized = true);
        window.electron.ipcRenderer.on("unmaximize", () => this.store.state.isMaximized = false);
        window.electron.ipcRenderer.on("minimize", () => this.store.state.isMinimized = true);
        window.electron.ipcRenderer.on("focus", () => this.store.state.isFocused = true);
        window.electron.ipcRenderer.on("unfocus", () => this.store.state.isFocused = false);

        window.electron.ipcRenderer.on("update", () => this.store.state.updateReady = true);

        window.electron.ipcRenderer.on<string>("play-file", path => path !== "--require" && amethyst.player.queue.add(path).then(() => {
          amethyst.player.play(amethyst.player.queue.getList().findIndex(track => track.path == path));
        }));
        window.electron.ipcRenderer.on<(string)[]>("play-folder", paths => amethyst.player.queue.add(flattenArray(paths)));
      }

      if (this.getCurrentRuntime() == 'tauri')
      {
        listen("open-file", (e) => {
          amethyst.player.queue.add(e.payload.files);
        });

        listen("open-folder", async (e) => {
          const entries = await tauriUtils.tauriReadFolder(e.payload.folder);
          for (const entry of entries) {
            amethyst.player.queue.add(entry.path);
          }
        });

        listen("add-source", async (e) => {
          await this.mediaSourceManager.addLocalSource();
        });

        listen("goto-settings", () => {
          router.push({ name: 'settings.appearance' });
        });
    
        listen("clear-queue", () => {
          amethyst.player.queue.clear();
        });
    
        listen("clear-error", () => {
          amethyst.player.queue.clearErrored();
        });
    
        listen("refresh-metadata", () => {
          amethyst.player.queue.fetchAsyncData(true);
        });

        invoke('init_presence', {});
        document.addEventListener('contextmenu', event => event.preventDefault());
      }
  
      // #region move this to the discord plugin
      let richPresenceTimer: NodeJS.Timer | undefined;

      const updateRichPresence = async(track: Track) => {
        const sendData = async () => {
        const args = [
          track.getArtistsFormatted() && track.getTitleFormatted() ? `${track.getArtistsFormatted()} - ${track.getTitleFormatted()}` : track.getFilename(),
            this.player.isPaused.value ? "Paused" : `${this.player.currentTimeFormatted(true)} - ${track.getDurationFormatted(true)}`,
            track.metadata.data?.format.container?.toLowerCase() || "unknown format"
          ];

          const [title, time, format] = args;
          if (this.getCurrentRuntime() == 'tauri')
          {
            const { invoke } = await import("@tauri-apps/api/tauri");
            invoke('update_presence', {  title: title, time: time, format: format });
          }
          else
          {
            window.electron.ipcRenderer.invoke("update-rich-presence", [args]);
          }
        };

        richPresenceTimer && clearInterval(richPresenceTimer);
        sendData();
        richPresenceTimer = setInterval(() => sendData(), 1000);
      };

      const updateWithCurrentTrack = () => {
        const currentTrack = this.player.getCurrentTrack();
        if (localStorage.getItem('settings') !== null ? JSON.parse(localStorage.getItem('settings')!).useDiscordRichPresence : true)
          currentTrack && updateRichPresence(currentTrack);
      };

      if (this.store.settings.value.useDiscordRichPresence) {
        this.player.on("play", () => {
          updateWithCurrentTrack();
        });
      };

      watch(() => this.store.settings.value.useDiscordRichPresence, value => {
        value ? updateWithCurrentTrack() : richPresenceTimer && clearInterval(richPresenceTimer);
      });
      // #endregion
    }

    // use this or runtime?
    if (this.getCurrentPlatform() === "mobile") {
      this.initMobile();
    }

    document.addEventListener("drop", event => {
      event.preventDefault();
      event.stopPropagation();

      amethyst.player.queue.add(Array.from(event.dataTransfer!.files).filter(f => {
        const path = f.path;
        const fileExt = path.split(".").pop();
        if (ALLOWED_AUDIO_EXTENSIONS.includes((fileExt ?? "").toLowerCase())) {
          return true;
        }
        return false;
      }).map(f => f.path));
      amethyst.player.play(amethyst.player.queue.getList()[amethyst.player.queue.getList().length - 1]);
    });

    document.addEventListener("dragover", e => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  public openDevTools() {
    if (this.getCurrentPlatform() !== "desktop" && this.getCurrentRuntime() == 'tauri') return;

    window.electron.ipcRenderer.invoke("dev-tools");
  }

  public openSettings = () => {
    router.push({ name: "settings.appearance" });
  };

  public importSettings = async () => {
    const dialog = await amethyst.showOpenFileDialog({
      filters: [{ name: "Amethyst Configuration File", extensions: ["acf"] }],
      defaultPath: "Amethyst Settings",
    });
    
    // @ts-expect-error
    if (this.getCurrentRuntime() == 'tauri' ? !dialog[0] : dialog?.canceled || !dialog?.filePaths[0]) return;
    
    // @ts-ignore
    const loadedSettings = this.getCurrentRuntime() == 'tauri' ? await tauriUtils.tauriFetch(dialog[1]) : await fetch(dialog.filePaths[0]);
    const parsedSettings = this.getCurrentRuntime() == 'tauri' ? JSON.parse(loadedSettings) : await loadedSettings.json();
  
    Object.keys(amethyst.store.settings.value).forEach(key => {
      // @ts-ignore
      amethyst.store.settings.value[key] = parsedSettings[key];
    });
  };
  
  public exportSettings = async () => {
    const dialog = await amethyst.showSaveFileDialog({
      filters: [{ name: "Amethyst Configuration File", extensions: ["acf"] }],
      defaultPath: "Amethyst Settings"
    });

    if (this.getCurrentRuntime() == 'tauri' ? !dialog : dialog?.canceled || !dialog?.filePath) return;

    return amethyst.writeFile(JSON.stringify(amethyst.store.settings.value, null, 2), this.getCurrentRuntime() == 'tauri' ? dialog : dialog?.filePath);
  };

  public resetSettings = () => {
		Object.keys(this.store.defaultSettings).forEach(key => {
      // @ts-ignore
      this.store.settings.value[key] = this.store.defaultSettings[key];
    });
  };

  public reload = () => {
    location.reload();
  };

  public zoom(action: "in" | "out" | "reset") {
    const currentZoom = amethyst.store.settings.value.zoomLevel;
    let newZoom = currentZoom;

    switch (action) {
      case "in":
        newZoom = currentZoom + .125;
        break;
      case "out":
        newZoom = currentZoom - .125;
        break;
      case "reset":
        newZoom = amethyst.store.defaultSettings.zoomLevel;
        break;
    }

    // Update store with new zoom level
    amethyst.store.settings.value.zoomLevel = newZoom;

    // Set new zoom level
    document.body.style.zoom = newZoom;
  }

  public performWindowAction(action: "close" | "maximize" | "unmaximize" | "minimize"): void {
    if (this.getCurrentPlatform() === "desktop") {
      if (this.getCurrentRuntime() !== 'tauri')
        window.electron.ipcRenderer.invoke(action).then(() => this.syncWindowState());
    } else {
      throw new Error(`${this.performWindowAction.name} can only be executed when running in 'desktop' (electron) client`);
    }
  }

  private syncWindowState = async () => {
    const windowState = await window.electron.ipcRenderer.invoke<{ isMinimized: boolean; isMaximized: boolean }>("sync-window-state");
    this.store.state.isMinimized = windowState.isMinimized;
    this.store.state.isMaximized = windowState.isMaximized;
  };

  private async initMobile() {
    switch (this.getCurrentOperatingSystem()) {
      case "android":
        await StatusBar.setBackgroundColor({color: "#0f1119"});
        await NavigationBar.setColor({color: "#181a27"});
        break;
      default:
        break;
    }

    this.loadMusicFolder();
  }

  /**
   * Loads all the music in Documents/Music to the queue
   * @mobile_only
   */
  private loadMusicFolder = async () => {
    const { Filesystem } = await import("@capacitor/filesystem");
    const evalPermission = async () => {
      const status = await Filesystem.requestPermissions();
      if (status.publicStorage == "denied") evalPermission();
    };

    const evalMusicFolder = async () => {
      Filesystem.stat({ directory: Directory.Documents, 
        path: "Music" }).catch(() => {
          Filesystem.mkdir({ directory: Directory.Documents, 
            path: "Music", recursive: true })
          .then(() => {
            console.log("Created music folder in Documents/Music");
          }).catch(err => {
            console.log(err);
          });
        });
    };

    await evalPermission();
    await evalMusicFolder();
    const {files} = await Filesystem.readdir({
      path: "Music",
      directory: Directory.Documents,
    });
    
    this.player.queue.add(files.map(file => Capacitor.convertFileSrc(file.uri)));
  };

  public async checkForUpdates() {
    this.store.state.isCheckingForUpdates = true;
    try {
      switch (this.getCurrentPlatform()) {
        case "desktop":
          await window.electron.ipcRenderer.invoke("check-for-updates");
          break; 
        default:
          break;
      }
        
    } catch (error) {
      console.log(error);
    }
    this.store.state.isCheckingForUpdates = false;
  }

}

export const amethyst = new Amethyst();

export const useState = () => amethyst.store;
export const useShortcuts = () => amethyst.shortcuts;

// interface IPluginDefinitionParameters {
//   store: Store, 
//   electron: ElectronEventManager, 
//   shortcuts: Shortcuts, 
//   player: Player
// }

// export const definePlugin = (register: (options: IPluginDefinitionParameters) => any) => {
//   const {store, electron, shortcuts} = amethyst;
//   const plugin = register({store, electron, shortcuts, player});
//   console.log(plugin);
// };
