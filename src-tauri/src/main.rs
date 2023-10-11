//! A tauri app that manages multiple pod views and serve
//! solid-os interface over them.
//!  

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![warn(missing_docs)]
#![deny(unused_qualifications)]

use std::sync::Arc;

use futures::TryFutureExt;
use manas_space::BoxError;
use podverse_proxy::recipe::Recipe;
use state::AppState;
use tauri::{utils::config::AppUrl, WindowBuilder, WindowUrl};
use tracing::error;

use crate::command::{
    podverse_config, podverse_proxy_endpoint, podverse_proxy_secret_token, provision_proxy_pod,
};

pub mod command;
pub mod podverse_proxy;
pub mod state;

// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

#[tokio::main]
async fn main() -> Result<(), BoxError> {
    tauri::async_runtime::set(tokio::runtime::Handle::current());

    let port = portpicker::pick_unused_port().expect("failed to find unused port");
    let mut context = tauri::generate_context!();
    let url = format!("http://localhost:{}", port).parse().unwrap();
    let window_url = WindowUrl::External(url);
    // rewrite the config so the IPC is enabled on this URL
    context.config_mut().build.dist_dir = AppUrl::Url(window_url.clone());

    let podverse_recipe = Recipe::new(Arc::new(context.config().clone()), cfg!(dev))
        .inspect_err(|e| error!("Error in initializing the recipe. {e}"))
        .await?;

    // Span podverse recipe.
    tokio::spawn(podverse_recipe.serve());

    tauri::Builder::default()
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_localhost::Builder::new(port).build())
        .manage(AppState {
            podverse: podverse_recipe,
        })
        .invoke_handler(tauri::generate_handler![
            podverse_proxy_endpoint,
            podverse_proxy_secret_token,
            podverse_config,
            provision_proxy_pod,
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
