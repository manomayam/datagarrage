import { podverseConfig, PODVERSE_PROXY_ENDPOINT, PODVERSE_PROXY_SESSION_SECRET_TOKEN,provisionProxyPod } from './podverse_manager';

async function logPodverseProxyInfo() {
    console.log({
        podverseConfig,
        PODVERSE_PROXY_ENDPOINT,
        PODVERSE_PROXY_SECRET_SESSION_TOKEN: PODVERSE_PROXY_SESSION_SECRET_TOKEN,
    });
}

await logPodverseProxyInfo();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.provision = provisionProxyPod;
