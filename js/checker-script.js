/* /////////////////////////////////////////////////////////////////////////////

This script is intended to check that the application is ready for interaction.

///////////////////////////////////////////////////////////////////////////// */

// DETECT IE
function detectIe() {

    let BrowserA = navigator.userAgent;
    let browsers = /Chrome|Safari|Firefox|Edg/i.test(BrowserA);

    if (browsers === false) {
        window.location.assign = ("/res/IE.html");
    }
    else {
        return true;
    }
} detectIe();
// DETECT IE

// CHECK READY STATE

function readyForInteraction() {

    // This looks to see if the main page is loaded.
    // It does NOT know if all of the async loading is complete. The satellite
    // database (.json file) is the largest async file and it has to  be processed
    // by the sat-cruncher web worker before webgl can draw the satellites
    document.addEventListener("readystatechange", function () {
        let intervalID = window.setInterval(isReady, 1000);

        function displayElement(id, value) {
            document.getElementById(id).style.display = value ? "block" : "none";
        }

        function isReady() {

            if (document.readyState === "interactive") {
                displayElement("main-container", false);
            }
            else if (document.readyState === "complete") {
                window.clearInterval(intervalID);
                displayElement("main-container", true);
                displayElement("canvas-holder", false);
                checkScripts();
            }
            else {
                displayElement("canvas-holder", true);
            }
        }
    });

    // check if the scripts that are writen to the DOM are loaded.
    function checkScripts() {

        let scriptFiles = document.scripts;

        for (let i = 0; i < scriptFiles.length; i++) {

            let scriptFileSrc = scriptFiles[i].src;
            let checkRequest = new Request(scriptFileSrc);

            fetch(checkRequest).then(function (response) {

                if (response.status === 404) {
                    // This same file can be used by .htaccess to redirect bad links
                    // across the whole server (ex. keeptrack.space/fakepage.html)
                    window.location.assign("/res/404.html");
                    return false;
                }
                else {
                    return true;
                }
            });
        }
    }
    // Combine this with the scriptFileSrc causing the error.
    // window.onerror = function (message, url) {
    //     console.log(message + " " + url);
    // }

} window.onload = readyForInteraction();
// CHECK READY STATE