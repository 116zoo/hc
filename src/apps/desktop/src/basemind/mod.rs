pub mod manifest;
pub mod resolver;

pub use crate::basemind::manifest::VersionManifest;
pub use crate::basemind::resolver::{
    check_basemind_update_internal, get_platform_status, resolve_basemind_binary, PlatformStatus,
};
use tauri::AppHandle;

/// Tauri command: Get the path to the basemind binary (resolves sidecar/cache/download)
#[tauri::command]
pub async fn get_basemind_path(app: AppHandle) -> Result<String, String> {
    let path = resolve_basemind_binary(&app, None).await?;
    Ok(path.to_string_lossy().to_string())
}

/// Initialize basemind on startup (pre-download if needed)
#[tauri::command]
pub async fn ensure_basemind_ready(app: AppHandle) -> Result<String, String> {
    let path = resolve_basemind_binary(&app, None).await?;
    Ok(path.to_string_lossy().to_string())
}
