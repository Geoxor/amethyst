// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[macro_use]
extern crate lazy_static;

use tauri::{CustomMenuItem, Menu, MenuItem, Submenu, AboutMetadata};
use tauri::Manager;
use tauri::State;
use std::sync::Mutex;

use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use tauri::api::dialog::FileDialogBuilder;
use std::path::PathBuf;

#[derive(Clone, serde::Serialize)]
struct FilePayload {
  files: Vec<PathBuf>,
}

#[derive(Clone, serde::Serialize)]
struct FolderPayload {
  folder: PathBuf
}

struct DiscordRpc(DiscordIpcClient);
type WrappedDiscordRpc = Mutex<Option<DiscordRpc>>;

#[tauri::command]
async fn pick_folder() -> (bool, PathBuf) {
  use tauri::api::dialog::blocking::FileDialogBuilder;
  let path = FileDialogBuilder::new().pick_folder().unwrap();
  return (path.is_dir(), path);
}

#[tauri::command]
async fn pick_file() -> (bool, PathBuf) {
  use tauri::api::dialog::blocking::FileDialogBuilder;
  let path = FileDialogBuilder::new().pick_file().unwrap();
  return (path.is_file(), path);
}

#[tauri::command]
fn open_shell(location: String) {
  let _ = open::that(location);
}

#[tauri::command]
fn init_presence(state: State<WrappedDiscordRpc>) {
  *state.lock().unwrap() = Some(DiscordRpc(DiscordIpcClient::new("976036303156162570").unwrap()));
  if let Some(ref mut state) = *state.lock().unwrap() {
    if let Err(_e) = state.0.connect() {}
  }
}

#[tauri::command]
fn update_presence(app_handle: tauri::AppHandle, state: State<WrappedDiscordRpc>, title: String, time: String, format: String) {

  let package = app_handle.package_info();
  let formatted_version = format!("Amethyst v{} (Tauri)", package.version);

  let assets = activity::Assets::new()
    .large_image("audio_file")
    .large_text(&format)
    .small_image("logo")
    .small_text(&formatted_version);

  let payload = activity::Activity::new()
    .state(&time)
    .details(&title)
    .assets(assets);

  if let Some(ref mut state) = *state.lock().unwrap() {
    if let Err(_e) =  state.0.set_activity(payload) {
      if let Err(_e) = state.0.reconnect() {} // don't handle it.
    }
  }
}

fn main() {

  #[cfg(debug_assertions)]
  #[cfg(target_os = "macos")]
  let menu = Menu::new()
    .add_submenu(Submenu::new("Amethyst", Menu::new()
      .add_native_item(MenuItem::About("Amethyst".to_string(), AboutMetadata::new()))
      .add_native_item(MenuItem::Separator)
      .add_native_item(MenuItem::Quit)))
    .add_submenu(Submenu::new("File", Menu::new()
      .add_item(CustomMenuItem::new("open_file".to_string(), "Open File").accelerator("Command+O"))
      .add_item(CustomMenuItem::new("open_folder".to_string(), "Open Folder").accelerator("Command+Shift+O"))))
      .add_item(CustomMenuItem::new("add_source".to_string(), "Add Source").accelerator("Command+O"))
    .add_submenu(Submenu::new("Utility", Menu::new()
      .add_item(CustomMenuItem::new("clear_queue".to_string(), "Clear queue").accelerator("Command+Shift+X"))
      .add_item(CustomMenuItem::new("clear_invalid".to_string(), "Clear errored / deleted").accelerator("Command+Shift+Z"))
      .add_native_item(MenuItem::Separator).add_item(CustomMenuItem::new("refresh_metadata".to_string(), "Refresh all metadata").accelerator("Command+Alt+R"))
      .add_item(CustomMenuItem::new("refresh_window".to_string(), "Refresh window").accelerator("Command+R"))))
    .add_submenu(Submenu::new("View", Menu::new()
      .add_item(CustomMenuItem::new("settings".to_string(), "Settings").accelerator("Command+S"))))
    .add_submenu(Submenu::new("Window", Menu::new().add_native_item(MenuItem::Minimize).add_native_item(MenuItem::Zoom).add_native_item(MenuItem::CloseWindow)
      .add_native_item(MenuItem::Separator).add_native_item(MenuItem::ShowAll)))
    .add_submenu(Submenu::new("Debug", Menu::new()
      .add_item(CustomMenuItem::new("debug".to_string(), "Developer tools").accelerator("Command+D"))))
    .add_submenu(Submenu::new("About", Menu::new()
      .add_item(CustomMenuItem::new("documentation".to_string(), "Go to Documentation"))
      .add_item(CustomMenuItem::new("github".to_string(), "Go to Github"))
      .add_item(CustomMenuItem::new("discord".to_string(), "Join Discord Server"))));

  #[cfg(not(debug_assertions))]
  #[cfg(target_os = "macos")]
  let menu = Menu::new()
    .add_submenu(Submenu::new("Amethyst", Menu::new()
      .add_native_item(MenuItem::About("Amethyst".to_string(), AboutMetadata::new()))
      .add_native_item(MenuItem::Separator)
      .add_native_item(MenuItem::Quit)))
    .add_submenu(Submenu::new("File", Menu::new()
      .add_item(CustomMenuItem::new("open_file".to_string(), "Open File").accelerator("Command+O"))
      .add_item(CustomMenuItem::new("open_folder".to_string(), "Open Folder").accelerator("Command+Shift+O"))))
      .add_item(CustomMenuItem::new("add_source".to_string(), "Add Source").accelerator("Command+O"))
    .add_submenu(Submenu::new("Utility", Menu::new()
      .add_item(CustomMenuItem::new("clear_queue".to_string(), "Clear queue").accelerator("Command+Shift+X"))
      .add_item(CustomMenuItem::new("clear_invalid".to_string(), "Clear errored / deleted").accelerator("Command+Shift+Z"))
      .add_native_item(MenuItem::Separator).add_item(CustomMenuItem::new("refresh_metadata".to_string(), "Refresh all metadata").accelerator("Command+Alt+R"))
      .add_item(CustomMenuItem::new("refresh_window".to_string(), "Refresh window").accelerator("Command+R"))))
    .add_submenu(Submenu::new("View", Menu::new()
      .add_item(CustomMenuItem::new("settings".to_string(), "Settings").accelerator("Command+S"))))
    .add_submenu(Submenu::new("Window", Menu::new()
      .add_native_item(MenuItem::Minimize).add_native_item(MenuItem::Zoom).add_native_item(MenuItem::CloseWindow).add_native_item(MenuItem::Separator).add_native_item(MenuItem::ShowAll)))
    .add_submenu(Submenu::new("About", Menu::new()
      .add_item(CustomMenuItem::new("documentation".to_string(), "Go to Documentation"))
      .add_item(CustomMenuItem::new("github".to_string(), "Go to Github"))
      .add_item(CustomMenuItem::new("discord".to_string(), "Join Discord Server"))));

  #[cfg(target_os = "windows")]
  let menu = Menu::new();

  #[cfg(target_os = "linux")]
  let menu = Menu::new();

  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![init_presence, update_presence, pick_folder, open_shell, pick_file])
    .menu(menu)
    .manage(Mutex::new(None::<DiscordRpc>))
    .on_menu_event(|event| {
      match event.menu_item_id() {
        "open_file" => {
          FileDialogBuilder::new().add_filter("Music", &[
            "ogg", 
            "ogv", 
            "oga", 
            "ogx", 
            "ogm", 
            "spx", 
            "opus", 
            "wav", 
            "wave", 
            "m4a", 
            "m4b", 
            "m4p", 
            "m4r", 
            "m4v", 
            "3gp", 
            "flac", 
            "opus", 
            "aac", 
            "aiff", 
            "mp3", 
            "m4a",
            "mp4",
            "dfpwm",
            "webm",
          ]).pick_files(move |file_paths| {
            event.window().emit("open-file", FilePayload { files: file_paths.unwrap() }).unwrap();
          })
        },
        "open_folder" => {
          FileDialogBuilder::new().pick_folder(move |folder_path| {
            event.window().emit("open-folder", FolderPayload { folder: folder_path.unwrap() }).unwrap();
          })
        },
        "add_source" => {
          event.window().emit("add-source", {}).unwrap();
        },
        "settings" => {
          event.window().emit("goto-settings", {}).unwrap();
        },
        "debug" => {
          #[cfg(debug_assertions)]
          event.window().open_devtools();
        },
        "clear_queue" => {
          event.window().emit("clear-queue", {}).unwrap();
        },
        "clear_invalid" => {
          event.window().emit("clear-error", {}).unwrap();
        },
        "refresh_metadata" => {
          event.window().emit("refresh-metadata", {}).unwrap();
        },
        "documentation" => {
          let _ = open::that("https://amethyst.pages.dev/introduction.html");
        },
        "github" => {
          let _ = open::that("https://github.com/Nyabsi/Amethyst/tree/tauri");
        },
        "discord" => {
          let _ = open::that("https://discord.gg/geoxor");
        },
        id => {
          println!("got menu event: {}", id);
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
