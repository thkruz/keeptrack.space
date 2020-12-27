import download from 'download-file';
 
var urls = [
    "https://www.keeptrack.space/textures/earthbump8k.jpg",
    "https://www.keeptrack.space/textures/earthbump10k.jpg",
    "https://www.keeptrack.space/textures/earthlights8k.jpg",
    "https://www.keeptrack.space/textures/earthlights10k.jpg",
    "https://www.keeptrack.space/textures/earthmap8k.jpg",
    "https://www.keeptrack.space/textures/earthmap10k.jpg",
    "https://www.keeptrack.space/textures/earthspec8k.jpg",
    "https://www.keeptrack.space/textures/earthspec10k.jpg"
];
 
var options = {
    directory: "./dist/textures/",
}
 
urls.forEach(url => {
    download(url, options, function(err) {
        if (err) {
            console.error(err);            
        } else {
            console.log(`${url} downloaded from KeepTrack.space`);
        }
    });
});