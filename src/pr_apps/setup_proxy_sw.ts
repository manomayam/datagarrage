/**
 * I provide functionality to setup pod proxy service worker.
 */

import { Workbox } from "workbox-window";
import { PODVERSE_CONFIG_CHANGE_EVENT, PODVERSE_PROXY_ENDPOINT, PODVERSE_PROXY_SESSION_SECRET_TOKEN, podverseConfig } from '../podverse_manager';

console.log("In pr_apps/setup_proxy_sw.ts");


// Name of the podverse proxy ready event.
export const PODVERSE_PROXY_READY_EVENT = 'podverse_proxy_ready';

const wb = new Workbox('/pr_apps/proxy_sw.js');

console.log(await wb.register());

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

console.log("In pr_apps/setup_proxy_sw.ts message sent", {
    podverseConfig: podverseConfig(),
});
