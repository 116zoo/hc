use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionManifest {
    pub version: String,
    pub published_at: String,
    pub platforms: HashMap<String, PlatformInfo>,
    pub minimum_openbitfun_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformInfo {
    pub available: bool,
    pub file: String,
    #[serde(default)]
    pub sha256: String,
    #[serde(default)]
    pub fallback: Option<String>,
}

impl VersionManifest {
    pub async fn fetch(version: Option<&str>) -> Result<Self, String> {
        let version = version.unwrap_or("latest");
        let url = if version == "latest" {
            "https://github.com/jamon8888/basemind/releases/latest/download/version-manifest.json"
        } else {
            &format!(
                "https://github.com/jamon8888/basemind/releases/download/{}/version-manifest.json",
                version
            )
        };

        let client = reqwest::Client::new();
        let resp = client
            .get(url)
            .header("User-Agent", "OpenBitFun")
            .send()
            .await
            .map_err(|e| format!("Failed to fetch manifest: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("Manifest not found: HTTP {}", resp.status()));
        }

        resp.json()
            .await
            .map_err(|e| format!("Invalid manifest JSON: {}", e))
    }

    pub fn platform_info(&self, platform: &str) -> Option<&PlatformInfo> {
        self.platforms.get(platform)
    }

    pub fn is_compatible(&self, current_version: &str) -> bool {
        version_compare(current_version, &self.minimum_openbitfun_version).is_ge()
    }
}

fn version_compare(a: &str, b: &str) -> std::cmp::Ordering {
    let a_parts: Vec<u32> = a
        .trim_start_matches('v')
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();
    let b_parts: Vec<u32> = b
        .trim_start_matches('v')
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();

    for i in 0..a_parts.len().max(b_parts.len()) {
        let a_val = a_parts.get(i).copied().unwrap_or(0);
        let b_val = b_parts.get(i).copied().unwrap_or(0);
        match a_val.cmp(&b_val) {
            std::cmp::Ordering::Equal => continue,
            other => return other,
        }
    }
    std::cmp::Ordering::Equal
}
