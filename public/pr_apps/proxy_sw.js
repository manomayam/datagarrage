/* global self console fetch BroadcastChannel */

self.addEventListener("install", function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

let podverseProxyEndpoint;
let podverseProxySessionSecretToken;
let podverseConfig;

const logch = new BroadcastChannel("sw_log");

function clLog(arg1, arg2) {
  console.log("SW0_LOG", arg1, arg2);
  logch.postMessage(JSON.parse(JSON.stringify({ arg1, arg2 })));
}

clLog("in service worker");

self.addEventListener("message", (event) => {
  clLog("message received in sw.", event);
  if (event.data.type === "PODVERSE_INFO") {
    clLog("podverse info message received.", event);

    ({
      podverseProxyEndpoint,
      podverseProxySessionSecretToken,
      podverseConfig,
    } = event.data.payload);

    event.ports[0].postMessage({});
  } else if (event.data.type === "PODVERSE_CONFIG_CHANGE") {
    clLog("podverse config change message received.", event);
    podverseConfig = event.data.payload;
    event.ports[0].postMessage({});
  }
});

function isProxiedUri(uri) {
  clLog("in isProxiedUri");
  let isProxied = podverseConfig.pods.some((pod) =>
    uri.startsWith(pod.storage.space.root_uri),
  );
  clLog({ uri, isProxied });
  return isProxied;
}

async function modifyRequest(request) {
  //   const headers = {};
  //   for (let entry of request.headers) {
  //     headers[entry[0]] = headers[entry[1]];
  //   }
  //   headers["x-local-session-token"] = podverseProxySessionSecretToken;
  //   headers["x-original-resource"] = request.url;

  let pUri = new URL(podverseProxyEndpoint);
  pUri.searchParams.append("res", request.url);
  pUri.searchParams.append("token", podverseProxySessionSecretToken);

  // eslint-disable-next-line no-undef
  return new Request(pUri, {
    method: request.method,
    body: ['PUT', 'POST', 'PATCH', 'DELETE'].includes(request.method) ? await request.blob() : undefined,
    headers: request.headers,
    cache: request.cache,
    mode: request.mode,
    credentials: request.credentials,
    redirect: request.redirect,
  });
}

async function modFetch(request) {
  request =
    typeof podverseConfig == "undefined" ||
    typeof podverseProxyEndpoint == "undefined" ||
    typeof podverseProxySessionSecretToken == "undefined" ||
    !isProxiedUri(request.url)
      ? request
      : await modifyRequest(request);

  return fetch(request);
}

self.addEventListener("fetch", (event) => {
  clLog("Received fetch event.", event.request.url);
  clLog({
    podverseConfig,
    podverseProxyEndpoint,
    podverseProxySessionSecretToken,
  });

  event.respondWith(modFetch(event.request));
});
