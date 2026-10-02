use crate::basemind::manifest::{PlatformInfo, VersionManifest};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone)]
pub struct PlatformAsset {
    pub name: &'static str,
    pub url_suffix: &'static str,
    pub fallback_version: Option<&'static str>,
    pub archive_type: ArchiveType,
}

#[derive(Debug, Clone, Copy)]
pub enum ArchiveType {
    TarGz,
    Zip,
}

impl PlatformAsset {
    pub fn binary_name(&self) -> &'static str {
        #[cfg(windows)]
        return "basemind.exe";
        "basemind"
    }

    pub fn all() -> Vec<PlatformAsset> {
        vec![
            PlatformAsset {
                name: "linux-x64",
                url_suffix: "basemind-x86_64-unknown-linux-gnu.tar.gz",
                fallback_version: None,
                archive_type: ArchiveType::TarGz,
            },
            PlatformAsset {
                name: "linux-arm64",
                url_suffix: "basemind-aarch64-unknown-linux-gnu.tar.gz",
                fallback_version: Some("v0.30.0"),
                archive_type: ArchiveType::TarGz,
            },
            PlatformAsset {
                name: "macos-x64",
                url_suffix: "basemind-x86_64-apple-darwin.tar.gz",
                fallback_version: None,
                archive_type: ArchiveType::TarGz,
            },
            PlatformAsset {
                name: "macos-arm64",
                url_suffix: "basemind-aarch64-apple-darwin.tar.gz",
                fallback_version: None,
                archive_type: ArchiveType::TarGz,
            },
            PlatformAsset {
                name: "windows-x64",
                url_suffix: "basemind-x86_64-pc-windows-msvc.zip",
                fallback_version: None,
                archive_type: ArchiveType::Zip,
            },
        ]
    }

    pub fn current() -> Result<&'static PlatformAsset, String> {
        let assets = Self::all();
        let current = current_platform_name();
        assets
            .iter()
            .find(|a| a.name == current)
            .ok_or_else(|| format!("Unsupported platform: {}", current))
    }
}

fn current_platform_name() -> &'static str {
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    return "linux-x64";
    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    return "linux-arm64";
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    return "macos-x64";
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    return "macos-arm64";
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    return "windows-x64";
    "unknown"
}

pub async fn resolve_basemind_binary(
    app: &AppHandle,
    version: Option<&str>,
) -> Result<PathBuf, String> {
    let asset = PlatformAsset::current()?;
    let version = version.unwrap_or("latest");

    // 1. Try sidecar (bundled)
    if let Ok(path) = try_sidecar(app, asset.name) {
        if path.exists() {
            log::info!("Using bundled sidecar for {}", asset.name);
            return Ok(path);
        }
    }

    // 2. Try cached download
    let cache_dir = cache_directory(app, version)?;
    let binary_path = cache_dir.join(asset.binary_name());
    if binary_path.exists() {
        log::info!("Using cached binary for {}", asset.name);
        return Ok(binary_path);
    }

    // 3. Download with fallback chain
    download_with_fallbacks(app, asset, version, &binary_path).await?;

    Ok(binary_path)
}

fn try_sidecar(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    #[cfg(feature = "sidecar")]
    {
        use tauri::api::path::sidecar;
        sidecar(app, name).map_err(|e| e.to_string())
    }
    #[cfg(not(feature = "sidecar"))]
    {
        Err("sidecar feature not enabled".to_string())
    }
}

fn cache_directory(app: &AppHandle, version: &str) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(data_dir.join("basemind").join(version))
}

async fn download_with_fallbacks(
    app: &AppHandle,
    asset: &PlatformAsset,
    version: &str,
    dest: &PathBuf,
) -> Result<(), String> {
    // Get manifest to check availability
    let manifest = VersionManifest::fetch(Some(version)).await.ok();

    // Build version list: current version first, then fallback
    let mut versions = vec![version.to_string()];
    if let Some(fallback) = asset.fallback_version {
        versions.push(fallback.to_string());
    }
    // Also check manifest for fallback
    if let Some(m) = &manifest {
        if let Some(info) = m.platform_info(asset.name) {
            if let Some(fb) = &info.fallback {
                if !versions.contains(&fb.to_string()) {
                    versions.push(fb.to_string());
                }
            }
        }
    }

    // Ensure cache directory exists
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    for v in &versions {
        let url = format!(
            "https://github.com/jamon8888/basemind/releases/download/{}/{}",
            v, asset.url_suffix
        );

        log::info!("Attempting download: {}", url);
        match try_download_and_extract(&url, dest, asset.archive_type).await {
            Ok(_) => {
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    std::fs::set_permissions(dest, std::fs::Permissions::from_mode(0o755))
                        .map_err(|e| e.to_string())?;
                }
                log::info!("Successfully downloaded basemind {} from {}", asset.name, v);
                return Ok(());
            }
            Err(e) => {
                log::warn!("Failed to download from {}: {}", v, e);
            }
        }
    }

    Err(format!(
        "No basemind binary for {} in {} or fallbacks {:?}",
        asset.name, version, asset.fallback_version
    ))
}

async fn try_download_and_extract(
    url: &str,
    dest: &PathBuf,
    archive_type: ArchiveType,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(url)
        .header("User-Agent", "OpenBitFun")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    match archive_type {
        ArchiveType::TarGz => extract_tar_gz(&bytes, dest).await,
        ArchiveType::Zip => extract_zip(&bytes, dest).await,
    }
}

async fn extract_tar_gz(bytes: &[u8], dest: &PathBuf) -> Result<(), String> {
    use flate2::read::GzDecoder;
    use std::io::Cursor;
    use tar::Archive;

    let cursor = Cursor::new(bytes);
    let gz = GzDecoder::new(cursor);
    let mut archive = Archive::new(gz);

    let temp_dir = dest
        .parent()
        .ok_or("No parent directory")?
        .join("tmp_extract");
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    archive.unpack(&temp_dir).map_err(|e| e.to_string())?;

    // Find the basemind binary in extracted files
    let binary_name = if cfg!(windows) {
        "basemind.exe"
    } else {
        "basemind"
    };
    let mut found = None;
    for entry in std::fs::read_dir(&temp_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.file_name().and_then(|n| n.to_str()) == Some(binary_name) {
            found = Some(path);
            break;
        }
        // Also check subdirectories
        if path.is_dir() {
            for sub_entry in std::fs::read_dir(&path).map_err(|e| e.to_string())? {
                let sub_entry = sub_entry.map_err(|e| e.to_string())?;
                let sub_path = sub_entry.path();
                if sub_path.file_name().and_then(|n| n.to_str()) == Some(binary_name) {
                    found = Some(sub_path);
                    break;
                }
            }
        }
    }

    if let Some(src) = found {
        std::fs::copy(&src, dest).map_err(|e| e.to_string())?;
    } else {
        return Err("basemind binary not found in archive".to_string());
    }

    // Cleanup
    let _ = std::fs::remove_dir_all(&temp_dir);
    Ok(())
}

async fn extract_zip(bytes: &[u8], dest: &PathBuf) -> Result<(), String> {
    use std::io::Cursor;
    use zip::ZipArchive;

    let cursor = Cursor::new(bytes);
    let mut archive = ZipArchive::new(cursor).map_err(|e| e.to_string())?;

    let temp_dir = dest
        .parent()
        .ok_or("No parent directory")?
        .join("tmp_extract");
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    archive.extract(&temp_dir).map_err(|e| e.to_string())?;

    let binary_name = "basemind.exe";
    let mut found = None;
    for entry in std::fs::read_dir(&temp_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.file_name().and_then(|n| n.to_str()) == Some(binary_name) {
            found = Some(path);
            break;
        }
        if path.is_dir() {
            for sub_entry in std::fs::read_dir(&path).map_err(|e| e.to_string())? {
                let sub_entry = sub_entry.map_err(|e| e.to_string())?;
                let sub_path = sub_entry.path();
                if sub_path.file_name().and_then(|n| n.to_str()) == Some(binary_name) {
                    found = Some(sub_path);
                    break;
                }
            }
        }
    }

    if let Some(src) = found {
        std::fs::copy(&src, dest).map_err(|e| e.to_string())?;
    } else {
        return Err("basemind.exe not found in archive".to_string());
    }

    let _ = std::fs::remove_dir_all(&temp_dir);
    Ok(())
}

pub async fn check_basemind_update() -> Result<VersionManifest, String> {
    VersionManifest::fetch(None).await
}

pub fn get_platform_status(manifest: &VersionManifest) -> PlatformStatus {
    let platform = current_platform_name();
    if let Some(info) = manifest.platform_info(platform) {
        PlatformStatus {
            platform: platform.to_string(),
            supported: info.available,
            fallback_version: info.fallback.clone(),
            current_version: manifest.version.clone(),
        }
    } else {
        PlatformStatus {
            platform: platform.to_string(),
            supported: false,
            fallback_version: None,
            current_version: manifest.version.clone(),
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PlatformStatus {
    pub platform: String,
    pub supported: bool,
    pub fallback_version: Option<String>,
    pub current_version: String,
}
