import download from 'download-file';
 
var urls = [
    "https://www.keeptrack.space/radarData/radarData.txt",
    "https://www.keeptrack.space/radarData/radarData.json"    
];
 
var options = {
    directory: "./dist/radarData/",
}
 
urls.forEach((url) => {
    download(url, options, function(err) {
        if (err) {
            console.error(err);            
        } else {
            console.log(`${url} downloaded from KeepTrack.space`);
        }
    });
});