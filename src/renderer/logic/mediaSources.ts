import { ALLOWED_AUDIO_EXTENSIONS } from "@shared/constants";
import { Track } from "./track";
import { Ref, ref } from "vue";
import { Player } from "./player";
import { Store } from "@/state";
import { invoke } from '@tauri-apps/api/tauri';
import { tauriUtils } from "@/tauri-utils";
import { Amethyst } from "@/amethyst";

export enum MediaSourceType {
  LocalFolder = "settings.media_source_type.local_folder",
  Generic = "settings.media_source_type.generic",
}

export class MediaSourceManager {
  public mediaSources = ref<MediaSource[]>([]);
  private readonly amethyst: Amethyst;
 
  public constructor(protected player: Player, protected store: Store, amethyst: Amethyst) {
    this.amethyst = amethyst;
    this.store.settings.value.saveMediaSources.forEach(savedSource => {
      if (savedSource.path) {
        this.mediaSources.value.push(new LocalMediaSource(this.player, this.store, savedSource.path, amethyst));
      }
    });
  }

  public addLocalSource = async () => {
      const dialog = await this.amethyst.showOpenFolderDialog();
      const path = this.amethyst.getCurrentRuntime() == 'tauri' ? dialog[1] : dialog.filePaths[0];
    
      if (this.amethyst.getCurrentRuntime() == 'tauri' ? !dialog[0] : dialog.canceled || !path) return;
    
      // Avoid adding folders if they already exist
      if (this.store.settings.value.saveMediaSources.some(savedSource => savedSource.path == path)) return;

      const mediaSource = new LocalMediaSource(this.player, this.store, path, this.amethyst);
      
      if (mediaSource.type && mediaSource.path) {
        this.store.settings.value.saveMediaSources.push({type: mediaSource.type, path: mediaSource.path});
        this.mediaSources.value.push(mediaSource);
      }
  };
  
  public removeMediaSource = async (mediaSource: MediaSource) => {
    const savedMediaSource = { type: mediaSource.type, path: mediaSource.path };
    const index = this.store.settings.value.saveMediaSources.findIndex(s => s.path == savedMediaSource.path);
    if (index == -1) return;
    this.store.settings.value.saveMediaSources.splice(index, 1);
    this.mediaSources.value.splice(index, 1);
  };
}

export class MediaSource {
  public type: MediaSourceType = MediaSourceType.Generic;
  public totalTracks: Ref<Number> = ref(0);  
  public totalBytes: Ref<Number> = ref(0);  
  public name: string = "generic";
  public tracks: Track[] = [];

  private readonly amethyst: Amethyst;

  public constructor(protected player: Player, protected store: Store, public path: string, amethyst: Amethyst) {
    this.amethyst = amethyst;
    this.fetchMedia();
  }

  private async fetchMedia() {
    const path = this.amethyst.getCurrentRuntime() == 'tauri' ? await tauriUtils.tauriReadFolder(this.path) : await window.electron.ipcRenderer.invoke<string[]>("fetch-folder-content", [this.path, [{name: "Audio", extensions: ALLOWED_AUDIO_EXTENSIONS}]]);
    const audioFiles = path.filter(file => ALLOWED_AUDIO_EXTENSIONS.some(ext => file.path.endsWith(ext)));

    this.totalTracks.value = audioFiles.length;
    this.tracks = audioFiles.map(file => new Track(file.path));
      
    // TODO: temporarily add tracks to the queue till theres discovery view added
    this.tracks.forEach(track => this.player.queue.add(track));
    await this.player.queue.fetchAsyncData();
  }
}

export class LocalMediaSource extends MediaSource {
  public constructor(protected player: Player, protected store: Store, public path: string, amethyst: Amethyst) {
    super(player, store, path, amethyst);
    this.type = MediaSourceType.LocalFolder;
    this.name = amethyst.getCurrentRuntime() == 'tauri' ? tauriUtils.tauriGetTopDirectory(this.path) : window.path.parse(this.path).base;
  }
}
