// This file contains all Tauri specific implementations that are detached from rest of the code.
import { join, appDataDir } from '@tauri-apps/api/path';
import { readBinaryFile, writeBinaryFile, readDir, createDir, writeTextFile, readTextFile, removeFile, exists, BaseDirectory } from '@tauri-apps/api/fs';
import { amethyst } from '@/amethyst';

// TODO: instead of having this utility class, we'll create a "dummy" Electron RPC wrapper that re-routes everything where they belong,
// allowing us to hook onto it, whenever Tauri is in use to make developing new features easier.
class TauriUtils {

    // @ts-ignore
    private dataDir: String;

    // stub
    constructor() {}

    async init()
    {
        this.dataDir = await appDataDir();
    }

    public getAppDir()
    {
        return this.dataDir;
    }

    public tauriGetFilename(path: String)
    {
        let nameWithExtension;
        // You see, Windows is not Unix.
        if (amethyst.getCurrentOperatingSystem() == 'windows')
            nameWithExtension = path.substring(path.lastIndexOf('\\') + 1);
        else
            nameWithExtension = path.substring(path.lastIndexOf('/') + 1);
        return nameWithExtension.substring(0, nameWithExtension.lastIndexOf('.'));
    }

    public tauriGetTopDirectory(path: String)
    {
        // TODO: better way of doing this?
        const rootDirectory = path.substring(path.lastIndexOf('/') + 1);
        return rootDirectory;
    }

    public tauriGetRootDirectory(path: String)
    {
        // TODO: better way of doing this?
        const rootDirectory = path.substring(0, path.lastIndexOf('/'));
        return rootDirectory;
    }

    public async tauriStat(path: String)
    {
        return await exists(path);
    }

    public async tauriCreateFolder(path: String)
    {
        await createDir(path, {
            recursive: true
        });
    }

    public async tauriReadFolder(path: String)
    {
        return await readDir(path, {
            recursive: true
        });
    }

    public async tauriFetch(path: String)
    {
        return await readTextFile(path);
    }

    public async tauriDelete(path: String)
    {
        return await removeFile(path);
    }

    public async tauriWrite(path: String, content: String)
    {
        return await writeTextFile(path, content);
    }

    public async tauriReadBuffer(path: String)
    {
        return await readBinaryFile(path);
    }

    public async tauriWriteBuffer(path: String, content: Buffer)
    {
        return await writeBinaryFile(path, content);
    }

    public async tauriJoin(strings: String[])
    {
        return await join(strings);
    }
}

export const tauriUtils = new TauriUtils();