//! I provide wiring of the recipe.

use std::{convert::Infallible, net::SocketAddr, path::PathBuf, sync::Arc};

use futures::{future::BoxFuture, TryFutureExt};
use http_uri::invariant::AbsoluteHttpUri;
use hyper::{service::make_service_fn, Server};
use manas_http::service::impl_::NormalValidateTargetUri;
use manas_server::CW;
use manas_space::{resource::uri::SolidResourceUri, BoxError};
use manas_storage::service::cors::LiberalCors;
use once_cell::sync::OnceCell;
use secrecy::Secret;
use tauri::Config;
use tokio::sync::{RwLock, RwLockReadGuard};
use tower_http::catch_panic::{CatchPanic, DefaultResponseForPanic};
use tracing::error;

use crate::podverse_proxy::{
    config::{load_podverse_config, write_podverse_config},
    podverse::build_podset,
};

use super::{
    config::{LRcpPodConfig, LRcpPodverseConfig},
    lproxy::{LProxyConfig, LProxyService},
    podverse::{LRcpPodServiceFactory, LRcpPodSet, LRcpPodSetService},
};

/// Type of recipe service
type RcpService = CatchPanic<
    LiberalCors<LProxyService<NormalValidateTargetUri<LRcpPodSetService>>>,
    DefaultResponseForPanic,
>;

/// A struct for representing pod key.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct PodKey(SolidResourceUri, PathBuf);

/// Interface to final recipe.
pub struct Recipe {
    app_config: Arc<Config>,
    session_secret_token: Secret<String>,
    port: OnceCell<u16>,
    endpoint: OnceCell<AbsoluteHttpUri>,
    podverse_config: Arc<RwLock<LRcpPodverseConfig>>,
    service: Arc<RwLock<RcpService>>,
    dev_mode: bool,
}

impl std::fmt::Debug for Recipe {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Recipe")
            .field("app_config", &self.app_config)
            .field("session_secret_token", &self.session_secret_token)
            .field("port", &self.port)
            .field("endpoint", &self.endpoint)
            .field("podverse_config", &self.podverse_config)
            .finish()
    }
}

impl Recipe {
    /// Create a new [`Recipe`].
    pub async fn new(app_config: Arc<Config>, dev_mode: bool) -> Result<Self, BoxError> {
        let persisted_podverse_config = load_podverse_config(&app_config)
            .inspect_err(|e| {
                error!("Error in loading podverse configuration. {e}");
            })
            .await?;

        let session_secret_token = Secret::new(uuid::Uuid::new_v4().to_string());

        let this = Self {
            app_config,
            port: Default::default(),
            endpoint: Default::default(),
            podverse_config: Arc::new(RwLock::new(LRcpPodverseConfig { pods: vec![] })),
            service: Arc::new(RwLock::new(Self::_make_svc(
                Arc::new(LRcpPodSet::new(vec![])),
                Secret::new(Default::default()),
                dev_mode,
            ))),
            session_secret_token,
            dev_mode,
        };

        this._invalidate_podverse(persisted_podverse_config).await?;

        Ok(this)
    }

    /// Get the recipe's session secret token.
    pub fn session_secret_token(&self) -> &Secret<String> {
        &self.session_secret_token
    }

    /// Get the port recipe is running at.
    pub fn port(&self) -> u16 {
        *self
            .port
            .get_or_init(|| portpicker::pick_unused_port().expect("No ports free"))
    }

    /// Get the recipe endpoint.
    pub fn endpoint(&self) -> &AbsoluteHttpUri {
        self.endpoint.get_or_init(|| {
            format!("http://localhost:{}/", self.port())
                .parse()
                .expect("Must be valid")
        })
    }

    /// Get the podverse configuration.
    pub async fn podverse_config(&self) -> RwLockReadGuard<'_, LRcpPodverseConfig> {
        self.podverse_config.read().await
    }

    fn _make_svc(
        podset: Arc<LRcpPodSet>,
        secret_token: Secret<String>,
        dev_mode: bool,
    ) -> RcpService {
        CatchPanic::new(LiberalCors::new(LProxyService::new(
            LProxyConfig { secret_token },
            NormalValidateTargetUri::new(LRcpPodSetService {
                pod_set: podset,
                pod_service_factory: Arc::new(CW::<LRcpPodServiceFactory>::new(dev_mode)),
            }),
        )))
    }

    /// Serve the recipe.
    pub fn serve(&self) -> BoxFuture<'static, Result<(), BoxError>> {
        let addr = SocketAddr::from(([127, 0, 0, 1], self.port()));

        let service_cell = self.service.clone();
        let make_svc = make_service_fn(move |_conn| {
            let service_cell = service_cell.clone();
            async move { Ok::<_, Infallible>(service_cell.read().await.clone()) }
        });

        let server = Server::bind(&addr).serve(make_svc);
        Box::pin(server.map_err(|e| e.into()))
    }

    /// Reload the config.
    async fn _invalidate_podverse(
        &self,
        new_podverse_config: LRcpPodverseConfig,
    ) -> Result<(), BoxError> {
        let new_podset = Arc::new(
            build_podset(&new_podverse_config)
                .inspect_err(|e| error!("Error in podset initialization. {e}"))
                .await?,
        );

        // Acquire locks.
        let mut podverse_config_guard = self.podverse_config.write().await;
        let mut service_guard = self.service.write().await;

        // Update podverse config.
        *podverse_config_guard = new_podverse_config;
        // Update service.
        *service_guard =
            Self::_make_svc(new_podset, self.session_secret_token.clone(), self.dev_mode);

        // Drop guards.
        drop(service_guard);
        drop(podverse_config_guard);

        Ok(())
    }

    /// Provision a new pod.
    pub async fn provision_pod(&self, new_pod_config: LRcpPodConfig) -> Result<(), BoxError> {
        // Construct updated podverse config.
        let mut podverse_config = self.podverse_config.read().await.clone();
        // TODO deduplicate.
        podverse_config.pods.push(new_pod_config);

        // Persist the new podverse config.
        write_podverse_config(&self.app_config, &podverse_config)
            .inspect_err(|e| error!("Error in writing the new podverse config. {e}"))
            .await?;

        // Invalidate the podverse.
        self._invalidate_podverse(podverse_config).await?;

        Ok(())
    }

    /// Deprovision a new pod.
    pub async fn deprovision_pod(&self, _pod_key: PodKey) -> Result<(), BoxError> {
        // Construct updated podverse config.
        let mut _podverse_config = self.podverse_config.read().await.clone();

        todo!()
    }
}
