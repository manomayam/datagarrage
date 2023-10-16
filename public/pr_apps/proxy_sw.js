/* global self console fetch */

self.addEventListener("install", function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

let podverseProxyEndpoint;
let podverseProxySessionToken;
let podverseConfig;

console.log("in service worker");

self.addEventListener("message", (event) => {
    console.log("message received in sw.", event);
  if (event.data.type === "PODVERSE_INFO") {
    console.log("podverse info message received.", event);

    ({ podverseProxyEndpoint, podverseProxySessionToken, podverseConfig } =
      event.data.payload);

    event.ports[0].postMessage({});
  } else if (event.data.type === "PODVERSE_CONFIG_CHANGE") {
    console.log("podverse config change message received.", event);
    podverseConfig = event.data.payload;
    event.ports[0].postMessage({});
  }
});

// function isProxiedUri(uri) {
//   return podverseConfig.pods.some((pod) =>
//     uri.startsWith(pod.storage.space.root_uri),
//   );
// }

// function modifyRequest(request) {
//   const headers = {};
//   for (let entry of request.headers) {
//     headers[entry[0]] = headers[entry[1]];
//   }
//   headers["x-local-session-token"] = podverseProxySessionToken;
//   headers["x-original-resource"] = request.uri;

//   // eslint-disable-next-line no-undef
//   return new Request(podverseProxyEndpoint, {
//     method: request.method,
//     body: request.body,
//     headers,
//     cache: request.cache,
//     mode: request.mode,
//     credentials: request.credentials,
//     redirect: request.redirect,
//   });
// }

// self.addEventListener("fetch", (event) => {
//   let request =
//     typeof podverseConfig == "undefined" ||
//     typeof podverseProxyEndpoint == "undefined" ||
//     typeof podverseProxySessionToken == "undefined" ||
//     !isProxiedUri(event.request.uri)
//       ? event.request
//       : modifyRequest(event.request);

//   event.respondWith(fetch(request));
// });
