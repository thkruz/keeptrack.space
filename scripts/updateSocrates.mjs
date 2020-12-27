import download from 'download-file';
 
var url = "https://www.keeptrack.space/SOCRATES.htm"
 
var options = {
    directory: "./src/",
    filename: "SOCRATES.htm"
}
 
download(url, options, function(err) {
    if (err) {
        console.error(err);
        return;
    }
    console.log("SOCRATES.htm Updated from KeepTrack.space")
});
