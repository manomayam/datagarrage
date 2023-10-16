/**
 * I provide functionality to setup pod proxy service worker.
 */

import { Workbox } from "workbox-window";
import { PODVERSE_CONFIG_CHANGE_EVENT, PODVERSE_PROXY_ENDPOINT, PODVERSE_PROXY_SESSION_SECRET_TOKEN, podverseConfig } from '../podverse_manager';

console.log("Initializin podverse proxy setup.");

const wb = new Workbox('/pr_apps/proxy_sw.js');

await wb.register();

const swLogch = new BroadcastChannel("sw_log");

window.swLogch = swLogch;

swLogch.addEventListener("message", (event) => {
    console.log("SW_LOG", event.data.arg1, event.data.arg2);
});

window.addEventListener(PODVERSE_CONFIG_CHANGE_EVENT, () => {
    wb.messageSW({
        type: 'PODVERSE_CONFIG_CHANGE',
        payload: podverseConfig()
    });
});

// Share current podverse info.
await wb.messageSW({
    type: 'PODVERSE_INFO',
    payload: {
        podverseProxyEndpoint: PODVERSE_PROXY_ENDPOINT,
        podverseProxySessionSecretToken: PODVERSE_PROXY_SESSION_SECRET_TOKEN,
        podverseConfig: podverseConfig(),
    }
});

console.log("Podverse proxy setup complete.");
