pub mod manifest;
pub mod resolver;

use crate::basemind::manifest::VersionManifest;
use crate::basemind::resolver::{
    check_basemind_update, get_platform_status, resolve_basemind_binary, PlatformStatus,
};
use tauri::{AppHandle, Manager, State};

/// Tauri command: Get the path to the basemind binary (resolves sidecar/cache/download)
#[tauri::command]
pub async fn get_basemind_path(app: AppHandle) -> Result<String, String> {
    let path = resolve_basemind_binary(&app, None).await?;
    Ok(path.to_string_lossy().to_string())
}

/// Tauri command: Check for basemind updates
#[tauri::command]
pub async fn check_basemind_update() -> Result<VersionManifest, String> {
    check_basemind_update().await
}

/// Tauri command: Get platform support status
#[tauri::command]
pub async fn get_basemind_platform_status() -> Result<PlatformStatus, String> {
    let manifest = check_basemind_update().await?;
    Ok(get_platform_status(&manifest))
}

/// Initialize basemind on startup (pre-download if needed)
#[tauri::command]
pub async fn ensure_basemind_ready(app: AppHandle) -> Result<String, String> {
    let path = resolve_basemind_binary(&app, None).await?;
    Ok(path.to_string_lossy().to_string())
}
