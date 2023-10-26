//@ts-nocheck

import "../setup_proxy_sw.ts";
import { podverseConfig } from "../../podverse_manager";
import { PodConfig } from '../../podverse_manager/config.ts';

console.log("In solidos/index.ts");

/// Get the config of pod with given storage root uri.
function getPodConfig(rootUri: string): PodConfig {
    console.log({ podverseConfig: podverseConfig() });
    return podverseConfig().pods.find(pod => {
        console.log({ rootUri, u: pod.storage.space.root_uri });
        return pod.storage.space.root_uri == rootUri;
    });
}

const params = new URLSearchParams(location.search);
const rootUri = params.get('root_uri');
const podConfig = getPodConfig(rootUri);

console.log({
    params, rootUri, podConfig
});

window.SolidAppContext = {
    noAuth: rootUri,
    webId: podConfig.storage.space.owner_id,
    app: rootUri,
    webid: podConfig.storage.space.owner_id,
};
window.document.title = `Rangam (${podConfig.label}) in SolidOs`;


await import("mashlib/dist/mash.css");
await import("mashlib/dist/mashlib.min.js");


// const authn = UI.authn;
// const authSession = UI.authn.authSession;
// const store = UI.store;
const $rdf = UI.rdf;
const dom = document;
$rdf.Fetcher.crossSiteProxyTemplate = self.origin + "/xss?uri={uri}";
const outliner = panes.getOutliner(dom); //function from solid-panes
const podLabelElem = dom.getElementById('pod-label');
const podDescrElem = dom.getElementById('pod-description')

function go() {
    // const uri = $rdf.uri.join(uriField.value, window.location.href);
    // console.log("User field " + uriField.value);
    // console.log("User requests " + uri);

    // const params = new URLSearchParams(location.search);
    // params.set("uri", uri);
    // window.history.replaceState(
    //     {},
    //     "",
    //     `${location.origin}${location.pathname}?${params}`,
    // );

    patchForN3Patch();
    const subject = $rdf.sym(rootUri);
    outliner.GotoSubject(subject, true, undefined, true, undefined);
    podLabelElem.innerHTML = podConfig.label;
    podDescrElem.innerHTML = podConfig.description;
    // dom.getElementById('pod-description')?.innerHTML = podConfig.description;
    // mungeLoginArea();
}

go()

// const uriField = dom.getElementById("uriField");
// const goButton = dom.getElementById("goButton");
// const loginButtonArea = document.getElementById("loginButtonArea");
// const webIdArea = dom.getElementById("webId");
// const banner = dom.getElementById("inputArea");

// uriField.addEventListener(
//     "keyup",
//     function (e) {
//         if (e.keyCode === 13) {
//             go(e);
//         }
//     },
//     false,
// );

// goButton.addEventListener("click", go, false);
// const initial = new URLSearchParams(self.location.search).get("uri");
// if (initial) {
//     uriField.value = initial;
//     go();
// } else {
//     console.log("ready for user input");
// }
// async function mungeLoginArea() {
//     loginButtonArea.innerHTML = "";
//     if (uriField.value) {
//         loginButtonArea.appendChild(
//             UI.login.loginStatusBox(document, null, {}),
//         );
//     }
//     const me = authn.currentUser();
//     if (me) {
//         const logoutButton = loginButtonArea.querySelector("input");
//         logoutButton.value = "Logout";
//         const displayId = `&lt;${me.value}>`;
//         webIdArea.innerHTML = displayId;
//         banner.style.backgroundColor = "#bbccbb";
//     } else {
//         banner.style.backgroundColor = "#ccbbbb";
//     }
//     loginButtonArea.style.display = "inline-block";
// }

// if (authSession) {
//     authSession.onLogin(() => {
//         mungeLoginArea();
//         go();
//     });
//     authSession.onLogout(() => {
//         mungeLoginArea();
//         webIdArea.innerHTML = "public user";
//         go();
//     });
//     authSession.onSessionRestore(() => {
//         mungeLoginArea();
//         go();
//     });
// }
// mungeLoginArea();







function patchForN3Patch() {
    const UM = UI.rdf.UpdateManager.prototype;
    const isStore = UI.rdf.isStore;
    const Util = UI.rdf.Util;

    Object.assign(UM, {
        editable(uri) {
            return "N3_PATCH";
        },

        update(
            deletions,
            insertions,
            callback,
            secondTry,
            options,
        ) {

            if (!callback) {
                var thisUpdater = this
                return new Promise(function (resolve, reject) { // Promise version
                    thisUpdater.update(deletions, insertions, function (uri, ok, errorBody) {
                        if (!ok) {
                            reject(new Error(errorBody))
                        } else {
                            resolve()
                        }
                    }, secondTry, options) // callbackFunction
                }) // promise
            } // if

            try {
                var kb = this.store;
                var ds = !deletions ? []
                    : isStore(deletions) ? deletions.statements
                        : deletions instanceof Array ? deletions : [deletions];
                var is = !insertions ? []
                    : isStore(insertions) ? insertions.statements
                        : insertions instanceof Array ? insertions : [insertions];

                if (!(ds instanceof Array)) {
                    throw new Error('Type Error ' + (typeof ds) + ': ' + ds);
                }

                if (!(is instanceof Array)) {
                    throw new Error('Type Error ' + (typeof is) + ': ' + is);
                }

                if (ds.length === 0 && is.length === 0) {
                    return callback(null, true) // success -- nothing needed to be done.
                }
                var doc = ds.length ? ds[0].graph : is[0].graph
                if (!doc) {
                    let message = 'Error patching: statement does not specify which document to patch:' + ds[0] + ', ' + is[0]
                    // console.log(message)
                    throw new Error(message)
                }
                if (doc.termType !== 'NamedNode') {
                    let message = 'Error patching: document not a NamedNode:' + ds[0] + ', ' + is[0]
                    // console.log(message)
                    throw new Error(message)
                }
                var control = this.patchControlFor(doc)

                var startTime = Date.now()

                var props = ['subject', 'predicate', 'object', 'why']
                var verbs = ['insert', 'delete']
                var clauses = { 'delete': ds, 'insert': is }
                verbs.map(function (verb) {
                    clauses[verb].map(function (st) {
                        if (!doc.equals(st.graph)) {
                            throw new Error('update: destination ' + doc +
                                ' inconsistent with delete quad ' + st.graph)
                        }
                        props.map(function (prop) {
                            if (typeof st[prop] === 'undefined') {
                                throw new Error('update: undefined ' + prop + ' of statement.')
                            }
                        })
                    })
                })

                var bnodes = []

                if (ds.length) bnodes = this.statementArrayBnodes(ds)
                if (is.length) bnodes = bnodes.concat(this.statementArrayBnodes(is))
                var context = this.bnodeContext(bnodes, doc)
                var whereClause = this.contextWhere(context)
                var query = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
                        @prefix ex: <http://www.example.org/terms#>.

                        _:patch a solid:InsertDeletePatch;
                        `;
                if (whereClause.length) { // Is there a WHERE clause?
                    if (ds.length) {
                        query += 'solid:deletes { '
                        for (let i = 0; i < ds.length; i++) {
                            query += this.anonymizeNT(ds[i]) + '\n'
                        }
                        query += ' };\n'
                    }
                    if (is.length) {
                        query += 'solid:inserts { '
                        for (let i = 0; i < is.length; i++) {
                            query += this.anonymizeNT(is[i]) + '\n'
                        }
                        query += ' };\n'
                    }
                    query += whereClause;
                    query += ' .\n'
                } else { // no where clause
                    if (ds.length) {
                        query += 'solid:deletes { '
                        for (let i = 0; i < ds.length; i++) {
                            query += this.anonymizeNT(ds[i]) + '\n'
                        }
                        query += ' } \n'
                    }
                    if (is.length) {
                        if (ds.length) query += ' ; '
                        query += 'solid:inserts { '
                        for (let i = 0; i < is.length; i++) {
                            query += this.nTriples(is[i]) + '\n'
                        }
                        query += ' }.\n'
                    }
                }
                // Track pending upstream patches until they have finished their callbackFunction
                control.pendingUpstream = control.pendingUpstream ? control.pendingUpstream + 1 : 1
                if ('upstreamCount' in control) {
                    control.upstreamCount += 1 // count changes we originated ourselves
                    // console.log('upstream count up to : ' + control.upstreamCount)
                }

                this.fire(doc.value, query, (uri, success, body, response) => {
                    (response).elapsedTimeMs = Date.now() - startTime
                    /* console.log('    UpdateManager: Return ' +
                    (success ? 'success ' : 'FAILURE ') + (response as Response).status +
                    ' elapsed ' + (response as any).elapsedTimeMs + 'ms')
                    */
                    if (success) {
                        try {
                            kb.remove(ds)
                        } catch (e) {
                            success = false
                            body = 'Remote Ok BUT error deleting ' + ds.length + ' from store!!! ' + e
                        } // Add in any case -- help recover from weirdness??
                        for (let i = 0; i < is.length; i++) {
                            kb.add(is[i].subject, is[i].predicate, is[i].object, doc)
                        }
                    }

                    callback(uri, success, body, response)
                    control.pendingUpstream -= 1
                    // When upstream patches have been sent, reload state if downstream waiting
                    if (control.pendingUpstream === 0 && control.downstreamAction) {
                        var downstreamAction = control.downstreamAction
                        delete control.downstreamAction
                        // console.log('delayed downstream action:')
                        downstreamAction(doc)
                    }
                }, options); // fire

            } // try
            catch (e) {
                callback(undefined, false, 'Exception in update: ' + e + '\n' +
                    Util.stackString(e))
            }
        },

        contextWhere(context) {
            var updater = this
            return (!context || context.length === 0)
                ? ''
                : 'solid::where { ' +
                context.map(function (x) {
                    return updater.anonymizeNT(x)
                }).join('\n') + ' }\n'
        },

        fire(
            uri,
            query,
            callbackFunction,
            options = {}
        ) {
            return Promise.resolve()
                .then(() => {
                    if (!uri) {
                        throw new Error('No URI given for remote editing operation: ' + query)
                    }
                    // console.log('UpdateManager: sending update to <' + uri + '>')

                    options.noMeta = true;
                    options.contentType = 'text/n3';
                    options.body = query;

                    return this.store.fetcher.webOperation('PATCH', uri, options)
                })
                .then(response => {
                    if (!response.ok) {
                        let message = 'UpdateManager: update failed for <' + uri + '> status=' +
                            response.status + ', ' + response.statusText +
                            '\n   for query: ' + query
                        // console.log(message)
                        throw new Error(message)
                    }

                    // console.log('UpdateManager: update Ok for <' + uri + '>')

                    callbackFunction(uri, response.ok, response.responseText, response)
                })
                .catch(err => {
                    callbackFunction(uri, false, err.message, err)
                })
        }
    });
}

