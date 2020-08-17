// DETECT IE
function detectIe() {

    let BrowserA = navigator.userAgent;
    let browsers = /Chrome|Safari|Firefox|Edg/i.test(BrowserA);

    if (browsers === false) {
        window.location.href = "https://keeptrack.space/oops.html";
    }
    else {
        return true;
    }
} detectIe();
// DETECT IE