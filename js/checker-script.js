/* /////////////////////////////////////////////////////////////////////////////

This script is intended to check that the application is ready for interaction.

///////////////////////////////////////////////////////////////////////////// */

// DETECT IE
function detectIe() {

    let BrowserA = navigator.userAgent;
    let browsers = /Chrome|Safari|Firefox|Edg/i.test(BrowserA);

    if (browsers === false) {
        window.location.assign = ("/IE.html");
    }
    else {
        return true;
    }
} detectIe();
// DETECT IE

// CHECK READY STATE
function readyForInteraction() {

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
            }
        }
    });

    function filesLoaded() {

        if (settingsManager.installDirectory !== "/") {
            window.location.assign("/500.html");
            // ADD CONTACT EMAIL ON ERROR PAGE BUTTON??
            // STYLE THE BUTTON
            // LOG ERRORS TO JSON FILE??
            return false;
        }
        else {
            return true;
        }
    } filesLoaded();

} readyForInteraction();
// CHECK READY STATE