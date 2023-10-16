import { PodConfig, PodverseConfig } from "./config";

// Podverse proxy endpoint.
export const PODVERSE_PROXY_ENDPOINT = <string>"http://localhost:4000/";

// Podverse proxy secret endpoint.
export const PODVERSE_PROXY_SESSION_SECRET_TOKEN = <string> "abcd";

// Initialize podverse config with current.
const _podverseConfig = <PodverseConfig>{
    pods: [{
        "label": "Test pod",
        "description": "Pod for testing",
        "storage": {
            "space": {
                "root_uri": "http://localhost:3000/",
                "owner_id": "http://localhost:3000/card#me"
            },
            "repo": {
                "backend": {
                    "root_dir_path": "/"
                }
            }
        }
    }]
}
    ;

/// Get current podverse config.
export function podverseConfig(): PodverseConfig {
    return _podverseConfig;
}

/// Name of the event for podverse config change.
export const PODVERSE_CONFIG_CHANGE_EVENT = "podverse_config_change";

/// Provision a proxy pod.
export async function provisionProxyPod(newPodConfig: PodConfig) {
}
