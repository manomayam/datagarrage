//! I provide tauri commands to manage podverse and security.
//!

use http_uri::invariant::AbsoluteHttpUri;
use secrecy::ExposeSecret;

use crate::{
    podverse_proxy::config::{LRcpPodConfig, LRcpPodverseConfig},
    state::AppState,
};

/// Get the podverse proxy endpoint.
#[tauri::command]
pub fn podverse_proxy_endpoint(state: tauri::State<AppState>) -> AbsoluteHttpUri {
    state.podverse.endpoint().clone()
}

/// Get the podverse proxy secret token.
#[tauri::command]
pub fn podverse_proxy_secret_token(state: tauri::State<AppState>) -> String {
    state
        .podverse
        .session_secret_token()
        .expose_secret()
        .clone()
}

/// Get the podverse config.
#[tauri::command]
pub async fn podverse_config(
    state: tauri::State<'_, AppState>,
) -> Result<LRcpPodverseConfig, String> {
    Ok(state.podverse.podverse_config().await.clone())
}

/// Provision a new proxy pods.
#[tauri::command]
pub async fn provision_proxy_pod(
    new_pod_config: LRcpPodConfig,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    Ok(state
        .podverse
        .provision_pod(new_pod_config)
        .await
        .map_err(|e| e.to_string())?)
}
