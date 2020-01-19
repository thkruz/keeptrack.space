var satVmagManager = {}
satVmagManager.init = function () {
  for (var i = 0; i < satVmagManager.starlink.length; i++) {
    satVmagManager.sats.push(satVmagManager.starlink[i]);
  }
  for (i = 0; i < satVmagManager.sats.length; i++) {
    satSet.vmagUpdate(satVmagManager.sats[i]);
  }
};
satVmagManager.starlink = [
  // Batch 1
  {
    "satid": "44235",
    "vmag": -3
  },
  {
    "satid": "44236",
    "vmag": -3
  },
  {
    "satid": "44237",
    "vmag": -3
  },
  {
    "satid": "44238",
    "vmag": -3
  },
  {
    "satid": "44239",
    "vmag": -3
  },
  {
    "satid": "44240",
    "vmag": -3
  },
  {
    "satid": "44241",
    "vmag": -3
  },
  {
    "satid": "44242",
    "vmag": -3
  },
  {
    "satid": "44243",
    "vmag": -3
  },
  {
    "satid": "44244",
    "vmag": -3
  },
  {
    "satid": "44245",
    "vmag": -3
  },
  {
    "satid": "44246",
    "vmag": -3
  },
  {
    "satid": "44247",
    "vmag": -3
  },
  {
    "satid": "44248",
    "vmag": -3
  },
  {
    "satid": "44249",
    "vmag": -3
  },
  {
    "satid": "44250",
    "vmag": -3
  },
  {
    "satid": "44251",
    "vmag": -3
  },
  {
    "satid": "44252",
    "vmag": -3
  },
  {
    "satid": "44253",
    "vmag": -3
  },
  {
    "satid": "44254",
    "vmag": -3
  },
  {
    "satid": "44255",
    "vmag": -3
  },
  {
    "satid": "44256",
    "vmag": -3
  },
  {
    "satid": "44257",
    "vmag": -3
  },
  {
    "satid": "44258",
    "vmag": -3
  },
  {
    "satid": "44259",
    "vmag": -3
  },
  {
    "satid": "44260",
    "vmag": -3
  },
  {
    "satid": "44261",
    "vmag": -3
  },
  {
    "satid": "44262",
    "vmag": -3
  },
  {
    "satid": "44263",
    "vmag": -3
  },
  {
    "satid": "44264",
    "vmag": -3
  },
  {
    "satid": "44265",
    "vmag": -3
  },
  {
    "satid": "44266",
    "vmag": -3
  },
  {
    "satid": "44267",
    "vmag": -3
  },
  {
    "satid": "44268",
    "vmag": -3
  },
  {
    "satid": "44269",
    "vmag": -3
  },
  {
    "satid": "44270",
    "vmag": -3
  },
  {
    "satid": "44271",
    "vmag": -3
  },
  {
    "satid": "44272",
    "vmag": -3
  },
  {
    "satid": "44273",
    "vmag": -3
  },
  {
    "satid": "44274",
    "vmag": -3
  },
  {
    "satid": "44275",
    "vmag": -3
  },
  {
    "satid": "44276",
    "vmag": -3
  },
  {
    "satid": "44277",
    "vmag": -3
  },
  {
    "satid": "44278",
    "vmag": -3
  },
  {
    "satid": "44279",
    "vmag": -3
  },
  {
    "satid": "44280",
    "vmag": -3
  },
  {
    "satid": "44281",
    "vmag": -3
  },
  {
    "satid": "44282",
    "vmag": -3
  },
  {
    "satid": "44283",
    "vmag": -3
  },
  {
    "satid": "44284",
    "vmag": -3
  },
  {
    "satid": "44285",
    "vmag": -3
  },
  {
    "satid": "44286",
    "vmag": -3
  },
  {
    "satid": "44287",
    "vmag": -3
  },
  {
    "satid": "44288",
    "vmag": -3
  },
  {
    "satid": "44289",
    "vmag": -3
  },
  {
    "satid": "44290",
    "vmag": -3
  },
  {
    "satid": "44291",
    "vmag": -3
  },
  {
    "satid": "44292",
    "vmag": -3
  },
  {
    "satid": "44293",
    "vmag": -3
  },
  {
    "satid": "44294",
    "vmag": -3
  }, /// Batch 2
  {
    "satid": "44713",
    "vmag": -3
  },
  {
    "satid": "44714",
    "vmag": -3
  },
  {
    "satid": "44715",
    "vmag": -3
  },
  {
    "satid": "44716",
    "vmag": -3
  },
  {
    "satid": "44717",
    "vmag": -3
  },
  {
    "satid": "44718",
    "vmag": -3
  },
  {
    "satid": "44719",
    "vmag": -3
  },
  {
    "satid": "44720",
    "vmag": -3
  },
  {
    "satid": "44721",
    "vmag": -3
  },
  {
    "satid": "44722",
    "vmag": -3
  },
  {
    "satid": "44723",
    "vmag": -3
  },
  {
    "satid": "44724",
    "vmag": -3
  },
  {
    "satid": "44725",
    "vmag": -3
  },
  {
    "satid": "44726",
    "vmag": -3
  },
  {
    "satid": "44727",
    "vmag": -3
  },
  {
    "satid": "44728",
    "vmag": -3
  },
  {
    "satid": "44729",
    "vmag": -3
  },
  {
    "satid": "44730",
    "vmag": -3
  },
  {
    "satid": "44731",
    "vmag": -3
  },
  {
    "satid": "44732",
    "vmag": -3
  },
  {
    "satid": "44733",
    "vmag": -3
  },
  {
    "satid": "44734",
    "vmag": -3
  },
  {
    "satid": "44735",
    "vmag": -3
  },
  {
    "satid": "44736",
    "vmag": -3
  },
  {
    "satid": "44737",
    "vmag": -3
  },
  {
    "satid": "44738",
    "vmag": -3
  },
  {
    "satid": "44739",
    "vmag": -3
  },
  {
    "satid": "44740",
    "vmag": -3
  },
  {
    "satid": "44741",
    "vmag": -3
  },
  {
    "satid": "44742",
    "vmag": -3
  },
  {
    "satid": "44743",
    "vmag": -3
  },
  {
    "satid": "44744",
    "vmag": -3
  },
  {
    "satid": "44745",
    "vmag": -3
  },
  {
    "satid": "44746",
    "vmag": -3
  },
  {
    "satid": "44747",
    "vmag": -3
  },
  {
    "satid": "44748",
    "vmag": -3
  },
  {
    "satid": "44749",
    "vmag": -3
  },
  {
    "satid": "44750",
    "vmag": -3
  },
  {
    "satid": "44751",
    "vmag": -3
  },
  {
    "satid": "44752",
    "vmag": -3
  },
  {
    "satid": "44753",
    "vmag": -3
  },
  {
    "satid": "44754",
    "vmag": -3
  },
  {
    "satid": "44755",
    "vmag": -3
  },
  {
    "satid": "44756",
    "vmag": -3
  },
  {
    "satid": "44757",
    "vmag": -3
  },
  {
    "satid": "44758",
    "vmag": -3
  },
  {
    "satid": "44759",
    "vmag": -3
  },
  {
    "satid": "44760",
    "vmag": -3
  },
  {
    "satid": "44761",
    "vmag": -3
  },
  {
    "satid": "44762",
    "vmag": -3
  },
  {
    "satid": "44763",
    "vmag": -3
  },
  {
    "satid": "44764",
    "vmag": -3
  },
  {
    "satid": "44765",
    "vmag": -3
  },
  {
    "satid": "44766",
    "vmag": -3
  },
  {
    "satid": "44767",
    "vmag": -3
  },
  {
    "satid": "44768",
    "vmag": -3
  },
  {
    "satid": "44769",
    "vmag": -3
  },
  {
    "satid": "44770",
    "vmag": -3
  },
  {
    "satid": "44771",
    "vmag": -3
  },
  {
    "satid": "44772",
    "vmag": -3
  },
  {
    "satid": "44914",
    "vmag": -3
  },
  {
    "satid": "44915",
    "vmag": -3
  },
  {
    "satid": "44916",
    "vmag": -3
  },
  {
    "satid": "44917",
    "vmag": -3
  },
  {
    "satid": "44918",
    "vmag": -3
  },
  {
    "satid": "44919",
    "vmag": -3
  },
  {
    "satid": "44920",
    "vmag": -3
  },
  {
    "satid": "44921",
    "vmag": -3
  },
  {
    "satid": "44922",
    "vmag": -3
  },
  {
    "satid": "44923",
    "vmag": -3
  },
  {
    "satid": "44924",
    "vmag": -3
  },
  {
    "satid": "44925",
    "vmag": -3
  },
  {
    "satid": "44926",
    "vmag": -3
  },
  {
    "satid": "44927",
    "vmag": -3
  },
  {
    "satid": "44928",
    "vmag": -3
  },
  {
    "satid": "44929",
    "vmag": -3
  },
  {
    "satid": "44930",
    "vmag": -3
  },
  {
    "satid": "44931",
    "vmag": -3
  },
  {
    "satid": "44932",
    "vmag": -3
  },
  {
    "satid": "44933",
    "vmag": -3
  },
  {
    "satid": "44934",
    "vmag": -3
  },
  {
    "satid": "44935",
    "vmag": -3
  },
  {
    "satid": "44936",
    "vmag": -3
  },
  {
    "satid": "44937",
    "vmag": -3
  },
  {
    "satid": "44938",
    "vmag": -3
  },
  {
    "satid": "44939",
    "vmag": -3
  },
  {
    "satid": "44940",
    "vmag": -3
  },
  {
    "satid": "44941",
    "vmag": -3
  },
  {
    "satid": "44942",
    "vmag": -3
  },
  {
    "satid": "44943",
    "vmag": -3
  },
  {
    "satid": "44944",
    "vmag": -3
  },
  {
    "satid": "44945",
    "vmag": -3
  },
  {
    "satid": "44946",
    "vmag": -3
  },
  {
    "satid": "44947",
    "vmag": -3
  },
  {
    "satid": "44948",
    "vmag": -3
  },
  {
    "satid": "44949",
    "vmag": -3
  },
  {
    "satid": "44950",
    "vmag": -3
  },
  {
    "satid": "44951",
    "vmag": -3
  },
  {
    "satid": "44952",
    "vmag": -3
  },
  {
    "satid": "44953",
    "vmag": -3
  },
  {
    "satid": "44954",
    "vmag": -3
  },
  {
    "satid": "44955",
    "vmag": -3
  },
  {
    "satid": "44956",
    "vmag": -3
  },
  {
    "satid": "44957",
    "vmag": -3
  },
  {
    "satid": "44958",
    "vmag": -3
  },
  {
    "satid": "44959",
    "vmag": -3
  },
  {
    "satid": "44960",
    "vmag": -3
  },
  {
    "satid": "44961",
    "vmag": -3
  },
  {
    "satid": "44962",
    "vmag": -3
  },
  {
    "satid": "44963",
    "vmag": -3
  },
  {
    "satid": "44964",
    "vmag": -3
  },
  {
    "satid": "44965",
    "vmag": -3
  },
  {
    "satid": "44966",
    "vmag": -3
  },
  {
    "satid": "44967",
    "vmag": -3
  },
  {
    "satid": "44968",
    "vmag": -3
  },
  {
    "satid": "44969",
    "vmag": -3
  },
  {
    "satid": "44970",
    "vmag": -3
  },
  {
    "satid": "44971",
    "vmag": -3
  },
  {
    "satid": "44972",
    "vmag": -3
  },
  {
    "satid": "44973",
    "vmag": -3
  },
  {
    "satid": "44974",
    "vmag": -3
  },
  {
    "satid": "44975",
    "vmag": -3
  },
  {
    "satid": "44976",
    "vmag": -3
  },
  {
    "satid": "44977",
    "vmag": -3
  }
]
satVmagManager.sats = [
  {
    "satid": "42800",
    "vmag": 0
  },
  // {
  //   "satid": "42689",
  //   "vmag": 0
  // },
  {
    "satid": "42061",
    "vmag": 0
  },
  {
    "satid": "41902",
    "vmag": 0
  },
  {
    "satid": "41868",
    "vmag": 0
  },
  {
    "satid": "41470",
    "vmag": 0
  },
  {
    "satid": "39574",
    "vmag": 4.5
  },
  {
    "satid": "39227",
    "vmag": 5.5
  },
  {
    "satid": "39211",
    "vmag": 4.5
  },
  {
    "satid": "39200",
    "vmag": 5
  },
  // {
  //   "satid": "38770",
  //   "vmag": 3.5
  // },
  {
    "satid": "33500",
    "vmag": 3.5
  },
  // {
  //   "satid": "31797",
  //   "vmag": 0
  // },
  {
    "satid": "29507",
    "vmag": 3.5
  },
  {
    "satid": "29093",
    "vmag": 4
  },
  // {
  //   "satid": "28888",
  //   "vmag": 0
  // },
  {
    "satid": "28647",
    "vmag": 3.5
  },
  {
    "satid": "28116",
    "vmag": 4.5
  },
  {
    "satid": "27422",
    "vmag": 4.5
  },
  {
    "satid": "27386",
    "vmag": 4.5
  },
  {
    "satid": "26474",
    "vmag": 3.5
  },
  {
    "satid": "25861",
    "vmag": 3.5
  },
  {
    "satid": "25860",
    "vmag": 4.5
  },
  {
    "satid": "25732",
    "vmag": 5
  },
  {
    "satid": "25723",
    "vmag": 5
  },
  {
    "satid": "25544",
    "vmag": -0.5
  },
  {
    "satid": "25407",
    "vmag": 3.5
  },
  {
    "satid": "25400",
    "vmag": 3.5
  },
  {
    "satid": "24883",
    "vmag": 6
  },
  {
    "satid": "24298",
    "vmag": 3.5
  },
  {
    "satid": "23705",
    "vmag": 3.5
  },
  {
    "satid": "23561",
    "vmag": 4.5
  },
  {
    "satid": "23560",
    "vmag": 4.5
  },
  {
    "satid": "23405",
    "vmag": 3.5
  },
  {
    "satid": "23343",
    "vmag": 3.5
  },
  {
    "satid": "23088",
    "vmag": 3.5
  },
  {
    "satid": "23087",
    "vmag": 5
  },
  {
    "satid": "22830",
    "vmag": 5
  },
  {
    "satid": "22803",
    "vmag": 3.5
  },
  {
    "satid": "22626",
    "vmag": 5
  },
  {
    "satid": "22566",
    "vmag": 3.5
  },
  {
    "satid": "22286",
    "vmag": 5
  },
  {
    "satid": "22285",
    "vmag": 3.5
  },
  {
    "satid": "22220",
    "vmag": 3.5
  },
  {
    "satid": "21938",
    "vmag": 5
  },
  {
    "satid": "21876",
    "vmag": 5.5
  },
  {
    "satid": "21820",
    "vmag": 5.5
  },
  {
    "satid": "21819",
    "vmag": 5.5
  },
  {
    "satid": "21610",
    "vmag": 4.5
  },
  {
    "satid": "21574",
    "vmag": 6
  },
  {
    "satid": "21423",
    "vmag": 5.5
  },
  {
    "satid": "21422",
    "vmag": 5
  },
  {
    "satid": "21397",
    "vmag": 5.5
  },
  {
    "satid": "21088",
    "vmag": 5
  },
  {
    "satid": "20775",
    "vmag": 5
  },
  {
    "satid": "20666",
    "vmag": 5.5
  },
  {
    "satid": "20663",
    "vmag": 5.5
  },
  {
    "satid": "20625",
    "vmag": 3.5
  },
  {
    "satid": "20580",
    "vmag": 3
  },
  {
    "satid": "20511",
    "vmag": 5
  },
  {
    "satid": "20466",
    "vmag": 5
  },
  {
    "satid": "20465",
    "vmag": 5
  },
  {
    "satid": "20453",
    "vmag": 5.5
  },
  {
    "satid": "20323",
    "vmag": 5.5
  },
  {
    "satid": "20262",
    "vmag": 6.5
  },
  {
    "satid": "20261",
    "vmag": 6
  },
  {
    "satid": "19650",
    "vmag": 3.5
  },
  {
    "satid": "19574",
    "vmag": 5
  },
  {
    "satid": "19573",
    "vmag": 5
  },
  {
    "satid": "19257",
    "vmag": 5.5
  },
  {
    "satid": "19210",
    "vmag": 4.5
  },
  {
    "satid": "19120",
    "vmag": 3.5
  },
  {
    "satid": "19046",
    "vmag": 5
  },
  {
    "satid": "18958",
    "vmag": 5.5
  },
  {
    "satid": "18749",
    "vmag": 5.5
  },
  {
    "satid": "18187",
    "vmag": 5
  },
  {
    "satid": "18153",
    "vmag": 5.5
  },
  {
    "satid": "17973",
    "vmag": 5
  },
  {
    "satid": "17912",
    "vmag": 5.5
  },
  {
    "satid": "17589",
    "vmag": 5.5
  },
  {
    "satid": "17567",
    "vmag": 5.5
  },
  {
    "satid": "17295",
    "vmag": 5
  },
  {
    "satid": "16882",
    "vmag": 5.5
  },
  {
    "satid": "16792",
    "vmag": 5.5
  },
  {
    "satid": "16496",
    "vmag": 5.5
  },
  {
    "satid": "16182",
    "vmag": 4
  },
  {
    "satid": "16111",
    "vmag": 5
  },
  {
    "satid": "15945",
    "vmag": 5.5
  },
  {
    "satid": "15772",
    "vmag": 5
  },
  {
    "satid": "15483",
    "vmag": 5.5
  },
  {
    "satid": "15354",
    "vmag": 5
  },
  {
    "satid": "14820",
    "vmag": 5.5
  },
  {
    "satid": "14819",
    "vmag": 5.5
  },
  {
    "satid": "14699",
    "vmag": 5
  },
  {
    "satid": "14372",
    "vmag": 5.5
  },
  {
    "satid": "14208",
    "vmag": 5
  },
  {
    "satid": "13819",
    "vmag": 5
  },
  {
    "satid": "13403",
    "vmag": 5
  },
  {
    "satid": "13154",
    "vmag": 5.5
  },
  {
    "satid": "13068",
    "vmag": 5
  },
  {
    "satid": "12904",
    "vmag": 5
  },
  {
    "satid": "12585",
    "vmag": 6
  },
  {
    "satid": "12465",
    "vmag": 5
  },
  {
    "satid": "12139",
    "vmag": 5
  },
  {
    "satid": "11672",
    "vmag": 5
  },
  {
    "satid": "11574",
    "vmag": 5
  },
  {
    "satid": "11267",
    "vmag": 5.5
  },
  {
    "satid": "10967",
    "vmag": 4
  },
  {
    "satid": "10114",
    "vmag": 5.5
  },
  {
    "satid": "08459",
    "vmag": 6
  },
  {
    "satid": "07004",
    "vmag": 5
  },
  {
    "satid": "06155",
    "vmag": 5
  },
  {
    "satid": "06153",
    "vmag": 6
  },
  {
    "satid": "06073",
    "vmag": 6.5
  },
  {
    "satid": "05730",
    "vmag": 5
  },
  {
    "satid": "05560",
    "vmag": 5
  },
  {
    "satid": "05118",
    "vmag": 5
  },
  {
    "satid": "04814",
    "vmag": 5
  },
  {
    "satid": "04327",
    "vmag": 6.5
  },
  {
    "satid": "03669",
    "vmag": 9
  },
  {
    "satid": "03597",
    "vmag": 6.5
  },
  {
    "satid": "03230",
    "vmag": 6
  },
  {
    "satid": "02802",
    "vmag": 5.5
  },
  {
    "satid": "00877",
    "vmag": 5
  },
  {
    "satid": "00733",
    "vmag": 5
  },
  {
    "satid": "00694",
    "vmag": 3.5
  }
];
