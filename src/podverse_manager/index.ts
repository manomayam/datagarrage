import { invoke } from "@tauri-apps/api";
import { listen } from '@tauri-apps/api/event'

import { PodConfig, PodverseConfig } from "./config";

// Podverse proxy endpoint.
export const PODVERSE_PROXY_ENDPOINT = <string>await invoke("podverse_proxy_endpoint");

// Podverse proxy secret endpoint.
export const PODVERSE_PROXY_SESSION_SECRET_TOKEN = <string>await invoke("podverse_proxy_session_secret_token");

// Initialize podverse config with current.
let _podverseConfig = <PodverseConfig>await invoke("podverse_config");

/// Get current podverse config.
export function podverseConfig(): PodverseConfig {
    return _podverseConfig;
}

/// Name of the event for podverse config change.
export const PODVERSE_CONFIG_CHANGE_EVENT = "podverse_config_change";

await listen(PODVERSE_CONFIG_CHANGE_EVENT, (event) => {
    console.log('Received podverse config change event from backend.');
    _podverseConfig = event.payload as unknown as PodverseConfig;
    window.dispatchEvent(new Event(PODVERSE_CONFIG_CHANGE_EVENT));
});

/// Provision a proxy pod.
export async function provisionProxyPod(newPodConfig: PodConfig) {
    try {
        await invoke("provision_proxy_pod", {
            newPodConfig
        });
        console.log('Proxy pod provision success.')
    } catch (error) {
        console.log("Error in provisioning a new pod.");
        console.log({ provisionError: error });
        throw error;
    }
}
