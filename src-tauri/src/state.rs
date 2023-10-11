//! I provide types to represent state of the app.

use crate::podverse_proxy::recipe::Recipe;

/// A struct to represent app state.
#[derive(Debug)]
pub struct AppState {
    /// Podverse proxy recipe.
    pub podverse: Recipe,
}
