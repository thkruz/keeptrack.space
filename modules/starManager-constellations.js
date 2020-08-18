/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2020, Theodore Kruczek
http://keeptrack.space

All code is Copyright © 2016-2020 by Theodore Kruczek. All rights reserved.
No part of this web site may be reproduced, published, distributed, displayed,
performed, copied or stored for public or private use, without written
permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

///////////////////////////////////////////////////////////////////////////// */

(function () {
  // Requires starManager Module
  try {
    starManager.isConstellationVisible = false;
    starManager.isAllConstellationVisible = false;
    starManager.findStarsConstellation = function (starName) {
      for (var i = 0; i < starManager.constellations.length; i++) {
        for (var s = 0; s < starManager.constellations[i].stars.length; s++) {
          if (starManager.constellations[i].stars[s][0] === starName) {
            return starManager.constellations[i].name;
          }
          if (starManager.constellations[i].stars[s][1] === starName) {
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
              'star2': starManager.constellations[i].stars[s][1],
              'color': [1,1,1,1]
            }
          );
          starManager.isConstellationVisible = true;
          starManager.isAllConstellationVisible = true;
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
    },
    {
      "name": "Aquila",
      "stars": [["Altair", "Alshain"],
                ["Alshain", "θ-Aql"],
                ["θ-Aql", "η-Aql"],
                ["η-Aql", "δ-Aql"],
                ["δ-Aql", "ζ-Aql"],
                ["ζ-Aql", "Tarazed"],
                ["Tarazed", "Altair"],
                ["ζ-Aql", "ε-Aql"],
                ["δ-Aql", "λ-Aql"]]
    },
    {
      "name": "Aries",
      "stars": [["c-Ari", "Hamal"],
                ["Hamal", "Sheratan"],
                ["Sheratan", "Mesarthim"]]
    },
    {
      "name": "Perseus",
      "stars": [["Atik", "ζ-Per"],
                ["ζ-Per", "Menkib"],
                ["Menkib", "ε-Per"],
                ["ε-Per", "δ-Per"],
                ["δ-Per", "Mirphak"],
                ["Mirphak", "κ-Per"],
                ["κ-Per", "Algol"],
                ["Algol", "ρ-Per"],
                ["ρ-Per", "16-Per"],
                ["Mirphak", "γ-Per"],
                ["γ-Per", "η-Per"],
                ["η-Per", "φ-Per"]]
    },
    {
      "name": "Cassiopeia",
      "stars": [["ε-Cas", "Ruchbah"],
                ["Ruchbah", "γ-Cas"],
                ["γ-Cas", "Schedar"],
                ["Schedar", "Caph"]]
    },
    {
    "name": "Triangulum",
    "stars": [["γ-Tri", "β-Tri"],
              ["β-Tri", "Mothallah"],
              ["Mothallah", "γ-Tri"]]
    },
    {
    "name": "Antlia",
    "stars": [["ι-Ant", "α-Ant"],
              ["α-Ant", "θ-Ant"],
              ["θ-Ant", "ε-Ant"]]
    },
    {
    "name": "Pyxis",
    "stars": [["γ-Pyx", "α-Pyx"],
              ["α-Pyx", "β-Pyx"]]
    },
    {
    "name": "Corvus",
    "stars": [["Alchiba", "ε-Crv"],
              ["ε-Crv", "Gienah"],
              ["Gienah", "Algorab"],
              ["Algorab", "β-Crv"],
              ["β-Crv", "ε-Crv"]]
    },
    {
    "name": "Apus",
    "stars": [["α-Aps", "δ¹-Aps"],
              ["δ¹-Aps", "β-Aps"],
              ["β-Aps", "γ-Aps"],
              ["γ-Aps", "δ¹-Aps"]]
    },
    {
    "name": "Triangulum Australe",
    "stars": [["β-TrA", "η¹-TrA"],
              ["η¹-TrA", "Atria"],
              ["Atria", "γ-TrA"],
              ["γ-TrA", "ε-TrA"],
              ["ε-TrA", "β-TrA"]]
    },
    {
    "name": "Circinus",
    "stars": [["β-Cir", "θ-Cir"],
              ["θ-Cir", "α-Cir"],
              ["α-Cir", "γ-Cir"]]
    },
    {
    "name": "Norma",
    "stars": [["η-Nor", "γ¹-Nor"],
              ["γ¹-Nor", "γ²-Nor"],
              ["γ²-Nor", "ε-Nor"]]
    },
    {
    "name": "Scorpius",
    "stars": [["Shaula", "κ-Sco"],
              ["κ-Sco", "ι¹-Sco"],
              ["ι¹-Sco", "Sargas"],
              ["Sargas", "η-Sco"],
              ["η-Sco", "ζ²-Sco"],
              ["ζ²-Sco", "μ¹-Sco"],
              ["μ¹-Sco", "ε-Sco"],
              ["ε-Sco", "τ-Sco"],
              ["τ-Sco", "Antares"],
              ["Antares", "σ-Sco"],
              ["σ-Sco", "Dschubba"],
              ["Dschubba", "Acrab"],
              ["Acrab", "ν-Sco"],
              ["Dschubba", "π-Sco"],
              ["π-Sco", "ρ-Sco"]]
    },
    {
    "name": "Corona Borealis",
    "stars": [["ι-CrB", "ε-CrB"],
              ["ε-CrB", "γ-CrB"],
              ["γ-CrB", "Alphecca"],
              ["Alphecca", "Nusakan"],
              ["Nusakan", "θ-CrB"]]
    },
    {
    "name": "Serpens Cauda",
    "stars": [["ν-Ser", "ξ-Ser"],
              ["ξ-Ser", "O-Ser"],
              ["O-Ser", "η-Ser"],
              ["η-Ser", "Alya"],
              ["Alya", "β-TrA"]]
    },
    {
    "name": "Serpens Caput",
    "stars": [["μ-Ser", "ω-Ser"],
              ["ω-Ser", "ε-Ser"],
              ["ε-Ser", "Unukalhai"],
              ["Unukalhai", "16-Ser"],
              ["16-Ser", "δ-Ser"],
              ["δ-Ser", "β-Ser"],
              ["β-Ser", "γ-Ser"],
              ["γ-Ser", "κ-Ser"],
              ["κ-Ser", "β-Ser"]]
    },
    {
    "name": "Aquarius",
    "stars": [["c²-Aqr", "Skat"],
              ["Skat", "τ²-Aqr"],
              ["τ²-Aqr", "λ-Aqr"],
              ["λ-Aqr", "81-Aqr"],
              ["81-Aqr", "φ-Aqr"],
              ["φ-Aqr", "η-Aqr"],
              ["ζ¹-Aqr", "Sadachbia"],
              ["Sadachbia", "Sadalmelik"],
              ["Sadalmelik", "Ancha"],
              ["Ancha", "e-Aqr"],
              ["e-Aqr", "ι-Aqr"],
              ["Sadalmelik", "Sadalsuud"],
              ["Sadalsuud", "μ-Aqr"],
              ["μ-Aqr", "Albali"]]
    },
    {
    "name": "Crux",
    "stars": [["Gacrux", "Acrux"],
              ["Mimosa", "δ-Cru"]]
    },
    {
    "name": "Musca",
    "stars": [["δ-Mus", "α-Mus"],
              ["α-Mus", "β-Mus"],
              ["α-Mus", "γ-Mus"],
              ["α-Mus", "ζ¹-Mus"],
              ["ζ¹-Mus", "ε-Mus"],
              ["ε-Mus", "μ-Mus"],
              ["μ-Mus", "λ-Mus"]]
    },
    {
    "name": "Chamaeleon",
    "stars": [["β-Cha", "γ-Cha"],
              ["γ-Cha", "δ²-Cha"],
              ["δ²-Cha", "β-Cha"],
              ["γ-Cha", "α-Cha"],
              ["α-Cha", "θ-Cha"],
              ["θ-Cha", "η-Cha"],
              ["η-Cha", "RS Cha"],
              ["RS Cha","ι-Cha"]]
    },
    {
    "name": "Volans",
    "stars": [["α-Vol", "β-Vol"],
              ["β-Vol", "ε-Vol"],
              ["ε-Vol", "ζ-Vol"],
              ["ζ-Vol", "γ²-Vol"],
              ["γ²-Vol", "δ-Vol"],
              ["δ-Vol", "ε-Vol"]]
    },
    {
    "name": "Carina",
    "stars": [["υ-Car", "Miaplacidus"],
              ["Miaplacidus", "ω-Car"],
              ["ω-Car", "θ-Car"],
              ["θ-Car", "V337 Car"],
              ["V337 Car", "Aspidiske"],
              ["Aspidiske", "Avior"],
              ["Avior", "χ-Car"],
              ["χ-Car","N-Car"],
              ["N-Car", "Canopus"]]
    },
    {
    "name": "Pictor",
    "stars": [["β-Pic", "γ-Pic"],
              ["γ-Pic", "α-Pic"]]
    },
    {
    "name": "Dorado",
    "stars": [["36-Dor", "β-Dor"],
              ["δ-Dor", "β-Dor"],
              ["β-Dor", "ζ-Dor"],
              ["ζ-Dor", "α-Dor"],
              ["α-Dor", "γ-Dor"]]
    },
    {
    "name": "Reticulum",
    "stars": [["ε-Ret", "ι-Ret"],
              ["ι-Ret", "δ-Ret"],
              ["δ-Ret", "β-Ret"],
              ["β-Ret", "α-Ret"],
              ["α-Ret", "ε-Ret"]]
    },
    {
    "name": "Horologium",
    "stars": [["α-Hor", "ι-Hor"],
              ["ι-Hor", "η-Hor"],
              ["η-Hor", "ζ-Hor"],
              ["ζ-Hor", "μ-Hor"],
              ["μ-Hor", "β-Hor"]]
    },
    {
    "name": "Hydrus",
    "stars": [["β-Hyi", "γ-Hyi"],
              ["γ-Hyi", "ε-Hyi"],
              ["ε-Hyi", "δ-Hyi"],
              ["δ-Hyi", "α-Hyi"]]
    },
    {
    "name": "Octans",
    "stars": [["ν-Oct", "β-Oct"],
              ["β-Oct", "δ-Oct"],
              ["δ-Oct", "ν-Oct"]]
    },
    {
    "name": "Indus",
    "stars": [["δ-Ind", "θ-Ind"],
              ["θ-Ind", "β-Ind"],
              ["θ-Ind", "α-Ind"]]
    },
    {
    "name": "Tucana",
    "stars": [["δ-Tuc", "α-Tuc"],
              ["α-Tuc", "γ-Tuc"],
              ["γ-Tuc", "ε-Tuc"],
              ["ε-Tuc", "ζ-Tuc"],
              ["ζ-Tuc", "β¹-Tuc"],
              ["β¹-Tuc", "γ-Tuc"]]
    },
    {
    "name": "Grus",
    "stars": [["ζ-Gru", "ε-Gru"],
              ["ε-Gru", "β-Gru"],
              ["β-Gru", "ι-Gru"],
              ["ι-Gru", "θ-Gru"],
              ["β-Gru", "Alnair"],
              ["β-Gru", "δ²-Gru"],
              ["δ²-Gru", "δ¹-Gru"],
              ["δ¹-Gru", "μ²-Gru"],
              ["μ²-Gru", "μ¹-Gru"],
              ["μ¹-Gru", "λ-Gru"],
              ["λ-Gru", "γ-Gru"]]
    },
    {
    "name": "Microscopium",
    "stars": [["θ¹-Mic", "ε-Mic"],
              ["ε-Mic", "2-PsA"],
              ["2-PsA", "γ-Mic"],
              ["γ-Mic", "α-Mic"]]
    },
    {
    "name": "Corona Australis",
    "stars": [["λ-CrA", "ε-CrA"],
              ["ε-CrA", "γ-CrA"],
              ["γ-CrA", "α-CrA"],
              ["α-CrA", "β-CrA"],
              ["β-CrA", "δ-CrA"],
              ["δ-CrA", "ζ-CrA"],
              ["ζ-CrA", "η¹-CrA"]]
    },
    {
    "name": "Telescopium",
    "stars": [["ζ-Tel", "α-Tel"],
              ["α-Tel", "ε-Tel"]]
    },
    {
    "name": "Ara",
    "stars": [["θ-Ara", "α-Ara"],
              ["α-Ara", "κ-Ara"],
              ["κ-Ara", "ε¹-Ara"],
              ["ε¹-Ara", "ζ-Ara"],
              ["ζ-Ara", "η-Ara"],
              ["ζ-Ara", "γ-Ara"],
              ["γ-Ara", "δ-Ara"],
              ["γ-Ara", "β-Ara"],
              ["β-Ara", "α-Ara"]]
    },
    {
    "name": "Lynx",
    "stars": [["α-Lyn", "38-Lyn"],
              ["38-Lyn", "10-UMa"],
              ["10-UMa", "31-Lyn"],
              ["31-Lyn", "21-Lyn"],
              ["21-Lyn", "15-Lyn"],
              ["15-Lyn", "UZ Lyn"]]
    },
    {
    "name": "Gemini",
    "stars": [["Propus", "μ-Gem"],
              ["μ-Gem", "Mebsuta"],
              ["Mebsuta", "τ-Gem"],
              ["τ-Gem", "ρ-Gem"],
              ["ρ-Gem", "Castor"],
              ["Castor", "σ-Gem"],
              ["σ-Gem", "Pollux"],
              ["Pollux", "κ-Gem"],
              ["κ-Gem", "Wasat"],
              ["Wasat", "Mekbuda"],
              ["Mekbuda", "Alhena"],
              ["Alhena", "30-Gem"],
              ["30-Gem", "ξ-Gem"]]
    },
    {
    "name": "Canis Minor",
    "stars": [["Procyon", "Gomeisa"]]
    },
    {
    "name": "Monoceros",
    "stars": [["ζ-Mon", "α-Mon"],
              ["α-Mon", "δ-Mon"],
              ["δ-Mon", "β-Mon"],
              ["β-Mon", "γ-Mon"],
              ["δ-Mon", "18-Mon"],
              ["18-Mon", "ε-Mon"],
              ["ε-Mon", "13-Mon"]]
    },
    {
    "name": "Canis Major",
    "stars": [["Mirzam", "Sirius"],
              ["Sirius", "EY CMa"],
              ["EY CMa", "O²-CMa"],
              ["O²-CMa", "Wezen"],
              ["Wezen", "σ-CMa"],
              ["σ-CMa", "Adhara"],
              ["Wezen", "Aludra"]]
    },
    {
    "name": "Columba",
    "stars": [["δ-Col", "κ-Col"],
              ["κ-Col", "γ-Col"],
              ["γ-Col", "Wazn"],
              ["Wazn", "η-Col"],
              ["Wazn", "Phact"],
              ["Phact", "ε-Col"]]
    },
    {
    "name": "Caelum",
    "stars": [["α-Cae", "β-Cae"]]
    },
    {
    "name": "Puppis",
    "stars": [["τ-Pup", "ν-Pup"],
              ["ν-Pup", "π-Pup"],
              ["π-Pup", "NV Pup"],
              ["NV Pup", "p-Pup"],
              ["p-Pup", "κ²-Pup"],
              ["κ²-Pup", "ξ-Pup"],
              ["ξ-Pup", "Tureis"],
              ["Tureis", "Naos"],
              ["Naos", "σ-Pup"],
              ["σ-Pup", "L2 Pup"],
              ["L2 Pup", "τ-Pup"]]
    },
    {
    "name": "Lupus",
    "stars": [["θ-Lup", "η-Lup"],
              ["η-Lup", "γ-Lup"],
              ["γ-Lup", "ε-Lup"],
              ["ε-Lup", "κ¹-Lup"],
              ["κ¹-Lup", "ζ-Lup"],
              ["ζ-Lup", "α-Lup"],
              ["α-Lup", "β-Lup"],
              ["β-Lup", "δ-Lup"],
              ["δ-Lup", "γ-Lup"],
              ["δ-Lup", "φ¹-Lup"],
              ["φ¹-Lup", "χ-Lup"]]
    },
    {
    "name": "Pavo",
    "stars": [["Peacock", "β-Pav"],
              ["β-Pav", "δ-Pav"],
              ["δ-Pav", "λ-Pav"],
              ["λ-Pav", "ξ-Pav"],
              ["ξ-Pav", "π-Pav"],
              ["π-Pav", "η-Pav"],
              ["η-Pav", "ζ-Pav"],
              ["ζ-Pav", "ε-Pav"],
              ["ε-Pav", "υ-Pav"],
              ["υ-Pav", "β-Pav"],
              ["β-Pav", "γ-Pav"]]
    },
    {
    "name": "Bootes",
    "stars": [["θ-Boo", "λ-Boo"],
              ["λ-Boo", "Seginus"],
              ["Seginus", "ρ-Boo"],
              ["ρ-Boo", "Arcturus"],
              ["Arcturus", "Muphrid"],
              ["Arcturus", "ζ-Boo"],
              ["Arcturus", "W Boo"],
              ["W Boo", "Izar"],
              ["Izar", "δ-Boo"],
              ["δ-Boo", "Nekkar"],
              ["Nekkar", "Seginus"]]
    },
    {
    "name": "Canes Venatici",
    "stars": [["Cor Caroli", "9-CVn"],
              ["9-CVn", "Chara"]]
    },
    {
    "name": "Coma Berenices",
    "stars": [["α-Com", "β-Com"],
              ["β-Com", "γ-Com"]]
    },
    {
    "name": "Leo",
    "stars": [["ε-Leo", "Rasalas"],
              ["Rasalas", "Adhafera"],
              ["Adhafera", "Algieba"],
              ["Algieba", "η-Leo"],
              ["η-Leo", "Regulus"],
              ["Regulus", "k-Leo"],
              ["k-Leo", "Chertan"],
              ["Chertan", "Zosma"],
              ["Zosma", "Denebola"],
              ["Denebola", "Chertan"]]
    },
    {
    "name": "Camelopardalis",
    "stars": [["7-Cam", "β-Cam"],
              ["β-Cam", "α-Cam"],
              ["α-Cam", "γ-Cam"],
              ["γ-Cam", "HD 21291"]]
    },
    {
    "name": "Cancer",
    "stars": [["ι-Cnc", "Asellus Borealis"],
              ["Asellus Borealis", "Asellus Australis"],
              ["Asellus Australis", "54-Cnc"],
              ["54-Cnc", "Acubens"],
              ["Asellus Australis", "BP Cnc"],
              ["BP Cnc", "β-Cnc"]]
    },
    {
    "name": "Capricornus",
    "stars": [["Algedi", "Dabih"],
              ["Dabih", "O-Cap"],
              ["O-Cap", "ψ-Cap"],
              ["ψ-Cap", "ω-Cap"],
              ["ω-Cap", "A-Cap"],
              ["A-Cap", "ζ-Cap"],
              ["ζ-Cap", "b-Cap"],
              ["b-Cap", "37-Cap"],
              ["37-Cap", "ε-Cap"],
              ["ε-Cap", "δ-Cap"],
              ["δ-Cap", "ι-Cap"],
              ["ι-Cap", "θ-Cap"],
              ["θ-Cap", "Dabih"]]
    },
    {
    "name": "Centaurus",
    "stars": [["λ-Cen", "π-Cen"],
              ["π-Cen", "ρ-Cen"],
              ["ρ-Cen", "δ-Cen"],
              ["δ-Cen", "σ-Cen"],
              ["σ-Cen", "γ-Cen"],
              ["γ-Cen", "ε-Cen"],
              ["ε-Cen", "Hadar"],
              ["ε-Cen", "Rigil Kentaurus"],
              ["ε-Cen", "M-Cen"],
              ["M-Cen" ,"ζ-Cen"]
              ["ζ-Cen", "μ-Cen"],
              ["μ-Cen", "ν-Cen"],
              ["ν-Cen", "Menkent"],
              ["ν-Cen", "η-Cen"],
              ["η-Cen", "κ-Cen"],
              ["v-Cen", "ι-Cen"]]
    },
    {
    "name": "Cepheus",
    "stars": [["δ-Cep", "ε-Cep"],
              ["ε-Cep", "ζ-Cep"],
              ["ζ-Cep", "Alderamin"],
              ["Alderamin", "η-Cep"],
              ["η-Cep", "θ-Cep"],
              ["Alderamin", "Alfirk"],
              ["Alfirk", "78-Dra"],
              ["78-Dra", "16-Cep"],
              ["16-Cep", "Errai"],
              ["Errai", "ι-Cep"],
              ["ι-Cep" ,"ζ-Cep"]]
    },
    {
    "name": "Cetus",
    "stars": [["ι-Cet", "Diphda"],
              ["Diphda", "τ-Cet"],
              ["τ-Cet", "Baten Kaitos"],
              ["Baten Kaitos", "θ-Cet"],
              ["θ-Cet", "η-Cet"],
              ["η-Cet", "ι-Cet"],
              ["Baten Kaitos", "70-Cet"],
              ["70-Cet", "δ-Cet"],
              ["δ-Cet", "γ-Cet"],
              ["γ-Cet" ,"ν-Cet"]
              ["ν-Cet", "ξ²-Cet"],
              ["ξ²-Cet", "μ-Cet"],
              ["μ-Cet", "λ-Cet"],
              ["λ-Cet", "93-Cet"],
              ["93-Cet", "Menkar"],
              ["Menkar", "γ-Cet"]]
    },
    {
    "name": "Crater",
    "stars": [["η-Crt", "ζ-Crt"],
              ["ζ-Crt", "γ-Crt"],
              ["γ-Crt", "β-Crt"],
              ["β-Crt", "Alkes"],
              ["Alkes", "δ-Crt"],
              ["δ-Crt", "γ-Crt"],
              ["δ-Crt", "ε-Crt"],
              ["ε-Crt", "θ-Crt"]]
    },
    {
    "name": "Cygnus",
    "stars": [["ζ-Cyg", "DT Cyg"],
              ["DT Cyg", "ε-Cyg"],
              ["ε-Cyg", "Sadr"],
              ["Sadr", "Deneb"],
              ["Sadr", "η-Cyg"],
              ["η-Cyg", "9-Cyg"],
              ["9-Cyg", "Albireo"],
              ["Sadr", "δ-Cyg"],
              ["δ-Cyg", "θ-Cyg"],
              ["θ-Cyg" ,"ι-Cyg"]
              ["ι-Cyg", "κ-Cyg"]]
    },
    {
    "name": "Lyra",
    "stars": [["κ-Lyr", "Vega"],
              ["Vega", "ε²-Lyr"],
              ["ε²-Lyr", "ζ¹-Lyr"],
              ["ζ¹-Lyr", "Sheliak"],
              ["Sheliak", "Sulafat"],
              ["Sulafat", "δ²-Lyr"],
              ["δ²-Lyr", "δ¹-Lyr"],
              ["δ¹-Lyr", "ζ¹-Lyr"]]
    },
    {
    "name": "Vulpecula",
    "stars": [["1-Vul", "α-Vul"],
              ["α-Vul", "13-Vul"]]
    }
    ];
  } catch {
    console.log('starManager.constellations Plugin failed to load!');
  }
})();
