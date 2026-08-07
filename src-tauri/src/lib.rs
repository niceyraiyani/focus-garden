mod blocker;
#[cfg(target_os = "macos")]
mod pf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      blocker::start_block,
      blocker::stop_block,
      blocker::is_blocking,
      blocker::reassert_block
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
