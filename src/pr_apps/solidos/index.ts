//@ts-nocheck

// import "mashlib/dist/mash.css";
// import "mashlib/dist/mashlib.min.js";

import "../setup_proxy_sw.ts";


console.log("In solidos/index.ts");


    console.log("Podverse proxy is ready.");

    const authn = UI.authn;
    const authSession = UI.authn.authSession;
    // const store = UI.store;
    const $rdf = UI.rdf;
    const dom = document;
    $rdf.Fetcher.crossSiteProxyTemplate = self.origin + "/xss?uri={uri}";
    const uri = window.location.href;
    window.document.title = "SolidOS Web App: " + uri;
    const outliner = panes.getOutliner(dom); //function from solid-panes

    function go() {
        const uri = $rdf.uri.join(uriField.value, window.location.href);
        console.log("User field " + uriField.value);
        console.log("User requests " + uri);

        const params = new URLSearchParams(location.search);
        params.set("uri", uri);
        window.history.replaceState(
            {},
            "",
            `${location.origin}${location.pathname}?${params}`,
        );

        const subject = $rdf.sym(uri);
        outliner.GotoSubject(subject, true, undefined, true, undefined);
        mungeLoginArea();
    }

    const uriField = dom.getElementById("uriField");
    const goButton = dom.getElementById("goButton");
    const loginButtonArea = document.getElementById("loginButtonArea");
    const webIdArea = dom.getElementById("webId");
    const banner = dom.getElementById("inputArea");

    uriField.addEventListener(
        "keyup",
        function (e) {
            if (e.keyCode === 13) {
                go(e);
            }
        },
        false,
    );

    goButton.addEventListener("click", go, false);
    const initial = new URLSearchParams(self.location.search).get("uri");
    if (initial) {
        uriField.value = initial;
        go();
    } else {
        console.log("ready for user input");
    }
    async function mungeLoginArea() {
        loginButtonArea.innerHTML = "";
        if (uriField.value) {
            loginButtonArea.appendChild(
                UI.login.loginStatusBox(document, null, {}),
            );
        }
        const me = authn.currentUser();
        if (me) {
            const logoutButton = loginButtonArea.querySelector("input");
            logoutButton.value = "Logout";
            const displayId = `&lt;${me.value}>`;
            webIdArea.innerHTML = displayId;
            banner.style.backgroundColor = "#bbccbb";
        } else {
            banner.style.backgroundColor = "#ccbbbb";
        }
        loginButtonArea.style.display = "inline-block";
    }

    if (authSession) {
        authSession.onLogin(() => {
            mungeLoginArea();
            go();
        });
        authSession.onLogout(() => {
            mungeLoginArea();
            webIdArea.innerHTML = "public user";
            go();
        });
        authSession.onSessionRestore(() => {
            mungeLoginArea();
            go();
        });
    }
    mungeLoginArea();



