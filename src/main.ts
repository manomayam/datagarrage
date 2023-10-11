import { invoke } from "@tauri-apps/api/tauri";

async function logPodverseProxyInfo() {
    console.log("Greet");
    console.log(invoke("greet", { name: "Rama" }));

    let endpoint = await invoke("podverse_proxy_endpoint");
    let secret_token = await invoke("podverse_proxy_secret_token");
    let config = await invoke("podverse_config");

    console.log({
        endpoint,
        secret_token,
        config,
    });
}

window.addEventListener("DOMContentLoaded", () => {
    logPodverseProxyInfo()
});
