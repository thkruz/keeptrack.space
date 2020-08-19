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

    fetch("/").then(function (response) {

        console.log(response.status);

        if (response.status === 404) {
            window.location.assign("/404.html");
        }
    });

} readyForInteraction();
// CHECK READY STATE