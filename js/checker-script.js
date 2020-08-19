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
let checkRequest = new Request("/");

fetch(checkRequest).then(function (response) {

    console.log(response.status + "OK");

    if (response.status === 404) {
        window.location.assign("/res/404.html");
    }
    else {
        readyForInteraction();
    }
});

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
}
// CHECK READY STATE