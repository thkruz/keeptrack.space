starManager.isConstellationVisible = false;

starManager.findStarsConstellation = function (starName) {
  for (var i = 0; i < starManager.constellations.length; i++) {
    for (var s = 0; s < starManager.constellations[i].stars.length; s++) {
      if (starManager.constellations[i].stars[s][0] === starName) {
        return starManager.constellations[i].name;
      }
    }
  }
  return null;
};

starManager.drawAllConstellations = function () {
  for (var i = 0; i < starManager.constellations.length; i++) {
    for (var s = 0; s < starManager.constellations[i].stars.length; s++) {
      // Verify Stars Exist
      var star1 = satSet.getSat(satSet.getIdFromStarName(starManager.constellations[i].stars[s][0]));
      var star2 = satSet.getSat(satSet.getIdFromStarName(starManager.constellations[i].stars[s][1]));
      if (star1 == null || star2 == null) { continue; }
      drawLineList.push(
        {
          'line': new Line(),
          'star1': starManager.constellations[i].stars[s][0],
          'star2': starManager.constellations[i].stars[s][1]
        }
      );
      starManager.isConstellationVisible = true;
    }
  }
};

starManager.drawConstellations = function (C) {
  for (var i = 0; i < starManager.constellations.length; i++) {
    if (starManager.constellations[i].name === C) {
      for (var s = 0; s < starManager.constellations[i].stars.length; s++) {
        // Verify Stars Exist
        var star1 = satSet.getSat(satSet.getIdFromStarName(starManager.constellations[i].stars[s][0]));
        var star2 = satSet.getSat(satSet.getIdFromStarName(starManager.constellations[i].stars[s][1]));
        if (star1 == null || star2 == null) { continue; }
        drawLineList.push(
          {
            'line': new Line(),
            'star1': starManager.constellations[i].stars[s][0],
            'star2': starManager.constellations[i].stars[s][1]
          }
        );
        starManager.isConstellationVisible = true;
      }
    }
  }
};

starManager.clearConstellations = function () {
  starManager.isConstellationVisible = false;
  var isFoundStar = true;
  var attempts = 0;
  while (isFoundStar && attempts < 30) {
    isFoundStar = false;
    for (var i = 0; i < drawLineList.length; i++) {
      if ((typeof drawLineList[i].star1 !=='undefined') || (typeof drawLineList[i].star2 !=='undefined')) {
        drawLineList.splice(i, 1);
        isFoundStar = true;
      }
    }
    attempts++;
  }
};

starManager.constellations = [
{
  "name": "Ursa Minor",
  "stars": [["Polaris", "Yildun"],
            ["Yildun", "ε-UMi"],
            ["ε-UMi", "ζ-UMi"],
            ["ζ-UMi", "Kochab"],
            ["Kochab", "Pherkad"],
            ["Pherkad", "η-UMi"],
            ["η-UMi", "ζ-UMi"]]
},
{
  "name": "Ursa Major",
  "stars": [["Alkaid", "Mizar"],
            ["Mizar", "Alioth"],
            ["Alioth", "Megrez"],
            ["Megrez", "Dubhe"],
            ["Dubhe", "Merak"],
            ["Merak", "Phecda"],
            ["Phecda", "Megrez"]]
},
{
  "name": "Sextans",
  "stars": [["α-Sextans", "γ-Sextans"],
            ["γ-Sextans", "β-Sextans"],
            ["β-Sextans", "α-Sextans"]]
},
{
  "name": "Leo Minor",
  "stars": [["46-LMi", "β-LMi"],
            ["β-LMi", "21-LMi"]]
}
];
