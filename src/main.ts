import { invoke } from "@tauri-apps/api/tauri";

async function logPodverseProxyInfo() {
    let endpoint = await invoke("podverseProxyEndpoint");
    let secret_token = await invoke("podverseProxySecretToken");
    let config = await invoke("podverseProxyConfig");

    console.log({
        endpoint,
        secret_token,
        config,
    });
}

window.addEventListener("DOMContentLoaded", () => {
    logPodverseProxyInfo()
});
