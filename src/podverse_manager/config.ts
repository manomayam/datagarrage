// Repo backend configuration.
export interface RepoBackendConfig {
    // Root dir path
    root_dir_path: string,
}

// Repo configuration.
export interface RepoConfig {
    backend: RepoBackendConfig,
}

// Storage space config.
export interface StorageSpaceConfig {
    root_uri: string,
    owner_id: string,
}

// Storage config.
export interface StorageConfig {
    space: StorageSpaceConfig,
    repo: RepoConfig
}

// Pod config.
export interface PodConfig {
    storage: StorageConfig,
    label?: string,
    description?: string,
}

// Podverse config.
export interface PodverseConfig {
    pods: Array<PodConfig>
}
