//! A tauri app that manages multiple pod views and serve
//! solid-os interface over them.
//!  

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![warn(missing_docs)]
#![deny(unused_qualifications)]

use std::sync::Arc;

use futures::TryFutureExt;
use http_uri::invariant::AbsoluteHttpUri;
use manas_space::BoxError;
use podverse_proxy::{
    config::{LRcpPodConfig, LRcpPodverseConfig},
    recipe::Recipe,
};
use secrecy::ExposeSecret;
use state::AppState;
use tauri::{utils::config::AppUrl, WindowBuilder, WindowUrl};
use tracing::error;

// pub mod command;
pub mod podverse_proxy;
pub mod state;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Get the podverse proxy endpoint.
#[tauri::command]
fn podverse_proxy_endpoint(state: tauri::State<AppState>) -> AbsoluteHttpUri {
    // "Rama Rama".into()
    state.podverse.endpoint().clone()
}

/// Get the podverse proxy secret token.
#[tauri::command]
fn podverse_proxy_secret_token(state: tauri::State<AppState>) -> String {
    state
        .podverse
        .session_secret_token()
        .expose_secret()
        .clone()
}

/// Get the podverse config.
#[tauri::command]
async fn podverse_config(state: tauri::State<'_, AppState>) -> Result<LRcpPodverseConfig, String> {
    Ok(state.podverse.podverse_config().await.clone())
}

/// Provision a new proxy pods.
#[tauri::command]
async fn provision_proxy_pod(
    new_pod_config: LRcpPodConfig,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    state
        .podverse
        .provision_pod(new_pod_config)
        .await
        .map_err(|e| e.to_string())
}

#[tokio::main]
async fn main() -> Result<(), BoxError> {
    tauri::async_runtime::set(tokio::runtime::Handle::current());

    let port = portpicker::pick_unused_port().expect("failed to find unused port");
    let mut context = tauri::generate_context!();
    let url = format!("http://localhost:{}", port).parse().unwrap();
    let window_url = WindowUrl::External(url);
    // rewrite the config so the IPC is enabled on this URL
    context.config_mut().build.dist_dir = AppUrl::Url(window_url.clone());

    let podverse_recipe = Arc::new(
        Recipe::new(Arc::new(context.config().clone()), cfg!(dev))
            .inspect_err(|e| error!("Error in initializing the recipe. {e}"))
            .await?,
    );

    // println!("recipe: {:?}", podverse_recipe);

    // Span podverse recipe.
    tokio::spawn(podverse_recipe.serve());

    tauri::Builder::default()
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_localhost::Builder::new(port).build())
        .manage(AppState {
            podverse: podverse_recipe.clone(),
        })
        .invoke_handler(tauri::generate_handler![
            podverse_proxy_endpoint,
            podverse_proxy_secret_token,
            podverse_config,
            provision_proxy_pod,
            greet,
        ])
        .setup(move |app| {
            WindowBuilder::new(
                app,
                "main".to_string(),
                if cfg!(dev) {
                    Default::default()
                } else {
                    window_url
                },
            )
            .title("Data garage")
            .build()?;

            Ok(())
        })
        .run(context)
        .expect("error while running tauri application");

    Ok(())
}
