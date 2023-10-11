//! I provide wiring of the recipe.

use std::{
    convert::Infallible,
    net::SocketAddr,
    sync::{Arc, RwLock},
};

use http_uri::invariant::AbsoluteHttpUri;
use hyper::{service::make_service_fn, Server};
use manas_http::service::impl_::NormalValidateTargetUri;
use manas_server::CW;
use manas_space::BoxError;
use manas_storage::service::cors::LiberalCors;
use once_cell::sync::Lazy;
use secrecy::Secret;
use tower_http::catch_panic::{CatchPanic, DefaultResponseForPanic};

use super::{
    config::LRcpPodverseConfig,
    lproxy::{LProxyConfig, LProxyService},
    podverse::{LRcpPodServiceFactory, LRcpPodSet, LRcpPodSetService},
};

/// Session secret token.
pub(crate) static SESSION_SECRET_TOKEN: Lazy<Secret<String>> =
    Lazy::new(|| Secret::new(uuid::Uuid::new_v4().to_string()));

static RECIPE_PORT: Lazy<u16> =
    Lazy::new(|| portpicker::pick_unused_port().expect("No ports free"));

/// Recipe endpoint uri.
pub static RECIPE_ENDPOINT_URI: Lazy<AbsoluteHttpUri> = Lazy::new(|| {
    format!("http://localhost:{}/", *RECIPE_PORT)
        .parse()
        .expect("Must be valid")
});

/// Recipe podverse config.
pub static RECIPE_PODVERSE_CONFIG: Lazy<RwLock<LRcpPodverseConfig>> =
    Lazy::new(|| RwLock::new(LRcpPodverseConfig { storages: vec![] }));

/// Type of recipe service
type RcpService = CatchPanic<
    LiberalCors<LProxyService<NormalValidateTargetUri<LRcpPodSetService>>>,
    DefaultResponseForPanic,
>;

/// Recipe podset.
static RECIPE_SERVICE: Lazy<RwLock<RcpService>> =
    Lazy::new(|| RwLock::new(make_rcp_svc(Arc::new(LRcpPodSet::new(vec![])))));

fn make_rcp_svc(podset: Arc<LRcpPodSet>) -> RcpService {
    CatchPanic::new(LiberalCors::new(LProxyService::new(
        LProxyConfig {
            secret_token: &*SESSION_SECRET_TOKEN,
        },
        NormalValidateTargetUri::new(LRcpPodSetService {
            pod_set: podset,
            pod_service_factory: Arc::new(CW::<LRcpPodServiceFactory>::new(cfg!(debug_assertions))),
        }),
    )))
}

/// Serve the recipe.
pub async fn serve_recipe() -> Result<(), BoxError> {
    let addr = SocketAddr::from(([127, 0, 0, 1], *RECIPE_PORT));
    let make_svc = make_service_fn(|_conn| async {
        // service_fn converts our function into a `Service`
        Ok::<_, Infallible>(
            RECIPE_SERVICE
                .read()
                .map(|svc_guard| svc_guard.clone())
                .expect("Must not be poisoned."),
        )
    });

    let server = Server::bind(&addr).serve(make_svc);
    Ok(server.await?)
}
