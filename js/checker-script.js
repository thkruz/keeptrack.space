/* /////////////////////////////////////////////////////////////////////////////

This script is intended to check that the application is ready for interaction.

///////////////////////////////////////////////////////////////////////////// */

// DETECT IE
function detectIe() {
  let BrowserA = navigator.userAgent
  let browsers = /Chrome|Safari|Firefox|Edg/i.test(BrowserA)

  if (browsers === false) {
    window.location.assign = '/res/IE.html'
  } else {
    return true
  }
}
detectIe()
// DETECT IE

// CHECK READY STATE
// Looking for an essential file such as main.js ensures that the install
// directory is currectly set. If we look for the index.htm file then it will
// always be found (otherwise how did we load this script). If we look for
// optional modules like sensorManager.js then it could fail to load unnecessarily
let checkRequest = new Request(`${settingsManager.installDirectory}js/main.js`)

fetch(checkRequest).then(function (response) {
  // console.log(response.status + "OK");

  if (response.status === 404) {
    // This same file can be used by .htaccess to redirect bad links
    // across the whole server (ex. keeptrack.space/fakepage.html)
    window.location.assign('/res/404.html')
  } else {
    readyForInteraction()
  }
})

function readyForInteraction() {
  // This looks to see if the main page is loaded.
  // It does NOT know if all of the async loading is complete. The satellite
  // database (.json file) is the largest async file and it has to  be processed
  // by the sat-cruncher web worker before webgl can draw the satellites
  document.addEventListener('readystatechange', function () {
    let intervalID = window.setInterval(isReady, 1000)

    function displayElement(id, value) {
      document.getElementById(id).style.display = value ? 'block' : 'none'
    }

    function isReady() {
      if (document.readyState === 'interactive') {
        displayElement('main-container', false)
      } else if (document.readyState === 'complete') {
        window.clearInterval(intervalID)
        displayElement('main-container', true)
      }
    }
  })
}
// CHECK READY STATE
