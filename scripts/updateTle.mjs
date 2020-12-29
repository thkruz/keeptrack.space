import download from 'download-file';
 
var url = "https://www.keeptrack.space/TLE.json"
 
var options = {
    directory: "./src/tle/",
    filename: "TLE.json"
}
 
download(url, options, function(err) {
    if (err) {
        console.error(err);
        return;
    }
    console.log("TLE.json Updated from KeepTrack.space")
});
