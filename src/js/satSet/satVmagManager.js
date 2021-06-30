var satVmagManager = {};
satVmagManager.init = function (satSet) {
  for (let i = 0; i < satVmagManager.starlink.length; i++) {
    satVmagManager.sats.push(satVmagManager.starlink[i]);
  }
  for (let i = 0; i < satVmagManager.sats.length; i++) {
    satSet.vmagUpdate(satVmagManager.sats[i]);
  }
};
satVmagManager.starlink = [
  // Batch 1
  {
    satid: 44235,
    vmag: -3,
  },
  {
    satid: 44236,
    vmag: -3,
  },
  {
    satid: 44237,
    vmag: -3,
  },
  {
    satid: 44238,
    vmag: -3,
  },
  {
    satid: 44239,
    vmag: -3,
  },
  {
    satid: 44240,
    vmag: -3,
  },
  {
    satid: 44241,
    vmag: -3,
  },
  {
    satid: 44242,
    vmag: -3,
  },
  {
    satid: 44243,
    vmag: -3,
  },
  {
    satid: 44244,
    vmag: -3,
  },
  {
    satid: 44245,
    vmag: -3,
  },
  {
    satid: 44246,
    vmag: -3,
  },
  {
    satid: 44247,
    vmag: -3,
  },
  {
    satid: 44248,
    vmag: -3,
  },
  {
    satid: 44249,
    vmag: -3,
  },
  {
    satid: 44250,
    vmag: -3,
  },
  {
    satid: 44251,
    vmag: -3,
  },
  {
    satid: 44252,
    vmag: -3,
  },
  {
    satid: 44253,
    vmag: -3,
  },
  {
    satid: 44254,
    vmag: -3,
  },
  {
    satid: 44255,
    vmag: -3,
  },
  {
    satid: 44256,
    vmag: -3,
  },
  {
    satid: 44257,
    vmag: -3,
  },
  {
    satid: 44258,
    vmag: -3,
  },
  {
    satid: 44259,
    vmag: -3,
  },
  {
    satid: 44260,
    vmag: -3,
  },
  {
    satid: 44261,
    vmag: -3,
  },
  {
    satid: 44262,
    vmag: -3,
  },
  {
    satid: 44263,
    vmag: -3,
  },
  {
    satid: 44264,
    vmag: -3,
  },
  {
    satid: 44265,
    vmag: -3,
  },
  {
    satid: 44266,
    vmag: -3,
  },
  {
    satid: 44267,
    vmag: -3,
  },
  {
    satid: 44268,
    vmag: -3,
  },
  {
    satid: 44269,
    vmag: -3,
  },
  {
    satid: 44270,
    vmag: -3,
  },
  {
    satid: 44271,
    vmag: -3,
  },
  {
    satid: 44272,
    vmag: -3,
  },
  {
    satid: 44273,
    vmag: -3,
  },
  {
    satid: 44274,
    vmag: -3,
  },
  {
    satid: 44275,
    vmag: -3,
  },
  {
    satid: 44276,
    vmag: -3,
  },
  {
    satid: 44277,
    vmag: -3,
  },
  {
    satid: 44278,
    vmag: -3,
  },
  {
    satid: 44279,
    vmag: -3,
  },
  {
    satid: 44280,
    vmag: -3,
  },
  {
    satid: 44281,
    vmag: -3,
  },
  {
    satid: 44282,
    vmag: -3,
  },
  {
    satid: 44283,
    vmag: -3,
  },
  {
    satid: 44284,
    vmag: -3,
  },
  {
    satid: 44285,
    vmag: -3,
  },
  {
    satid: 44286,
    vmag: -3,
  },
  {
    satid: 44287,
    vmag: -3,
  },
  {
    satid: 44288,
    vmag: -3,
  },
  {
    satid: 44289,
    vmag: -3,
  },
  {
    satid: 44290,
    vmag: -3,
  },
  {
    satid: 44291,
    vmag: -3,
  },
  {
    satid: 44292,
    vmag: -3,
  },
  {
    satid: 44293,
    vmag: -3,
  },
  {
    satid: 44294,
    vmag: -3,
  }, /// Batch 2
  {
    satid: 44713,
    vmag: -3,
  },
  {
    satid: 44714,
    vmag: -3,
  },
  {
    satid: 44715,
    vmag: -3,
  },
  {
    satid: 44716,
    vmag: -3,
  },
  {
    satid: 44717,
    vmag: -3,
  },
  {
    satid: 44718,
    vmag: -3,
  },
  {
    satid: 44719,
    vmag: -3,
  },
  {
    satid: 44720,
    vmag: -3,
  },
  {
    satid: 44721,
    vmag: -3,
  },
  {
    satid: 44722,
    vmag: -3,
  },
  {
    satid: 44723,
    vmag: -3,
  },
  {
    satid: 44724,
    vmag: -3,
  },
  {
    satid: 44725,
    vmag: -3,
  },
  {
    satid: 44726,
    vmag: -3,
  },
  {
    satid: 44727,
    vmag: -3,
  },
  {
    satid: 44728,
    vmag: -3,
  },
  {
    satid: 44729,
    vmag: -3,
  },
  {
    satid: 44730,
    vmag: -3,
  },
  {
    satid: 44731,
    vmag: -3,
  },
  {
    satid: 44732,
    vmag: -3,
  },
  {
    satid: 44733,
    vmag: -3,
  },
  {
    satid: 44734,
    vmag: -3,
  },
  {
    satid: 44735,
    vmag: -3,
  },
  {
    satid: 44736,
    vmag: -3,
  },
  {
    satid: 44737,
    vmag: -3,
  },
  {
    satid: 44738,
    vmag: -3,
  },
  {
    satid: 44739,
    vmag: -3,
  },
  {
    satid: 44740,
    vmag: -3,
  },
  {
    satid: 44741,
    vmag: -3,
  },
  {
    satid: 44742,
    vmag: -3,
  },
  {
    satid: 44743,
    vmag: -3,
  },
  {
    satid: 44744,
    vmag: -3,
  },
  {
    satid: 44745,
    vmag: -3,
  },
  {
    satid: 44746,
    vmag: -3,
  },
  {
    satid: 44747,
    vmag: -3,
  },
  {
    satid: 44748,
    vmag: -3,
  },
  {
    satid: 44749,
    vmag: -3,
  },
  {
    satid: 44750,
    vmag: -3,
  },
  {
    satid: 44751,
    vmag: -3,
  },
  {
    satid: 44752,
    vmag: -3,
  },
  {
    satid: 44753,
    vmag: -3,
  },
  {
    satid: 44754,
    vmag: -3,
  },
  {
    satid: 44755,
    vmag: -3,
  },
  {
    satid: 44756,
    vmag: -3,
  },
  {
    satid: 44757,
    vmag: -3,
  },
  {
    satid: 44758,
    vmag: -3,
  },
  {
    satid: 44759,
    vmag: -3,
  },
  {
    satid: 44760,
    vmag: -3,
  },
  {
    satid: 44761,
    vmag: -3,
  },
  {
    satid: 44762,
    vmag: -3,
  },
  {
    satid: 44763,
    vmag: -3,
  },
  {
    satid: 44764,
    vmag: -3,
  },
  {
    satid: 44765,
    vmag: -3,
  },
  {
    satid: 44766,
    vmag: -3,
  },
  {
    satid: 44767,
    vmag: -3,
  },
  {
    satid: 44768,
    vmag: -3,
  },
  {
    satid: 44769,
    vmag: -3,
  },
  {
    satid: 44770,
    vmag: -3,
  },
  {
    satid: 44771,
    vmag: -3,
  },
  {
    satid: 44772,
    vmag: -3,
  },
  {
    satid: 44914,
    vmag: -3,
  },
  {
    satid: 44915,
    vmag: -3,
  },
  {
    satid: 44916,
    vmag: -3,
  },
  {
    satid: 44917,
    vmag: -3,
  },
  {
    satid: 44918,
    vmag: -3,
  },
  {
    satid: 44919,
    vmag: -3,
  },
  {
    satid: 44920,
    vmag: -3,
  },
  {
    satid: 44921,
    vmag: -3,
  },
  {
    satid: 44922,
    vmag: -3,
  },
  {
    satid: 44923,
    vmag: -3,
  },
  {
    satid: 44924,
    vmag: -3,
  },
  {
    satid: 44925,
    vmag: -3,
  },
  {
    satid: 44926,
    vmag: -3,
  },
  {
    satid: 44927,
    vmag: -3,
  },
  {
    satid: 44928,
    vmag: -3,
  },
  {
    satid: 44929,
    vmag: -3,
  },
  {
    satid: 44930,
    vmag: -3,
  },
  {
    satid: 44931,
    vmag: -3,
  },
  {
    satid: 44932,
    vmag: -3,
  },
  {
    satid: 44933,
    vmag: -3,
  },
  {
    satid: 44934,
    vmag: -3,
  },
  {
    satid: 44935,
    vmag: -3,
  },
  {
    satid: 44936,
    vmag: -3,
  },
  {
    satid: 44937,
    vmag: -3,
  },
  {
    satid: 44938,
    vmag: -3,
  },
  {
    satid: 44939,
    vmag: -3,
  },
  {
    satid: 44940,
    vmag: -3,
  },
  {
    satid: 44941,
    vmag: -3,
  },
  {
    satid: 44942,
    vmag: -3,
  },
  {
    satid: 44943,
    vmag: -3,
  },
  {
    satid: 44944,
    vmag: -3,
  },
  {
    satid: 44945,
    vmag: -3,
  },
  {
    satid: 44946,
    vmag: -3,
  },
  {
    satid: 44947,
    vmag: -3,
  },
  {
    satid: 44948,
    vmag: -3,
  },
  {
    satid: 44949,
    vmag: -3,
  },
  {
    satid: 44950,
    vmag: -3,
  },
  {
    satid: 44951,
    vmag: -3,
  },
  {
    satid: 44952,
    vmag: -3,
  },
  {
    satid: 44953,
    vmag: -3,
  },
  {
    satid: 44954,
    vmag: -3,
  },
  {
    satid: 44955,
    vmag: -3,
  },
  {
    satid: 44956,
    vmag: -3,
  },
  {
    satid: 44957,
    vmag: -3,
  },
  {
    satid: 44958,
    vmag: -3,
  },
  {
    satid: 44959,
    vmag: -3,
  },
  {
    satid: 44960,
    vmag: -3,
  },
  {
    satid: 44961,
    vmag: -3,
  },
  {
    satid: 44962,
    vmag: -3,
  },
  {
    satid: 44963,
    vmag: -3,
  },
  {
    satid: 44964,
    vmag: -3,
  },
  {
    satid: 44965,
    vmag: -3,
  },
  {
    satid: 44966,
    vmag: -3,
  },
  {
    satid: 44967,
    vmag: -3,
  },
  {
    satid: 44968,
    vmag: -3,
  },
  {
    satid: 44969,
    vmag: -3,
  },
  {
    satid: 44970,
    vmag: -3,
  },
  {
    satid: 44971,
    vmag: -3,
  },
  {
    satid: 44972,
    vmag: -3,
  },
  {
    satid: 44973,
    vmag: -3,
  },
  {
    satid: 44974,
    vmag: -3,
  },
  {
    satid: 44975,
    vmag: -3,
  },
  {
    satid: 44976,
    vmag: -3,
  },
  {
    satid: 44977,
    vmag: -3,
  },
];
satVmagManager.sats = [
  {
    satid: 42800,
    vmag: 0,
  },
  // {
  //   "satid": "42689",
  //   "vmag": 0
  // },
  {
    satid: 42061,
    vmag: 0,
  },
  {
    satid: 41902,
    vmag: 0,
  },
  {
    satid: 41868,
    vmag: 0,
  },
  {
    satid: 41470,
    vmag: 0,
  },
  {
    satid: 39574,
    vmag: 4.5,
  },
  {
    satid: 39227,
    vmag: 5.5,
  },
  {
    satid: 39211,
    vmag: 4.5,
  },
  {
    satid: 39200,
    vmag: 5,
  },
  // {
  //   "satid": "38770",
  //   "vmag": 3.5
  // },
  {
    satid: 33500,
    vmag: 3.5,
  },
  // {
  //   "satid": "31797",
  //   "vmag": 0
  // },
  {
    satid: 29507,
    vmag: 3.5,
  },
  {
    satid: 29093,
    vmag: 4,
  },
  // {
  //   "satid": "28888",
  //   "vmag": 0
  // },
  {
    satid: 28647,
    vmag: 3.5,
  },
  {
    satid: 28116,
    vmag: 4.5,
  },
  {
    satid: 27422,
    vmag: 4.5,
  },
  {
    satid: 27386,
    vmag: 4.5,
  },
  {
    satid: 26474,
    vmag: 3.5,
  },
  {
    satid: 25861,
    vmag: 3.5,
  },
  {
    satid: 25860,
    vmag: 4.5,
  },
  {
    satid: 25732,
    vmag: 5,
  },
  {
    satid: 25723,
    vmag: 5,
  },
  {
    satid: 25544,
    vmag: -0.5,
  },
  {
    satid: 25407,
    vmag: 3.5,
  },
  {
    satid: 25400,
    vmag: 3.5,
  },
  {
    satid: 24883,
    vmag: 6,
  },
  {
    satid: 24298,
    vmag: 3.5,
  },
  {
    satid: 23705,
    vmag: 3.5,
  },
  {
    satid: 23561,
    vmag: 4.5,
  },
  {
    satid: 23560,
    vmag: 4.5,
  },
  {
    satid: 23405,
    vmag: 3.5,
  },
  {
    satid: 23343,
    vmag: 3.5,
  },
  {
    satid: 23088,
    vmag: 3.5,
  },
  {
    satid: 23087,
    vmag: 5,
  },
  {
    satid: 22830,
    vmag: 5,
  },
  {
    satid: 22803,
    vmag: 3.5,
  },
  {
    satid: 22626,
    vmag: 5,
  },
  {
    satid: 22566,
    vmag: 3.5,
  },
  {
    satid: 22286,
    vmag: 5,
  },
  {
    satid: 22285,
    vmag: 3.5,
  },
  {
    satid: 22220,
    vmag: 3.5,
  },
  {
    satid: 21938,
    vmag: 5,
  },
  {
    satid: 21876,
    vmag: 5.5,
  },
  {
    satid: 21820,
    vmag: 5.5,
  },
  {
    satid: 21819,
    vmag: 5.5,
  },
  {
    satid: 21610,
    vmag: 4.5,
  },
  {
    satid: 21574,
    vmag: 6,
  },
  {
    satid: 21423,
    vmag: 5.5,
  },
  {
    satid: 21422,
    vmag: 5,
  },
  {
    satid: 21397,
    vmag: 5.5,
  },
  {
    satid: 21088,
    vmag: 5,
  },
  {
    satid: 20775,
    vmag: 5,
  },
  {
    satid: 20666,
    vmag: 5.5,
  },
  {
    satid: 20663,
    vmag: 5.5,
  },
  {
    satid: 20625,
    vmag: 3.5,
  },
  {
    satid: 20580,
    vmag: 3,
  },
  {
    satid: 20511,
    vmag: 5,
  },
  {
    satid: 20466,
    vmag: 5,
  },
  {
    satid: 20465,
    vmag: 5,
  },
  {
    satid: 20453,
    vmag: 5.5,
  },
  {
    satid: 20323,
    vmag: 5.5,
  },
  {
    satid: 20262,
    vmag: 6.5,
  },
  {
    satid: 20261,
    vmag: 6,
  },
  {
    satid: 19650,
    vmag: 3.5,
  },
  {
    satid: 19574,
    vmag: 5,
  },
  {
    satid: 19573,
    vmag: 5,
  },
  {
    satid: 19257,
    vmag: 5.5,
  },
  {
    satid: 19210,
    vmag: 4.5,
  },
  {
    satid: 19120,
    vmag: 3.5,
  },
  {
    satid: 19046,
    vmag: 5,
  },
  {
    satid: 18958,
    vmag: 5.5,
  },
  {
    satid: 18749,
    vmag: 5.5,
  },
  {
    satid: 18187,
    vmag: 5,
  },
  {
    satid: 18153,
    vmag: 5.5,
  },
  {
    satid: 17973,
    vmag: 5,
  },
  {
    satid: 17912,
    vmag: 5.5,
  },
  {
    satid: 17589,
    vmag: 5.5,
  },
  {
    satid: 17567,
    vmag: 5.5,
  },
  {
    satid: 17295,
    vmag: 5,
  },
  {
    satid: 16882,
    vmag: 5.5,
  },
  {
    satid: 16792,
    vmag: 5.5,
  },
  {
    satid: 16496,
    vmag: 5.5,
  },
  {
    satid: 16182,
    vmag: 4,
  },
  {
    satid: 16111,
    vmag: 5,
  },
  {
    satid: 15945,
    vmag: 5.5,
  },
  {
    satid: 15772,
    vmag: 5,
  },
  {
    satid: 15483,
    vmag: 5.5,
  },
  {
    satid: 15354,
    vmag: 5,
  },
  {
    satid: 14820,
    vmag: 5.5,
  },
  {
    satid: 14819,
    vmag: 5.5,
  },
  {
    satid: 14699,
    vmag: 5,
  },
  {
    satid: 14372,
    vmag: 5.5,
  },
  {
    satid: 14208,
    vmag: 5,
  },
  {
    satid: 13819,
    vmag: 5,
  },
  {
    satid: 13403,
    vmag: 5,
  },
  {
    satid: 13154,
    vmag: 5.5,
  },
  {
    satid: 13068,
    vmag: 5,
  },
  {
    satid: 12904,
    vmag: 5,
  },
  {
    satid: 12585,
    vmag: 6,
  },
  {
    satid: 12465,
    vmag: 5,
  },
  {
    satid: 12139,
    vmag: 5,
  },
  {
    satid: 11672,
    vmag: 5,
  },
  {
    satid: 11574,
    vmag: 5,
  },
  {
    satid: 11267,
    vmag: 5.5,
  },
  {
    satid: 10967,
    vmag: 4,
  },
  {
    satid: 10114,
    vmag: 5.5,
  },
  {
    satid: 8459,
    vmag: 6,
  },
  {
    satid: 7004,
    vmag: 5,
  },
  {
    satid: 6155,
    vmag: 5,
  },
  {
    satid: 6153,
    vmag: 6,
  },
  {
    satid: 6073,
    vmag: 6.5,
  },
  {
    satid: 5730,
    vmag: 5,
  },
  {
    satid: 5560,
    vmag: 5,
  },
  {
    satid: 5118,
    vmag: 5,
  },
  {
    satid: 4814,
    vmag: 5,
  },
  {
    satid: 4327,
    vmag: 6.5,
  },
  {
    satid: 3669,
    vmag: 9,
  },
  {
    satid: 3597,
    vmag: 6.5,
  },
  {
    satid: 3230,
    vmag: 6,
  },
  {
    satid: 2802,
    vmag: 5.5,
  },
  {
    satid: 877,
    vmag: 5,
  },
  {
    satid: 733,
    vmag: 5,
  },
  {
    satid: 694,
    vmag: 3.5,
  },
  {
    satid: 5,
    vmag: 9.5,
  },
  {
    satid: 11,
    vmag: 7.5,
  },
  {
    satid: 12,
    vmag: 6.5,
  },
  {
    satid: 16,
    vmag: 7,
  },
  {
    satid: 20,
    vmag: 7,
  },
  {
    satid: 22,
    vmag: 7.5,
  },
  {
    satid: 29,
    vmag: 7.5,
  },
  {
    satid: 45,
    vmag: 6,
  },
  {
    satid: 47,
    vmag: 5,
  },
  {
    satid: 50,
    vmag: 6,
  },
  {
    satid: 51,
    vmag: 7.5,
  },
  {
    satid: 53,
    vmag: 7.5,
  },
  {
    satid: 58,
    vmag: 7,
  },
  {
    satid: 59,
    vmag: 4.5,
  },
  {
    satid: 60,
    vmag: 6.5,
  },
  {
    satid: 63,
    vmag: 7.5,
  },
  {
    satid: 82,
    vmag: 7.5,
  },
  {
    satid: 107,
    vmag: 6.5,
  },
  {
    satid: 116,
    vmag: 7.5,
  },
  {
    satid: 117,
    vmag: 7.5,
  },
  {
    satid: 118,
    vmag: 4.5,
  },
  {
    satid: 119,
    vmag: 7,
  },
  {
    satid: 126,
    vmag: 6.5,
  },
  {
    satid: 130,
    vmag: 7.5,
  },
  {
    satid: 133,
    vmag: 9.5,
  },
  {
    satid: 134,
    vmag: 6.5,
  },
  {
    satid: 162,
    vmag: 8,
  },
  {
    satid: 163,
    vmag: 3.5,
  },
  {
    satid: 165,
    vmag: 7.5,
  },
  {
    satid: 192,
    vmag: 5,
  },
  {
    satid: 202,
    vmag: 8,
  },
  {
    satid: 204,
    vmag: 5.5,
  },
  {
    satid: 205,
    vmag: 7.5,
  },
  {
    satid: 226,
    vmag: 7,
  },
  {
    satid: 229,
    vmag: 7.5,
  },
  {
    satid: 271,
    vmag: 4.5,
  },
  {
    satid: 309,
    vmag: 8,
  },
  {
    satid: 340,
    vmag: 7,
  },
  {
    satid: 341,
    vmag: 6,
  },
  {
    satid: 369,
    vmag: 8.5,
  },
  {
    satid: 397,
    vmag: 7.5,
  },
  {
    satid: 424,
    vmag: 5.5,
  },
  {
    satid: 426,
    vmag: 4.5,
  },
  {
    satid: 446,
    vmag: 8,
  },
  {
    satid: 447,
    vmag: 4.5,
  },
  {
    satid: 506,
    vmag: 7.5,
  },
  {
    satid: 573,
    vmag: 7,
  },
  {
    satid: 574,
    vmag: 3.5,
  },
  {
    satid: 575,
    vmag: 6,
  },
  {
    satid: 614,
    vmag: 9,
  },
  {
    satid: 622,
    vmag: 3.5,
  },
  {
    satid: 669,
    vmag: 5,
  },
  {
    satid: 670,
    vmag: 8,
  },
  {
    satid: 671,
    vmag: 6.5,
  },
  {
    satid: 694,
    vmag: 2,
  },
  {
    satid: 698,
    vmag: 6.5,
  },
  {
    satid: 700,
    vmag: 7,
  },
  {
    satid: 701,
    vmag: 4.5,
  },
  {
    satid: 703,
    vmag: 5.5,
  },
  {
    satid: 704,
    vmag: 7.5,
  },
  {
    satid: 705,
    vmag: 7.5,
  },
  {
    satid: 716,
    vmag: 9,
  },
  {
    satid: 721,
    vmag: 7,
  },
  {
    satid: 727,
    vmag: 4.5,
  },
  {
    satid: 728,
    vmag: 7.5,
  },
  {
    satid: 730,
    vmag: 7,
  },
  {
    satid: 731,
    vmag: 6.5,
  },
  {
    satid: 733,
    vmag: 3.5,
  },
  {
    satid: 741,
    vmag: 4.5,
  },
  {
    satid: 742,
    vmag: 6,
  },
  {
    satid: 743,
    vmag: 8,
  },
  {
    satid: 746,
    vmag: 5,
  },
  {
    satid: 801,
    vmag: 7,
  },
  {
    satid: 809,
    vmag: 8,
  },
  {
    satid: 815,
    vmag: 5.5,
  },
  {
    satid: 829,
    vmag: 5,
  },
  {
    satid: 869,
    vmag: 5.5,
  },
  {
    satid: 870,
    vmag: 6.5,
  },
  {
    satid: 871,
    vmag: 5.5,
  },
  {
    satid: 876,
    vmag: 3.5,
  },
  {
    satid: 877,
    vmag: 3.5,
  },
  {
    satid: 893,
    vmag: 5,
  },
  {
    satid: 897,
    vmag: 6,
  },
  {
    satid: 898,
    vmag: 4,
  },
  {
    satid: 899,
    vmag: 7,
  },
  {
    satid: 901,
    vmag: 9,
  },
  {
    satid: 907,
    vmag: 7,
  },
  {
    satid: 932,
    vmag: 8,
  },
  {
    satid: 933,
    vmag: 7,
  },
  {
    satid: 953,
    vmag: 5.5,
  },
  {
    satid: 959,
    vmag: 6.5,
  },
  {
    satid: 965,
    vmag: 8.5,
  },
  {
    satid: 978,
    vmag: 7.5,
  },
  {
    satid: 979,
    vmag: 7.5,
  },
  {
    satid: 1000,
    vmag: 4.5,
  },
  {
    satid: 1001,
    vmag: 3.5,
  },
  {
    satid: 1002,
    vmag: 7.5,
  },
  {
    satid: 1099,
    vmag: 8.5,
  },
  {
    satid: 1244,
    vmag: 6.5,
  },
  {
    satid: 1245,
    vmag: 4.5,
  },
  {
    satid: 1271,
    vmag: 6.5,
  },
  {
    satid: 1291,
    vmag: 7.5,
  },
  {
    satid: 1292,
    vmag: 6.5,
  },
  {
    satid: 1314,
    vmag: 4,
  },
  {
    satid: 1316,
    vmag: 6,
  },
  {
    satid: 1318,
    vmag: 7.5,
  },
  {
    satid: 1328,
    vmag: 7.5,
  },
  {
    satid: 1358,
    vmag: 6,
  },
  {
    satid: 1359,
    vmag: 3.5,
  },
  {
    satid: 1361,
    vmag: 6,
  },
  {
    satid: 1377,
    vmag: 9,
  },
  {
    satid: 1389,
    vmag: 6,
  },
  {
    satid: 1420,
    vmag: 7.5,
  },
  {
    satid: 1425,
    vmag: 9,
  },
  {
    satid: 1428,
    vmag: 5.5,
  },
  {
    satid: 1430,
    vmag: 8,
  },
  {
    satid: 1502,
    vmag: 5.5,
  },
  {
    satid: 1508,
    vmag: 5.5,
  },
  {
    satid: 1510,
    vmag: 7.5,
  },
  {
    satid: 1511,
    vmag: 8.5,
  },
  {
    satid: 1514,
    vmag: 7,
  },
  {
    satid: 1520,
    vmag: 8,
  },
  {
    satid: 1572,
    vmag: 8,
  },
  {
    satid: 1575,
    vmag: 4,
  },
  {
    satid: 1583,
    vmag: 7,
  },
  {
    satid: 1589,
    vmag: 4.5,
  },
  {
    satid: 1613,
    vmag: 7,
  },
  {
    satid: 1616,
    vmag: 6.5,
  },
  {
    satid: 1641,
    vmag: 6.5,
  },
  {
    satid: 1642,
    vmag: 5.5,
  },
  {
    satid: 1646,
    vmag: 5.5,
  },
  {
    satid: 1653,
    vmag: 7.5,
  },
  {
    satid: 1668,
    vmag: 6,
  },
  {
    satid: 1672,
    vmag: 8.5,
  },
  {
    satid: 1680,
    vmag: 6,
  },
  {
    satid: 1684,
    vmag: 6.5,
  },
  {
    satid: 1716,
    vmag: 6.5,
  },
  {
    satid: 1726,
    vmag: 7,
  },
  {
    satid: 1729,
    vmag: 8,
  },
  {
    satid: 1738,
    vmag: 7.5,
  },
  {
    satid: 1739,
    vmag: 6.5,
  },
  {
    satid: 1804,
    vmag: 7,
  },
  {
    satid: 1805,
    vmag: 5.5,
  },
  {
    satid: 1806,
    vmag: 8,
  },
  {
    satid: 1807,
    vmag: 4,
  },
  {
    satid: 1808,
    vmag: 6,
  },
  {
    satid: 1814,
    vmag: 7.5,
  },
  {
    satid: 1815,
    vmag: 8.5,
  },
  {
    satid: 1822,
    vmag: 5,
  },
  {
    satid: 1843,
    vmag: 4,
  },
  {
    satid: 1844,
    vmag: 4,
  },
  {
    satid: 1863,
    vmag: 4,
  },
  {
    satid: 1864,
    vmag: 6.5,
  },
  {
    satid: 1865,
    vmag: 7.5,
  },
  {
    satid: 1944,
    vmag: 8,
  },
  {
    satid: 1952,
    vmag: 7,
  },
  {
    satid: 1953,
    vmag: 6.5,
  },
  {
    satid: 1982,
    vmag: 6,
  },
  {
    satid: 1983,
    vmag: 6.5,
  },
  {
    satid: 2016,
    vmag: 8,
  },
  {
    satid: 2017,
    vmag: 8,
  },
  {
    satid: 2091,
    vmag: 8.5,
  },
  {
    satid: 2096,
    vmag: 7,
  },
  {
    satid: 2119,
    vmag: 5.5,
  },
  {
    satid: 2120,
    vmag: 7.5,
  },
  {
    satid: 2121,
    vmag: 7,
  },
  {
    satid: 2122,
    vmag: 7,
  },
  {
    satid: 2123,
    vmag: 6.5,
  },
  {
    satid: 2124,
    vmag: 6.5,
  },
  {
    satid: 2125,
    vmag: 7.5,
  },
  {
    satid: 2142,
    vmag: 4.5,
  },
  {
    satid: 2144,
    vmag: 4.5,
  },
  {
    satid: 2150,
    vmag: 7.5,
  },
  {
    satid: 2167,
    vmag: 6.5,
  },
  {
    satid: 2173,
    vmag: 5,
  },
  {
    satid: 2174,
    vmag: 4,
  },
  {
    satid: 2176,
    vmag: 8,
  },
  {
    satid: 2180,
    vmag: 7.5,
  },
  {
    satid: 2206,
    vmag: 6.5,
  },
  {
    satid: 2253,
    vmag: 5,
  },
  {
    satid: 2255,
    vmag: 3.5,
  },
  {
    satid: 2328,
    vmag: 7,
  },
  {
    satid: 2337,
    vmag: 7,
  },
  {
    satid: 2389,
    vmag: 7,
  },
  {
    satid: 2401,
    vmag: 8,
  },
  {
    satid: 2403,
    vmag: 3.5,
  },
  {
    satid: 2413,
    vmag: 7.5,
  },
  {
    satid: 2422,
    vmag: 5.5,
  },
  {
    satid: 2435,
    vmag: 8,
  },
  {
    satid: 2436,
    vmag: 7.5,
  },
  {
    satid: 2481,
    vmag: 3,
  },
  {
    satid: 2610,
    vmag: 8,
  },
  {
    satid: 2611,
    vmag: 6.5,
  },
  {
    satid: 2621,
    vmag: 6,
  },
  {
    satid: 2622,
    vmag: 6,
  },
  {
    satid: 2643,
    vmag: 6,
  },
  {
    satid: 2657,
    vmag: 8,
  },
  {
    satid: 2661,
    vmag: 8.5,
  },
  {
    satid: 2669,
    vmag: 7.5,
  },
  {
    satid: 2671,
    vmag: 7.5,
  },
  {
    satid: 2674,
    vmag: 6.5,
  },
  {
    satid: 2680,
    vmag: 7,
  },
  {
    satid: 2682,
    vmag: 5.5,
  },
  {
    satid: 2741,
    vmag: 7,
  },
  {
    satid: 2754,
    vmag: 6.5,
  },
  {
    satid: 2757,
    vmag: 8,
  },
  {
    satid: 2763,
    vmag: 4,
  },
  {
    satid: 2780,
    vmag: 6,
  },
  {
    satid: 2801,
    vmag: 5.5,
  },
  {
    satid: 2802,
    vmag: 4,
  },
  {
    satid: 2807,
    vmag: 7,
  },
  {
    satid: 2811,
    vmag: 8,
  },
  {
    satid: 2825,
    vmag: 4,
  },
  {
    satid: 2826,
    vmag: 6.5,
  },
  {
    satid: 2828,
    vmag: 7.5,
  },
  {
    satid: 2834,
    vmag: 9,
  },
  {
    satid: 2872,
    vmag: 8.5,
  },
  {
    satid: 2873,
    vmag: 7.5,
  },
  {
    satid: 2874,
    vmag: 8.5,
  },
  {
    satid: 2909,
    vmag: 8,
  },
  {
    satid: 2920,
    vmag: 7,
  },
  {
    satid: 2940,
    vmag: 5.5,
  },
  {
    satid: 2965,
    vmag: 7,
  },
  {
    satid: 2971,
    vmag: 6.5,
  },
  {
    satid: 2980,
    vmag: 7.5,
  },
  {
    satid: 2985,
    vmag: 6.5,
  },
  {
    satid: 3011,
    vmag: 3.5,
  },
  {
    satid: 3019,
    vmag: 3.5,
  },
  {
    satid: 3035,
    vmag: 7,
  },
  {
    satid: 3036,
    vmag: 7.5,
  },
  {
    satid: 3047,
    vmag: 4.5,
  },
  {
    satid: 3048,
    vmag: 5,
  },
  {
    satid: 3081,
    vmag: 5.5,
  },
  {
    satid: 3093,
    vmag: 7.5,
  },
  {
    satid: 3094,
    vmag: 6.5,
  },
  {
    satid: 3129,
    vmag: 4.5,
  },
  {
    satid: 3131,
    vmag: 5,
  },
  {
    satid: 3133,
    vmag: 7.5,
  },
  {
    satid: 3137,
    vmag: 8,
  },
  {
    satid: 3151,
    vmag: 4,
  },
  {
    satid: 3158,
    vmag: 6,
  },
  {
    satid: 3173,
    vmag: 8,
  },
  {
    satid: 3174,
    vmag: 6.5,
  },
  {
    satid: 3177,
    vmag: 6.5,
  },
  {
    satid: 3212,
    vmag: 6.5,
  },
  {
    satid: 3229,
    vmag: 6,
  },
  {
    satid: 3230,
    vmag: 4.5,
  },
  {
    satid: 3271,
    vmag: 6,
  },
  {
    satid: 3283,
    vmag: 3.5,
  },
  {
    satid: 3307,
    vmag: 3.5,
  },
  {
    satid: 3315,
    vmag: 8,
  },
  {
    satid: 3338,
    vmag: 7.5,
  },
  {
    satid: 3341,
    vmag: 6,
  },
  {
    satid: 3346,
    vmag: 5,
  },
  {
    satid: 3504,
    vmag: 5.5,
  },
  {
    satid: 3506,
    vmag: 7.5,
  },
  {
    satid: 3510,
    vmag: 7.5,
  },
  {
    satid: 3522,
    vmag: 7.5,
  },
  {
    satid: 3530,
    vmag: 6,
  },
  {
    satid: 3576,
    vmag: 6.5,
  },
  {
    satid: 3577,
    vmag: 5.5,
  },
  {
    satid: 3597,
    vmag: 5,
  },
  {
    satid: 3598,
    vmag: 3.5,
  },
  {
    satid: 3616,
    vmag: 5,
  },
  {
    satid: 3669,
    vmag: 7.5,
  },
  {
    satid: 3670,
    vmag: 8,
  },
  {
    satid: 3673,
    vmag: 7,
  },
  {
    satid: 3818,
    vmag: 5,
  },
  {
    satid: 3819,
    vmag: 5,
  },
  {
    satid: 3825,
    vmag: 8,
  },
  {
    satid: 3827,
    vmag: 7,
  },
  {
    satid: 3835,
    vmag: 4.5,
  },
  {
    satid: 3890,
    vmag: 6.5,
  },
  {
    satid: 3892,
    vmag: 4.5,
  },
  {
    satid: 3956,
    vmag: 5,
  },
  {
    satid: 4047,
    vmag: 6.5,
  },
  {
    satid: 4048,
    vmag: 6,
  },
  {
    satid: 4053,
    vmag: 5.5,
  },
  {
    satid: 4069,
    vmag: 2.5,
  },
  {
    satid: 4070,
    vmag: 6,
  },
  {
    satid: 4071,
    vmag: 4,
  },
  {
    satid: 4119,
    vmag: 5,
  },
  {
    satid: 4120,
    vmag: 4,
  },
  {
    satid: 4138,
    vmag: 5,
  },
  {
    satid: 4139,
    vmag: 4,
  },
  {
    satid: 4159,
    vmag: 3.5,
  },
  {
    satid: 4166,
    vmag: 6,
  },
  {
    satid: 4209,
    vmag: 8.5,
  },
  {
    satid: 4216,
    vmag: 5.5,
  },
  {
    satid: 4217,
    vmag: 6.5,
  },
  {
    satid: 4221,
    vmag: 8,
  },
  {
    satid: 4222,
    vmag: 5.5,
  },
  {
    satid: 4237,
    vmag: 6.5,
  },
  {
    satid: 4247,
    vmag: 7,
  },
  {
    satid: 4251,
    vmag: 5.5,
  },
  {
    satid: 4254,
    vmag: 4,
  },
  {
    satid: 4255,
    vmag: 6,
  },
  {
    satid: 4256,
    vmag: 8,
  },
  {
    satid: 4257,
    vmag: 7.5,
  },
  {
    satid: 4259,
    vmag: 7.5,
  },
  {
    satid: 4295,
    vmag: 7.5,
  },
  {
    satid: 4298,
    vmag: 6.5,
  },
  {
    satid: 4322,
    vmag: 3.5,
  },
  {
    satid: 4327,
    vmag: 5,
  },
  {
    satid: 4331,
    vmag: 8,
  },
  {
    satid: 4332,
    vmag: 7.5,
  },
  {
    satid: 4354,
    vmag: 6,
  },
  {
    satid: 4369,
    vmag: 6,
  },
  {
    satid: 4370,
    vmag: 4,
  },
  {
    satid: 4382,
    vmag: 6.5,
  },
  {
    satid: 4391,
    vmag: 6,
  },
  {
    satid: 4392,
    vmag: 4,
  },
  {
    satid: 4393,
    vmag: 4.5,
  },
  {
    satid: 4394,
    vmag: 3.5,
  },
  {
    satid: 4419,
    vmag: 5,
  },
  {
    satid: 4420,
    vmag: 4,
  },
  {
    satid: 4486,
    vmag: 6.5,
  },
  {
    satid: 4507,
    vmag: 6,
  },
  {
    satid: 4512,
    vmag: 6.5,
  },
  {
    satid: 4513,
    vmag: 5.5,
  },
  {
    satid: 4515,
    vmag: 7.5,
  },
  {
    satid: 4564,
    vmag: 5.5,
  },
  {
    satid: 4578,
    vmag: 5.5,
  },
  {
    satid: 4579,
    vmag: 3.5,
  },
  {
    satid: 4583,
    vmag: 4.5,
  },
  {
    satid: 4584,
    vmag: 3.5,
  },
  {
    satid: 4588,
    vmag: 6.5,
  },
  {
    satid: 4589,
    vmag: 4,
  },
  {
    satid: 4597,
    vmag: 5,
  },
  {
    satid: 4598,
    vmag: 5,
  },
  {
    satid: 4603,
    vmag: 5.5,
  },
  {
    satid: 4607,
    vmag: 6.5,
  },
  {
    satid: 4611,
    vmag: 6,
  },
  {
    satid: 4614,
    vmag: 4.5,
  },
  {
    satid: 4642,
    vmag: 6.5,
  },
  {
    satid: 4657,
    vmag: 5,
  },
  {
    satid: 4660,
    vmag: 7.5,
  },
  {
    satid: 4675,
    vmag: 7,
  },
  {
    satid: 4719,
    vmag: 6,
  },
  {
    satid: 4783,
    vmag: 5.5,
  },
  {
    satid: 4784,
    vmag: 4,
  },
  {
    satid: 4786,
    vmag: 3.5,
  },
  {
    satid: 4794,
    vmag: 3.5,
  },
  {
    satid: 4799,
    vmag: 5,
  },
  {
    satid: 4800,
    vmag: 5,
  },
  {
    satid: 4813,
    vmag: 3,
  },
  {
    satid: 4814,
    vmag: 3.5,
  },
  {
    satid: 4849,
    vmag: 4,
  },
  {
    satid: 4850,
    vmag: 4,
  },
  {
    satid: 4882,
    vmag: 2.5,
  },
  {
    satid: 4903,
    vmag: 6.5,
  },
  {
    satid: 4922,
    vmag: 7.5,
  },
  {
    satid: 4952,
    vmag: 7,
  },
  {
    satid: 4953,
    vmag: 6.5,
  },
  {
    satid: 4954,
    vmag: 6.5,
  },
  {
    satid: 4964,
    vmag: 5,
  },
  {
    satid: 4966,
    vmag: 4,
  },
  {
    satid: 5050,
    vmag: 8,
  },
  {
    satid: 5051,
    vmag: 5.5,
  },
  {
    satid: 5052,
    vmag: 8,
  },
  {
    satid: 5104,
    vmag: 5.5,
  },
  {
    satid: 5105,
    vmag: 5.5,
  },
  {
    satid: 5106,
    vmag: 7.5,
  },
  {
    satid: 5117,
    vmag: 4,
  },
  {
    satid: 5118,
    vmag: 3.5,
  },
  {
    satid: 5126,
    vmag: 7.5,
  },
  {
    satid: 5143,
    vmag: 3.5,
  },
  {
    satid: 5174,
    vmag: 5.5,
  },
  {
    satid: 5175,
    vmag: 3.5,
  },
  {
    satid: 5180,
    vmag: 6.5,
  },
  {
    satid: 5181,
    vmag: 6,
  },
  {
    satid: 5214,
    vmag: 7,
  },
  {
    satid: 5218,
    vmag: 5.5,
  },
  {
    satid: 5238,
    vmag: 6,
  },
  {
    satid: 5239,
    vmag: 4,
  },
  {
    satid: 5265,
    vmag: 5,
  },
  {
    satid: 5281,
    vmag: 5.5,
  },
  {
    satid: 5282,
    vmag: 4,
  },
  {
    satid: 5328,
    vmag: 4,
  },
  {
    satid: 5395,
    vmag: 6.5,
  },
  {
    satid: 5397,
    vmag: 5.5,
  },
  {
    satid: 5398,
    vmag: 5.5,
  },
  {
    satid: 5435,
    vmag: 7,
  },
  {
    satid: 5438,
    vmag: 6,
  },
  {
    satid: 5485,
    vmag: 9,
  },
  {
    satid: 5498,
    vmag: 7,
  },
  {
    satid: 5551,
    vmag: 7.5,
  },
  {
    satid: 5553,
    vmag: 7.5,
  },
  {
    satid: 5555,
    vmag: 6.5,
  },
  {
    satid: 5556,
    vmag: 6.5,
  },
  {
    satid: 5557,
    vmag: 6,
  },
  {
    satid: 5560,
    vmag: 3.5,
  },
  {
    satid: 5580,
    vmag: 6,
  },
  {
    satid: 5581,
    vmag: 6.5,
  },
  {
    satid: 5614,
    vmag: 7,
  },
  {
    satid: 5615,
    vmag: 4.5,
  },
  {
    satid: 5678,
    vmag: 8,
  },
  {
    satid: 5679,
    vmag: 3.5,
  },
  {
    satid: 5680,
    vmag: 7,
  },
  {
    satid: 5681,
    vmag: 7,
  },
  {
    satid: 5682,
    vmag: 7,
  },
  {
    satid: 5683,
    vmag: 6,
  },
  {
    satid: 5685,
    vmag: 4,
  },
  {
    satid: 5705,
    vmag: 4.5,
  },
  {
    satid: 5707,
    vmag: 4,
  },
  {
    satid: 5721,
    vmag: 4.5,
  },
  {
    satid: 5729,
    vmag: 5.5,
  },
  {
    satid: 5730,
    vmag: 3.5,
  },
  {
    satid: 5731,
    vmag: 4.5,
  },
  {
    satid: 5732,
    vmag: 4,
  },
  {
    satid: 5816,
    vmag: 2,
  },
  {
    satid: 5846,
    vmag: 5.5,
  },
  {
    satid: 5847,
    vmag: 5,
  },
  {
    satid: 5853,
    vmag: 3.5,
  },
  {
    satid: 5903,
    vmag: 5.5,
  },
  {
    satid: 5904,
    vmag: 7,
  },
  {
    satid: 5905,
    vmag: 5.5,
  },
  {
    satid: 5907,
    vmag: 5.5,
  },
  {
    satid: 5917,
    vmag: 4,
  },
  {
    satid: 5918,
    vmag: 3.5,
  },
  {
    satid: 5977,
    vmag: 6,
  },
  {
    satid: 5978,
    vmag: 7,
  },
  {
    satid: 5994,
    vmag: 2,
  },
  {
    satid: 6019,
    vmag: 5.5,
  },
  {
    satid: 6020,
    vmag: 4,
  },
  {
    satid: 6058,
    vmag: 1.5,
  },
  {
    satid: 6059,
    vmag: 5.5,
  },
  {
    satid: 6061,
    vmag: 4,
  },
  {
    satid: 6073,
    vmag: 5,
  },
  {
    satid: 6079,
    vmag: 4.5,
  },
  {
    satid: 6080,
    vmag: 4,
  },
  {
    satid: 6120,
    vmag: 7.5,
  },
  {
    satid: 6125,
    vmag: 6,
  },
  {
    satid: 6126,
    vmag: 5,
  },
  {
    satid: 6127,
    vmag: 5.5,
  },
  {
    satid: 6148,
    vmag: 6,
  },
  {
    satid: 6149,
    vmag: 4.5,
  },
  {
    satid: 6153,
    vmag: 4.5,
  },
  {
    satid: 6154,
    vmag: 5,
  },
  {
    satid: 6155,
    vmag: 3.5,
  },
  {
    satid: 6173,
    vmag: 7,
  },
  {
    satid: 6180,
    vmag: 6.5,
  },
  {
    satid: 6192,
    vmag: 4.5,
  },
  {
    satid: 6206,
    vmag: 7.5,
  },
  {
    satid: 6207,
    vmag: 4,
  },
  {
    satid: 6212,
    vmag: 4.5,
  },
  {
    satid: 6217,
    vmag: 5.5,
  },
  {
    satid: 6218,
    vmag: 6.5,
  },
  {
    satid: 6221,
    vmag: 6.5,
  },
  {
    satid: 6235,
    vmag: 6,
  },
  {
    satid: 6237,
    vmag: 5.5,
  },
  {
    satid: 6256,
    vmag: 4.5,
  },
  {
    satid: 6257,
    vmag: 4,
  },
  {
    satid: 6270,
    vmag: 7,
  },
  {
    satid: 6271,
    vmag: 5.5,
  },
  {
    satid: 6275,
    vmag: 5,
  },
  {
    satid: 6276,
    vmag: 7,
  },
  {
    satid: 6302,
    vmag: 3.5,
  },
  {
    satid: 6306,
    vmag: 5.5,
  },
  {
    satid: 6319,
    vmag: 7,
  },
  {
    satid: 6320,
    vmag: 5,
  },
  {
    satid: 6323,
    vmag: 5.5,
  },
  {
    satid: 6324,
    vmag: 3.5,
  },
  {
    satid: 6350,
    vmag: 5.5,
  },
  {
    satid: 6392,
    vmag: 4.5,
  },
  {
    satid: 6393,
    vmag: 4,
  },
  {
    satid: 6659,
    vmag: 5,
  },
  {
    satid: 6660,
    vmag: 4,
  },
  {
    satid: 6676,
    vmag: 8,
  },
  {
    satid: 6679,
    vmag: 7.5,
  },
  {
    satid: 6683,
    vmag: 6,
  },
  {
    satid: 6691,
    vmag: 4,
  },
  {
    satid: 6707,
    vmag: 6.5,
  },
  {
    satid: 6708,
    vmag: 4.5,
  },
  {
    satid: 6779,
    vmag: 2,
  },
  {
    satid: 6787,
    vmag: 5,
  },
  {
    satid: 6788,
    vmag: 6.5,
  },
  {
    satid: 6797,
    vmag: 1.5,
  },
  {
    satid: 6825,
    vmag: 7,
  },
  {
    satid: 6826,
    vmag: 4,
  },
  {
    satid: 6828,
    vmag: 6,
  },
  {
    satid: 6829,
    vmag: 4.5,
  },
  {
    satid: 6853,
    vmag: 4,
  },
  {
    satid: 6895,
    vmag: 3.5,
  },
  {
    satid: 6907,
    vmag: 5.5,
  },
  {
    satid: 6908,
    vmag: 3.5,
  },
  {
    satid: 6909,
    vmag: 7.5,
  },
  {
    satid: 6910,
    vmag: 7.5,
  },
  {
    satid: 6920,
    vmag: 6,
  },
  {
    satid: 6921,
    vmag: 5,
  },
  {
    satid: 6939,
    vmag: 5.5,
  },
  {
    satid: 6965,
    vmag: 5.5,
  },
  {
    satid: 6966,
    vmag: 4,
  },
  {
    satid: 6987,
    vmag: 6.3,
  },
  {
    satid: 6993,
    vmag: 6,
  },
  {
    satid: 7003,
    vmag: 5.5,
  },
  {
    satid: 7004,
    vmag: 3.5,
  },
  {
    satid: 7005,
    vmag: 5.5,
  },
  {
    satid: 7008,
    vmag: 6.5,
  },
  {
    satid: 7009,
    vmag: 4.5,
  },
  {
    satid: 7013,
    vmag: 6.5,
  },
  {
    satid: 7017,
    vmag: 5,
  },
  {
    satid: 7018,
    vmag: 7.5,
  },
  {
    satid: 7019,
    vmag: 7.5,
  },
  {
    satid: 7028,
    vmag: 6.5,
  },
  {
    satid: 7032,
    vmag: 5.5,
  },
  {
    satid: 7044,
    vmag: 6,
  },
  {
    satid: 7054,
    vmag: 6,
  },
  {
    satid: 7079,
    vmag: 7.5,
  },
  {
    satid: 7094,
    vmag: 5.5,
  },
  {
    satid: 7095,
    vmag: 6.5,
  },
  {
    satid: 7138,
    vmag: 5.5,
  },
  {
    satid: 7209,
    vmag: 4.5,
  },
  {
    satid: 7210,
    vmag: 4,
  },
  {
    satid: 7213,
    vmag: 6,
  },
  {
    satid: 7218,
    vmag: 5.5,
  },
  {
    satid: 7219,
    vmag: 6,
  },
  {
    satid: 7228,
    vmag: 6.5,
  },
  {
    satid: 7273,
    vmag: 6,
  },
  {
    satid: 7274,
    vmag: 4.5,
  },
  {
    satid: 7275,
    vmag: 4.5,
  },
  {
    satid: 7276,
    vmag: 4.5,
  },
  {
    satid: 7281,
    vmag: 6,
  },
  {
    satid: 7284,
    vmag: 5.5,
  },
  {
    satid: 7291,
    vmag: 4.5,
  },
  {
    satid: 7297,
    vmag: 5,
  },
  {
    satid: 7337,
    vmag: 6.5,
  },
  {
    satid: 7338,
    vmag: 3.5,
  },
  {
    satid: 7349,
    vmag: 5.5,
  },
  {
    satid: 7350,
    vmag: 5,
  },
  {
    satid: 7363,
    vmag: 4.5,
  },
  {
    satid: 7364,
    vmag: 4,
  },
  {
    satid: 7373,
    vmag: 4.5,
  },
  {
    satid: 7376,
    vmag: 4,
  },
  {
    satid: 7382,
    vmag: 4,
  },
  {
    satid: 7411,
    vmag: 5,
  },
  {
    satid: 7412,
    vmag: 7,
  },
  {
    satid: 7417,
    vmag: 4.5,
  },
  {
    satid: 7418,
    vmag: 3,
  },
  {
    satid: 7424,
    vmag: 7,
  },
  {
    satid: 7426,
    vmag: 5,
  },
  {
    satid: 7433,
    vmag: 6,
  },
  {
    satid: 7434,
    vmag: 4,
  },
  {
    satid: 7443,
    vmag: 6,
  },
  {
    satid: 7476,
    vmag: 6.5,
  },
  {
    satid: 7477,
    vmag: 4,
  },
  {
    satid: 7490,
    vmag: 4.5,
  },
  {
    satid: 7493,
    vmag: 4,
  },
  {
    satid: 7529,
    vmag: 6,
  },
  {
    satid: 7545,
    vmag: 2.5,
  },
  {
    satid: 7574,
    vmag: 4.5,
  },
  {
    satid: 7575,
    vmag: 4,
  },
  {
    satid: 7593,
    vmag: 6.5,
  },
  {
    satid: 7594,
    vmag: 4.5,
  },
  {
    satid: 7615,
    vmag: 6.5,
  },
  {
    satid: 7616,
    vmag: 5,
  },
  {
    satid: 7625,
    vmag: 4.5,
  },
  {
    satid: 7629,
    vmag: 5,
  },
  {
    satid: 7646,
    vmag: 8,
  },
  {
    satid: 7647,
    vmag: 7,
  },
  {
    satid: 7663,
    vmag: 6.5,
  },
  {
    satid: 7665,
    vmag: 5.5,
  },
  {
    satid: 7678,
    vmag: 7.5,
  },
  {
    satid: 7686,
    vmag: 6,
  },
  {
    satid: 7714,
    vmag: 4,
  },
  {
    satid: 7715,
    vmag: 4,
  },
  {
    satid: 7718,
    vmag: 5.5,
  },
  {
    satid: 7727,
    vmag: 4,
  },
  {
    satid: 7734,
    vmag: 5.5,
  },
  {
    satid: 7735,
    vmag: 3.5,
  },
  {
    satid: 7736,
    vmag: 6,
  },
  {
    satid: 7737,
    vmag: 4.5,
  },
  {
    satid: 7768,
    vmag: 6.5,
  },
  {
    satid: 7769,
    vmag: 5,
  },
  {
    satid: 7780,
    vmag: 5,
  },
  {
    satid: 7794,
    vmag: 6,
  },
  {
    satid: 7816,
    vmag: 5.5,
  },
  {
    satid: 7831,
    vmag: 5.5,
  },
  {
    satid: 7832,
    vmag: 6,
  },
  {
    satid: 7838,
    vmag: 6,
  },
  {
    satid: 7902,
    vmag: 2.5,
  },
  {
    satid: 7946,
    vmag: 5,
  },
  {
    satid: 7968,
    vmag: 4.5,
  },
  {
    satid: 7969,
    vmag: 4,
  },
  {
    satid: 8026,
    vmag: 4.5,
  },
  {
    satid: 8027,
    vmag: 4,
  },
  {
    satid: 8063,
    vmag: 4,
  },
  {
    satid: 8072,
    vmag: 5.5,
  },
  {
    satid: 8073,
    vmag: 5,
  },
  {
    satid: 8074,
    vmag: 2,
  },
  {
    satid: 8127,
    vmag: 3,
  },
  {
    satid: 8128,
    vmag: 3.5,
  },
  {
    satid: 8133,
    vmag: 3.5,
  },
  {
    satid: 8139,
    vmag: 7.5,
  },
  {
    satid: 8168,
    vmag: 8,
  },
  {
    satid: 8184,
    vmag: 7,
  },
  {
    satid: 8195,
    vmag: 4.5,
  },
  {
    satid: 8197,
    vmag: 6,
  },
  {
    satid: 8287,
    vmag: 8.5,
  },
  {
    satid: 8293,
    vmag: 4.5,
  },
  {
    satid: 8294,
    vmag: 4,
  },
  {
    satid: 8295,
    vmag: 6,
  },
  {
    satid: 8311,
    vmag: 6,
  },
  {
    satid: 8325,
    vmag: 6.5,
  },
  {
    satid: 8326,
    vmag: 5.5,
  },
  {
    satid: 8331,
    vmag: 2,
  },
  {
    satid: 8343,
    vmag: 5,
  },
  {
    satid: 8344,
    vmag: 4,
  },
  {
    satid: 8352,
    vmag: 7,
  },
  {
    satid: 8398,
    vmag: 6,
  },
  {
    satid: 8418,
    vmag: 4,
  },
  {
    satid: 8419,
    vmag: 6,
  },
  {
    satid: 8421,
    vmag: 4.5,
  },
  {
    satid: 8425,
    vmag: 5,
  },
  {
    satid: 8458,
    vmag: 6,
  },
  {
    satid: 8459,
    vmag: 4.5,
  },
  {
    satid: 8473,
    vmag: 4.5,
  },
  {
    satid: 8482,
    vmag: 4.5,
  },
  {
    satid: 8519,
    vmag: 4.5,
  },
  {
    satid: 8520,
    vmag: 4,
  },
  {
    satid: 8546,
    vmag: 6,
  },
  {
    satid: 8591,
    vmag: 6.5,
  },
  {
    satid: 8597,
    vmag: 4,
  },
  {
    satid: 8615,
    vmag: 5.5,
  },
  {
    satid: 8621,
    vmag: 4.5,
  },
  {
    satid: 8645,
    vmag: 7,
  },
  {
    satid: 8646,
    vmag: 6,
  },
  {
    satid: 8685,
    vmag: 8,
  },
  {
    satid: 8688,
    vmag: 6.5,
  },
  {
    satid: 8701,
    vmag: 4,
  },
  {
    satid: 8702,
    vmag: 6.5,
  },
  {
    satid: 8709,
    vmag: 4,
  },
  {
    satid: 8710,
    vmag: 7,
  },
  {
    satid: 8744,
    vmag: 5.5,
  },
  {
    satid: 8745,
    vmag: 4,
  },
  {
    satid: 8746,
    vmag: 5,
  },
  {
    satid: 8754,
    vmag: 4,
  },
  {
    satid: 8755,
    vmag: 3.5,
  },
  {
    satid: 8799,
    vmag: 4.5,
  },
  {
    satid: 8800,
    vmag: 3.5,
  },
  {
    satid: 8818,
    vmag: 6,
  },
  {
    satid: 8821,
    vmag: 5.5,
  },
  {
    satid: 8826,
    vmag: 5.5,
  },
  {
    satid: 8835,
    vmag: 6,
  },
  {
    satid: 8836,
    vmag: 6,
  },
  {
    satid: 8840,
    vmag: 3.5,
  },
  {
    satid: 8845,
    vmag: 5.5,
  },
  {
    satid: 8846,
    vmag: 4,
  },
  {
    satid: 8860,
    vmag: 6,
  },
  {
    satid: 8861,
    vmag: 8,
  },
  {
    satid: 8873,
    vmag: 6.5,
  },
  {
    satid: 8874,
    vmag: 4,
  },
  {
    satid: 8884,
    vmag: 6.5,
  },
  {
    satid: 8897,
    vmag: 6,
  },
  {
    satid: 8910,
    vmag: 6,
  },
  {
    satid: 8923,
    vmag: 6,
  },
  {
    satid: 8924,
    vmag: 4.5,
  },
  {
    satid: 9013,
    vmag: 3.5,
  },
  {
    satid: 9017,
    vmag: 5.5,
  },
  {
    satid: 9022,
    vmag: 5,
  },
  {
    satid: 9023,
    vmag: 3.5,
  },
  {
    satid: 9025,
    vmag: 6,
  },
  {
    satid: 9044,
    vmag: 4.5,
  },
  {
    satid: 9057,
    vmag: 7.5,
  },
  {
    satid: 9061,
    vmag: 6,
  },
  {
    satid: 9062,
    vmag: 5,
  },
  {
    satid: 9063,
    vmag: 5,
  },
  {
    satid: 9329,
    vmag: 2,
  },
  {
    satid: 9390,
    vmag: 4,
  },
  {
    satid: 9415,
    vmag: 5,
  },
  {
    satid: 9443,
    vmag: 5,
  },
  {
    satid: 9444,
    vmag: 4.5,
  },
  {
    satid: 9481,
    vmag: 5,
  },
  {
    satid: 9482,
    vmag: 4,
  },
  {
    satid: 9486,
    vmag: 4.5,
  },
  {
    satid: 9494,
    vmag: 5.5,
  },
  {
    satid: 9495,
    vmag: 5,
  },
  {
    satid: 9509,
    vmag: 5,
  },
  {
    satid: 9510,
    vmag: 4,
  },
  {
    satid: 9591,
    vmag: 8,
  },
  {
    satid: 9598,
    vmag: 5.5,
  },
  {
    satid: 9610,
    vmag: 6,
  },
  {
    satid: 9613,
    vmag: 4,
  },
  {
    satid: 9634,
    vmag: 5.5,
  },
  {
    satid: 9637,
    vmag: 5.5,
  },
  {
    satid: 9638,
    vmag: 6,
  },
  {
    satid: 9661,
    vmag: 4.5,
  },
  {
    satid: 9662,
    vmag: 4,
  },
  {
    satid: 9737,
    vmag: 5.5,
  },
  {
    satid: 9738,
    vmag: 4,
  },
  {
    satid: 9786,
    vmag: 4,
  },
  {
    satid: 9803,
    vmag: 4,
  },
  {
    satid: 9841,
    vmag: 8,
  },
  {
    satid: 9846,
    vmag: 5.5,
  },
  {
    satid: 9848,
    vmag: 4.5,
  },
  {
    satid: 9850,
    vmag: 4.5,
  },
  {
    satid: 9854,
    vmag: 4,
  },
  {
    satid: 9864,
    vmag: 6,
  },
  {
    satid: 9880,
    vmag: 4,
  },
  {
    satid: 9892,
    vmag: 6.5,
  },
  {
    satid: 9903,
    vmag: 4,
  },
  {
    satid: 9904,
    vmag: 3.5,
  },
  {
    satid: 9911,
    vmag: 4.5,
  },
  {
    satid: 9921,
    vmag: 4.5,
  },
  {
    satid: 9927,
    vmag: 4.5,
  },
  {
    satid: 9931,
    vmag: 4.5,
  },
  {
    satid: 9941,
    vmag: 5,
  },
  {
    satid: 9980,
    vmag: 4,
  },
  {
    satid: 10010,
    vmag: 7,
  },
  {
    satid: 10011,
    vmag: 3.5,
  },
  {
    satid: 10019,
    vmag: 6.5,
  },
  {
    satid: 10020,
    vmag: 5.5,
  },
  {
    satid: 10025,
    vmag: 2,
  },
  {
    satid: 10033,
    vmag: 5,
  },
  {
    satid: 10059,
    vmag: 4.5,
  },
  {
    satid: 10062,
    vmag: 3.5,
  },
  {
    satid: 10095,
    vmag: 5.5,
  },
  {
    satid: 10096,
    vmag: 3.5,
  },
  {
    satid: 10113,
    vmag: 5.5,
  },
  {
    satid: 10114,
    vmag: 4,
  },
  {
    satid: 10120,
    vmag: 6,
  },
  {
    satid: 10121,
    vmag: 4,
  },
  {
    satid: 10134,
    vmag: 3,
  },
  {
    satid: 10135,
    vmag: 3.5,
  },
  {
    satid: 10137,
    vmag: 6.5,
  },
  {
    satid: 10138,
    vmag: 4.5,
  },
  {
    satid: 10141,
    vmag: 5.5,
  },
  {
    satid: 10142,
    vmag: 5,
  },
  {
    satid: 10144,
    vmag: 5,
  },
  {
    satid: 10150,
    vmag: 4.5,
  },
  {
    satid: 10155,
    vmag: 4.5,
  },
  {
    satid: 10184,
    vmag: 5,
  },
  {
    satid: 10188,
    vmag: 7,
  },
  {
    satid: 10223,
    vmag: 5.5,
  },
  {
    satid: 10227,
    vmag: 6.5,
  },
  {
    satid: 10234,
    vmag: 6,
  },
  {
    satid: 10246,
    vmag: 6.5,
  },
  {
    satid: 10293,
    vmag: 6,
  },
  {
    satid: 10295,
    vmag: 5,
  },
  {
    satid: 10309,
    vmag: 6.5,
  },
  {
    satid: 10352,
    vmag: 5,
  },
  {
    satid: 10355,
    vmag: 4.5,
  },
  {
    satid: 10358,
    vmag: 4.5,
  },
  {
    satid: 10362,
    vmag: 4.5,
  },
  {
    satid: 10363,
    vmag: 3.5,
  },
  {
    satid: 10457,
    vmag: 7.5,
  },
  {
    satid: 10459,
    vmag: 5.5,
  },
  {
    satid: 10461,
    vmag: 4,
  },
  {
    satid: 10462,
    vmag: 5.5,
  },
  {
    satid: 10485,
    vmag: 4,
  },
  {
    satid: 10490,
    vmag: 3.5,
  },
  {
    satid: 10491,
    vmag: 6,
  },
  {
    satid: 10492,
    vmag: 4,
  },
  {
    satid: 10502,
    vmag: 6,
  },
  {
    satid: 10508,
    vmag: 5,
  },
  {
    satid: 10512,
    vmag: 6.5,
  },
  {
    satid: 10513,
    vmag: 4,
  },
  {
    satid: 10514,
    vmag: 4.5,
  },
  {
    satid: 10515,
    vmag: 3.5,
  },
  {
    satid: 10517,
    vmag: 3.5,
  },
  {
    satid: 10520,
    vmag: 5.5,
  },
  {
    satid: 10521,
    vmag: 3.5,
  },
  {
    satid: 10529,
    vmag: 6,
  },
  {
    satid: 10531,
    vmag: 5,
  },
  {
    satid: 10536,
    vmag: 5,
  },
  {
    satid: 10537,
    vmag: 4,
  },
  {
    satid: 10539,
    vmag: 4.5,
  },
  {
    satid: 10541,
    vmag: 4,
  },
  {
    satid: 10544,
    vmag: 6,
  },
  {
    satid: 10561,
    vmag: 3.5,
  },
  {
    satid: 10582,
    vmag: 3.5,
  },
  {
    satid: 10591,
    vmag: 5.5,
  },
  {
    satid: 10594,
    vmag: 6,
  },
  {
    satid: 10599,
    vmag: 6.5,
  },
  {
    satid: 10600,
    vmag: 4.5,
  },
  {
    satid: 10658,
    vmag: 6.5,
  },
  {
    satid: 10664,
    vmag: 6.5,
  },
  {
    satid: 10674,
    vmag: 6.5,
  },
  {
    satid: 10675,
    vmag: 5,
  },
  {
    satid: 10676,
    vmag: 5.5,
  },
  {
    satid: 10677,
    vmag: 4,
  },
  {
    satid: 10692,
    vmag: 6,
  },
  {
    satid: 10693,
    vmag: 4,
  },
  {
    satid: 10702,
    vmag: 5,
  },
  {
    satid: 10703,
    vmag: 8.5,
  },
  {
    satid: 10704,
    vmag: 5.5,
  },
  {
    satid: 10722,
    vmag: 4.5,
  },
  {
    satid: 10723,
    vmag: 4.5,
  },
  {
    satid: 10730,
    vmag: 5.5,
  },
  {
    satid: 10731,
    vmag: 5.5,
  },
  {
    satid: 10732,
    vmag: 4.5,
  },
  {
    satid: 10744,
    vmag: 5.5,
  },
  {
    satid: 10745,
    vmag: 4.5,
  },
  {
    satid: 10766,
    vmag: 7.5,
  },
  {
    satid: 10776,
    vmag: 6,
  },
  {
    satid: 10777,
    vmag: 4,
  },
  {
    satid: 10779,
    vmag: 2,
  },
  {
    satid: 10793,
    vmag: 3.5,
  },
  {
    satid: 10801,
    vmag: 5.5,
  },
  {
    satid: 10820,
    vmag: 4.5,
  },
  {
    satid: 10856,
    vmag: 4.5,
  },
  {
    satid: 10860,
    vmag: 4,
  },
  {
    satid: 10861,
    vmag: 3.5,
  },
  {
    satid: 10894,
    vmag: 6,
  },
  {
    satid: 10917,
    vmag: 5.5,
  },
  {
    satid: 10918,
    vmag: 4.5,
  },
  {
    satid: 10925,
    vmag: 4,
  },
  {
    satid: 10938,
    vmag: 6,
  },
  {
    satid: 10941,
    vmag: 2,
  },
  {
    satid: 10954,
    vmag: 4,
  },
  {
    satid: 10961,
    vmag: 5.5,
  },
  {
    satid: 10962,
    vmag: 4.5,
  },
  {
    satid: 10967,
    vmag: 2.5,
  },
  {
    satid: 10973,
    vmag: 4.5,
  },
  {
    satid: 10974,
    vmag: 3.5,
  },
  {
    satid: 10976,
    vmag: 3,
  },
  {
    satid: 10983,
    vmag: 5,
  },
  {
    satid: 10991,
    vmag: 5.5,
  },
  {
    satid: 10992,
    vmag: 4,
  },
  {
    satid: 10994,
    vmag: 3,
  },
  {
    satid: 10998,
    vmag: 4.5,
  },
  {
    satid: 11015,
    vmag: 4.5,
  },
  {
    satid: 11027,
    vmag: 8,
  },
  {
    satid: 11028,
    vmag: 7.5,
  },
  {
    satid: 11051,
    vmag: 5.5,
  },
  {
    satid: 11054,
    vmag: 5,
  },
  {
    satid: 11055,
    vmag: 4,
  },
  {
    satid: 11056,
    vmag: 3.5,
  },
  {
    satid: 11057,
    vmag: 4.5,
  },
  {
    satid: 11060,
    vmag: 5,
  },
  {
    satid: 11074,
    vmag: 6,
  },
  {
    satid: 11076,
    vmag: 4.5,
  },
  {
    satid: 11079,
    vmag: 4,
  },
  {
    satid: 11080,
    vmag: 4.5,
  },
  {
    satid: 11081,
    vmag: 4,
  },
  {
    satid: 11084,
    vmag: 4.5,
  },
  {
    satid: 11087,
    vmag: 4.5,
  },
  {
    satid: 11111,
    vmag: 5.5,
  },
  {
    satid: 11112,
    vmag: 4,
  },
  {
    satid: 11136,
    vmag: 6,
  },
  {
    satid: 11142,
    vmag: 6.5,
  },
  {
    satid: 11155,
    vmag: 3.5,
  },
  {
    satid: 11156,
    vmag: 4,
  },
  {
    satid: 11165,
    vmag: 4.5,
  },
  {
    satid: 11166,
    vmag: 4,
  },
  {
    satid: 11168,
    vmag: 7,
  },
  {
    satid: 11170,
    vmag: 4,
  },
  {
    satid: 11238,
    vmag: 6.5,
  },
  {
    satid: 11239,
    vmag: 4,
  },
  {
    satid: 11240,
    vmag: 5,
  },
  {
    satid: 11251,
    vmag: 4,
  },
  {
    satid: 11252,
    vmag: 4,
  },
  {
    satid: 11266,
    vmag: 4,
  },
  {
    satid: 11267,
    vmag: 4,
  },
  {
    satid: 11268,
    vmag: 4.5,
  },
  {
    satid: 11269,
    vmag: 3.5,
  },
  {
    satid: 11285,
    vmag: 4.5,
  },
  {
    satid: 11286,
    vmag: 3.5,
  },
  {
    satid: 11288,
    vmag: 4.5,
  },
  {
    satid: 11289,
    vmag: 3.5,
  },
  {
    satid: 11304,
    vmag: 6,
  },
  {
    satid: 11308,
    vmag: 5.5,
  },
  {
    satid: 11309,
    vmag: 4.5,
  },
  {
    satid: 11320,
    vmag: 6,
  },
  {
    satid: 11321,
    vmag: 6.5,
  },
  {
    satid: 11326,
    vmag: 6.5,
  },
  {
    satid: 11327,
    vmag: 3.5,
  },
  {
    satid: 11331,
    vmag: 3.5,
  },
  {
    satid: 11332,
    vmag: 3.5,
  },
  {
    satid: 11378,
    vmag: 5.5,
  },
  {
    satid: 11379,
    vmag: 4.5,
  },
  {
    satid: 11389,
    vmag: 5.5,
  },
  {
    satid: 11397,
    vmag: 4,
  },
  {
    satid: 11416,
    vmag: 4,
  },
  {
    satid: 11417,
    vmag: 5,
  },
  {
    satid: 11425,
    vmag: 5.5,
  },
  {
    satid: 11427,
    vmag: 4,
  },
  {
    satid: 11436,
    vmag: 4,
  },
  {
    satid: 11457,
    vmag: 3,
  },
  {
    satid: 11458,
    vmag: 4,
  },
  {
    satid: 11474,
    vmag: 5,
  },
  {
    satid: 11510,
    vmag: 5.5,
  },
  {
    satid: 11511,
    vmag: 3.5,
  },
  {
    satid: 11540,
    vmag: 8.5,
  },
  {
    satid: 11546,
    vmag: 6,
  },
  {
    satid: 11550,
    vmag: 3.5,
  },
  {
    satid: 11553,
    vmag: 4.5,
  },
  {
    satid: 11555,
    vmag: 4.5,
  },
  {
    satid: 11556,
    vmag: 4,
  },
  {
    satid: 11558,
    vmag: 2.5,
  },
  {
    satid: 11560,
    vmag: 4,
  },
  {
    satid: 11573,
    vmag: 6,
  },
  {
    satid: 11574,
    vmag: 3.5,
  },
  {
    satid: 11585,
    vmag: 5.5,
  },
  {
    satid: 11586,
    vmag: 5,
  },
  {
    satid: 11600,
    vmag: 4,
  },
  {
    satid: 11601,
    vmag: 4,
  },
  {
    satid: 11605,
    vmag: 4.5,
  },
  {
    satid: 11608,
    vmag: 3.5,
  },
  {
    satid: 11629,
    vmag: 3,
  },
  {
    satid: 11630,
    vmag: 3.5,
  },
  {
    satid: 11636,
    vmag: 4,
  },
  {
    satid: 11667,
    vmag: 5.5,
  },
  {
    satid: 11668,
    vmag: 4.5,
  },
  {
    satid: 11669,
    vmag: 5,
  },
  {
    satid: 11671,
    vmag: 3.5,
  },
  {
    satid: 11672,
    vmag: 3.5,
  },
  {
    satid: 11680,
    vmag: 5.5,
  },
  {
    satid: 11681,
    vmag: 4,
  },
  {
    satid: 11682,
    vmag: 3.5,
  },
  {
    satid: 11683,
    vmag: 3.5,
  },
  {
    satid: 11695,
    vmag: 6.5,
  },
  {
    satid: 11699,
    vmag: 5.5,
  },
  {
    satid: 11703,
    vmag: 4,
  },
  {
    satid: 11705,
    vmag: 6.5,
  },
  {
    satid: 11718,
    vmag: 5.5,
  },
  {
    satid: 11720,
    vmag: 6,
  },
  {
    satid: 11731,
    vmag: 6,
  },
  {
    satid: 11732,
    vmag: 6,
  },
  {
    satid: 11733,
    vmag: 6,
  },
  {
    satid: 11735,
    vmag: 6.5,
  },
  {
    satid: 11736,
    vmag: 4.5,
  },
  {
    satid: 11745,
    vmag: 6,
  },
  {
    satid: 11750,
    vmag: 6.5,
  },
  {
    satid: 11751,
    vmag: 4,
  },
  {
    satid: 11765,
    vmag: 4.5,
  },
  {
    satid: 11783,
    vmag: 5,
  },
  {
    satid: 11788,
    vmag: 5.5,
  },
  {
    satid: 11803,
    vmag: 5,
  },
  {
    satid: 11804,
    vmag: 4,
  },
  {
    satid: 11821,
    vmag: 4,
  },
  {
    satid: 11822,
    vmag: 4,
  },
  {
    satid: 11841,
    vmag: 5,
  },
  {
    satid: 11844,
    vmag: 3.5,
  },
  {
    satid: 11847,
    vmag: 5,
  },
  {
    satid: 11849,
    vmag: 4,
  },
  {
    satid: 11852,
    vmag: 8,
  },
  {
    satid: 11869,
    vmag: 5.5,
  },
  {
    satid: 11870,
    vmag: 4,
  },
  {
    satid: 11871,
    vmag: 5,
  },
  {
    satid: 11879,
    vmag: 5,
  },
  {
    satid: 11883,
    vmag: 6,
  },
  {
    satid: 11888,
    vmag: 5,
  },
  {
    satid: 11896,
    vmag: 5,
  },
  {
    satid: 11909,
    vmag: 4.5,
  },
  {
    satid: 11932,
    vmag: 3.5,
  },
  {
    satid: 11933,
    vmag: 3.5,
  },
  {
    satid: 11962,
    vmag: 4.5,
  },
  {
    satid: 11963,
    vmag: 4,
  },
  {
    satid: 12032,
    vmag: 4,
  },
  {
    satid: 12046,
    vmag: 5,
  },
  {
    satid: 12054,
    vmag: 2.5,
  },
  {
    satid: 12069,
    vmag: 2,
  },
  {
    satid: 12071,
    vmag: 4,
  },
  {
    satid: 12072,
    vmag: 3.5,
  },
  {
    satid: 12078,
    vmag: 4.5,
  },
  {
    satid: 12086,
    vmag: 4.5,
  },
  {
    satid: 12087,
    vmag: 5,
  },
  {
    satid: 12088,
    vmag: 4.5,
  },
  {
    satid: 12091,
    vmag: 5.5,
  },
  {
    satid: 12092,
    vmag: 5,
  },
  {
    satid: 12115,
    vmag: 5.5,
  },
  {
    satid: 12133,
    vmag: 4.5,
  },
  {
    satid: 12138,
    vmag: 5.5,
  },
  {
    satid: 12139,
    vmag: 3.5,
  },
  {
    satid: 12149,
    vmag: 7.5,
  },
  {
    satid: 12150,
    vmag: 4,
  },
  {
    satid: 12154,
    vmag: 4,
  },
  {
    satid: 12155,
    vmag: 3.5,
  },
  {
    satid: 12156,
    vmag: 5,
  },
  {
    satid: 12159,
    vmag: 4.5,
  },
  {
    satid: 12166,
    vmag: 8,
  },
  {
    satid: 12171,
    vmag: 6,
  },
  {
    satid: 12174,
    vmag: 6,
  },
  {
    satid: 12175,
    vmag: 8,
  },
  {
    satid: 12201,
    vmag: 5.5,
  },
  {
    satid: 12295,
    vmag: 5.5,
  },
  {
    satid: 12297,
    vmag: 5.5,
  },
  {
    satid: 12298,
    vmag: 4,
  },
  {
    satid: 12303,
    vmag: 4,
  },
  {
    satid: 12311,
    vmag: 4.5,
  },
  {
    satid: 12319,
    vmag: 5,
  },
  {
    satid: 12323,
    vmag: 8,
  },
  {
    satid: 12325,
    vmag: 5.5,
  },
  {
    satid: 12328,
    vmag: 6,
  },
  {
    satid: 12339,
    vmag: 4,
  },
  {
    satid: 12363,
    vmag: 2,
  },
  {
    satid: 12371,
    vmag: 4.5,
  },
  {
    satid: 12376,
    vmag: 4,
  },
  {
    satid: 12388,
    vmag: 5.5,
  },
  {
    satid: 12389,
    vmag: 3,
  },
  {
    satid: 12409,
    vmag: 5,
  },
  {
    satid: 12442,
    vmag: 5.5,
  },
  {
    satid: 12443,
    vmag: 4,
  },
  {
    satid: 12445,
    vmag: 3.5,
  },
  {
    satid: 12456,
    vmag: 5,
  },
  {
    satid: 12457,
    vmag: 4.5,
  },
  {
    satid: 12458,
    vmag: 6.5,
  },
  {
    satid: 12464,
    vmag: 4,
  },
  {
    satid: 12465,
    vmag: 3.5,
  },
  {
    satid: 12474,
    vmag: 5.5,
  },
  {
    satid: 12497,
    vmag: 2.5,
  },
  {
    satid: 12504,
    vmag: 7,
  },
  {
    satid: 12508,
    vmag: 3.5,
  },
  {
    satid: 12519,
    vmag: 3.5,
  },
  {
    satid: 12532,
    vmag: 5.5,
  },
  {
    satid: 12545,
    vmag: 6,
  },
  {
    satid: 12553,
    vmag: 5.5,
  },
  {
    satid: 12561,
    vmag: 4.5,
  },
  {
    satid: 12585,
    vmag: 4.5,
  },
  {
    satid: 12586,
    vmag: 3.5,
  },
  {
    satid: 12624,
    vmag: 6,
  },
  {
    satid: 12627,
    vmag: 5.5,
  },
  {
    satid: 12644,
    vmag: 6,
  },
  {
    satid: 12645,
    vmag: 4,
  },
  {
    satid: 12646,
    vmag: 4,
  },
  {
    satid: 12653,
    vmag: 8,
  },
  {
    satid: 12655,
    vmag: 5.5,
  },
  {
    satid: 12679,
    vmag: 6.5,
  },
  {
    satid: 12681,
    vmag: 5.5,
  },
  {
    satid: 12682,
    vmag: 4,
  },
  {
    satid: 12692,
    vmag: 9,
  },
  {
    satid: 12783,
    vmag: 5.5,
  },
  {
    satid: 12785,
    vmag: 3.5,
  },
  {
    satid: 12786,
    vmag: 4,
  },
  {
    satid: 12787,
    vmag: 5.5,
  },
  {
    satid: 12791,
    vmag: 6,
  },
  {
    satid: 12792,
    vmag: 4,
  },
  {
    satid: 12803,
    vmag: 6.5,
  },
  {
    satid: 12804,
    vmag: 4.5,
  },
  {
    satid: 12818,
    vmag: 5,
  },
  {
    satid: 12827,
    vmag: 4.5,
  },
  {
    satid: 12833,
    vmag: 6.5,
  },
  {
    satid: 12835,
    vmag: 5.5,
  },
  {
    satid: 12836,
    vmag: 4.5,
  },
  {
    satid: 12848,
    vmag: 4,
  },
  {
    satid: 12849,
    vmag: 3.5,
  },
  {
    satid: 12879,
    vmag: 3.5,
  },
  {
    satid: 12880,
    vmag: 4.5,
  },
  {
    satid: 12887,
    vmag: 5.5,
  },
  {
    satid: 12889,
    vmag: 3.5,
  },
  {
    satid: 12892,
    vmag: 5.5,
  },
  {
    satid: 12903,
    vmag: 4,
  },
  {
    satid: 12904,
    vmag: 3.5,
  },
  {
    satid: 12908,
    vmag: 2.5,
  },
  {
    satid: 12940,
    vmag: 4.5,
  },
  {
    satid: 12983,
    vmag: 5.5,
  },
  {
    satid: 12987,
    vmag: 4.5,
  },
  {
    satid: 12988,
    vmag: 4,
  },
  {
    satid: 12995,
    vmag: 5,
  },
  {
    satid: 12998,
    vmag: 6,
  },
  {
    satid: 13001,
    vmag: 8.5,
  },
  {
    satid: 13002,
    vmag: 6.5,
  },
  {
    satid: 13003,
    vmag: 3.5,
  },
  {
    satid: 13007,
    vmag: 3,
  },
  {
    satid: 13011,
    vmag: 4.5,
  },
  {
    satid: 13012,
    vmag: 5,
  },
  {
    satid: 13016,
    vmag: 4.5,
  },
  {
    satid: 13027,
    vmag: 6,
  },
  {
    satid: 13028,
    vmag: 4,
  },
  {
    satid: 13033,
    vmag: 6.5,
  },
  {
    satid: 13034,
    vmag: 4,
  },
  {
    satid: 13065,
    vmag: 5.5,
  },
  {
    satid: 13066,
    vmag: 4,
  },
  {
    satid: 13067,
    vmag: 3.5,
  },
  {
    satid: 13068,
    vmag: 3.5,
  },
  {
    satid: 13069,
    vmag: 4,
  },
  {
    satid: 13070,
    vmag: 4.5,
  },
  {
    satid: 13075,
    vmag: 4.5,
  },
  {
    satid: 13080,
    vmag: 5,
  },
  {
    satid: 13086,
    vmag: 5,
  },
  {
    satid: 13090,
    vmag: 4.5,
  },
  {
    satid: 13110,
    vmag: 5.5,
  },
  {
    satid: 13111,
    vmag: 5,
  },
  {
    satid: 13113,
    vmag: 4.5,
  },
  {
    satid: 13114,
    vmag: 4,
  },
  {
    satid: 13120,
    vmag: 4.5,
  },
  {
    satid: 13121,
    vmag: 3.5,
  },
  {
    satid: 13124,
    vmag: 4.5,
  },
  {
    satid: 13127,
    vmag: 6,
  },
  {
    satid: 13128,
    vmag: 5.5,
  },
  {
    satid: 13138,
    vmag: 1,
  },
  {
    satid: 13148,
    vmag: 6,
  },
  {
    satid: 13149,
    vmag: 4,
  },
  {
    satid: 13153,
    vmag: 4.5,
  },
  {
    satid: 13154,
    vmag: 4,
  },
  {
    satid: 13164,
    vmag: 8,
  },
  {
    satid: 13168,
    vmag: 3.5,
  },
  {
    satid: 13169,
    vmag: 5,
  },
  {
    satid: 13172,
    vmag: 7,
  },
  {
    satid: 13175,
    vmag: 4.5,
  },
  {
    satid: 13215,
    vmag: 4,
  },
  {
    satid: 13241,
    vmag: 5.5,
  },
  {
    satid: 13242,
    vmag: 4,
  },
  {
    satid: 13243,
    vmag: 5,
  },
  {
    satid: 13260,
    vmag: 4,
  },
  {
    satid: 13271,
    vmag: 4,
  },
  {
    satid: 13272,
    vmag: 4,
  },
  {
    satid: 13298,
    vmag: 4.5,
  },
  {
    satid: 13301,
    vmag: 5.5,
  },
  {
    satid: 13302,
    vmag: 4,
  },
  {
    satid: 13353,
    vmag: 5.5,
  },
  {
    satid: 13354,
    vmag: 4,
  },
  {
    satid: 13367,
    vmag: 4.5,
  },
  {
    satid: 13386,
    vmag: 6,
  },
  {
    satid: 13402,
    vmag: 4.5,
  },
  {
    satid: 13403,
    vmag: 3.5,
  },
  {
    satid: 13446,
    vmag: 4.5,
  },
  {
    satid: 13492,
    vmag: 6,
  },
  {
    satid: 13493,
    vmag: 6,
  },
  {
    satid: 13552,
    vmag: 3.5,
  },
  {
    satid: 13553,
    vmag: 4,
  },
  {
    satid: 13589,
    vmag: 4.5,
  },
  {
    satid: 13590,
    vmag: 4,
  },
  {
    satid: 13591,
    vmag: 4.5,
  },
  {
    satid: 13600,
    vmag: 5.5,
  },
  {
    satid: 13608,
    vmag: 6,
  },
  {
    satid: 13609,
    vmag: 6,
  },
  {
    satid: 13617,
    vmag: 6.5,
  },
  {
    satid: 13618,
    vmag: 4,
  },
  {
    satid: 13648,
    vmag: 6.5,
  },
  {
    satid: 13649,
    vmag: 4,
  },
  {
    satid: 13658,
    vmag: 5,
  },
  {
    satid: 13666,
    vmag: 5.5,
  },
  {
    satid: 13669,
    vmag: 5,
  },
  {
    satid: 13718,
    vmag: 4.5,
  },
  {
    satid: 13719,
    vmag: 4,
  },
  {
    satid: 13736,
    vmag: 5,
  },
  {
    satid: 13757,
    vmag: 5,
  },
  {
    satid: 13758,
    vmag: 4,
  },
  {
    satid: 13768,
    vmag: 6.5,
  },
  {
    satid: 13769,
    vmag: 6,
  },
  {
    satid: 13770,
    vmag: 4,
  },
  {
    satid: 13771,
    vmag: 3.5,
  },
  {
    satid: 13777,
    vmag: 4.5,
  },
  {
    satid: 13778,
    vmag: 4,
  },
  {
    satid: 13783,
    vmag: 7,
  },
  {
    satid: 13791,
    vmag: 6,
  },
  {
    satid: 13818,
    vmag: 4,
  },
  {
    satid: 13819,
    vmag: 4,
  },
  {
    satid: 13844,
    vmag: 6,
  },
  {
    satid: 13845,
    vmag: 6,
  },
  {
    satid: 13874,
    vmag: 6,
  },
  {
    satid: 13875,
    vmag: 4,
  },
  {
    satid: 13882,
    vmag: 4.5,
  },
  {
    satid: 13890,
    vmag: 4,
  },
  {
    satid: 13897,
    vmag: 4.5,
  },
  {
    satid: 13912,
    vmag: 6,
  },
  {
    satid: 13916,
    vmag: 5.5,
  },
  {
    satid: 13917,
    vmag: 4,
  },
  {
    satid: 13923,
    vmag: 5,
  },
  {
    satid: 13949,
    vmag: 5,
  },
  {
    satid: 13950,
    vmag: 5,
  },
  {
    satid: 13964,
    vmag: 4,
  },
  {
    satid: 13967,
    vmag: 3.5,
  },
  {
    satid: 13969,
    vmag: 1.5,
  },
  {
    satid: 13971,
    vmag: 3,
  },
  {
    satid: 13985,
    vmag: 3.5,
  },
  {
    satid: 13991,
    vmag: 5.5,
  },
  {
    satid: 13992,
    vmag: 3.5,
  },
  {
    satid: 14032,
    vmag: 3,
  },
  {
    satid: 14033,
    vmag: 3.5,
  },
  {
    satid: 14041,
    vmag: 3.5,
  },
  {
    satid: 14051,
    vmag: 3.5,
  },
  {
    satid: 14057,
    vmag: 5.5,
  },
  {
    satid: 14059,
    vmag: 3.5,
  },
  {
    satid: 14064,
    vmag: 3.5,
  },
  {
    satid: 14075,
    vmag: 5.5,
  },
  {
    satid: 14077,
    vmag: 5,
  },
  {
    satid: 14084,
    vmag: 4,
  },
  {
    satid: 14085,
    vmag: 3.5,
  },
  {
    satid: 14096,
    vmag: 3.5,
  },
  {
    satid: 14112,
    vmag: 5.5,
  },
  {
    satid: 14135,
    vmag: 6,
  },
  {
    satid: 14136,
    vmag: 6,
  },
  {
    satid: 14139,
    vmag: 7.5,
  },
  {
    satid: 14143,
    vmag: 5.5,
  },
  {
    satid: 14144,
    vmag: 6,
  },
  {
    satid: 14147,
    vmag: 3.5,
  },
  {
    satid: 14148,
    vmag: 4,
  },
  {
    satid: 14154,
    vmag: 8,
  },
  {
    satid: 14155,
    vmag: 8,
  },
  {
    satid: 14160,
    vmag: 5,
  },
  {
    satid: 14179,
    vmag: 5.5,
  },
  {
    satid: 14180,
    vmag: 6,
  },
  {
    satid: 14182,
    vmag: 3,
  },
  {
    satid: 14190,
    vmag: 5.5,
  },
  {
    satid: 14192,
    vmag: 6,
  },
  {
    satid: 14207,
    vmag: 4,
  },
  {
    satid: 14208,
    vmag: 3.5,
  },
  {
    satid: 14240,
    vmag: 5,
  },
  {
    satid: 14241,
    vmag: 4,
  },
  {
    satid: 14277,
    vmag: 5.5,
  },
  {
    satid: 14278,
    vmag: 6,
  },
  {
    satid: 14319,
    vmag: 4.5,
  },
  {
    satid: 14329,
    vmag: 4,
  },
  {
    satid: 14352,
    vmag: 5,
  },
  {
    satid: 14372,
    vmag: 4,
  },
  {
    satid: 14373,
    vmag: 4,
  },
  {
    satid: 14401,
    vmag: 5.5,
  },
  {
    satid: 14402,
    vmag: 4,
  },
  {
    satid: 14450,
    vmag: 5,
  },
  {
    satid: 14451,
    vmag: 4.5,
  },
  {
    satid: 14452,
    vmag: 4,
  },
  {
    satid: 14453,
    vmag: 3.5,
  },
  {
    satid: 14483,
    vmag: 6,
  },
  {
    satid: 14484,
    vmag: 3.5,
  },
  {
    satid: 14506,
    vmag: 4,
  },
  {
    satid: 14516,
    vmag: 4,
  },
  {
    satid: 14521,
    vmag: 3.5,
  },
  {
    satid: 14522,
    vmag: 4.5,
  },
  {
    satid: 14524,
    vmag: 5.5,
  },
  {
    satid: 14546,
    vmag: 5,
  },
  {
    satid: 14547,
    vmag: 4,
  },
  {
    satid: 14551,
    vmag: 4.5,
  },
  {
    satid: 14552,
    vmag: 4,
  },
  {
    satid: 14587,
    vmag: 4,
  },
  {
    satid: 14607,
    vmag: 6,
  },
  {
    satid: 14608,
    vmag: 6,
  },
  {
    satid: 14615,
    vmag: 8,
  },
  {
    satid: 14619,
    vmag: 5.5,
  },
  {
    satid: 14624,
    vmag: 5.5,
  },
  {
    satid: 14625,
    vmag: 4,
  },
  {
    satid: 14670,
    vmag: 5.5,
  },
  {
    satid: 14679,
    vmag: 5.5,
  },
  {
    satid: 14680,
    vmag: 4,
  },
  {
    satid: 14690,
    vmag: 5.5,
  },
  {
    satid: 14693,
    vmag: 5.5,
  },
  {
    satid: 14694,
    vmag: 5.5,
  },
  {
    satid: 14699,
    vmag: 3.5,
  },
  {
    satid: 14700,
    vmag: 4,
  },
  {
    satid: 14728,
    vmag: 6,
  },
  {
    satid: 14729,
    vmag: 6,
  },
  {
    satid: 14759,
    vmag: 5.5,
  },
  {
    satid: 14760,
    vmag: 4,
  },
  {
    satid: 14780,
    vmag: 4,
  },
  {
    satid: 14781,
    vmag: 7.5,
  },
  {
    satid: 14782,
    vmag: 5.5,
  },
  {
    satid: 14795,
    vmag: 6,
  },
  {
    satid: 14796,
    vmag: 4,
  },
  {
    satid: 14819,
    vmag: 4,
  },
  {
    satid: 14820,
    vmag: 4,
  },
  {
    satid: 14884,
    vmag: 3.5,
  },
  {
    satid: 14894,
    vmag: 4.5,
  },
  {
    satid: 14898,
    vmag: 4,
  },
  {
    satid: 14900,
    vmag: 2.5,
  },
  {
    satid: 14930,
    vmag: 4.5,
  },
  {
    satid: 14965,
    vmag: 5.5,
  },
  {
    satid: 14966,
    vmag: 4,
  },
  {
    satid: 14973,
    vmag: 6,
  },
  {
    satid: 14974,
    vmag: 3.5,
  },
  {
    satid: 14985,
    vmag: 5,
  },
  {
    satid: 15002,
    vmag: 8,
  },
  {
    satid: 15006,
    vmag: 3.5,
  },
  {
    satid: 15030,
    vmag: 4.5,
  },
  {
    satid: 15031,
    vmag: 5.5,
  },
  {
    satid: 15032,
    vmag: 4,
  },
  {
    satid: 15053,
    vmag: 6.5,
  },
  {
    satid: 15054,
    vmag: 5.5,
  },
  {
    satid: 15055,
    vmag: 5.5,
  },
  {
    satid: 15056,
    vmag: 4,
  },
  {
    satid: 15071,
    vmag: 5.5,
  },
  {
    satid: 15076,
    vmag: 6,
  },
  {
    satid: 15077,
    vmag: 5.5,
  },
  {
    satid: 15078,
    vmag: 4.5,
  },
  {
    satid: 15080,
    vmag: 5.5,
  },
  {
    satid: 15085,
    vmag: 5,
  },
  {
    satid: 15098,
    vmag: 5,
  },
  {
    satid: 15099,
    vmag: 4.5,
  },
  {
    satid: 15100,
    vmag: 4,
  },
  {
    satid: 15156,
    vmag: 4.5,
  },
  {
    satid: 15166,
    vmag: 4.5,
  },
  {
    satid: 15171,
    vmag: 3.5,
  },
  {
    satid: 15172,
    vmag: 4.5,
  },
  {
    satid: 15188,
    vmag: 4,
  },
  {
    satid: 15202,
    vmag: 4,
  },
  {
    satid: 15206,
    vmag: 4.5,
  },
  {
    satid: 15223,
    vmag: 4.5,
  },
  {
    satid: 15244,
    vmag: 5.5,
  },
  {
    satid: 15245,
    vmag: 5.5,
  },
  {
    satid: 15246,
    vmag: 6,
  },
  {
    satid: 15266,
    vmag: 6,
  },
  {
    satid: 15270,
    vmag: 4.5,
  },
  {
    satid: 15272,
    vmag: 5.5,
  },
  {
    satid: 15292,
    vmag: 6,
  },
  {
    satid: 15293,
    vmag: 4,
  },
  {
    satid: 15331,
    vmag: 4.5,
  },
  {
    satid: 15332,
    vmag: 4,
  },
  {
    satid: 15333,
    vmag: 3.5,
  },
  {
    satid: 15334,
    vmag: 4.5,
  },
  {
    satid: 15335,
    vmag: 7,
  },
  {
    satid: 15338,
    vmag: 6,
  },
  {
    satid: 15354,
    vmag: 3.5,
  },
  {
    satid: 15355,
    vmag: 4,
  },
  {
    satid: 15359,
    vmag: 5.5,
  },
  {
    satid: 15360,
    vmag: 3.5,
  },
  {
    satid: 15362,
    vmag: 6.5,
  },
  {
    satid: 15369,
    vmag: 3.5,
  },
  {
    satid: 15370,
    vmag: 4,
  },
  {
    satid: 15378,
    vmag: 3.5,
  },
  {
    satid: 15385,
    vmag: 4,
  },
  {
    satid: 15387,
    vmag: 5.5,
  },
  {
    satid: 15388,
    vmag: 3,
  },
  {
    satid: 15390,
    vmag: 5,
  },
  {
    satid: 15392,
    vmag: 3.5,
  },
  {
    satid: 15398,
    vmag: 5.5,
  },
  {
    satid: 15399,
    vmag: 4,
  },
  {
    satid: 15402,
    vmag: 6,
  },
  {
    satid: 15423,
    vmag: 3,
  },
  {
    satid: 15427,
    vmag: 4.5,
  },
  {
    satid: 15429,
    vmag: 4,
  },
  {
    satid: 15439,
    vmag: 4,
  },
  {
    satid: 15471,
    vmag: 6.3,
  },
  {
    satid: 15475,
    vmag: 4,
  },
  {
    satid: 15482,
    vmag: 5.5,
  },
  {
    satid: 15483,
    vmag: 4,
  },
  {
    satid: 15494,
    vmag: 3,
  },
  {
    satid: 15495,
    vmag: 4,
  },
  {
    satid: 15505,
    vmag: 5,
  },
  {
    satid: 15506,
    vmag: 4,
  },
  {
    satid: 15516,
    vmag: 4.5,
  },
  {
    satid: 15517,
    vmag: 4,
  },
  {
    satid: 15562,
    vmag: 2.5,
  },
  {
    satid: 15592,
    vmag: 3.5,
  },
  {
    satid: 15593,
    vmag: 3.5,
  },
  {
    satid: 15595,
    vmag: 4,
  },
  {
    satid: 15596,
    vmag: 5.5,
  },
  {
    satid: 15597,
    vmag: 5.5,
  },
  {
    satid: 15598,
    vmag: 3.5,
  },
  {
    satid: 15625,
    vmag: 3.5,
  },
  {
    satid: 15629,
    vmag: 5,
  },
  {
    satid: 15644,
    vmag: 5.5,
  },
  {
    satid: 15677,
    vmag: 5,
  },
  {
    satid: 15679,
    vmag: 3,
  },
  {
    satid: 15680,
    vmag: 4,
  },
  {
    satid: 15698,
    vmag: 5.5,
  },
  {
    satid: 15714,
    vmag: 6,
  },
  {
    satid: 15715,
    vmag: 6.5,
  },
  {
    satid: 15738,
    vmag: 4.5,
  },
  {
    satid: 15741,
    vmag: 5,
  },
  {
    satid: 15751,
    vmag: 6.5,
  },
  {
    satid: 15752,
    vmag: 3.5,
  },
  {
    satid: 15755,
    vmag: 3.5,
  },
  {
    satid: 15772,
    vmag: 3.5,
  },
  {
    satid: 15773,
    vmag: 7.5,
  },
  {
    satid: 15774,
    vmag: 6.5,
  },
  {
    satid: 15808,
    vmag: 5,
  },
  {
    satid: 15811,
    vmag: 4,
  },
  {
    satid: 15821,
    vmag: 3.5,
  },
  {
    satid: 15822,
    vmag: 4.5,
  },
  {
    satid: 15830,
    vmag: 5,
  },
  {
    satid: 15832,
    vmag: 6.5,
  },
  {
    satid: 15836,
    vmag: 6,
  },
  {
    satid: 15837,
    vmag: 6,
  },
  {
    satid: 15874,
    vmag: 3,
  },
  {
    satid: 15889,
    vmag: 3.5,
  },
  {
    satid: 15890,
    vmag: 4,
  },
  {
    satid: 15909,
    vmag: 4.5,
  },
  {
    satid: 15916,
    vmag: 4,
  },
  {
    satid: 15930,
    vmag: 4.5,
  },
  {
    satid: 15935,
    vmag: 7.5,
  },
  {
    satid: 15936,
    vmag: 7.5,
  },
  {
    satid: 15938,
    vmag: 8.5,
  },
  {
    satid: 15944,
    vmag: 3.5,
  },
  {
    satid: 15945,
    vmag: 4,
  },
  {
    satid: 15952,
    vmag: 4,
  },
  {
    satid: 15955,
    vmag: 5,
  },
  {
    satid: 15977,
    vmag: 5,
  },
  {
    satid: 15983,
    vmag: 3.5,
  },
  {
    satid: 15986,
    vmag: 5,
  },
  {
    satid: 15994,
    vmag: 5.5,
  },
  {
    satid: 15996,
    vmag: 5.5,
  },
  {
    satid: 16001,
    vmag: 4,
  },
  {
    satid: 16007,
    vmag: 5.5,
  },
  {
    satid: 16011,
    vmag: 5.5,
  },
  {
    satid: 16012,
    vmag: 3.5,
  },
  {
    satid: 16101,
    vmag: 4,
  },
  {
    satid: 16102,
    vmag: 3.5,
  },
  {
    satid: 16103,
    vmag: 4.5,
  },
  {
    satid: 16106,
    vmag: 4.5,
  },
  {
    satid: 16110,
    vmag: 5,
  },
  {
    satid: 16111,
    vmag: 3.5,
  },
  {
    satid: 16118,
    vmag: 3.5,
  },
  {
    satid: 16119,
    vmag: 5,
  },
  {
    satid: 16125,
    vmag: 4.5,
  },
  {
    satid: 16137,
    vmag: 6.5,
  },
  {
    satid: 16138,
    vmag: 7,
  },
  {
    satid: 16139,
    vmag: 7.5,
  },
  {
    satid: 16144,
    vmag: 4,
  },
  {
    satid: 16181,
    vmag: 5.5,
  },
  {
    satid: 16182,
    vmag: 2.5,
  },
  {
    satid: 16186,
    vmag: 4.5,
  },
  {
    satid: 16187,
    vmag: 3.5,
  },
  {
    satid: 16191,
    vmag: 5,
  },
  {
    satid: 16194,
    vmag: 4.5,
  },
  {
    satid: 16197,
    vmag: 5.5,
  },
  {
    satid: 16209,
    vmag: 5.5,
  },
  {
    satid: 16220,
    vmag: 4.5,
  },
  {
    satid: 16223,
    vmag: 4,
  },
  {
    satid: 16229,
    vmag: 4.5,
  },
  {
    satid: 16243,
    vmag: 5,
  },
  {
    satid: 16262,
    vmag: 4,
  },
  {
    satid: 16263,
    vmag: 4,
  },
  {
    satid: 16291,
    vmag: 6,
  },
  {
    satid: 16292,
    vmag: 4.5,
  },
  {
    satid: 16293,
    vmag: 6,
  },
  {
    satid: 16294,
    vmag: 6,
  },
  {
    satid: 16295,
    vmag: 4.5,
  },
  {
    satid: 16326,
    vmag: 3.5,
  },
  {
    satid: 16327,
    vmag: 4,
  },
  {
    satid: 16368,
    vmag: 5.5,
  },
  {
    satid: 16369,
    vmag: 3.5,
  },
  {
    satid: 16393,
    vmag: 4.5,
  },
  {
    satid: 16402,
    vmag: 5,
  },
  {
    satid: 16408,
    vmag: 4.5,
  },
  {
    satid: 16409,
    vmag: 4,
  },
  {
    satid: 16445,
    vmag: 6.5,
  },
  {
    satid: 16446,
    vmag: 7.5,
  },
  {
    satid: 16457,
    vmag: 6,
  },
  {
    satid: 16483,
    vmag: 5,
  },
  {
    satid: 16493,
    vmag: 5.5,
  },
  {
    satid: 16494,
    vmag: 3.5,
  },
  {
    satid: 16495,
    vmag: 3,
  },
  {
    satid: 16496,
    vmag: 4,
  },
  {
    satid: 16510,
    vmag: 6,
  },
  {
    satid: 16511,
    vmag: 3.5,
  },
  {
    satid: 16528,
    vmag: 3.5,
  },
  {
    satid: 16591,
    vmag: 6,
  },
  {
    satid: 16592,
    vmag: 5.5,
  },
  {
    satid: 16593,
    vmag: 4.5,
  },
  {
    satid: 16594,
    vmag: 4.5,
  },
  {
    satid: 16600,
    vmag: 5.5,
  },
  {
    satid: 16609,
    vmag: 1,
  },
  {
    satid: 16611,
    vmag: 4,
  },
  {
    satid: 16612,
    vmag: 3.5,
  },
  {
    satid: 16613,
    vmag: 4.5,
  },
  {
    satid: 16614,
    vmag: 6,
  },
  {
    satid: 16615,
    vmag: 3.5,
  },
  {
    satid: 16623,
    vmag: 8.5,
  },
  {
    satid: 16624,
    vmag: 5.5,
  },
  {
    satid: 16625,
    vmag: 5.5,
  },
  {
    satid: 16631,
    vmag: 5.5,
  },
  {
    satid: 16647,
    vmag: 5.5,
  },
  {
    satid: 16657,
    vmag: 2.5,
  },
  {
    satid: 16681,
    vmag: 5.5,
  },
  {
    satid: 16682,
    vmag: 4,
  },
  {
    satid: 16686,
    vmag: 5,
  },
  {
    satid: 16719,
    vmag: 3.5,
  },
  {
    satid: 16720,
    vmag: 4,
  },
  {
    satid: 16727,
    vmag: 5.5,
  },
  {
    satid: 16728,
    vmag: 3.5,
  },
  {
    satid: 16735,
    vmag: 4.5,
  },
  {
    satid: 16736,
    vmag: 4,
  },
  {
    satid: 16764,
    vmag: 7.5,
  },
  {
    satid: 16766,
    vmag: 5.5,
  },
  {
    satid: 16791,
    vmag: 4,
  },
  {
    satid: 16792,
    vmag: 4,
  },
  {
    satid: 16798,
    vmag: 5.5,
  },
  {
    satid: 16799,
    vmag: 5,
  },
  {
    satid: 16802,
    vmag: 3.5,
  },
  {
    satid: 16849,
    vmag: 4.5,
  },
  {
    satid: 16854,
    vmag: 4.5,
  },
  {
    satid: 16860,
    vmag: 5.5,
  },
  {
    satid: 16864,
    vmag: 3.5,
  },
  {
    satid: 16865,
    vmag: 5,
  },
  {
    satid: 16866,
    vmag: 5,
  },
  {
    satid: 16881,
    vmag: 4,
  },
  {
    satid: 16882,
    vmag: 4,
  },
  {
    satid: 16908,
    vmag: 3.5,
  },
  {
    satid: 16910,
    vmag: 3.5,
  },
  {
    satid: 16917,
    vmag: 5,
  },
  {
    satid: 16925,
    vmag: 4.5,
  },
  {
    satid: 16934,
    vmag: 5,
  },
  {
    satid: 16939,
    vmag: 4.5,
  },
  {
    satid: 16952,
    vmag: 5,
  },
  {
    satid: 16953,
    vmag: 4,
  },
  {
    satid: 16969,
    vmag: 6,
  },
  {
    satid: 16986,
    vmag: 3.5,
  },
  {
    satid: 16987,
    vmag: 4,
  },
  {
    satid: 16993,
    vmag: 4.5,
  },
  {
    satid: 16996,
    vmag: 5,
  },
  {
    satid: 17037,
    vmag: 4,
  },
  {
    satid: 17038,
    vmag: 4,
  },
  {
    satid: 17066,
    vmag: 6,
  },
  {
    satid: 17067,
    vmag: 4.5,
  },
  {
    satid: 17070,
    vmag: 7,
  },
  {
    satid: 17071,
    vmag: 7.5,
  },
  {
    satid: 17081,
    vmag: 4,
  },
  {
    satid: 17083,
    vmag: 5,
  },
  {
    satid: 17122,
    vmag: 5.5,
  },
  {
    satid: 17123,
    vmag: 4,
  },
  {
    satid: 17129,
    vmag: 5.5,
  },
  {
    satid: 17130,
    vmag: 4.5,
  },
  {
    satid: 17131,
    vmag: 4,
  },
  {
    satid: 17134,
    vmag: 4.5,
  },
  {
    satid: 17146,
    vmag: 5.5,
  },
  {
    satid: 17147,
    vmag: 4.5,
  },
  {
    satid: 17159,
    vmag: 4.5,
  },
  {
    satid: 17160,
    vmag: 3.5,
  },
  {
    satid: 17177,
    vmag: 3,
  },
  {
    satid: 17178,
    vmag: 4.5,
  },
  {
    satid: 17191,
    vmag: 4,
  },
  {
    satid: 17192,
    vmag: 4,
  },
  {
    satid: 17216,
    vmag: 4,
  },
  {
    satid: 17239,
    vmag: 5,
  },
  {
    satid: 17240,
    vmag: 4,
  },
  {
    satid: 17241,
    vmag: 4.5,
  },
  {
    satid: 17242,
    vmag: 4,
  },
  {
    satid: 17264,
    vmag: 4.5,
  },
  {
    satid: 17267,
    vmag: 4.5,
  },
  {
    satid: 17290,
    vmag: 4,
  },
  {
    satid: 17291,
    vmag: 4,
  },
  {
    satid: 17295,
    vmag: 3.5,
  },
  {
    satid: 17296,
    vmag: 4,
  },
  {
    satid: 17303,
    vmag: 5.5,
  },
  {
    satid: 17304,
    vmag: 4,
  },
  {
    satid: 17325,
    vmag: 3.5,
  },
  {
    satid: 17328,
    vmag: 4.5,
  },
  {
    satid: 17333,
    vmag: 4.5,
  },
  {
    satid: 17358,
    vmag: 3.5,
  },
  {
    satid: 17359,
    vmag: 5.5,
  },
  {
    satid: 17360,
    vmag: 4,
  },
  {
    satid: 17369,
    vmag: 3.5,
  },
  {
    satid: 17425,
    vmag: 6,
  },
  {
    satid: 17480,
    vmag: 6,
  },
  {
    satid: 17481,
    vmag: 5,
  },
  {
    satid: 17525,
    vmag: 4.5,
  },
  {
    satid: 17526,
    vmag: 3.5,
  },
  {
    satid: 17527,
    vmag: 4,
  },
  {
    satid: 17528,
    vmag: 3.5,
  },
  {
    satid: 17535,
    vmag: 3.5,
  },
  {
    satid: 17536,
    vmag: 4,
  },
  {
    satid: 17562,
    vmag: 4.5,
  },
  {
    satid: 17563,
    vmag: 5,
  },
  {
    satid: 17566,
    vmag: 3,
  },
  {
    satid: 17567,
    vmag: 4,
  },
  {
    satid: 17583,
    vmag: 6.5,
  },
  {
    satid: 17585,
    vmag: 6.3,
  },
  {
    satid: 17588,
    vmag: 4.5,
  },
  {
    satid: 17589,
    vmag: 4,
  },
  {
    satid: 17590,
    vmag: 2.5,
  },
  {
    satid: 17911,
    vmag: 4,
  },
  {
    satid: 17912,
    vmag: 4,
  },
  {
    satid: 17969,
    vmag: 4,
  },
  {
    satid: 17973,
    vmag: 3.5,
  },
  {
    satid: 17974,
    vmag: 2.5,
  },
  {
    satid: 17997,
    vmag: 5.5,
  },
  {
    satid: 17998,
    vmag: 6.5,
  },
  {
    satid: 18009,
    vmag: 5.5,
  },
  {
    satid: 18010,
    vmag: 5.5,
  },
  {
    satid: 18025,
    vmag: 5.5,
  },
  {
    satid: 18086,
    vmag: 4.5,
  },
  {
    satid: 18095,
    vmag: 5.5,
  },
  {
    satid: 18096,
    vmag: 4,
  },
  {
    satid: 18106,
    vmag: 5,
  },
  {
    satid: 18121,
    vmag: 5.5,
  },
  {
    satid: 18122,
    vmag: 4.5,
  },
  {
    satid: 18123,
    vmag: 5,
  },
  {
    satid: 18129,
    vmag: 5.5,
  },
  {
    satid: 18130,
    vmag: 4,
  },
  {
    satid: 18152,
    vmag: 4,
  },
  {
    satid: 18153,
    vmag: 4,
  },
  {
    satid: 18160,
    vmag: 4.5,
  },
  {
    satid: 18161,
    vmag: 4,
  },
  {
    satid: 18187,
    vmag: 3.5,
  },
  {
    satid: 18214,
    vmag: 4,
  },
  {
    satid: 18215,
    vmag: 4,
  },
  {
    satid: 18312,
    vmag: 4.5,
  },
  {
    satid: 18313,
    vmag: 4,
  },
  {
    satid: 18332,
    vmag: 6,
  },
  {
    satid: 18335,
    vmag: 6.5,
  },
  {
    satid: 18336,
    vmag: 6.5,
  },
  {
    satid: 18337,
    vmag: 7,
  },
  {
    satid: 18338,
    vmag: 6.5,
  },
  {
    satid: 18340,
    vmag: 4.5,
  },
  {
    satid: 18351,
    vmag: 2,
  },
  {
    satid: 18361,
    vmag: 7.5,
  },
  {
    satid: 18362,
    vmag: 6.5,
  },
  {
    satid: 18363,
    vmag: 8,
  },
  {
    satid: 18374,
    vmag: 6,
  },
  {
    satid: 18402,
    vmag: 5.5,
  },
  {
    satid: 18403,
    vmag: 4,
  },
  {
    satid: 18421,
    vmag: 3.5,
  },
  {
    satid: 18422,
    vmag: 4,
  },
  {
    satid: 18570,
    vmag: 5,
  },
  {
    satid: 18571,
    vmag: 3,
  },
  {
    satid: 18583,
    vmag: 4,
  },
  {
    satid: 18585,
    vmag: 5,
  },
  {
    satid: 18586,
    vmag: 3.5,
  },
  {
    satid: 18665,
    vmag: 4.5,
  },
  {
    satid: 18704,
    vmag: 4.5,
  },
  {
    satid: 18709,
    vmag: 5.5,
  },
  {
    satid: 18710,
    vmag: 4,
  },
  {
    satid: 18719,
    vmag: 6,
  },
  {
    satid: 18748,
    vmag: 4,
  },
  {
    satid: 18749,
    vmag: 4,
  },
  {
    satid: 18765,
    vmag: 8,
  },
  {
    satid: 18788,
    vmag: 7.5,
  },
  {
    satid: 18790,
    vmag: 7,
  },
  {
    satid: 18791,
    vmag: 7.5,
  },
  {
    satid: 18793,
    vmag: 7.5,
  },
  {
    satid: 18794,
    vmag: 4.5,
  },
  {
    satid: 18820,
    vmag: 5,
  },
  {
    satid: 18821,
    vmag: 4,
  },
  {
    satid: 18822,
    vmag: 5,
  },
  {
    satid: 18879,
    vmag: 5,
  },
  {
    satid: 18883,
    vmag: 4.5,
  },
  {
    satid: 18945,
    vmag: 6,
  },
  {
    satid: 18946,
    vmag: 5,
  },
  {
    satid: 18949,
    vmag: 5,
  },
  {
    satid: 18951,
    vmag: 4,
  },
  {
    satid: 18953,
    vmag: 4,
  },
  {
    satid: 18957,
    vmag: 4,
  },
  {
    satid: 18958,
    vmag: 4,
  },
  {
    satid: 18959,
    vmag: 4,
  },
  {
    satid: 18960,
    vmag: 4.5,
  },
  {
    satid: 18961,
    vmag: 4,
  },
  {
    satid: 18980,
    vmag: 4.5,
  },
  {
    satid: 18983,
    vmag: 4.5,
  },
  {
    satid: 18984,
    vmag: 7,
  },
  {
    satid: 18985,
    vmag: 6,
  },
  {
    satid: 18986,
    vmag: 3.5,
  },
  {
    satid: 19017,
    vmag: 4,
  },
  {
    satid: 19038,
    vmag: 5,
  },
  {
    satid: 19039,
    vmag: 3.5,
  },
  {
    satid: 19045,
    vmag: 4,
  },
  {
    satid: 19046,
    vmag: 3.5,
  },
  {
    satid: 19070,
    vmag: 7.5,
  },
  {
    satid: 19071,
    vmag: 7.5,
  },
  {
    satid: 19072,
    vmag: 8,
  },
  {
    satid: 19119,
    vmag: 3,
  },
  {
    satid: 19120,
    vmag: 2,
  },
  {
    satid: 19122,
    vmag: 3.5,
  },
  {
    satid: 19163,
    vmag: 4,
  },
  {
    satid: 19165,
    vmag: 4,
  },
  {
    satid: 19170,
    vmag: 6,
  },
  {
    satid: 19195,
    vmag: 3,
  },
  {
    satid: 19196,
    vmag: 4.5,
  },
  {
    satid: 19210,
    vmag: 3,
  },
  {
    satid: 19211,
    vmag: 4,
  },
  {
    satid: 19217,
    vmag: 5,
  },
  {
    satid: 19219,
    vmag: 4,
  },
  {
    satid: 19220,
    vmag: 3.5,
  },
  {
    satid: 19223,
    vmag: 7,
  },
  {
    satid: 19256,
    vmag: 5.5,
  },
  {
    satid: 19257,
    vmag: 4,
  },
  {
    satid: 19274,
    vmag: 4,
  },
  {
    satid: 19275,
    vmag: 3.5,
  },
  {
    satid: 19324,
    vmag: 5.5,
  },
  {
    satid: 19325,
    vmag: 4,
  },
  {
    satid: 19331,
    vmag: 5,
  },
  {
    satid: 19332,
    vmag: 3.5,
  },
  {
    satid: 19336,
    vmag: 4,
  },
  {
    satid: 19337,
    vmag: 4.5,
  },
  {
    satid: 19348,
    vmag: 6,
  },
  {
    satid: 19377,
    vmag: 4.5,
  },
  {
    satid: 19397,
    vmag: 5,
  },
  {
    satid: 19419,
    vmag: 7,
  },
  {
    satid: 19420,
    vmag: 7.5,
  },
  {
    satid: 19421,
    vmag: 6.5,
  },
  {
    satid: 19445,
    vmag: 4,
  },
  {
    satid: 19448,
    vmag: 4.5,
  },
  {
    satid: 19460,
    vmag: 4,
  },
  {
    satid: 19467,
    vmag: 4.5,
  },
  {
    satid: 19468,
    vmag: 4,
  },
  {
    satid: 19483,
    vmag: 5,
  },
  {
    satid: 19485,
    vmag: 4,
  },
  {
    satid: 19521,
    vmag: 2,
  },
  {
    satid: 19531,
    vmag: 4,
  },
  {
    satid: 19535,
    vmag: 6,
  },
  {
    satid: 19537,
    vmag: 6.5,
  },
  {
    satid: 19544,
    vmag: 4.5,
  },
  {
    satid: 19549,
    vmag: 3.5,
  },
  {
    satid: 19557,
    vmag: 4.5,
  },
  {
    satid: 19573,
    vmag: 3.5,
  },
  {
    satid: 19574,
    vmag: 3.5,
  },
  {
    satid: 19611,
    vmag: 5,
  },
  {
    satid: 19621,
    vmag: 5,
  },
  {
    satid: 19622,
    vmag: 3,
  },
  {
    satid: 19625,
    vmag: 3,
  },
  {
    satid: 19649,
    vmag: 3.5,
  },
  {
    satid: 19650,
    vmag: 2,
  },
  {
    satid: 19670,
    vmag: 1,
  },
  {
    satid: 19671,
    vmag: 2,
  },
  {
    satid: 19688,
    vmag: 2,
  },
  {
    satid: 19689,
    vmag: 3,
  },
  {
    satid: 19716,
    vmag: 4.5,
  },
  {
    satid: 19720,
    vmag: 4.5,
  },
  {
    satid: 19733,
    vmag: 4.5,
  },
  {
    satid: 19750,
    vmag: 5.5,
  },
  {
    satid: 19751,
    vmag: 5.5,
  },
  {
    satid: 19755,
    vmag: 6.5,
  },
  {
    satid: 19764,
    vmag: 3.5,
  },
  {
    satid: 19765,
    vmag: 5,
  },
  {
    satid: 19769,
    vmag: 5.5,
  },
  {
    satid: 19770,
    vmag: 4,
  },
  {
    satid: 19773,
    vmag: 2.5,
  },
  {
    satid: 19785,
    vmag: 7,
  },
  {
    satid: 19786,
    vmag: 6.5,
  },
  {
    satid: 19788,
    vmag: 7,
  },
  {
    satid: 19791,
    vmag: 4,
  },
  {
    satid: 19799,
    vmag: 4.5,
  },
  {
    satid: 19810,
    vmag: 4.5,
  },
  {
    satid: 19822,
    vmag: 6,
  },
  {
    satid: 19824,
    vmag: 7,
  },
  {
    satid: 19826,
    vmag: 5.5,
  },
  {
    satid: 19827,
    vmag: 4,
  },
  {
    satid: 19851,
    vmag: 4.5,
  },
  {
    satid: 19852,
    vmag: 4.5,
  },
  {
    satid: 19856,
    vmag: 6,
  },
  {
    satid: 19874,
    vmag: 5,
  },
  {
    satid: 19883,
    vmag: 2,
  },
  {
    satid: 19884,
    vmag: 3,
  },
  {
    satid: 19909,
    vmag: 8,
  },
  {
    satid: 19910,
    vmag: 5.5,
  },
  {
    satid: 19911,
    vmag: 3,
  },
  {
    satid: 19919,
    vmag: 2,
  },
  {
    satid: 19920,
    vmag: 4,
  },
  {
    satid: 19921,
    vmag: 5.5,
  },
  {
    satid: 19922,
    vmag: 3.5,
  },
  {
    satid: 19970,
    vmag: 3,
  },
  {
    satid: 20006,
    vmag: 3,
  },
  {
    satid: 20026,
    vmag: 5.5,
  },
  {
    satid: 20040,
    vmag: 5,
  },
  {
    satid: 20045,
    vmag: 5.5,
  },
  {
    satid: 20046,
    vmag: 3.5,
  },
  {
    satid: 20052,
    vmag: 3.5,
  },
  {
    satid: 20061,
    vmag: 3.5,
  },
  {
    satid: 20064,
    vmag: 5.5,
  },
  {
    satid: 20065,
    vmag: 4,
  },
  {
    satid: 20066,
    vmag: 5,
  },
  {
    satid: 20081,
    vmag: 7,
  },
  {
    satid: 20082,
    vmag: 7,
  },
  {
    satid: 20094,
    vmag: 6,
  },
  {
    satid: 20103,
    vmag: 5.5,
  },
  {
    satid: 20104,
    vmag: 3.5,
  },
  {
    satid: 20122,
    vmag: 5,
  },
  {
    satid: 20127,
    vmag: 4,
  },
  {
    satid: 20132,
    vmag: 4,
  },
  {
    satid: 20147,
    vmag: 3,
  },
  {
    satid: 20149,
    vmag: 5.5,
  },
  {
    satid: 20150,
    vmag: 3.5,
  },
  {
    satid: 20167,
    vmag: 4,
  },
  {
    satid: 20169,
    vmag: 5,
  },
  {
    satid: 20170,
    vmag: 3.5,
  },
  {
    satid: 20196,
    vmag: 3,
  },
  {
    satid: 20197,
    vmag: 4,
  },
  {
    satid: 20229,
    vmag: 3.5,
  },
  {
    satid: 20230,
    vmag: 5,
  },
  {
    satid: 20232,
    vmag: 6.3,
  },
  {
    satid: 20233,
    vmag: 6,
  },
  {
    satid: 20234,
    vmag: 6.3,
  },
  {
    satid: 20235,
    vmag: 6.3,
  },
  {
    satid: 20236,
    vmag: 6.3,
  },
  {
    satid: 20237,
    vmag: 6.3,
  },
  {
    satid: 20238,
    vmag: 4,
  },
  {
    satid: 20255,
    vmag: 4,
  },
  {
    satid: 20258,
    vmag: 4,
  },
  {
    satid: 20259,
    vmag: 3,
  },
  {
    satid: 20261,
    vmag: 4.5,
  },
  {
    satid: 20262,
    vmag: 5,
  },
  {
    satid: 20281,
    vmag: 7.5,
  },
  {
    satid: 20299,
    vmag: 3,
  },
  {
    satid: 20303,
    vmag: 3.5,
  },
  {
    satid: 20304,
    vmag: 5,
  },
  {
    satid: 20305,
    vmag: 4.5,
  },
  {
    satid: 20306,
    vmag: 4,
  },
  {
    satid: 20316,
    vmag: 3.5,
  },
  {
    satid: 20322,
    vmag: 4.5,
  },
  {
    satid: 20323,
    vmag: 4,
  },
  {
    satid: 20329,
    vmag: 0.1,
  },
  {
    satid: 20330,
    vmag: 4,
  },
  {
    satid: 20333,
    vmag: 3.5,
  },
  {
    satid: 20338,
    vmag: 4,
  },
  {
    satid: 20339,
    vmag: 3.5,
  },
  {
    satid: 20344,
    vmag: 5,
  },
  {
    satid: 20352,
    vmag: 3.5,
  },
  {
    satid: 20357,
    vmag: 5,
  },
  {
    satid: 20362,
    vmag: 4,
  },
  {
    satid: 20389,
    vmag: 4.5,
  },
  {
    satid: 20390,
    vmag: 4,
  },
  {
    satid: 20404,
    vmag: 4.5,
  },
  {
    satid: 20406,
    vmag: 4.5,
  },
  {
    satid: 20409,
    vmag: 1,
  },
  {
    satid: 20411,
    vmag: 4,
  },
  {
    satid: 20413,
    vmag: 4,
  },
  {
    satid: 20432,
    vmag: 5.5,
  },
  {
    satid: 20433,
    vmag: 3.5,
  },
  {
    satid: 20436,
    vmag: 4.5,
  },
  {
    satid: 20438,
    vmag: 8.5,
  },
  {
    satid: 20443,
    vmag: 3.5,
  },
  {
    satid: 20444,
    vmag: 4.5,
  },
  {
    satid: 20446,
    vmag: 4,
  },
  {
    satid: 20447,
    vmag: 5,
  },
  {
    satid: 20453,
    vmag: 4,
  },
  {
    satid: 20465,
    vmag: 3.5,
  },
  {
    satid: 20466,
    vmag: 3.5,
  },
  {
    satid: 20474,
    vmag: 3,
  },
  {
    satid: 20478,
    vmag: 4,
  },
  {
    satid: 20479,
    vmag: 6.5,
  },
  {
    satid: 20480,
    vmag: 6.5,
  },
  {
    satid: 20488,
    vmag: 4.5,
  },
  {
    satid: 20491,
    vmag: 3.5,
  },
  {
    satid: 20496,
    vmag: 5.5,
  },
  {
    satid: 20497,
    vmag: 4.5,
  },
  {
    satid: 20498,
    vmag: 4.5,
  },
  {
    satid: 20508,
    vmag: 5,
  },
  {
    satid: 20509,
    vmag: 4,
  },
  {
    satid: 20510,
    vmag: 4,
  },
  {
    satid: 20511,
    vmag: 3.5,
  },
  {
    satid: 20523,
    vmag: 4.5,
  },
  {
    satid: 20525,
    vmag: 2.5,
  },
  {
    satid: 20527,
    vmag: 5.5,
  },
  {
    satid: 20528,
    vmag: 3.5,
  },
  {
    satid: 20541,
    vmag: 6,
  },
  {
    satid: 20546,
    vmag: 5.5,
  },
  {
    satid: 20547,
    vmag: 8.5,
  },
  {
    satid: 20557,
    vmag: 5.5,
  },
  {
    satid: 20559,
    vmag: 2,
  },
  {
    satid: 20563,
    vmag: 6,
  },
  {
    satid: 20566,
    vmag: 5.5,
  },
  {
    satid: 20571,
    vmag: 3.5,
  },
  {
    satid: 20577,
    vmag: 5.5,
  },
  {
    satid: 20578,
    vmag: 3.5,
  },
  {
    satid: 20579,
    vmag: 1.5,
  },
  {
    satid: 20580,
    vmag: 1.5,
  },
  {
    satid: 20582,
    vmag: 3.5,
  },
  {
    satid: 20583,
    vmag: 4.5,
  },
  {
    satid: 20584,
    vmag: 2.5,
  },
  {
    satid: 20599,
    vmag: 4.5,
  },
  {
    satid: 20607,
    vmag: 8,
  },
  {
    satid: 20608,
    vmag: 7.5,
  },
  {
    satid: 20609,
    vmag: 7.5,
  },
  {
    satid: 20624,
    vmag: 3.5,
  },
  {
    satid: 20625,
    vmag: 2,
  },
  {
    satid: 20630,
    vmag: 6.5,
  },
  {
    satid: 20631,
    vmag: 6.5,
  },
  {
    satid: 20632,
    vmag: 3.5,
  },
  {
    satid: 20638,
    vmag: 4.5,
  },
  {
    satid: 20639,
    vmag: 4.5,
  },
  {
    satid: 20641,
    vmag: 5,
  },
  {
    satid: 20642,
    vmag: 4,
  },
  {
    satid: 20646,
    vmag: 4.5,
  },
  {
    satid: 20649,
    vmag: 4.5,
  },
  {
    satid: 20663,
    vmag: 4,
  },
  {
    satid: 20666,
    vmag: 4,
  },
  {
    satid: 20667,
    vmag: 4,
  },
  {
    satid: 20669,
    vmag: 3,
  },
  {
    satid: 20670,
    vmag: 5,
  },
  {
    satid: 20671,
    vmag: 4,
  },
  {
    satid: 20674,
    vmag: 5.5,
  },
  {
    satid: 20682,
    vmag: 0.5,
  },
  {
    satid: 20683,
    vmag: 2.5,
  },
  {
    satid: 20686,
    vmag: 2,
  },
  {
    satid: 20687,
    vmag: 2,
  },
  {
    satid: 20691,
    vmag: 4,
  },
  {
    satid: 20692,
    vmag: 4,
  },
  {
    satid: 20698,
    vmag: 6,
  },
  {
    satid: 20705,
    vmag: 3,
  },
  {
    satid: 20707,
    vmag: 5,
  },
  {
    satid: 20708,
    vmag: 2.5,
  },
  {
    satid: 20710,
    vmag: 4.5,
  },
  {
    satid: 20712,
    vmag: 5,
  },
  {
    satid: 20713,
    vmag: 3.5,
  },
  {
    satid: 20717,
    vmag: 3,
  },
  {
    satid: 20718,
    vmag: 3,
  },
  {
    satid: 20720,
    vmag: 3.5,
  },
  {
    satid: 20721,
    vmag: 3.5,
  },
  {
    satid: 20725,
    vmag: 4.5,
  },
  {
    satid: 20735,
    vmag: 7,
  },
  {
    satid: 20737,
    vmag: 6,
  },
  {
    satid: 20738,
    vmag: 7,
  },
  {
    satid: 20740,
    vmag: 7,
  },
  {
    satid: 20741,
    vmag: 4,
  },
  {
    satid: 20742,
    vmag: 4.5,
  },
  {
    satid: 20745,
    vmag: 5,
  },
  {
    satid: 20763,
    vmag: 4,
  },
  {
    satid: 20764,
    vmag: 5,
  },
  {
    satid: 20765,
    vmag: 3,
  },
  {
    satid: 20771,
    vmag: 3,
  },
  {
    satid: 20774,
    vmag: 5.5,
  },
  {
    satid: 20775,
    vmag: 3.5,
  },
  {
    satid: 20777,
    vmag: 5,
  },
  {
    satid: 20788,
    vmag: 4.5,
  },
  {
    satid: 20789,
    vmag: 4.5,
  },
  {
    satid: 20790,
    vmag: 4.5,
  },
  {
    satid: 20791,
    vmag: 5,
  },
  {
    satid: 20793,
    vmag: 8,
  },
  {
    satid: 20804,
    vmag: 5.5,
  },
  {
    satid: 20805,
    vmag: 3.5,
  },
  {
    satid: 20816,
    vmag: 4.5,
  },
  {
    satid: 20826,
    vmag: 4,
  },
  {
    satid: 20827,
    vmag: 4,
  },
  {
    satid: 20828,
    vmag: 1.5,
  },
  {
    satid: 20843,
    vmag: 3.5,
  },
  {
    satid: 20847,
    vmag: 4,
  },
  {
    satid: 20849,
    vmag: 5.5,
  },
  {
    satid: 20853,
    vmag: 5.5,
  },
  {
    satid: 20855,
    vmag: 4,
  },
  {
    satid: 20861,
    vmag: 7.5,
  },
  {
    satid: 20872,
    vmag: 3.5,
  },
  {
    satid: 20873,
    vmag: 4,
  },
  {
    satid: 20874,
    vmag: 3,
  },
  {
    satid: 20877,
    vmag: 7,
  },
  {
    satid: 20919,
    vmag: 3,
  },
  {
    satid: 20923,
    vmag: 5,
  },
  {
    satid: 20929,
    vmag: 2,
  },
  {
    satid: 20935,
    vmag: 0.5,
  },
  {
    satid: 20941,
    vmag: 4,
  },
  {
    satid: 20944,
    vmag: 4.5,
  },
  {
    satid: 20946,
    vmag: 5,
  },
  {
    satid: 20947,
    vmag: 3.5,
  },
  {
    satid: 20952,
    vmag: 4.5,
  },
  {
    satid: 20960,
    vmag: 3,
  },
  {
    satid: 20966,
    vmag: 4,
  },
  {
    satid: 20967,
    vmag: 3.5,
  },
  {
    satid: 20978,
    vmag: 5,
  },
  {
    satid: 20985,
    vmag: 3,
  },
  {
    satid: 21007,
    vmag: 4,
  },
  {
    satid: 21011,
    vmag: 3,
  },
  {
    satid: 21012,
    vmag: 6.5,
  },
  {
    satid: 21013,
    vmag: 6.5,
  },
  {
    satid: 21014,
    vmag: 5.5,
  },
  {
    satid: 21015,
    vmag: 4,
  },
  {
    satid: 21025,
    vmag: 6.5,
  },
  {
    satid: 21026,
    vmag: 2.5,
  },
  {
    satid: 21028,
    vmag: 6.3,
  },
  {
    satid: 21029,
    vmag: 6.5,
  },
  {
    satid: 21030,
    vmag: 6.3,
  },
  {
    satid: 21031,
    vmag: 6.3,
  },
  {
    satid: 21032,
    vmag: 6.3,
  },
  {
    satid: 21033,
    vmag: 6.3,
  },
  {
    satid: 21034,
    vmag: 4.5,
  },
  {
    satid: 21048,
    vmag: 3.5,
  },
  {
    satid: 21049,
    vmag: 5,
  },
  {
    satid: 21055,
    vmag: 5,
  },
  {
    satid: 21057,
    vmag: 3.5,
  },
  {
    satid: 21065,
    vmag: 3,
  },
  {
    satid: 21087,
    vmag: 5,
  },
  {
    satid: 21088,
    vmag: 3.5,
  },
  {
    satid: 21089,
    vmag: 5,
  },
  {
    satid: 21090,
    vmag: 3.5,
  },
  {
    satid: 21104,
    vmag: 8,
  },
  {
    satid: 21106,
    vmag: 7,
  },
  {
    satid: 21108,
    vmag: 3.5,
  },
  {
    satid: 21109,
    vmag: 5.5,
  },
  {
    satid: 21114,
    vmag: 6,
  },
  {
    satid: 21121,
    vmag: 4,
  },
  {
    satid: 21130,
    vmag: 5,
  },
  {
    satid: 21131,
    vmag: 4.5,
  },
  {
    satid: 21141,
    vmag: 3.5,
  },
  {
    satid: 21147,
    vmag: 2,
  },
  {
    satid: 21148,
    vmag: 2,
  },
  {
    satid: 21149,
    vmag: 3.5,
  },
  {
    satid: 21150,
    vmag: 4,
  },
  {
    satid: 21151,
    vmag: 5.5,
  },
  {
    satid: 21152,
    vmag: 5.5,
  },
  {
    satid: 21153,
    vmag: 3.5,
  },
  {
    satid: 21190,
    vmag: 4.5,
  },
  {
    satid: 21191,
    vmag: 4,
  },
  {
    satid: 21196,
    vmag: 4.5,
  },
  {
    satid: 21199,
    vmag: 4.5,
  },
  {
    satid: 21213,
    vmag: 1.5,
  },
  {
    satid: 21220,
    vmag: 6.5,
  },
  {
    satid: 21223,
    vmag: 3.5,
  },
  {
    satid: 21225,
    vmag: 2,
  },
  {
    satid: 21227,
    vmag: 4,
  },
  {
    satid: 21228,
    vmag: 3.5,
  },
  {
    satid: 21229,
    vmag: 6,
  },
  {
    satid: 21230,
    vmag: 5,
  },
  {
    satid: 21231,
    vmag: 4,
  },
  {
    satid: 21232,
    vmag: 4.5,
  },
  {
    satid: 21233,
    vmag: 4,
  },
  {
    satid: 21263,
    vmag: 4,
  },
  {
    satid: 21299,
    vmag: 6.3,
  },
  {
    satid: 21300,
    vmag: 6.3,
  },
  {
    satid: 21301,
    vmag: 6.5,
  },
  {
    satid: 21302,
    vmag: 6.5,
  },
  {
    satid: 21303,
    vmag: 6.5,
  },
  {
    satid: 21304,
    vmag: 7,
  },
  {
    satid: 21305,
    vmag: 4,
  },
  {
    satid: 21327,
    vmag: 7,
  },
  {
    satid: 21338,
    vmag: 7.5,
  },
  {
    satid: 21393,
    vmag: 3,
  },
  {
    satid: 21394,
    vmag: 6,
  },
  {
    satid: 21397,
    vmag: 4,
  },
  {
    satid: 21398,
    vmag: 4,
  },
  {
    satid: 21418,
    vmag: 5,
  },
  {
    satid: 21419,
    vmag: 4,
  },
  {
    satid: 21422,
    vmag: 3.5,
  },
  {
    satid: 21423,
    vmag: 4,
  },
  {
    satid: 21426,
    vmag: 4.5,
  },
  {
    satid: 21433,
    vmag: 8.5,
  },
  {
    satid: 21527,
    vmag: 9,
  },
  {
    satid: 21528,
    vmag: 8.5,
  },
  {
    satid: 21533,
    vmag: 4,
  },
  {
    satid: 21555,
    vmag: 5,
  },
  {
    satid: 21574,
    vmag: 4.5,
  },
  {
    satid: 21578,
    vmag: 8,
  },
  {
    satid: 21610,
    vmag: 3,
  },
  {
    satid: 21630,
    vmag: 5,
  },
  {
    satid: 21640,
    vmag: 4,
  },
  {
    satid: 21654,
    vmag: 3.5,
  },
  {
    satid: 21655,
    vmag: 4.5,
  },
  {
    satid: 21656,
    vmag: 4,
  },
  {
    satid: 21666,
    vmag: 5.5,
  },
  {
    satid: 21667,
    vmag: 3.5,
  },
  {
    satid: 21668,
    vmag: 4.5,
  },
  {
    satid: 21688,
    vmag: 4.5,
  },
  {
    satid: 21689,
    vmag: 4.5,
  },
  {
    satid: 21694,
    vmag: 6.5,
  },
  {
    satid: 21695,
    vmag: 4,
  },
  {
    satid: 21701,
    vmag: 2,
  },
  {
    satid: 21706,
    vmag: 4,
  },
  {
    satid: 21709,
    vmag: 4.5,
  },
  {
    satid: 21713,
    vmag: 3,
  },
  {
    satid: 21726,
    vmag: 2.5,
  },
  {
    satid: 21727,
    vmag: 2.5,
  },
  {
    satid: 21728,
    vmag: 6.3,
  },
  {
    satid: 21729,
    vmag: 6.3,
  },
  {
    satid: 21730,
    vmag: 6.5,
  },
  {
    satid: 21731,
    vmag: 6.3,
  },
  {
    satid: 21732,
    vmag: 6.3,
  },
  {
    satid: 21733,
    vmag: 6.3,
  },
  {
    satid: 21734,
    vmag: 3.5,
  },
  {
    satid: 21744,
    vmag: 4,
  },
  {
    satid: 21753,
    vmag: 7.5,
  },
  {
    satid: 21759,
    vmag: 5.5,
  },
  {
    satid: 21766,
    vmag: 3,
  },
  {
    satid: 21775,
    vmag: 4.5,
  },
  {
    satid: 21776,
    vmag: 2,
  },
  {
    satid: 21779,
    vmag: 6.5,
  },
  {
    satid: 21780,
    vmag: 7,
  },
  {
    satid: 21782,
    vmag: 7.5,
  },
  {
    satid: 21783,
    vmag: 6.5,
  },
  {
    satid: 21784,
    vmag: 6.5,
  },
  {
    satid: 21785,
    vmag: 4.5,
  },
  {
    satid: 21789,
    vmag: 5,
  },
  {
    satid: 21795,
    vmag: 1,
  },
  {
    satid: 21796,
    vmag: 4.5,
  },
  {
    satid: 21797,
    vmag: 3.5,
  },
  {
    satid: 21798,
    vmag: 5,
  },
  {
    satid: 21799,
    vmag: 4,
  },
  {
    satid: 21804,
    vmag: 3,
  },
  {
    satid: 21805,
    vmag: 6,
  },
  {
    satid: 21806,
    vmag: 3.5,
  },
  {
    satid: 21808,
    vmag: 4,
  },
  {
    satid: 21809,
    vmag: 4,
  },
  {
    satid: 21813,
    vmag: 5,
  },
  {
    satid: 21815,
    vmag: 3.5,
  },
  {
    satid: 21818,
    vmag: 4.5,
  },
  {
    satid: 21819,
    vmag: 4,
  },
  {
    satid: 21820,
    vmag: 4,
  },
  {
    satid: 21829,
    vmag: 6.5,
  },
  {
    satid: 21833,
    vmag: 6,
  },
  {
    satid: 21834,
    vmag: 2.5,
  },
  {
    satid: 21835,
    vmag: 8,
  },
  {
    satid: 21836,
    vmag: 7.5,
  },
  {
    satid: 21846,
    vmag: 0.1,
  },
  {
    satid: 21850,
    vmag: 4.5,
  },
  {
    satid: 21875,
    vmag: 5,
  },
  {
    satid: 21876,
    vmag: 4,
  },
  {
    satid: 21890,
    vmag: 5,
  },
  {
    satid: 21891,
    vmag: 3.5,
  },
  {
    satid: 21892,
    vmag: 5,
  },
  {
    satid: 21893,
    vmag: 5,
  },
  {
    satid: 21895,
    vmag: 3.5,
  },
  {
    satid: 21902,
    vmag: 5.5,
  },
  {
    satid: 21903,
    vmag: 3.5,
  },
  {
    satid: 21906,
    vmag: 4,
  },
  {
    satid: 21907,
    vmag: 2,
  },
  {
    satid: 21925,
    vmag: 5,
  },
  {
    satid: 21928,
    vmag: 3,
  },
  {
    satid: 21931,
    vmag: 3.5,
  },
  {
    satid: 21932,
    vmag: 5.5,
  },
  {
    satid: 21935,
    vmag: 6,
  },
  {
    satid: 21937,
    vmag: 4.5,
  },
  {
    satid: 21938,
    vmag: 3.5,
  },
  {
    satid: 21941,
    vmag: 3,
  },
  {
    satid: 21942,
    vmag: 4,
  },
  {
    satid: 21949,
    vmag: 4,
  },
  {
    satid: 21965,
    vmag: 3.5,
  },
  {
    satid: 21966,
    vmag: 5.5,
  },
  {
    satid: 21968,
    vmag: 6.5,
  },
  {
    satid: 21973,
    vmag: 4.5,
  },
  {
    satid: 21976,
    vmag: 7.5,
  },
  {
    satid: 21977,
    vmag: 7.5,
  },
  {
    satid: 21980,
    vmag: 7.5,
  },
  {
    satid: 21981,
    vmag: 7.5,
  },
  {
    satid: 21983,
    vmag: 7.5,
  },
  {
    satid: 21984,
    vmag: 4,
  },
  {
    satid: 21987,
    vmag: 4,
  },
  {
    satid: 21988,
    vmag: 4,
  },
  {
    satid: 21990,
    vmag: 2.5,
  },
  {
    satid: 22000,
    vmag: 0.5,
  },
  {
    satid: 22006,
    vmag: 5,
  },
  {
    satid: 22007,
    vmag: 4,
  },
  {
    satid: 22012,
    vmag: 7,
  },
  {
    satid: 22013,
    vmag: 5.5,
  },
  {
    satid: 22015,
    vmag: 3.5,
  },
  {
    satid: 22016,
    vmag: 6,
  },
  {
    satid: 22017,
    vmag: 3.5,
  },
  {
    satid: 22020,
    vmag: 4.5,
  },
  {
    satid: 22032,
    vmag: 2.5,
  },
  {
    satid: 22033,
    vmag: 4,
  },
  {
    satid: 22034,
    vmag: 7.5,
  },
  {
    satid: 22035,
    vmag: 7.5,
  },
  {
    satid: 22036,
    vmag: 6.5,
  },
  {
    satid: 22037,
    vmag: 7,
  },
  {
    satid: 22039,
    vmag: 7,
  },
  {
    satid: 22040,
    vmag: 4,
  },
  {
    satid: 22058,
    vmag: 4,
  },
  {
    satid: 22065,
    vmag: 3,
  },
  {
    satid: 22066,
    vmag: 6.5,
  },
  {
    satid: 22068,
    vmag: 4,
  },
  {
    satid: 22071,
    vmag: 4.5,
  },
  {
    satid: 22076,
    vmag: 3.5,
  },
  {
    satid: 22079,
    vmag: 3,
  },
  {
    satid: 22080,
    vmag: 5.5,
  },
  {
    satid: 22081,
    vmag: 4,
  },
  {
    satid: 22086,
    vmag: 5.5,
  },
  {
    satid: 22088,
    vmag: 1.5,
  },
  {
    satid: 22097,
    vmag: 3.5,
  },
  {
    satid: 22098,
    vmag: 5,
  },
  {
    satid: 22109,
    vmag: 3.5,
  },
  {
    satid: 22115,
    vmag: 4.5,
  },
  {
    satid: 22117,
    vmag: 4,
  },
  {
    satid: 22161,
    vmag: 5.5,
  },
  {
    satid: 22176,
    vmag: 4,
  },
  {
    satid: 22177,
    vmag: 5.5,
  },
  {
    satid: 22178,
    vmag: 4.5,
  },
  {
    satid: 22181,
    vmag: 4,
  },
  {
    satid: 22182,
    vmag: 7,
  },
  {
    satid: 22183,
    vmag: 7,
  },
  {
    satid: 22184,
    vmag: 6,
  },
  {
    satid: 22185,
    vmag: 7,
  },
  {
    satid: 22186,
    vmag: 7,
  },
  {
    satid: 22187,
    vmag: 7,
  },
  {
    satid: 22188,
    vmag: 4,
  },
  {
    satid: 22189,
    vmag: 4.5,
  },
  {
    satid: 22196,
    vmag: 5.5,
  },
  {
    satid: 22205,
    vmag: 2.5,
  },
  {
    satid: 22207,
    vmag: 5.5,
  },
  {
    satid: 22208,
    vmag: 3.5,
  },
  {
    satid: 22213,
    vmag: 3.5,
  },
  {
    satid: 22219,
    vmag: 3,
  },
  {
    satid: 22220,
    vmag: 2,
  },
  {
    satid: 22232,
    vmag: 3.5,
  },
  {
    satid: 22233,
    vmag: 5.5,
  },
  {
    satid: 22236,
    vmag: 3,
  },
  {
    satid: 22237,
    vmag: 4,
  },
  {
    satid: 22241,
    vmag: 4.5,
  },
  {
    satid: 22245,
    vmag: 5,
  },
  {
    satid: 22250,
    vmag: 6.5,
  },
  {
    satid: 22251,
    vmag: 4,
  },
  {
    satid: 22254,
    vmag: 2.5,
  },
  {
    satid: 22255,
    vmag: 4,
  },
  {
    satid: 22258,
    vmag: 4.5,
  },
  {
    satid: 22259,
    vmag: 0.1,
  },
  {
    satid: 22276,
    vmag: 3.5,
  },
  {
    satid: 22277,
    vmag: 5,
  },
  {
    satid: 22278,
    vmag: 5,
  },
  {
    satid: 22282,
    vmag: 3,
  },
  {
    satid: 22283,
    vmag: 4,
  },
  {
    satid: 22284,
    vmag: 4,
  },
  {
    satid: 22285,
    vmag: 2,
  },
  {
    satid: 22286,
    vmag: 3.5,
  },
  {
    satid: 22287,
    vmag: 3.5,
  },
  {
    satid: 22307,
    vmag: 6,
  },
  {
    satid: 22308,
    vmag: 4,
  },
  {
    satid: 22309,
    vmag: 5.5,
  },
  {
    satid: 22312,
    vmag: 3.5,
  },
  {
    satid: 22315,
    vmag: 3,
  },
  {
    satid: 22316,
    vmag: 4,
  },
  {
    satid: 22321,
    vmag: 4,
  },
  {
    satid: 22324,
    vmag: 3.5,
  },
  {
    satid: 22327,
    vmag: 7.5,
  },
  {
    satid: 22335,
    vmag: 7,
  },
  {
    satid: 22350,
    vmag: 9,
  },
  {
    satid: 22354,
    vmag: 7,
  },
  {
    satid: 22358,
    vmag: 7.5,
  },
  {
    satid: 22371,
    vmag: 7,
  },
  {
    satid: 22375,
    vmag: 8.5,
  },
  {
    satid: 22417,
    vmag: 8.5,
  },
  {
    satid: 22447,
    vmag: 4,
  },
  {
    satid: 22448,
    vmag: 5,
  },
  {
    satid: 22487,
    vmag: 5,
  },
  {
    satid: 22488,
    vmag: 3.5,
  },
  {
    satid: 22489,
    vmag: 7,
  },
  {
    satid: 22490,
    vmag: 8.5,
  },
  {
    satid: 22518,
    vmag: 4,
  },
  {
    satid: 22519,
    vmag: 4,
  },
  {
    satid: 22521,
    vmag: 4,
  },
  {
    satid: 22522,
    vmag: 5,
  },
  {
    satid: 22561,
    vmag: 5,
  },
  {
    satid: 22562,
    vmag: 6,
  },
  {
    satid: 22563,
    vmag: 3,
  },
  {
    satid: 22564,
    vmag: 2,
  },
  {
    satid: 22565,
    vmag: 4,
  },
  {
    satid: 22566,
    vmag: 2,
  },
  {
    satid: 22577,
    vmag: 6.5,
  },
  {
    satid: 22583,
    vmag: 3,
  },
  {
    satid: 22584,
    vmag: 5,
  },
  {
    satid: 22585,
    vmag: 2,
  },
  {
    satid: 22590,
    vmag: 4.5,
  },
  {
    satid: 22591,
    vmag: 4,
  },
  {
    satid: 22597,
    vmag: 4,
  },
  {
    satid: 22626,
    vmag: 3.5,
  },
  {
    satid: 22627,
    vmag: 4,
  },
  {
    satid: 22633,
    vmag: 4.5,
  },
  {
    satid: 22636,
    vmag: 3.5,
  },
  {
    satid: 22638,
    vmag: 6.5,
  },
  {
    satid: 22639,
    vmag: 6,
  },
  {
    satid: 22640,
    vmag: 0.1,
  },
  {
    satid: 22643,
    vmag: 2.5,
  },
  {
    satid: 22646,
    vmag: 6.5,
  },
  {
    satid: 22647,
    vmag: 6.5,
  },
  {
    satid: 22648,
    vmag: 6,
  },
  {
    satid: 22649,
    vmag: 7,
  },
  {
    satid: 22650,
    vmag: 7,
  },
  {
    satid: 22651,
    vmag: 3.5,
  },
  {
    satid: 22652,
    vmag: 6,
  },
  {
    satid: 22655,
    vmag: 3.5,
  },
  {
    satid: 22658,
    vmag: 3,
  },
  {
    satid: 22659,
    vmag: 5,
  },
  {
    satid: 22670,
    vmag: 4,
  },
  {
    satid: 22671,
    vmag: 4,
  },
  {
    satid: 22674,
    vmag: 4.5,
  },
  {
    satid: 22675,
    vmag: 5,
  },
  {
    satid: 22676,
    vmag: 3.5,
  },
  {
    satid: 22687,
    vmag: 7.5,
  },
  {
    satid: 22688,
    vmag: 6.5,
  },
  {
    satid: 22689,
    vmag: 6.3,
  },
  {
    satid: 22690,
    vmag: 7,
  },
  {
    satid: 22691,
    vmag: 6,
  },
  {
    satid: 22692,
    vmag: 6.5,
  },
  {
    satid: 22693,
    vmag: 4,
  },
  {
    satid: 22698,
    vmag: 8,
  },
  {
    satid: 22699,
    vmag: 6.5,
  },
  {
    satid: 22702,
    vmag: 5,
  },
  {
    satid: 22709,
    vmag: 2.5,
  },
  {
    satid: 22725,
    vmag: 3.5,
  },
  {
    satid: 22726,
    vmag: 3.5,
  },
  {
    satid: 22732,
    vmag: 4.5,
  },
  {
    satid: 22738,
    vmag: 2.5,
  },
  {
    satid: 22739,
    vmag: 4.5,
  },
  {
    satid: 22741,
    vmag: 3.5,
  },
  {
    satid: 22744,
    vmag: 4.5,
  },
  {
    satid: 22780,
    vmag: 3,
  },
  {
    satid: 22781,
    vmag: 5,
  },
  {
    satid: 22782,
    vmag: 4,
  },
  {
    satid: 22784,
    vmag: 4,
  },
  {
    satid: 22788,
    vmag: 2,
  },
  {
    satid: 22795,
    vmag: 0.5,
  },
  {
    satid: 22796,
    vmag: 1.5,
  },
  {
    satid: 22797,
    vmag: 4,
  },
  {
    satid: 22802,
    vmag: 4,
  },
  {
    satid: 22803,
    vmag: 2,
  },
  {
    satid: 22808,
    vmag: 2.5,
  },
  {
    satid: 22823,
    vmag: 4.5,
  },
  {
    satid: 22829,
    vmag: 8.5,
  },
  {
    satid: 22830,
    vmag: 3.5,
  },
  {
    satid: 22851,
    vmag: 2.5,
  },
  {
    satid: 22859,
    vmag: 5.5,
  },
  {
    satid: 22869,
    vmag: 0.1,
  },
  {
    satid: 22875,
    vmag: 4.5,
  },
  {
    satid: 22876,
    vmag: 3.5,
  },
  {
    satid: 22877,
    vmag: 5,
  },
  {
    satid: 22878,
    vmag: 3.5,
  },
  {
    satid: 22879,
    vmag: 5.5,
  },
  {
    satid: 22888,
    vmag: 5,
  },
  {
    satid: 22889,
    vmag: 3.5,
  },
  {
    satid: 22907,
    vmag: 6,
  },
  {
    satid: 22911,
    vmag: 4,
  },
  {
    satid: 22913,
    vmag: 2,
  },
  {
    satid: 22914,
    vmag: 4.5,
  },
  {
    satid: 22920,
    vmag: 6.5,
  },
  {
    satid: 22922,
    vmag: 4,
  },
  {
    satid: 22923,
    vmag: 5.5,
  },
  {
    satid: 22925,
    vmag: 6.5,
  },
  {
    satid: 22927,
    vmag: 2,
  },
  {
    satid: 22928,
    vmag: 3,
  },
  {
    satid: 22930,
    vmag: 4,
  },
  {
    satid: 22933,
    vmag: 3.5,
  },
  {
    satid: 22949,
    vmag: 4,
  },
  {
    satid: 22952,
    vmag: 4,
  },
  {
    satid: 22966,
    vmag: 3.5,
  },
  {
    satid: 22969,
    vmag: 4.5,
  },
  {
    satid: 22970,
    vmag: 4.5,
  },
  {
    satid: 22979,
    vmag: 4,
  },
  {
    satid: 22980,
    vmag: 2.5,
  },
  {
    satid: 22988,
    vmag: 2,
  },
  {
    satid: 22989,
    vmag: 2,
  },
  {
    satid: 22994,
    vmag: 8,
  },
  {
    satid: 22995,
    vmag: 8,
  },
  {
    satid: 22996,
    vmag: 5,
  },
  {
    satid: 22997,
    vmag: 1.5,
  },
  {
    satid: 22999,
    vmag: 6.5,
  },
  {
    satid: 23000,
    vmag: 7,
  },
  {
    satid: 23001,
    vmag: 7,
  },
  {
    satid: 23002,
    vmag: 6.5,
  },
  {
    satid: 23005,
    vmag: 3.5,
  },
  {
    satid: 23009,
    vmag: 4.5,
  },
  {
    satid: 23016,
    vmag: 4.5,
  },
  {
    satid: 23018,
    vmag: 5.5,
  },
  {
    satid: 23019,
    vmag: 3.5,
  },
  {
    satid: 23020,
    vmag: 3.5,
  },
  {
    satid: 23025,
    vmag: 0.1,
  },
  {
    satid: 23027,
    vmag: 4.5,
  },
  {
    satid: 23028,
    vmag: 4,
  },
  {
    satid: 23029,
    vmag: 6,
  },
  {
    satid: 23030,
    vmag: 5,
  },
  {
    satid: 23031,
    vmag: 5,
  },
  {
    satid: 23042,
    vmag: 1,
  },
  {
    satid: 23044,
    vmag: 3.5,
  },
  {
    satid: 23049,
    vmag: 6.5,
  },
  {
    satid: 23050,
    vmag: 6,
  },
  {
    satid: 23051,
    vmag: 3.5,
  },
  {
    satid: 23087,
    vmag: 3.5,
  },
  {
    satid: 23088,
    vmag: 2,
  },
  {
    satid: 23092,
    vmag: 4.5,
  },
  {
    satid: 23093,
    vmag: 3.5,
  },
  {
    satid: 23097,
    vmag: 2,
  },
  {
    satid: 23099,
    vmag: 7,
  },
  {
    satid: 23100,
    vmag: 7,
  },
  {
    satid: 23101,
    vmag: 6,
  },
  {
    satid: 23102,
    vmag: 6,
  },
  {
    satid: 23105,
    vmag: 6,
  },
  {
    satid: 23106,
    vmag: 6.5,
  },
  {
    satid: 23111,
    vmag: 4,
  },
  {
    satid: 23117,
    vmag: 6.5,
  },
  {
    satid: 23122,
    vmag: 1.5,
  },
  {
    satid: 23127,
    vmag: 3,
  },
  {
    satid: 23133,
    vmag: 2,
  },
  {
    satid: 23145,
    vmag: 4,
  },
  {
    satid: 23168,
    vmag: 5,
  },
  {
    satid: 23173,
    vmag: 1.5,
  },
  {
    satid: 23177,
    vmag: 3,
  },
  {
    satid: 23178,
    vmag: 2,
  },
  {
    satid: 23179,
    vmag: 5.5,
  },
  {
    satid: 23180,
    vmag: 3.5,
  },
  {
    satid: 23186,
    vmag: 3,
  },
  {
    satid: 23189,
    vmag: 4.5,
  },
  {
    satid: 23190,
    vmag: 3.5,
  },
  {
    satid: 23191,
    vmag: 4,
  },
  {
    satid: 23192,
    vmag: 3,
  },
  {
    satid: 23193,
    vmag: 2.5,
  },
  {
    satid: 23195,
    vmag: 4,
  },
  {
    satid: 23197,
    vmag: 5,
  },
  {
    satid: 23198,
    vmag: 7,
  },
  {
    satid: 23199,
    vmag: 5,
  },
  {
    satid: 23200,
    vmag: 4.5,
  },
  {
    satid: 23201,
    vmag: 2,
  },
  {
    satid: 23202,
    vmag: 4,
  },
  {
    satid: 23209,
    vmag: 6.5,
  },
  {
    satid: 23210,
    vmag: 6,
  },
  {
    satid: 23211,
    vmag: 4.5,
  },
  {
    satid: 23212,
    vmag: 3.5,
  },
  {
    satid: 23214,
    vmag: 4,
  },
  {
    satid: 23229,
    vmag: 5,
  },
  {
    satid: 23230,
    vmag: 2.5,
  },
  {
    satid: 23233,
    vmag: 4.5,
  },
  {
    satid: 23236,
    vmag: 4.5,
  },
  {
    satid: 23246,
    vmag: 4.5,
  },
  {
    satid: 23247,
    vmag: 2.5,
  },
  {
    satid: 23249,
    vmag: 3.5,
  },
  {
    satid: 23267,
    vmag: 6,
  },
  {
    satid: 23278,
    vmag: 5.5,
  },
  {
    satid: 23279,
    vmag: 4,
  },
  {
    satid: 23313,
    vmag: 4,
  },
  {
    satid: 23316,
    vmag: 3.5,
  },
  {
    satid: 23317,
    vmag: 3.5,
  },
  {
    satid: 23318,
    vmag: 4,
  },
  {
    satid: 23323,
    vmag: 5,
  },
  {
    satid: 23324,
    vmag: 4.5,
  },
  {
    satid: 23330,
    vmag: 4,
  },
  {
    satid: 23332,
    vmag: 3,
  },
  {
    satid: 23334,
    vmag: 3,
  },
  {
    satid: 23336,
    vmag: 2.5,
  },
  {
    satid: 23340,
    vmag: 0.5,
  },
  {
    satid: 23341,
    vmag: 4,
  },
  {
    satid: 23342,
    vmag: 4,
  },
  {
    satid: 23343,
    vmag: 2,
  },
  {
    satid: 23402,
    vmag: 6,
  },
  {
    satid: 23404,
    vmag: 3.5,
  },
  {
    satid: 23405,
    vmag: 2,
  },
  {
    satid: 23411,
    vmag: 3,
  },
  {
    satid: 23412,
    vmag: 3.5,
  },
  {
    satid: 23415,
    vmag: 5,
  },
  {
    satid: 23416,
    vmag: 2.5,
  },
  {
    satid: 23420,
    vmag: 4.5,
  },
  {
    satid: 23426,
    vmag: 3,
  },
  {
    satid: 23431,
    vmag: 5,
  },
  {
    satid: 23432,
    vmag: 4,
  },
  {
    satid: 23439,
    vmag: 6,
  },
  {
    satid: 23440,
    vmag: 3,
  },
  {
    satid: 23441,
    vmag: 6.5,
  },
  {
    satid: 23442,
    vmag: 5.5,
  },
  {
    satid: 23443,
    vmag: 5.5,
  },
  {
    satid: 23444,
    vmag: 5.5,
  },
  {
    satid: 23445,
    vmag: 5.5,
  },
  {
    satid: 23446,
    vmag: 5.5,
  },
  {
    satid: 23447,
    vmag: 3.5,
  },
  {
    satid: 23455,
    vmag: 4.5,
  },
  {
    satid: 23461,
    vmag: 3,
  },
  {
    satid: 23462,
    vmag: 3,
  },
  {
    satid: 23463,
    vmag: 5.5,
  },
  {
    satid: 23464,
    vmag: 6,
  },
  {
    satid: 23465,
    vmag: 7.5,
  },
  {
    satid: 23466,
    vmag: 3.5,
  },
  {
    satid: 23468,
    vmag: 3,
  },
  {
    satid: 23501,
    vmag: 4.5,
  },
  {
    satid: 23502,
    vmag: 4.5,
  },
  {
    satid: 23516,
    vmag: 3,
  },
  {
    satid: 23521,
    vmag: 4.5,
  },
  {
    satid: 23523,
    vmag: 3.5,
  },
  {
    satid: 23526,
    vmag: 6,
  },
  {
    satid: 23527,
    vmag: 4,
  },
  {
    satid: 23528,
    vmag: 4,
  },
  {
    satid: 23529,
    vmag: 2.5,
  },
  {
    satid: 23533,
    vmag: 4.5,
  },
  {
    satid: 23536,
    vmag: 5,
  },
  {
    satid: 23538,
    vmag: 2.5,
  },
  {
    satid: 23539,
    vmag: 4,
  },
  {
    satid: 23545,
    vmag: 7.5,
  },
  {
    satid: 23546,
    vmag: 7,
  },
  {
    satid: 23547,
    vmag: 6.5,
  },
  {
    satid: 23548,
    vmag: 6,
  },
  {
    satid: 23549,
    vmag: 5.5,
  },
  {
    satid: 23550,
    vmag: 4,
  },
  {
    satid: 23553,
    vmag: 3.5,
  },
  {
    satid: 23554,
    vmag: 2.5,
  },
  {
    satid: 23560,
    vmag: 3,
  },
  {
    satid: 23561,
    vmag: 3,
  },
  {
    satid: 23568,
    vmag: 2,
  },
  {
    satid: 23571,
    vmag: 3.5,
  },
  {
    satid: 23581,
    vmag: 2.5,
  },
  {
    satid: 23584,
    vmag: 4.5,
  },
  {
    satid: 23587,
    vmag: 4.5,
  },
  {
    satid: 23589,
    vmag: 3.5,
  },
  {
    satid: 23590,
    vmag: 3.5,
  },
  {
    satid: 23596,
    vmag: 3,
  },
  {
    satid: 23598,
    vmag: 2,
  },
  {
    satid: 23599,
    vmag: 3,
  },
  {
    satid: 23600,
    vmag: 0.5,
  },
  {
    satid: 23603,
    vmag: 4.5,
  },
  {
    satid: 23604,
    vmag: 3.5,
  },
  {
    satid: 23605,
    vmag: 3.5,
  },
  {
    satid: 23606,
    vmag: 7,
  },
  {
    satid: 23608,
    vmag: 3.5,
  },
  {
    satid: 23613,
    vmag: 2.5,
  },
  {
    satid: 23614,
    vmag: 3.5,
  },
  {
    satid: 23615,
    vmag: 3.5,
  },
  {
    satid: 23633,
    vmag: 3.5,
  },
  {
    satid: 23637,
    vmag: 2.5,
  },
  {
    satid: 23640,
    vmag: 3.5,
  },
  {
    satid: 23641,
    vmag: 5.5,
  },
  {
    satid: 23642,
    vmag: 4,
  },
  {
    satid: 23645,
    vmag: 4,
  },
  {
    satid: 23657,
    vmag: 3.5,
  },
  {
    satid: 23659,
    vmag: 4,
  },
  {
    satid: 23661,
    vmag: 6,
  },
  {
    satid: 23662,
    vmag: 8.5,
  },
  {
    satid: 23664,
    vmag: 0,
  },
  {
    satid: 23665,
    vmag: 2,
  },
  {
    satid: 23667,
    vmag: 1,
  },
  {
    satid: 23670,
    vmag: 2,
  },
  {
    satid: 23671,
    vmag: 3,
  },
  {
    satid: 23674,
    vmag: 3,
  },
  {
    satid: 23676,
    vmag: 4,
  },
  {
    satid: 23677,
    vmag: 4,
  },
  {
    satid: 23687,
    vmag: 2,
  },
  {
    satid: 23688,
    vmag: 1.5,
  },
  {
    satid: 23689,
    vmag: 7,
  },
  {
    satid: 23690,
    vmag: 8,
  },
  {
    satid: 23691,
    vmag: 6,
  },
  {
    satid: 23693,
    vmag: 7,
  },
  {
    satid: 23694,
    vmag: 7,
  },
  {
    satid: 23695,
    vmag: 7,
  },
  {
    satid: 23696,
    vmag: 4.5,
  },
  {
    satid: 23697,
    vmag: 3,
  },
  {
    satid: 23703,
    vmag: 6,
  },
  {
    satid: 23704,
    vmag: 3.5,
  },
  {
    satid: 23705,
    vmag: 2,
  },
  {
    satid: 23710,
    vmag: 4.5,
  },
  {
    satid: 23711,
    vmag: 3.5,
  },
  {
    satid: 23713,
    vmag: 2,
  },
  {
    satid: 23714,
    vmag: 0.5,
  },
  {
    satid: 23715,
    vmag: 2.5,
  },
  {
    satid: 23716,
    vmag: 2.5,
  },
  {
    satid: 23717,
    vmag: 3.5,
  },
  {
    satid: 23725,
    vmag: 3,
  },
  {
    satid: 23732,
    vmag: 2.5,
  },
  {
    satid: 23733,
    vmag: 3.5,
  },
  {
    satid: 23741,
    vmag: 3,
  },
  {
    satid: 23742,
    vmag: 2,
  },
  {
    satid: 23748,
    vmag: 3,
  },
  {
    satid: 23751,
    vmag: 4,
  },
  {
    satid: 23752,
    vmag: 7,
  },
  {
    satid: 23753,
    vmag: 4,
  },
  {
    satid: 23756,
    vmag: 3.5,
  },
  {
    satid: 23757,
    vmag: 4.5,
  },
  {
    satid: 23762,
    vmag: 0.1,
  },
  {
    satid: 23764,
    vmag: 4,
  },
  {
    satid: 23766,
    vmag: 3,
  },
  {
    satid: 23767,
    vmag: 4,
  },
  {
    satid: 23769,
    vmag: 4,
  },
  {
    satid: 23770,
    vmag: 5.5,
  },
  {
    satid: 23772,
    vmag: 7,
  },
  {
    satid: 23773,
    vmag: 4.5,
  },
  {
    satid: 23774,
    vmag: 4,
  },
  {
    satid: 23781,
    vmag: 4,
  },
  {
    satid: 23782,
    vmag: 2.5,
  },
  {
    satid: 23783,
    vmag: 7,
  },
  {
    satid: 23785,
    vmag: 2.5,
  },
  {
    satid: 23787,
    vmag: 6,
  },
  {
    satid: 23788,
    vmag: 6,
  },
  {
    satid: 23789,
    vmag: 6,
  },
  {
    satid: 23790,
    vmag: 6,
  },
  {
    satid: 23791,
    vmag: 6.5,
  },
  {
    satid: 23792,
    vmag: 7,
  },
  {
    satid: 23793,
    vmag: 4,
  },
  {
    satid: 23794,
    vmag: 3,
  },
  {
    satid: 23801,
    vmag: 2.5,
  },
  {
    satid: 23805,
    vmag: 3,
  },
  {
    satid: 23814,
    vmag: 6.5,
  },
  {
    satid: 23815,
    vmag: 6,
  },
  {
    satid: 23816,
    vmag: 5,
  },
  {
    satid: 23817,
    vmag: 3,
  },
  {
    satid: 23824,
    vmag: 5.5,
  },
  {
    satid: 23827,
    vmag: 4,
  },
  {
    satid: 23828,
    vmag: 4.5,
  },
  {
    satid: 23834,
    vmag: 3.5,
  },
  {
    satid: 23835,
    vmag: 5.5,
  },
  {
    satid: 23840,
    vmag: 3.5,
  },
  {
    satid: 23845,
    vmag: 3,
  },
  {
    satid: 23846,
    vmag: 5,
  },
  {
    satid: 23847,
    vmag: 2.5,
  },
  {
    satid: 23851,
    vmag: 3.5,
  },
  {
    satid: 23853,
    vmag: 4,
  },
  {
    satid: 23854,
    vmag: 4,
  },
  {
    satid: 23855,
    vmag: 2,
  },
  {
    satid: 23859,
    vmag: 8,
  },
  {
    satid: 23862,
    vmag: 4,
  },
  {
    satid: 23863,
    vmag: 4,
  },
  {
    satid: 23866,
    vmag: 2.5,
  },
  {
    satid: 23867,
    vmag: 3.5,
  },
  {
    satid: 23868,
    vmag: 5,
  },
  {
    satid: 23873,
    vmag: 7,
  },
  {
    satid: 23874,
    vmag: 6.5,
  },
  {
    satid: 23875,
    vmag: 6,
  },
  {
    satid: 23876,
    vmag: 7.5,
  },
  {
    satid: 23877,
    vmag: 5,
  },
  {
    satid: 23878,
    vmag: 3.5,
  },
  {
    satid: 23879,
    vmag: 5.5,
  },
  {
    satid: 23884,
    vmag: 6,
  },
  {
    satid: 23885,
    vmag: 7,
  },
  {
    satid: 23891,
    vmag: 7,
  },
  {
    satid: 23892,
    vmag: 6.5,
  },
  {
    satid: 23895,
    vmag: 6.5,
  },
  {
    satid: 23896,
    vmag: 6,
  },
  {
    satid: 23897,
    vmag: 7,
  },
  {
    satid: 23899,
    vmag: 6.5,
  },
  {
    satid: 23901,
    vmag: 6.5,
  },
  {
    satid: 23902,
    vmag: 7.5,
  },
  {
    satid: 23907,
    vmag: 2,
  },
  {
    satid: 23908,
    vmag: 4,
  },
  {
    satid: 23910,
    vmag: 9,
  },
  {
    satid: 23911,
    vmag: 6.5,
  },
  {
    satid: 23920,
    vmag: 7,
  },
  {
    satid: 23929,
    vmag: 7,
  },
  {
    satid: 23936,
    vmag: 4,
  },
  {
    satid: 23937,
    vmag: 6.5,
  },
  {
    satid: 23940,
    vmag: 7,
  },
  {
    satid: 23941,
    vmag: 6,
  },
  {
    satid: 23944,
    vmag: 2,
  },
  {
    satid: 23946,
    vmag: 2,
  },
  {
    satid: 23947,
    vmag: 4.5,
  },
  {
    satid: 23950,
    vmag: 3,
  },
  {
    satid: 23951,
    vmag: 3.5,
  },
  {
    satid: 23954,
    vmag: 3.5,
  },
  {
    satid: 23955,
    vmag: 5.5,
  },
  {
    satid: 23968,
    vmag: 3,
  },
  {
    satid: 24211,
    vmag: 4,
  },
  {
    satid: 24273,
    vmag: 4.5,
  },
  {
    satid: 24274,
    vmag: 3.5,
  },
  {
    satid: 24276,
    vmag: 4.5,
  },
  {
    satid: 24277,
    vmag: 3.5,
  },
  {
    satid: 24278,
    vmag: 9,
  },
  {
    satid: 24279,
    vmag: 2.5,
  },
  {
    satid: 24283,
    vmag: 2,
  },
  {
    satid: 24285,
    vmag: 6,
  },
  {
    satid: 24286,
    vmag: 5.5,
  },
  {
    satid: 24291,
    vmag: 8,
  },
  {
    satid: 24292,
    vmag: 5.5,
  },
  {
    satid: 24293,
    vmag: 3.5,
  },
  {
    satid: 24294,
    vmag: 3.5,
  },
  {
    satid: 24295,
    vmag: 5.5,
  },
  {
    satid: 24296,
    vmag: 3.5,
  },
  {
    satid: 24297,
    vmag: 4,
  },
  {
    satid: 24298,
    vmag: 2,
  },
  {
    satid: 24303,
    vmag: 8,
  },
  {
    satid: 24304,
    vmag: 5,
  },
  {
    satid: 24306,
    vmag: 4,
  },
  {
    satid: 24313,
    vmag: 5,
  },
  {
    satid: 24314,
    vmag: 3.5,
  },
  {
    satid: 24315,
    vmag: 5,
  },
  {
    satid: 24321,
    vmag: 5,
  },
  {
    satid: 24323,
    vmag: 3.5,
  },
  {
    satid: 24640,
    vmag: 4.5,
  },
  {
    satid: 24645,
    vmag: 5.5,
  },
  {
    satid: 24649,
    vmag: 2,
  },
  {
    satid: 24654,
    vmag: 3.5,
  },
  {
    satid: 24655,
    vmag: 3,
  },
  {
    satid: 24660,
    vmag: 1.5,
  },
  {
    satid: 24668,
    vmag: 3.5,
  },
  {
    satid: 24670,
    vmag: 3,
  },
  {
    satid: 24675,
    vmag: 3.5,
  },
  {
    satid: 24677,
    vmag: 5,
  },
  {
    satid: 24678,
    vmag: 4,
  },
  {
    satid: 24680,
    vmag: 4,
  },
  {
    satid: 24701,
    vmag: 3.5,
  },
  {
    satid: 24707,
    vmag: 6,
  },
  {
    satid: 24713,
    vmag: 5,
  },
  {
    satid: 24714,
    vmag: 3,
  },
  {
    satid: 24715,
    vmag: 3.5,
  },
  {
    satid: 24716,
    vmag: 3,
  },
  {
    satid: 24720,
    vmag: 3,
  },
  {
    satid: 24721,
    vmag: 5,
  },
  {
    satid: 24726,
    vmag: 7.5,
  },
  {
    satid: 24727,
    vmag: 7.5,
  },
  {
    satid: 24728,
    vmag: 6.3,
  },
  {
    satid: 24729,
    vmag: 7.5,
  },
  {
    satid: 24730,
    vmag: 7,
  },
  {
    satid: 24731,
    vmag: 3.5,
  },
  {
    satid: 24736,
    vmag: 5,
  },
  {
    satid: 24743,
    vmag: 2.5,
  },
  {
    satid: 24748,
    vmag: 4,
  },
  {
    satid: 24753,
    vmag: 4.5,
  },
  {
    satid: 24764,
    vmag: 4,
  },
  {
    satid: 24770,
    vmag: 3,
  },
  {
    satid: 24771,
    vmag: 3,
  },
  {
    satid: 24772,
    vmag: 4.5,
  },
  {
    satid: 24773,
    vmag: 3.5,
  },
  {
    satid: 24779,
    vmag: 6.5,
  },
  {
    satid: 24780,
    vmag: 6,
  },
  {
    satid: 24787,
    vmag: 3,
  },
  {
    satid: 24792,
    vmag: 6,
  },
  {
    satid: 24793,
    vmag: 5.5,
  },
  {
    satid: 24794,
    vmag: 5.5,
  },
  {
    satid: 24795,
    vmag: 5.5,
  },
  {
    satid: 24796,
    vmag: 5.5,
  },
  {
    satid: 24797,
    vmag: 3.5,
  },
  {
    satid: 24799,
    vmag: 2,
  },
  {
    satid: 24800,
    vmag: 4.5,
  },
  {
    satid: 24803,
    vmag: 4,
  },
  {
    satid: 24805,
    vmag: 3,
  },
  {
    satid: 24809,
    vmag: 3.5,
  },
  {
    satid: 24810,
    vmag: 5,
  },
  {
    satid: 24812,
    vmag: 3,
  },
  {
    satid: 24815,
    vmag: 3,
  },
  {
    satid: 24819,
    vmag: 4,
  },
  {
    satid: 24820,
    vmag: 5,
  },
  {
    satid: 24822,
    vmag: 3.5,
  },
  {
    satid: 24827,
    vmag: 2.5,
  },
  {
    satid: 24829,
    vmag: 3.5,
  },
  {
    satid: 24833,
    vmag: 6,
  },
  {
    satid: 24836,
    vmag: 6,
  },
  {
    satid: 24837,
    vmag: 5.5,
  },
  {
    satid: 24838,
    vmag: 5.5,
  },
  {
    satid: 24839,
    vmag: 5.5,
  },
  {
    satid: 24840,
    vmag: 5.5,
  },
  {
    satid: 24841,
    vmag: 5.5,
  },
  {
    satid: 24842,
    vmag: 5.5,
  },
  {
    satid: 24843,
    vmag: 6.5,
  },
  {
    satid: 24847,
    vmag: 2.5,
  },
  {
    satid: 24869,
    vmag: 6,
  },
  {
    satid: 24870,
    vmag: 5.5,
  },
  {
    satid: 24871,
    vmag: 5.5,
  },
  {
    satid: 24872,
    vmag: 5.5,
  },
  {
    satid: 24873,
    vmag: 5.5,
  },
  {
    satid: 24877,
    vmag: 3.5,
  },
  {
    satid: 24878,
    vmag: 5,
  },
  {
    satid: 24892,
    vmag: 3.5,
  },
  {
    satid: 24903,
    vmag: 5.5,
  },
  {
    satid: 24904,
    vmag: 5.5,
  },
  {
    satid: 24905,
    vmag: 5.5,
  },
  {
    satid: 24906,
    vmag: 5.5,
  },
  {
    satid: 24907,
    vmag: 5.5,
  },
  {
    satid: 24914,
    vmag: 5.5,
  },
  {
    satid: 24916,
    vmag: 4,
  },
  {
    satid: 24919,
    vmag: 3,
  },
  {
    satid: 24920,
    vmag: 7,
  },
  {
    satid: 24921,
    vmag: 6,
  },
  {
    satid: 24925,
    vmag: 5.5,
  },
  {
    satid: 24926,
    vmag: 5.5,
  },
  {
    satid: 24934,
    vmag: 3.5,
  },
  {
    satid: 24937,
    vmag: 2.5,
  },
  {
    satid: 24944,
    vmag: 5.5,
  },
  {
    satid: 24945,
    vmag: 5.5,
  },
  {
    satid: 24946,
    vmag: 5.5,
  },
  {
    satid: 24947,
    vmag: 5.5,
  },
  {
    satid: 24948,
    vmag: 5.5,
  },
  {
    satid: 24949,
    vmag: 5.5,
  },
  {
    satid: 24950,
    vmag: 5.5,
  },
  {
    satid: 24953,
    vmag: 5.5,
  },
  {
    satid: 24954,
    vmag: 6.5,
  },
  {
    satid: 24955,
    vmag: 4,
  },
  {
    satid: 24960,
    vmag: 4,
  },
  {
    satid: 24963,
    vmag: 4,
  },
  {
    satid: 24965,
    vmag: 6,
  },
  {
    satid: 24966,
    vmag: 5,
  },
  {
    satid: 24967,
    vmag: 5.5,
  },
  {
    satid: 24968,
    vmag: 5.5,
  },
  {
    satid: 24969,
    vmag: 6,
  },
  {
    satid: 24971,
    vmag: 3.5,
  },
  {
    satid: 24972,
    vmag: 5,
  },
  {
    satid: 25004,
    vmag: 4,
  },
  {
    satid: 25013,
    vmag: 7,
  },
  {
    satid: 25017,
    vmag: 2.5,
  },
  {
    satid: 25018,
    vmag: 2,
  },
  {
    satid: 25020,
    vmag: 2.5,
  },
  {
    satid: 25023,
    vmag: 2,
  },
  {
    satid: 25024,
    vmag: 3,
  },
  {
    satid: 25026,
    vmag: 3,
  },
  {
    satid: 25031,
    vmag: 4,
  },
  {
    satid: 25032,
    vmag: 5.5,
  },
  {
    satid: 25034,
    vmag: 2.5,
  },
  {
    satid: 25035,
    vmag: 1.5,
  },
  {
    satid: 25039,
    vmag: 5.5,
  },
  {
    satid: 25040,
    vmag: 5.5,
  },
  {
    satid: 25041,
    vmag: 6,
  },
  {
    satid: 25042,
    vmag: 6,
  },
  {
    satid: 25043,
    vmag: 5.5,
  },
  {
    satid: 25051,
    vmag: 2,
  },
  {
    satid: 25054,
    vmag: 5.5,
  },
  {
    satid: 25063,
    vmag: 3,
  },
  {
    satid: 25064,
    vmag: 3.5,
  },
  {
    satid: 25065,
    vmag: 3,
  },
  {
    satid: 25066,
    vmag: 5,
  },
  {
    satid: 25069,
    vmag: 3,
  },
  {
    satid: 25074,
    vmag: 2.5,
  },
  {
    satid: 25077,
    vmag: 5.5,
  },
  {
    satid: 25078,
    vmag: 5,
  },
  {
    satid: 25086,
    vmag: 3,
  },
  {
    satid: 25088,
    vmag: 3,
  },
  {
    satid: 25102,
    vmag: 3,
  },
  {
    satid: 25104,
    vmag: 5.5,
  },
  {
    satid: 25105,
    vmag: 5.5,
  },
  {
    satid: 25106,
    vmag: 5,
  },
  {
    satid: 25107,
    vmag: 4,
  },
  {
    satid: 25108,
    vmag: 6,
  },
  {
    satid: 25109,
    vmag: 3,
  },
  {
    satid: 25111,
    vmag: 2.5,
  },
  {
    satid: 25112,
    vmag: 8,
  },
  {
    satid: 25113,
    vmag: 7.5,
  },
  {
    satid: 25114,
    vmag: 7,
  },
  {
    satid: 25115,
    vmag: 7,
  },
  {
    satid: 25116,
    vmag: 8.5,
  },
  {
    satid: 25117,
    vmag: 8,
  },
  {
    satid: 25118,
    vmag: 8.5,
  },
  {
    satid: 25119,
    vmag: 7.5,
  },
  {
    satid: 25120,
    vmag: 6.5,
  },
  {
    satid: 25121,
    vmag: 7,
  },
  {
    satid: 25126,
    vmag: 4,
  },
  {
    satid: 25129,
    vmag: 2.5,
  },
  {
    satid: 25135,
    vmag: 3.5,
  },
  {
    satid: 25136,
    vmag: 5.5,
  },
  {
    satid: 25138,
    vmag: 7,
  },
  {
    satid: 25152,
    vmag: 5,
  },
  {
    satid: 25154,
    vmag: 3,
  },
  {
    satid: 25155,
    vmag: 4,
  },
  {
    satid: 25157,
    vmag: 5.5,
  },
  {
    satid: 25158,
    vmag: 7.5,
  },
  {
    satid: 25159,
    vmag: 8,
  },
  {
    satid: 25160,
    vmag: 4.5,
  },
  {
    satid: 25161,
    vmag: 7,
  },
  {
    satid: 25162,
    vmag: 4.5,
  },
  {
    satid: 25163,
    vmag: 4.5,
  },
  {
    satid: 25164,
    vmag: 4.5,
  },
  {
    satid: 25165,
    vmag: 4.5,
  },
  {
    satid: 25166,
    vmag: 3.5,
  },
  {
    satid: 25169,
    vmag: 6,
  },
  {
    satid: 25170,
    vmag: 5.5,
  },
  {
    satid: 25171,
    vmag: 5.5,
  },
  {
    satid: 25172,
    vmag: 6,
  },
  {
    satid: 25173,
    vmag: 5.5,
  },
  {
    satid: 25175,
    vmag: 3,
  },
  {
    satid: 25176,
    vmag: 2.5,
  },
  {
    satid: 25239,
    vmag: 4,
  },
  {
    satid: 25240,
    vmag: 2.5,
  },
  {
    satid: 25259,
    vmag: 3,
  },
  {
    satid: 25260,
    vmag: 4,
  },
  {
    satid: 25261,
    vmag: 4,
  },
  {
    satid: 25262,
    vmag: 5,
  },
  {
    satid: 25263,
    vmag: 6,
  },
  {
    satid: 25272,
    vmag: 6,
  },
  {
    satid: 25273,
    vmag: 5.5,
  },
  {
    satid: 25274,
    vmag: 5.5,
  },
  {
    satid: 25275,
    vmag: 5,
  },
  {
    satid: 25276,
    vmag: 5.5,
  },
  {
    satid: 25279,
    vmag: 2.5,
  },
  {
    satid: 25280,
    vmag: 5.5,
  },
  {
    satid: 25281,
    vmag: 6,
  },
  {
    satid: 25285,
    vmag: 5.8,
  },
  {
    satid: 25286,
    vmag: 5.5,
  },
  {
    satid: 25287,
    vmag: 5.5,
  },
  {
    satid: 25288,
    vmag: 5.5,
  },
  {
    satid: 25289,
    vmag: 6,
  },
  {
    satid: 25290,
    vmag: 5.5,
  },
  {
    satid: 25291,
    vmag: 6,
  },
  {
    satid: 25294,
    vmag: 5.5,
  },
  {
    satid: 25297,
    vmag: 1,
  },
  {
    satid: 25306,
    vmag: 4.5,
  },
  {
    satid: 25307,
    vmag: 4.5,
  },
  {
    satid: 25308,
    vmag: 4.5,
  },
  {
    satid: 25309,
    vmag: 4.5,
  },
  {
    satid: 25310,
    vmag: 3.5,
  },
  {
    satid: 25312,
    vmag: 5,
  },
  {
    satid: 25313,
    vmag: 3,
  },
  {
    satid: 25314,
    vmag: 3,
  },
  {
    satid: 25319,
    vmag: 5.5,
  },
  {
    satid: 25320,
    vmag: 5.5,
  },
  {
    satid: 25322,
    vmag: 3,
  },
  {
    satid: 25330,
    vmag: 4.5,
  },
  {
    satid: 25331,
    vmag: 4,
  },
  {
    satid: 25334,
    vmag: 3,
  },
  {
    satid: 25338,
    vmag: 4.5,
  },
  {
    satid: 25339,
    vmag: 3,
  },
  {
    satid: 25342,
    vmag: 5.5,
  },
  {
    satid: 25343,
    vmag: 5.5,
  },
  {
    satid: 25344,
    vmag: 5,
  },
  {
    satid: 25345,
    vmag: 5,
  },
  {
    satid: 25346,
    vmag: 6,
  },
  {
    satid: 25349,
    vmag: 2,
  },
  {
    satid: 25359,
    vmag: 3.5,
  },
  {
    satid: 25360,
    vmag: 5,
  },
  {
    satid: 25364,
    vmag: 6.5,
  },
  {
    satid: 25365,
    vmag: 6.3,
  },
  {
    satid: 25366,
    vmag: 6.3,
  },
  {
    satid: 25368,
    vmag: 6.3,
  },
  {
    satid: 25369,
    vmag: 4,
  },
  {
    satid: 25371,
    vmag: 4,
  },
  {
    satid: 25372,
    vmag: 3,
  },
  {
    satid: 25376,
    vmag: 3.5,
  },
  {
    satid: 25379,
    vmag: 3.5,
  },
  {
    satid: 25381,
    vmag: 5.5,
  },
  {
    satid: 25382,
    vmag: 4.5,
  },
  {
    satid: 25391,
    vmag: 4.5,
  },
  {
    satid: 25394,
    vmag: 5,
  },
  {
    satid: 25396,
    vmag: 9,
  },
  {
    satid: 25397,
    vmag: 8.5,
  },
  {
    satid: 25398,
    vmag: 8,
  },
  {
    satid: 25399,
    vmag: 8,
  },
  {
    satid: 25400,
    vmag: 2,
  },
  {
    satid: 25405,
    vmag: 2,
  },
  {
    satid: 25406,
    vmag: 4,
  },
  {
    satid: 25407,
    vmag: 2,
  },
  {
    satid: 25413,
    vmag: 8,
  },
  {
    satid: 25414,
    vmag: 7.5,
  },
  {
    satid: 25415,
    vmag: 8.5,
  },
  {
    satid: 25416,
    vmag: 7.5,
  },
  {
    satid: 25417,
    vmag: 8,
  },
  {
    satid: 25418,
    vmag: 8,
  },
  {
    satid: 25419,
    vmag: 7.5,
  },
  {
    satid: 25420,
    vmag: 8,
  },
  {
    satid: 25422,
    vmag: 7.5,
  },
  {
    satid: 25431,
    vmag: 5.5,
  },
  {
    satid: 25432,
    vmag: 5.5,
  },
  {
    satid: 25461,
    vmag: 3,
  },
  {
    satid: 25465,
    vmag: 2.5,
  },
  {
    satid: 25467,
    vmag: 5.5,
  },
  {
    satid: 25468,
    vmag: 5.5,
  },
  {
    satid: 25469,
    vmag: 6,
  },
  {
    satid: 25470,
    vmag: 5.5,
  },
  {
    satid: 25471,
    vmag: 5.5,
  },
  {
    satid: 25475,
    vmag: 7,
  },
  {
    satid: 25476,
    vmag: 7.5,
  },
  {
    satid: 25477,
    vmag: 8,
  },
  {
    satid: 25478,
    vmag: 7.5,
  },
  {
    satid: 25479,
    vmag: 7,
  },
  {
    satid: 25480,
    vmag: 7.5,
  },
  {
    satid: 25481,
    vmag: 7,
  },
  {
    satid: 25482,
    vmag: 7.5,
  },
  {
    satid: 25484,
    vmag: 6,
  },
  {
    satid: 25485,
    vmag: 5,
  },
  {
    satid: 25488,
    vmag: 4.5,
  },
  {
    satid: 25489,
    vmag: 7,
  },
  {
    satid: 25490,
    vmag: 5.5,
  },
  {
    satid: 25493,
    vmag: 3,
  },
  {
    satid: 25494,
    vmag: 3.5,
  },
  {
    satid: 25496,
    vmag: 3.5,
  },
  {
    satid: 25502,
    vmag: 2.5,
  },
  {
    satid: 25503,
    vmag: 3.5,
  },
  {
    satid: 25504,
    vmag: 7,
  },
  {
    satid: 25506,
    vmag: 6,
  },
  {
    satid: 25509,
    vmag: 8,
  },
  {
    satid: 25510,
    vmag: 3.5,
  },
  {
    satid: 25516,
    vmag: 4,
  },
  {
    satid: 25518,
    vmag: 3.5,
  },
  {
    satid: 25520,
    vmag: 8.5,
  },
  {
    satid: 25525,
    vmag: 3,
  },
  {
    satid: 25527,
    vmag: 4.5,
  },
  {
    satid: 25528,
    vmag: 5.5,
  },
  {
    satid: 25529,
    vmag: 6,
  },
  {
    satid: 25530,
    vmag: 5.5,
  },
  {
    satid: 25531,
    vmag: 5,
  },
  {
    satid: 25542,
    vmag: 4,
  },
  {
    satid: 25543,
    vmag: 3.5,
  },
  {
    satid: 25544,
    vmag: 2.5,
  },
  {
    satid: 25547,
    vmag: 3.5,
  },
  {
    satid: 25548,
    vmag: 5.5,
  },
  {
    satid: 25550,
    vmag: 7.5,
  },
  {
    satid: 25559,
    vmag: 3,
  },
  {
    satid: 25560,
    vmag: 5,
  },
  {
    satid: 25561,
    vmag: 5.5,
  },
  {
    satid: 25567,
    vmag: 4.5,
  },
  {
    satid: 25568,
    vmag: 7,
  },
  {
    satid: 25569,
    vmag: 4,
  },
  {
    satid: 25577,
    vmag: 5.5,
  },
  {
    satid: 25578,
    vmag: 5.5,
  },
  {
    satid: 25585,
    vmag: 5,
  },
  {
    satid: 25586,
    vmag: 3,
  },
  {
    satid: 25590,
    vmag: 4.5,
  },
  {
    satid: 25592,
    vmag: 4,
  },
  {
    satid: 25607,
    vmag: 3.5,
  },
  {
    satid: 25615,
    vmag: 5,
  },
  {
    satid: 25616,
    vmag: 5.5,
  },
  {
    satid: 25619,
    vmag: 4,
  },
  {
    satid: 25621,
    vmag: 4,
  },
  {
    satid: 25622,
    vmag: 4,
  },
  {
    satid: 25623,
    vmag: 3.5,
  },
  {
    satid: 25624,
    vmag: 4,
  },
  {
    satid: 25625,
    vmag: 2.5,
  },
  {
    satid: 25626,
    vmag: 4,
  },
  {
    satid: 25629,
    vmag: 3,
  },
  {
    satid: 25634,
    vmag: 3,
  },
  {
    satid: 25635,
    vmag: 7.5,
  },
  {
    satid: 25636,
    vmag: 8.5,
  },
  {
    satid: 25637,
    vmag: 4,
  },
  {
    satid: 25640,
    vmag: 3,
  },
  {
    satid: 25641,
    vmag: 4,
  },
  {
    satid: 25646,
    vmag: 6,
  },
  {
    satid: 25647,
    vmag: 6,
  },
  {
    satid: 25649,
    vmag: 4,
  },
  {
    satid: 25650,
    vmag: 4,
  },
  {
    satid: 25651,
    vmag: 4,
  },
  {
    satid: 25652,
    vmag: 4.5,
  },
  {
    satid: 25660,
    vmag: 3.5,
  },
  {
    satid: 25662,
    vmag: 2.5,
  },
  {
    satid: 25667,
    vmag: 3,
  },
  {
    satid: 25668,
    vmag: 4,
  },
  {
    satid: 25669,
    vmag: 4,
  },
  {
    satid: 25670,
    vmag: 2,
  },
  {
    satid: 25674,
    vmag: 3,
  },
  {
    satid: 25676,
    vmag: 4.5,
  },
  {
    satid: 25677,
    vmag: 4,
  },
  {
    satid: 25678,
    vmag: 4,
  },
  {
    satid: 25679,
    vmag: 4,
  },
  {
    satid: 25680,
    vmag: 3,
  },
  {
    satid: 25682,
    vmag: 4,
  },
  {
    satid: 25685,
    vmag: 6,
  },
  {
    satid: 25693,
    vmag: 7.5,
  },
  {
    satid: 25694,
    vmag: 7,
  },
  {
    satid: 25695,
    vmag: 4.5,
  },
  {
    satid: 25721,
    vmag: 4,
  },
  {
    satid: 25722,
    vmag: 8,
  },
  {
    satid: 25723,
    vmag: 3.5,
  },
  {
    satid: 25724,
    vmag: 2,
  },
  {
    satid: 25725,
    vmag: 2,
  },
  {
    satid: 25727,
    vmag: 4.5,
  },
  {
    satid: 25728,
    vmag: 2.5,
  },
  {
    satid: 25730,
    vmag: 4.5,
  },
  {
    satid: 25731,
    vmag: 5,
  },
  {
    satid: 25732,
    vmag: 3.5,
  },
  {
    satid: 25733,
    vmag: 4,
  },
  {
    satid: 25735,
    vmag: 6.5,
  },
  {
    satid: 25736,
    vmag: 7,
  },
  {
    satid: 25737,
    vmag: 6.5,
  },
  {
    satid: 25738,
    vmag: 6.5,
  },
  {
    satid: 25739,
    vmag: 8,
  },
  {
    satid: 25740,
    vmag: 4.5,
  },
  {
    satid: 25743,
    vmag: 3,
  },
  {
    satid: 25744,
    vmag: 2,
  },
  {
    satid: 25746,
    vmag: 2,
  },
  {
    satid: 25770,
    vmag: 4.5,
  },
  {
    satid: 25771,
    vmag: 4,
  },
  {
    satid: 25772,
    vmag: 4,
  },
  {
    satid: 25773,
    vmag: 4,
  },
  {
    satid: 25774,
    vmag: 4,
  },
  {
    satid: 25776,
    vmag: 6,
  },
  {
    satid: 25777,
    vmag: 6,
  },
  {
    satid: 25778,
    vmag: 5.5,
  },
  {
    satid: 25788,
    vmag: 3,
  },
  {
    satid: 25789,
    vmag: 5.5,
  },
  {
    satid: 25790,
    vmag: 2.5,
  },
  {
    satid: 25791,
    vmag: 4,
  },
  {
    satid: 25798,
    vmag: 7,
  },
  {
    satid: 25847,
    vmag: 4,
  },
  {
    satid: 25850,
    vmag: 4,
  },
  {
    satid: 25851,
    vmag: 4,
  },
  {
    satid: 25852,
    vmag: 4,
  },
  {
    satid: 25853,
    vmag: 4,
  },
  {
    satid: 25854,
    vmag: 4,
  },
  {
    satid: 25855,
    vmag: 3.5,
  },
  {
    satid: 25860,
    vmag: 3,
  },
  {
    satid: 25861,
    vmag: 2,
  },
  {
    satid: 25867,
    vmag: 2.5,
  },
  {
    satid: 25868,
    vmag: 2.5,
  },
  {
    satid: 25872,
    vmag: 4,
  },
  {
    satid: 25873,
    vmag: 4,
  },
  {
    satid: 25874,
    vmag: 4.5,
  },
  {
    satid: 25875,
    vmag: 4.5,
  },
  {
    satid: 25876,
    vmag: 3.5,
  },
  {
    satid: 25881,
    vmag: 3,
  },
  {
    satid: 25883,
    vmag: 4.5,
  },
  {
    satid: 25884,
    vmag: 4.5,
  },
  {
    satid: 25885,
    vmag: 4,
  },
  {
    satid: 25886,
    vmag: 4.5,
  },
  {
    satid: 25887,
    vmag: 4,
  },
  {
    satid: 25892,
    vmag: 4.5,
  },
  {
    satid: 25893,
    vmag: 3.5,
  },
  {
    satid: 25895,
    vmag: 3,
  },
  {
    satid: 25900,
    vmag: 4,
  },
  {
    satid: 25907,
    vmag: 4,
  },
  {
    satid: 25908,
    vmag: 4.5,
  },
  {
    satid: 25909,
    vmag: 4,
  },
  {
    satid: 25910,
    vmag: 4,
  },
  {
    satid: 25916,
    vmag: 6,
  },
  {
    satid: 25919,
    vmag: 5,
  },
  {
    satid: 25927,
    vmag: 3,
  },
  {
    satid: 25935,
    vmag: 5.5,
  },
  {
    satid: 25937,
    vmag: 3,
  },
  {
    satid: 25938,
    vmag: 3,
  },
  {
    satid: 25940,
    vmag: 4,
  },
  {
    satid: 25942,
    vmag: 4.5,
  },
  {
    satid: 25943,
    vmag: 4.5,
  },
  {
    satid: 25944,
    vmag: 4.7,
  },
  {
    satid: 25945,
    vmag: 4.7,
  },
  {
    satid: 25946,
    vmag: 4.5,
  },
  {
    satid: 25954,
    vmag: 3.5,
  },
  {
    satid: 25955,
    vmag: 2.5,
  },
  {
    satid: 25961,
    vmag: 4,
  },
  {
    satid: 25962,
    vmag: 4,
  },
  {
    satid: 25963,
    vmag: 5,
  },
  {
    satid: 25964,
    vmag: 4,
  },
  {
    satid: 25965,
    vmag: 3.5,
  },
  {
    satid: 25968,
    vmag: 3,
  },
  {
    satid: 25977,
    vmag: 5,
  },
  {
    satid: 25978,
    vmag: 7,
  },
  {
    satid: 25979,
    vmag: 3,
  },
  {
    satid: 25980,
    vmag: 8,
  },
  {
    satid: 25981,
    vmag: 9,
  },
  {
    satid: 25982,
    vmag: 9,
  },
  {
    satid: 25983,
    vmag: 8,
  },
  {
    satid: 25984,
    vmag: 8.5,
  },
  {
    satid: 25985,
    vmag: 7.5,
  },
  {
    satid: 25986,
    vmag: 8,
  },
  {
    satid: 25987,
    vmag: 7,
  },
  {
    satid: 25989,
    vmag: 3.5,
  },
  {
    satid: 25990,
    vmag: 3,
  },
  {
    satid: 25991,
    vmag: 5,
  },
  {
    satid: 25994,
    vmag: 2,
  },
  {
    satid: 25996,
    vmag: 1,
  },
  {
    satid: 26032,
    vmag: 5.5,
  },
  {
    satid: 26033,
    vmag: 8,
  },
  {
    satid: 26034,
    vmag: 7,
  },
  {
    satid: 26035,
    vmag: 5.5,
  },
  {
    satid: 26038,
    vmag: 4,
  },
  {
    satid: 26039,
    vmag: 3,
  },
  {
    satid: 26040,
    vmag: 2.5,
  },
  {
    satid: 26043,
    vmag: 3,
  },
  {
    satid: 26045,
    vmag: 4.5,
  },
  {
    satid: 26053,
    vmag: 2.5,
  },
  {
    satid: 26054,
    vmag: 4,
  },
  {
    satid: 26057,
    vmag: 3.5,
  },
  {
    satid: 26059,
    vmag: 2.5,
  },
  {
    satid: 26062,
    vmag: 3.5,
  },
  {
    satid: 26063,
    vmag: 7.5,
  },
  {
    satid: 26064,
    vmag: 9,
  },
  {
    satid: 26065,
    vmag: 6,
  },
  {
    satid: 26066,
    vmag: 6,
  },
  {
    satid: 26069,
    vmag: 3.5,
  },
  {
    satid: 26070,
    vmag: 2,
  },
  {
    satid: 26072,
    vmag: 3.5,
  },
  {
    satid: 26081,
    vmag: 4,
  },
  {
    satid: 26082,
    vmag: 4.5,
  },
  {
    satid: 26083,
    vmag: 4.5,
  },
  {
    satid: 26084,
    vmag: 4.5,
  },
  {
    satid: 26086,
    vmag: 5.5,
  },
  {
    satid: 26090,
    vmag: 3.5,
  },
  {
    satid: 26096,
    vmag: 3,
  },
  {
    satid: 26102,
    vmag: 5,
  },
  {
    satid: 26103,
    vmag: 6,
  },
  {
    satid: 26106,
    vmag: 4.5,
  },
  {
    satid: 26109,
    vmag: 2.5,
  },
  {
    satid: 26110,
    vmag: 3.5,
  },
  {
    satid: 26113,
    vmag: 5,
  },
  {
    satid: 26115,
    vmag: 4.5,
  },
  {
    satid: 26121,
    vmag: 5,
  },
  {
    satid: 26139,
    vmag: 7.5,
  },
  {
    satid: 26141,
    vmag: 5.5,
  },
  {
    satid: 26186,
    vmag: 6.5,
  },
  {
    satid: 26220,
    vmag: 5.5,
  },
  {
    satid: 26222,
    vmag: 5,
  },
  {
    satid: 26298,
    vmag: 3.5,
  },
  {
    satid: 26299,
    vmag: 3,
  },
  {
    satid: 26338,
    vmag: 7.5,
  },
  {
    satid: 26353,
    vmag: 2.5,
  },
  {
    satid: 26354,
    vmag: 2.5,
  },
  {
    satid: 26357,
    vmag: 2,
  },
  {
    satid: 26361,
    vmag: 3.5,
  },
  {
    satid: 26362,
    vmag: 5.5,
  },
  {
    satid: 26365,
    vmag: 5.5,
  },
  {
    satid: 26366,
    vmag: 5.5,
  },
  {
    satid: 26370,
    vmag: 3,
  },
  {
    satid: 26374,
    vmag: 4.5,
  },
  {
    satid: 26375,
    vmag: 6.5,
  },
  {
    satid: 26377,
    vmag: 3.5,
  },
  {
    satid: 26383,
    vmag: 2.5,
  },
  {
    satid: 26384,
    vmag: 6,
  },
  {
    satid: 26387,
    vmag: 4,
  },
  {
    satid: 26389,
    vmag: 2.5,
  },
  {
    satid: 26390,
    vmag: 4,
  },
  {
    satid: 26398,
    vmag: 6,
  },
  {
    satid: 26402,
    vmag: 5,
  },
  {
    satid: 26403,
    vmag: 2.5,
  },
  {
    satid: 26404,
    vmag: 7,
  },
  {
    satid: 26405,
    vmag: 6,
  },
  {
    satid: 26406,
    vmag: 3,
  },
  {
    satid: 26408,
    vmag: 4,
  },
  {
    satid: 26409,
    vmag: 5.5,
  },
  {
    satid: 26415,
    vmag: 7,
  },
  {
    satid: 26451,
    vmag: 4,
  },
  {
    satid: 26452,
    vmag: 3,
  },
  {
    satid: 26469,
    vmag: 5,
  },
  {
    satid: 26471,
    vmag: 4,
  },
  {
    satid: 26473,
    vmag: 2,
  },
  {
    satid: 26474,
    vmag: 2,
  },
  {
    satid: 26475,
    vmag: 3,
  },
  {
    satid: 26476,
    vmag: 4,
  },
  {
    satid: 26481,
    vmag: 4,
  },
  {
    satid: 26483,
    vmag: 4,
  },
  {
    satid: 26486,
    vmag: 3,
  },
  {
    satid: 26488,
    vmag: 3,
  },
  {
    satid: 26490,
    vmag: 3.5,
  },
  {
    satid: 26496,
    vmag: 4,
  },
  {
    satid: 26497,
    vmag: 4,
  },
  {
    satid: 26500,
    vmag: 6,
  },
  {
    satid: 26536,
    vmag: 5,
  },
  {
    satid: 26538,
    vmag: 2,
  },
  {
    satid: 26546,
    vmag: 8.5,
  },
  {
    satid: 26548,
    vmag: 8,
  },
  {
    satid: 26550,
    vmag: 4,
  },
  {
    satid: 26551,
    vmag: 6.5,
  },
  {
    satid: 26557,
    vmag: 3,
  },
  {
    satid: 26560,
    vmag: 3.5,
  },
  {
    satid: 26573,
    vmag: 6.5,
  },
  {
    satid: 26576,
    vmag: 0,
  },
  {
    satid: 26579,
    vmag: 3,
  },
  {
    satid: 26580,
    vmag: 3.5,
  },
  {
    satid: 26583,
    vmag: 3,
  },
  {
    satid: 26591,
    vmag: 3,
  },
  {
    satid: 26606,
    vmag: 3.5,
  },
  {
    satid: 26607,
    vmag: 5.5,
  },
  {
    satid: 26608,
    vmag: 4,
  },
  {
    satid: 26612,
    vmag: 3.5,
  },
  {
    satid: 26613,
    vmag: 4,
  },
  {
    satid: 26619,
    vmag: 6,
  },
  {
    satid: 26620,
    vmag: 5.5,
  },
  {
    satid: 26622,
    vmag: 4,
  },
  {
    satid: 26623,
    vmag: 4,
  },
  {
    satid: 26624,
    vmag: 4,
  },
  {
    satid: 26625,
    vmag: 3.5,
  },
  {
    satid: 26631,
    vmag: 6,
  },
  {
    satid: 26632,
    vmag: 5.5,
  },
  {
    satid: 26640,
    vmag: 5.5,
  },
  {
    satid: 26641,
    vmag: 3,
  },
  {
    satid: 26642,
    vmag: 4,
  },
  {
    satid: 26644,
    vmag: 1.5,
  },
  {
    satid: 26664,
    vmag: 3,
  },
  {
    satid: 26682,
    vmag: 7,
  },
  {
    satid: 26687,
    vmag: 4,
  },
  {
    satid: 26691,
    vmag: 4,
  },
  {
    satid: 26692,
    vmag: 5.5,
  },
  {
    satid: 26696,
    vmag: 3,
  },
  {
    satid: 26697,
    vmag: 4.5,
  },
  {
    satid: 26702,
    vmag: 6,
  },
  {
    satid: 26703,
    vmag: 5.5,
  },
  {
    satid: 26716,
    vmag: 2,
  },
  {
    satid: 26721,
    vmag: 4,
  },
  {
    satid: 26722,
    vmag: 2.5,
  },
  {
    satid: 26724,
    vmag: 4,
  },
  {
    satid: 26725,
    vmag: 3,
  },
  {
    satid: 26729,
    vmag: 4,
  },
  {
    satid: 26737,
    vmag: 3.5,
  },
  {
    satid: 26739,
    vmag: 4,
  },
  {
    satid: 26742,
    vmag: 7,
  },
  {
    satid: 26746,
    vmag: 4,
  },
  {
    satid: 26747,
    vmag: 0.5,
  },
  {
    satid: 26761,
    vmag: 3,
  },
  {
    satid: 26762,
    vmag: 3,
  },
  {
    satid: 26769,
    vmag: 2.5,
  },
  {
    satid: 26771,
    vmag: 4,
  },
  {
    satid: 26818,
    vmag: 5,
  },
  {
    satid: 26819,
    vmag: 4,
  },
  {
    satid: 26855,
    vmag: 3,
  },
  {
    satid: 26857,
    vmag: 3.5,
  },
  {
    satid: 26858,
    vmag: 2,
  },
  {
    satid: 26864,
    vmag: 5.5,
  },
  {
    satid: 26865,
    vmag: 3.5,
  },
  {
    satid: 26866,
    vmag: 4,
  },
  {
    satid: 26867,
    vmag: 4.5,
  },
  {
    satid: 26870,
    vmag: 4.5,
  },
  {
    satid: 26871,
    vmag: 4,
  },
  {
    satid: 26873,
    vmag: 3.5,
  },
  {
    satid: 26874,
    vmag: 3,
  },
  {
    satid: 26881,
    vmag: 2,
  },
  {
    satid: 26885,
    vmag: 3,
  },
  {
    satid: 26897,
    vmag: 6.5,
  },
  {
    satid: 26898,
    vmag: 7,
  },
  {
    satid: 26899,
    vmag: 2,
  },
  {
    satid: 26901,
    vmag: 3,
  },
  {
    satid: 26905,
    vmag: 3,
  },
  {
    satid: 26906,
    vmag: 2,
  },
  {
    satid: 26907,
    vmag: 3,
  },
  {
    satid: 26929,
    vmag: 9,
  },
  {
    satid: 26930,
    vmag: 9,
  },
  {
    satid: 26931,
    vmag: 9.5,
  },
  {
    satid: 26934,
    vmag: 3,
  },
  {
    satid: 26960,
    vmag: 4.5,
  },
  {
    satid: 26970,
    vmag: 4.5,
  },
  {
    satid: 26985,
    vmag: 3.5,
  },
  {
    satid: 26987,
    vmag: 4.5,
  },
  {
    satid: 26992,
    vmag: 3,
  },
  {
    satid: 26997,
    vmag: 4,
  },
  {
    satid: 26998,
    vmag: 5,
  },
  {
    satid: 27000,
    vmag: 4,
  },
  {
    satid: 27001,
    vmag: 4.5,
  },
  {
    satid: 27002,
    vmag: 7.5,
  },
  {
    satid: 27003,
    vmag: 8,
  },
  {
    satid: 27004,
    vmag: 8,
  },
  {
    satid: 27005,
    vmag: 8,
  },
  {
    satid: 27006,
    vmag: 2,
  },
  {
    satid: 27053,
    vmag: 2,
  },
  {
    satid: 27055,
    vmag: 6.5,
  },
  {
    satid: 27056,
    vmag: 6.7,
  },
  {
    satid: 27057,
    vmag: 6.5,
  },
  {
    satid: 27058,
    vmag: 6.5,
  },
  {
    satid: 27059,
    vmag: 6.5,
  },
  {
    satid: 27060,
    vmag: 6.5,
  },
  {
    satid: 27061,
    vmag: 4,
  },
  {
    satid: 27124,
    vmag: 9.5,
  },
  {
    satid: 27168,
    vmag: 1.5,
  },
  {
    satid: 27169,
    vmag: 2,
  },
  {
    satid: 27299,
    vmag: 3,
  },
  {
    satid: 27367,
    vmag: 5.5,
  },
  {
    satid: 27368,
    vmag: 3,
  },
  {
    satid: 27369,
    vmag: 2,
  },
  {
    satid: 27370,
    vmag: 6.5,
  },
  {
    satid: 27371,
    vmag: 6,
  },
  {
    satid: 27372,
    vmag: 5.5,
  },
  {
    satid: 27373,
    vmag: 5.5,
  },
  {
    satid: 27374,
    vmag: 5.5,
  },
  {
    satid: 27375,
    vmag: 5.5,
  },
  {
    satid: 27376,
    vmag: 5.5,
  },
  {
    satid: 27377,
    vmag: 3.5,
  },
  {
    satid: 27378,
    vmag: 3,
  },
  {
    satid: 27379,
    vmag: 3.5,
  },
  {
    satid: 27386,
    vmag: 3,
  },
  {
    satid: 27387,
    vmag: 2.5,
  },
  {
    satid: 27389,
    vmag: 3,
  },
  {
    satid: 27390,
    vmag: 2,
  },
  {
    satid: 27391,
    vmag: 5.5,
  },
  {
    satid: 27392,
    vmag: 5.5,
  },
  {
    satid: 27401,
    vmag: 3.5,
  },
  {
    satid: 27402,
    vmag: 3,
  },
  {
    satid: 27404,
    vmag: 3,
  },
  {
    satid: 27408,
    vmag: 4,
  },
  {
    satid: 27409,
    vmag: 3.5,
  },
  {
    satid: 27412,
    vmag: 4,
  },
  {
    satid: 27415,
    vmag: 2.5,
  },
  {
    satid: 27421,
    vmag: 3,
  },
  {
    satid: 27422,
    vmag: 2.5,
  },
  {
    satid: 27424,
    vmag: 4,
  },
  {
    satid: 27426,
    vmag: 4,
  },
  {
    satid: 27427,
    vmag: 1,
  },
  {
    satid: 27429,
    vmag: 2.5,
  },
  {
    satid: 27430,
    vmag: 6,
  },
  {
    satid: 27431,
    vmag: 4,
  },
  {
    satid: 27432,
    vmag: 3,
  },
  {
    satid: 27433,
    vmag: 4,
  },
  {
    satid: 27434,
    vmag: 6,
  },
  {
    satid: 27435,
    vmag: 4.5,
  },
  {
    satid: 27436,
    vmag: 4.5,
  },
  {
    satid: 27437,
    vmag: 4,
  },
  {
    satid: 27439,
    vmag: 3,
  },
  {
    satid: 27440,
    vmag: 0.1,
  },
  {
    satid: 27445,
    vmag: 4,
  },
  {
    satid: 27446,
    vmag: 3,
  },
  {
    satid: 27450,
    vmag: 6,
  },
  {
    satid: 27451,
    vmag: 5.5,
  },
  {
    satid: 27452,
    vmag: 4,
  },
  {
    satid: 27453,
    vmag: 5,
  },
  {
    satid: 27454,
    vmag: 3,
  },
  {
    satid: 27459,
    vmag: 5.5,
  },
  {
    satid: 27462,
    vmag: 3,
  },
  {
    satid: 27463,
    vmag: 3,
  },
  {
    satid: 27464,
    vmag: 6.5,
  },
  {
    satid: 27465,
    vmag: 7,
  },
  {
    satid: 27466,
    vmag: 3.5,
  },
  {
    satid: 27470,
    vmag: 3.5,
  },
  {
    satid: 27473,
    vmag: 3,
  },
  {
    satid: 27474,
    vmag: 6,
  },
  {
    satid: 27475,
    vmag: 6,
  },
  {
    satid: 27476,
    vmag: 8,
  },
  {
    satid: 27494,
    vmag: 5,
  },
  {
    satid: 27500,
    vmag: 3.5,
  },
  {
    satid: 27501,
    vmag: 5,
  },
  {
    satid: 27504,
    vmag: 3,
  },
  {
    satid: 27510,
    vmag: 3,
  },
  {
    satid: 27511,
    vmag: 3.5,
  },
  {
    satid: 27515,
    vmag: 5,
  },
  {
    satid: 27517,
    vmag: 4,
  },
  {
    satid: 27518,
    vmag: 2,
  },
  {
    satid: 27519,
    vmag: 3,
  },
  {
    satid: 27520,
    vmag: 3,
  },
  {
    satid: 27526,
    vmag: 4,
  },
  {
    satid: 27529,
    vmag: 2,
  },
  {
    satid: 27534,
    vmag: 5.5,
  },
  {
    satid: 27535,
    vmag: 4,
  },
  {
    satid: 27537,
    vmag: 0.1,
  },
  {
    satid: 27540,
    vmag: 2.5,
  },
  {
    satid: 27541,
    vmag: 3,
  },
  {
    satid: 27542,
    vmag: 3.5,
  },
  {
    satid: 27550,
    vmag: 4,
  },
  {
    satid: 27551,
    vmag: 3.5,
  },
  {
    satid: 27555,
    vmag: 3,
  },
  {
    satid: 27556,
    vmag: 0.5,
  },
  {
    satid: 27560,
    vmag: 7.5,
  },
  {
    satid: 27561,
    vmag: 3.5,
  },
  {
    satid: 27566,
    vmag: 4,
  },
  {
    satid: 27567,
    vmag: 2,
  },
  {
    satid: 27593,
    vmag: 3.5,
  },
  {
    satid: 27597,
    vmag: 2,
  },
  {
    satid: 27598,
    vmag: 9,
  },
  {
    satid: 27599,
    vmag: 9,
  },
  {
    satid: 27600,
    vmag: 8.5,
  },
  {
    satid: 27601,
    vmag: 2,
  },
  {
    satid: 27604,
    vmag: 3,
  },
  {
    satid: 27605,
    vmag: 8,
  },
  {
    satid: 27608,
    vmag: 7.5,
  },
  {
    satid: 27609,
    vmag: 5,
  },
  {
    satid: 27610,
    vmag: 4,
  },
  {
    satid: 27611,
    vmag: 5.5,
  },
  {
    satid: 27616,
    vmag: 3.5,
  },
  {
    satid: 27617,
    vmag: 3,
  },
  {
    satid: 27618,
    vmag: 3,
  },
  {
    satid: 27619,
    vmag: 3,
  },
  {
    satid: 27630,
    vmag: 3,
  },
  {
    satid: 27632,
    vmag: 5,
  },
  {
    satid: 27633,
    vmag: 4,
  },
  {
    satid: 27634,
    vmag: 3.5,
  },
  {
    satid: 27640,
    vmag: 4,
  },
  {
    satid: 27641,
    vmag: 3,
  },
  {
    satid: 27642,
    vmag: 5,
  },
  {
    satid: 27643,
    vmag: 8.5,
  },
  {
    satid: 27644,
    vmag: 4,
  },
  {
    satid: 27646,
    vmag: 3.5,
  },
  {
    satid: 27651,
    vmag: 6.5,
  },
  {
    satid: 27652,
    vmag: 6,
  },
  {
    satid: 27664,
    vmag: 9,
  },
  {
    satid: 27665,
    vmag: 3.5,
  },
  {
    satid: 27666,
    vmag: 5.5,
  },
  {
    satid: 27667,
    vmag: 4,
  },
  {
    satid: 27698,
    vmag: 3,
  },
  {
    satid: 27699,
    vmag: 2.5,
  },
  {
    satid: 27700,
    vmag: 2,
  },
  {
    satid: 27701,
    vmag: 3,
  },
  {
    satid: 27702,
    vmag: 5.5,
  },
  {
    satid: 27703,
    vmag: 5.5,
  },
  {
    satid: 27705,
    vmag: 3.5,
  },
  {
    satid: 27706,
    vmag: 5.5,
  },
  {
    satid: 27707,
    vmag: 4,
  },
  {
    satid: 27710,
    vmag: 4.5,
  },
  {
    satid: 27711,
    vmag: 2,
  },
  {
    satid: 27712,
    vmag: 2,
  },
  {
    satid: 27715,
    vmag: 4,
  },
  {
    satid: 27716,
    vmag: 4,
  },
  {
    satid: 27717,
    vmag: 2.5,
  },
  {
    satid: 27719,
    vmag: 2.5,
  },
  {
    satid: 27740,
    vmag: 3.5,
  },
  {
    satid: 27745,
    vmag: 6,
  },
  {
    satid: 27783,
    vmag: 6,
  },
  {
    satid: 27784,
    vmag: 6,
  },
  {
    satid: 27785,
    vmag: 3.5,
  },
  {
    satid: 27786,
    vmag: 3.5,
  },
  {
    satid: 27808,
    vmag: 2.5,
  },
  {
    satid: 27814,
    vmag: 2,
  },
  {
    satid: 27818,
    vmag: 5,
  },
  {
    satid: 27819,
    vmag: 4,
  },
  {
    satid: 27820,
    vmag: 2.5,
  },
  {
    satid: 27821,
    vmag: 3,
  },
  {
    satid: 27823,
    vmag: 3,
  },
  {
    satid: 27826,
    vmag: 3,
  },
  {
    satid: 27829,
    vmag: 3.5,
  },
  {
    satid: 27832,
    vmag: 3.5,
  },
  {
    satid: 27833,
    vmag: 2.5,
  },
  {
    satid: 27834,
    vmag: 4,
  },
  {
    satid: 27835,
    vmag: 3,
  },
  {
    satid: 27838,
    vmag: 6.5,
  },
  {
    satid: 27840,
    vmag: 4,
  },
  {
    satid: 27849,
    vmag: 5,
  },
  {
    satid: 27851,
    vmag: 3,
  },
  {
    satid: 27852,
    vmag: 4,
  },
  {
    satid: 27853,
    vmag: 2,
  },
  {
    satid: 27854,
    vmag: 5,
  },
  {
    satid: 27855,
    vmag: 3,
  },
  {
    satid: 27858,
    vmag: 8,
  },
  {
    satid: 27859,
    vmag: 5.5,
  },
  {
    satid: 27868,
    vmag: 6,
  },
  {
    satid: 27869,
    vmag: 6,
  },
  {
    satid: 27870,
    vmag: 4,
  },
  {
    satid: 27875,
    vmag: 3,
  },
  {
    satid: 27877,
    vmag: 4,
  },
  {
    satid: 27903,
    vmag: 4,
  },
  {
    satid: 27938,
    vmag: 2,
  },
  {
    satid: 27939,
    vmag: 8,
  },
  {
    satid: 27940,
    vmag: 4,
  },
  {
    satid: 27946,
    vmag: 3.5,
  },
  {
    satid: 27950,
    vmag: 5,
  },
  {
    satid: 27952,
    vmag: 3.5,
  },
  {
    satid: 27953,
    vmag: 2.5,
  },
  {
    satid: 28049,
    vmag: 3,
  },
  {
    satid: 28050,
    vmag: 4.5,
  },
  {
    satid: 28051,
    vmag: 5,
  },
  {
    satid: 28054,
    vmag: 5,
  },
  {
    satid: 28057,
    vmag: 6,
  },
  {
    satid: 28058,
    vmag: 7,
  },
  {
    satid: 28059,
    vmag: 4,
  },
  {
    satid: 28060,
    vmag: 5.5,
  },
  {
    satid: 28061,
    vmag: 4,
  },
  {
    satid: 28078,
    vmag: 4,
  },
  {
    satid: 28083,
    vmag: 2,
  },
  {
    satid: 28095,
    vmag: 3,
  },
  {
    satid: 28096,
    vmag: 2,
  },
  {
    satid: 28097,
    vmag: 3,
  },
  {
    satid: 28098,
    vmag: 6,
  },
  {
    satid: 28099,
    vmag: 4.5,
  },
  {
    satid: 28116,
    vmag: 3,
  },
  {
    satid: 28118,
    vmag: 2,
  },
  {
    satid: 28130,
    vmag: 3.5,
  },
  {
    satid: 28131,
    vmag: 5,
  },
  {
    satid: 28133,
    vmag: 4,
  },
  {
    satid: 28137,
    vmag: 4,
  },
  {
    satid: 28138,
    vmag: 3.5,
  },
  {
    satid: 28140,
    vmag: 4,
  },
  {
    satid: 28142,
    vmag: 3,
  },
  {
    satid: 28155,
    vmag: 0,
  },
  {
    satid: 28156,
    vmag: 5,
  },
  {
    satid: 28160,
    vmag: 3,
  },
  {
    satid: 28163,
    vmag: 4.5,
  },
  {
    satid: 28164,
    vmag: 4,
  },
  {
    satid: 28185,
    vmag: 2,
  },
  {
    satid: 28188,
    vmag: 3.5,
  },
  {
    satid: 28191,
    vmag: 3.5,
  },
  {
    satid: 28192,
    vmag: 5.5,
  },
  {
    satid: 28198,
    vmag: 6.5,
  },
  {
    satid: 28220,
    vmag: 6.5,
  },
  {
    satid: 28222,
    vmag: 3.5,
  },
  {
    satid: 28230,
    vmag: 3.5,
  },
  {
    satid: 28231,
    vmag: 3.5,
  },
  {
    satid: 28234,
    vmag: 1,
  },
  {
    satid: 28237,
    vmag: 5,
  },
  {
    satid: 28238,
    vmag: 4,
  },
  {
    satid: 28239,
    vmag: 3,
  },
  {
    satid: 28243,
    vmag: 4.5,
  },
  {
    satid: 28253,
    vmag: 2.5,
  },
  {
    satid: 28254,
    vmag: 5.5,
  },
  {
    satid: 28255,
    vmag: 5.5,
  },
  {
    satid: 28261,
    vmag: 3,
  },
  {
    satid: 28350,
    vmag: 2.5,
  },
  {
    satid: 28352,
    vmag: 3,
  },
  {
    satid: 28353,
    vmag: 2,
  },
  {
    satid: 28359,
    vmag: 3,
  },
  {
    satid: 28360,
    vmag: 4,
  },
  {
    satid: 28362,
    vmag: 3.5,
  },
  {
    satid: 28363,
    vmag: 5.5,
  },
  {
    satid: 28365,
    vmag: 3,
  },
  {
    satid: 28367,
    vmag: 5,
  },
  {
    satid: 28368,
    vmag: 7.5,
  },
  {
    satid: 28373,
    vmag: 7.5,
  },
  {
    satid: 28374,
    vmag: 5,
  },
  {
    satid: 28378,
    vmag: 4,
  },
  {
    satid: 28379,
    vmag: 3,
  },
  {
    satid: 28380,
    vmag: 6,
  },
  {
    satid: 28381,
    vmag: 4,
  },
  {
    satid: 28382,
    vmag: 6.5,
  },
  {
    satid: 28385,
    vmag: 2.5,
  },
  {
    satid: 28390,
    vmag: 3,
  },
  {
    satid: 28393,
    vmag: 4,
  },
  {
    satid: 28394,
    vmag: 3.5,
  },
  {
    satid: 28395,
    vmag: 3.5,
  },
  {
    satid: 28396,
    vmag: 4,
  },
  {
    satid: 28401,
    vmag: 6.5,
  },
  {
    satid: 28412,
    vmag: 6.5,
  },
  {
    satid: 28413,
    vmag: 7,
  },
  {
    satid: 28414,
    vmag: 5,
  },
  {
    satid: 28415,
    vmag: 3.5,
  },
  {
    satid: 28416,
    vmag: 4.5,
  },
  {
    satid: 28418,
    vmag: 3.5,
  },
  {
    satid: 28419,
    vmag: 6,
  },
  {
    satid: 28420,
    vmag: 6,
  },
  {
    satid: 28421,
    vmag: 4,
  },
  {
    satid: 28446,
    vmag: 4,
  },
  {
    satid: 28447,
    vmag: 3,
  },
  {
    satid: 28448,
    vmag: 3,
  },
  {
    satid: 28452,
    vmag: 1.5,
  },
  {
    satid: 28470,
    vmag: 5,
  },
  {
    satid: 28471,
    vmag: 4,
  },
  {
    satid: 28472,
    vmag: 2,
  },
  {
    satid: 28473,
    vmag: 2,
  },
  {
    satid: 28476,
    vmag: 5.5,
  },
  {
    satid: 28477,
    vmag: 3,
  },
  {
    satid: 28478,
    vmag: 6,
  },
  {
    satid: 28479,
    vmag: 5.5,
  },
  {
    satid: 28480,
    vmag: 3,
  },
  {
    satid: 28485,
    vmag: 3,
  },
  {
    satid: 28496,
    vmag: 7.5,
  },
  {
    satid: 28500,
    vmag: 4,
  },
  {
    satid: 28505,
    vmag: 3,
  },
  {
    satid: 28506,
    vmag: 4,
  },
  {
    satid: 28519,
    vmag: 3,
  },
  {
    satid: 28521,
    vmag: 5.5,
  },
  {
    satid: 28522,
    vmag: 4,
  },
  {
    satid: 28523,
    vmag: 7,
  },
  {
    satid: 28526,
    vmag: 4,
  },
  {
    satid: 28527,
    vmag: 3.5,
  },
  {
    satid: 28528,
    vmag: 3.5,
  },
  {
    satid: 28537,
    vmag: 3.5,
  },
  {
    satid: 28538,
    vmag: 2,
  },
  {
    satid: 28541,
    vmag: 3.5,
  },
  {
    satid: 28543,
    vmag: 3.5,
  },
  {
    satid: 28545,
    vmag: 2.5,
  },
  {
    satid: 28546,
    vmag: 2.5,
  },
  {
    satid: 28623,
    vmag: 2.5,
  },
  {
    satid: 28626,
    vmag: 4,
  },
  {
    satid: 28627,
    vmag: 2.5,
  },
  {
    satid: 28637,
    vmag: 6,
  },
  {
    satid: 28639,
    vmag: 3,
  },
  {
    satid: 28642,
    vmag: 7,
  },
  {
    satid: 28643,
    vmag: 7,
  },
  {
    satid: 28644,
    vmag: 4,
  },
  {
    satid: 28645,
    vmag: 2,
  },
  {
    satid: 28646,
    vmag: 2,
  },
  {
    satid: 28647,
    vmag: 2,
  },
  {
    satid: 28649,
    vmag: 4,
  },
  {
    satid: 28651,
    vmag: 4,
  },
  {
    satid: 28656,
    vmag: 4,
  },
  {
    satid: 28659,
    vmag: 3,
  },
  {
    satid: 28661,
    vmag: 3,
  },
  {
    satid: 28686,
    vmag: 5,
  },
  {
    satid: 28702,
    vmag: 4,
  },
  {
    satid: 28703,
    vmag: 2.5,
  },
  {
    satid: 28737,
    vmag: 5,
  },
  {
    satid: 28738,
    vmag: 4,
  },
  {
    satid: 28773,
    vmag: 3.5,
  },
  {
    satid: 28774,
    vmag: 4.5,
  },
  {
    satid: 28775,
    vmag: 0.1,
  },
  {
    satid: 28776,
    vmag: 3.5,
  },
  {
    satid: 28787,
    vmag: 3.5,
  },
  {
    satid: 28811,
    vmag: 5,
  },
  {
    satid: 28822,
    vmag: 5.5,
  },
  {
    satid: 28868,
    vmag: 4,
  },
  {
    satid: 28869,
    vmag: 3.5,
  },
  {
    satid: 28870,
    vmag: 3,
  },
  {
    satid: 28871,
    vmag: 4.5,
  },
  {
    satid: 28872,
    vmag: 6,
  },
  {
    satid: 28875,
    vmag: 3,
  },
  {
    satid: 28876,
    vmag: 5.5,
  },
  {
    satid: 28883,
    vmag: 2.5,
  },
  {
    satid: 28886,
    vmag: 3,
  },
  {
    satid: 28887,
    vmag: 5,
  },
  {
    satid: 28888,
    vmag: 3,
  },
  {
    satid: 28898,
    vmag: 4,
  },
  {
    satid: 28900,
    vmag: 2.5,
  },
  {
    satid: 28903,
    vmag: 4,
  },
  {
    satid: 28904,
    vmag: 2,
  },
  {
    satid: 28905,
    vmag: 5,
  },
  {
    satid: 28908,
    vmag: 5.3,
  },
  {
    satid: 28909,
    vmag: 5.3,
  },
  {
    satid: 28910,
    vmag: 4,
  },
  {
    satid: 28913,
    vmag: 3,
  },
  {
    satid: 28914,
    vmag: 3.5,
  },
  {
    satid: 28925,
    vmag: 3.5,
  },
  {
    satid: 28926,
    vmag: 3,
  },
  {
    satid: 28931,
    vmag: 2.5,
  },
  {
    satid: 28932,
    vmag: 3,
  },
  {
    satid: 28933,
    vmag: 5.5,
  },
  {
    satid: 28935,
    vmag: 3,
  },
  {
    satid: 28936,
    vmag: 3,
  },
  {
    satid: 28938,
    vmag: 2,
  },
  {
    satid: 28939,
    vmag: 5.5,
  },
  {
    satid: 28942,
    vmag: 4.5,
  },
  {
    satid: 28944,
    vmag: 3.5,
  },
  {
    satid: 28947,
    vmag: 4.5,
  },
  {
    satid: 28948,
    vmag: 2,
  },
  {
    satid: 28983,
    vmag: 5,
  },
  {
    satid: 28998,
    vmag: 3,
  },
  {
    satid: 29046,
    vmag: 2.5,
  },
  {
    satid: 29047,
    vmag: 7,
  },
  {
    satid: 29048,
    vmag: 8,
  },
  {
    satid: 29050,
    vmag: 8,
  },
  {
    satid: 29051,
    vmag: 8,
  },
  {
    satid: 29052,
    vmag: 8,
  },
  {
    satid: 29053,
    vmag: 6,
  },
  {
    satid: 29056,
    vmag: 3.5,
  },
  {
    satid: 29092,
    vmag: 3,
  },
  {
    satid: 29093,
    vmag: 2.5,
  },
  {
    satid: 29107,
    vmag: 6,
  },
  {
    satid: 29110,
    vmag: 4.5,
  },
  {
    satid: 29111,
    vmag: 3,
  },
  {
    satid: 29156,
    vmag: 2.5,
  },
  {
    satid: 29157,
    vmag: 6.5,
  },
  {
    satid: 29159,
    vmag: 5.5,
  },
  {
    satid: 29164,
    vmag: 3.5,
  },
  {
    satid: 29165,
    vmag: 2,
  },
  {
    satid: 29228,
    vmag: 3,
  },
  {
    satid: 29229,
    vmag: 2,
  },
  {
    satid: 29236,
    vmag: 4,
  },
  {
    satid: 29237,
    vmag: 3,
  },
  {
    satid: 29247,
    vmag: 2.5,
  },
  {
    satid: 29249,
    vmag: 2,
  },
  {
    satid: 29250,
    vmag: 2.5,
  },
  {
    satid: 29252,
    vmag: 4,
  },
  {
    satid: 29253,
    vmag: 5.5,
  },
  {
    satid: 29254,
    vmag: 2.5,
  },
  {
    satid: 29256,
    vmag: 6,
  },
  {
    satid: 29261,
    vmag: 3,
  },
  {
    satid: 29263,
    vmag: 6,
  },
  {
    satid: 29271,
    vmag: 3,
  },
  {
    satid: 29274,
    vmag: 3,
  },
  {
    satid: 29275,
    vmag: 2.5,
  },
  {
    satid: 29350,
    vmag: 2.5,
  },
  {
    satid: 29399,
    vmag: 2,
  },
  {
    satid: 29402,
    vmag: 3,
  },
  {
    satid: 29479,
    vmag: 5.5,
  },
  {
    satid: 29480,
    vmag: 4,
  },
  {
    satid: 29487,
    vmag: 5.5,
  },
  {
    satid: 29488,
    vmag: 3,
  },
  {
    satid: 29494,
    vmag: 4,
  },
  {
    satid: 29497,
    vmag: 3.5,
  },
  {
    satid: 29498,
    vmag: 3,
  },
  {
    satid: 29499,
    vmag: 4,
  },
  {
    satid: 29505,
    vmag: 6.5,
  },
  {
    satid: 29506,
    vmag: 5.5,
  },
  {
    satid: 29507,
    vmag: 2,
  },
  {
    satid: 29508,
    vmag: 4,
  },
  {
    satid: 29512,
    vmag: 3.5,
  },
  {
    satid: 29517,
    vmag: 1,
  },
  {
    satid: 29522,
    vmag: 5,
  },
  {
    satid: 29527,
    vmag: 3,
  },
  {
    satid: 29528,
    vmag: 3,
  },
  {
    satid: 29602,
    vmag: 5,
  },
  {
    satid: 29603,
    vmag: 3,
  },
  {
    satid: 29646,
    vmag: 2,
  },
  {
    satid: 29647,
    vmag: 1,
  },
  {
    satid: 29649,
    vmag: 3,
  },
  {
    satid: 29650,
    vmag: 3.5,
  },
  {
    satid: 29651,
    vmag: 2,
  },
  {
    satid: 29653,
    vmag: 6.5,
  },
  {
    satid: 29654,
    vmag: 6.5,
  },
  {
    satid: 29657,
    vmag: 2,
  },
  {
    satid: 29658,
    vmag: 5,
  },
  {
    satid: 29659,
    vmag: 4,
  },
  {
    satid: 29667,
    vmag: 8,
  },
  {
    satid: 29668,
    vmag: 4,
  },
  {
    satid: 29678,
    vmag: 6,
  },
  {
    satid: 29679,
    vmag: 3,
  },
  {
    satid: 29710,
    vmag: 6.5,
  },
  {
    satid: 29712,
    vmag: 7,
  },
  {
    satid: 29713,
    vmag: 4,
  },
  {
    satid: 30772,
    vmag: 5.5,
  },
  {
    satid: 30773,
    vmag: 8.5,
  },
  {
    satid: 30774,
    vmag: 5.5,
  },
  {
    satid: 30775,
    vmag: 7.5,
  },
  {
    satid: 30777,
    vmag: 6.5,
  },
  {
    satid: 30778,
    vmag: 2.5,
  },
  {
    satid: 30795,
    vmag: 3,
  },
  {
    satid: 30796,
    vmag: 3,
  },
  {
    satid: 31103,
    vmag: 3.5,
  },
  {
    satid: 31104,
    vmag: 3.5,
  },
  {
    satid: 31113,
    vmag: 7,
  },
  {
    satid: 31114,
    vmag: 2.5,
  },
  {
    satid: 31116,
    vmag: 2,
  },
  {
    satid: 31123,
    vmag: 4.5,
  },
  {
    satid: 31134,
    vmag: 6.5,
  },
  {
    satid: 31140,
    vmag: 7.5,
  },
  {
    satid: 31141,
    vmag: 6,
  },
  {
    satid: 31307,
    vmag: 5,
  },
  {
    satid: 31396,
    vmag: 1.5,
  },
  {
    satid: 31571,
    vmag: 4.5,
  },
  {
    satid: 31573,
    vmag: 4.5,
  },
  {
    satid: 31574,
    vmag: 4.5,
  },
  {
    satid: 31576,
    vmag: 4.5,
  },
  {
    satid: 31598,
    vmag: 3,
  },
  {
    satid: 31600,
    vmag: 0.1,
  },
  {
    satid: 31601,
    vmag: 6,
  },
  {
    satid: 31602,
    vmag: 6,
  },
  {
    satid: 31698,
    vmag: 6,
  },
  {
    satid: 31699,
    vmag: 4.5,
  },
  {
    satid: 31700,
    vmag: 6.5,
  },
  {
    satid: 31701,
    vmag: 3,
  },
  {
    satid: 31702,
    vmag: 2,
  },
  {
    satid: 31708,
    vmag: 3,
  },
  {
    satid: 31789,
    vmag: 5,
  },
  {
    satid: 31790,
    vmag: 5.5,
  },
  {
    satid: 31791,
    vmag: 6,
  },
  {
    satid: 31792,
    vmag: 2.5,
  },
  {
    satid: 31793,
    vmag: 2,
  },
  {
    satid: 31797,
    vmag: 4.5,
  },
  {
    satid: 31798,
    vmag: 4,
  },
  {
    satid: 31863,
    vmag: 3,
  },
  {
    satid: 31864,
    vmag: 3.5,
  },
  {
    satid: 31927,
    vmag: 4.5,
  },
  {
    satid: 31928,
    vmag: 5,
  },
  {
    satid: 32000,
    vmag: 2.5,
  },
  {
    satid: 32007,
    vmag: 3,
  },
  {
    satid: 32008,
    vmag: 0.5,
  },
  {
    satid: 32021,
    vmag: 3,
  },
  {
    satid: 32051,
    vmag: 2.5,
  },
  {
    satid: 32052,
    vmag: 4.5,
  },
  {
    satid: 32053,
    vmag: 4,
  },
  {
    satid: 32059,
    vmag: 2.5,
  },
  {
    satid: 32062,
    vmag: 5,
  },
  {
    satid: 32251,
    vmag: 3,
  },
  {
    satid: 32255,
    vmag: 3,
  },
  {
    satid: 32261,
    vmag: 5.5,
  },
  {
    satid: 32262,
    vmag: 3,
  },
  {
    satid: 32263,
    vmag: 4.3,
  },
  {
    satid: 32264,
    vmag: 4.3,
  },
  {
    satid: 32265,
    vmag: 4.3,
  },
  {
    satid: 32266,
    vmag: 4.3,
  },
  {
    satid: 32270,
    vmag: 3.5,
  },
  {
    satid: 32272,
    vmag: 0.1,
  },
  {
    satid: 32281,
    vmag: 6,
  },
  {
    satid: 32283,
    vmag: 5.5,
  },
  {
    satid: 32284,
    vmag: 4,
  },
  {
    satid: 32287,
    vmag: 5,
  },
  {
    satid: 32288,
    vmag: 2,
  },
  {
    satid: 32289,
    vmag: 5,
  },
  {
    satid: 32290,
    vmag: 4,
  },
  {
    satid: 32295,
    vmag: 2.5,
  },
  {
    satid: 32296,
    vmag: 3.5,
  },
  {
    satid: 32300,
    vmag: 3,
  },
  {
    satid: 32301,
    vmag: 3,
  },
  {
    satid: 32374,
    vmag: 3.5,
  },
  {
    satid: 32376,
    vmag: 4,
  },
  {
    satid: 32377,
    vmag: 4,
  },
  {
    satid: 32378,
    vmag: 3,
  },
  {
    satid: 32379,
    vmag: 2.5,
  },
  {
    satid: 32382,
    vmag: 5,
  },
  {
    satid: 32385,
    vmag: 5.5,
  },
  {
    satid: 32387,
    vmag: 5,
  },
  {
    satid: 32389,
    vmag: 3.5,
  },
  {
    satid: 32398,
    vmag: 6,
  },
  {
    satid: 32405,
    vmag: 3,
  },
  {
    satid: 32476,
    vmag: 6,
  },
  {
    satid: 32477,
    vmag: 4.5,
  },
  {
    satid: 32480,
    vmag: 3.5,
  },
  {
    satid: 32501,
    vmag: 2.5,
  },
  {
    satid: 32686,
    vmag: 2,
  },
  {
    satid: 32699,
    vmag: 0.1,
  },
  {
    satid: 32709,
    vmag: 3,
  },
  {
    satid: 32712,
    vmag: 5.5,
  },
  {
    satid: 32713,
    vmag: 3.5,
  },
  {
    satid: 32730,
    vmag: 3,
  },
  {
    satid: 32750,
    vmag: 4.5,
  },
  {
    satid: 32751,
    vmag: 4,
  },
  {
    satid: 32764,
    vmag: 3,
  },
  {
    satid: 32769,
    vmag: 2.5,
  },
  {
    satid: 32770,
    vmag: 3.5,
  },
  {
    satid: 32780,
    vmag: 2,
  },
  {
    satid: 32783,
    vmag: 6,
  },
  {
    satid: 32786,
    vmag: 8,
  },
  {
    satid: 32792,
    vmag: 5,
  },
  {
    satid: 32951,
    vmag: 4,
  },
  {
    satid: 32954,
    vmag: 6.5,
  },
  {
    satid: 32957,
    vmag: 4,
  },
  {
    satid: 32958,
    vmag: 3.5,
  },
  {
    satid: 32959,
    vmag: 3.5,
  },
  {
    satid: 33052,
    vmag: 2,
  },
  {
    satid: 33053,
    vmag: 4.5,
  },
  {
    satid: 33057,
    vmag: 2.5,
  },
  {
    satid: 33058,
    vmag: 3,
  },
  {
    satid: 33060,
    vmag: 7.5,
  },
  {
    satid: 33061,
    vmag: 8,
  },
  {
    satid: 33062,
    vmag: 8,
  },
  {
    satid: 33063,
    vmag: 8,
  },
  {
    satid: 33064,
    vmag: 8,
  },
  {
    satid: 33065,
    vmag: 8,
  },
  {
    satid: 33066,
    vmag: 4,
  },
  {
    satid: 33105,
    vmag: 4.5,
  },
  {
    satid: 33106,
    vmag: 4,
  },
  {
    satid: 33113,
    vmag: 6.5,
  },
  {
    satid: 33155,
    vmag: 3,
  },
  {
    satid: 33156,
    vmag: 2.5,
  },
  {
    satid: 33208,
    vmag: 3.5,
  },
  {
    satid: 33244,
    vmag: 6,
  },
  {
    satid: 33245,
    vmag: 4,
  },
  {
    satid: 33272,
    vmag: 4.5,
  },
  {
    satid: 33277,
    vmag: 3.5,
  },
  {
    satid: 33279,
    vmag: 3.5,
  },
  {
    satid: 33319,
    vmag: 4.5,
  },
  {
    satid: 33321,
    vmag: 7,
  },
  {
    satid: 33331,
    vmag: 5,
  },
  {
    satid: 33340,
    vmag: 2.5,
  },
  {
    satid: 33373,
    vmag: 2.5,
  },
  {
    satid: 33374,
    vmag: 3,
  },
  {
    satid: 33375,
    vmag: 4,
  },
  {
    satid: 33376,
    vmag: 3,
  },
  {
    satid: 33377,
    vmag: 3.5,
  },
  {
    satid: 33394,
    vmag: 4,
  },
  {
    satid: 33396,
    vmag: 5.5,
  },
  {
    satid: 33397,
    vmag: 5,
  },
  {
    satid: 33398,
    vmag: 6,
  },
  {
    satid: 33406,
    vmag: 4,
  },
  {
    satid: 33408,
    vmag: 5.5,
  },
  {
    satid: 33409,
    vmag: 5,
  },
  {
    satid: 33410,
    vmag: 3.5,
  },
  {
    satid: 33411,
    vmag: 4,
  },
  {
    satid: 33412,
    vmag: 5,
  },
  {
    satid: 33413,
    vmag: 3.5,
  },
  {
    satid: 33433,
    vmag: 6.5,
  },
  {
    satid: 33434,
    vmag: 6,
  },
  {
    satid: 33435,
    vmag: 2.5,
  },
  {
    satid: 33437,
    vmag: 3.5,
  },
  {
    satid: 33450,
    vmag: 4.5,
  },
  {
    satid: 33454,
    vmag: 3,
  },
  {
    satid: 33455,
    vmag: 3,
  },
  {
    satid: 33461,
    vmag: 4,
  },
  {
    satid: 33462,
    vmag: 2.5,
  },
  {
    satid: 33464,
    vmag: 2.5,
  },
  {
    satid: 33491,
    vmag: 2,
  },
  {
    satid: 33505,
    vmag: 4,
  },
  {
    satid: 33507,
    vmag: 4,
  },
  {
    satid: 33591,
    vmag: 5,
  },
  {
    satid: 33597,
    vmag: 3,
  },
  {
    satid: 33754,
    vmag: 2.5,
  },
  {
    satid: 33886,
    vmag: 7.5,
  },
  {
    satid: 34111,
    vmag: 4,
  },
  {
    satid: 34112,
    vmag: 3.5,
  },
  {
    satid: 34382,
    vmag: 4,
  },
  {
    satid: 34602,
    vmag: 5,
  },
  {
    satid: 34662,
    vmag: 5.5,
  },
  {
    satid: 34663,
    vmag: 3,
  },
  {
    satid: 34712,
    vmag: 3,
  },
  {
    satid: 34713,
    vmag: 3,
  },
  {
    satid: 34780,
    vmag: 1.5,
  },
  {
    satid: 34807,
    vmag: 6.5,
  },
  {
    satid: 34809,
    vmag: 5,
  },
  {
    satid: 34811,
    vmag: 2.5,
  },
  {
    satid: 34839,
    vmag: 3.5,
  },
  {
    satid: 34904,
    vmag: 3.5,
  },
  {
    satid: 34943,
    vmag: 4,
  },
  {
    satid: 35001,
    vmag: 4.5,
  },
  {
    satid: 35006,
    vmag: 6.5,
  },
  {
    satid: 35492,
    vmag: 2.5,
  },
  {
    satid: 35494,
    vmag: 3,
  },
  {
    satid: 35495,
    vmag: 3.5,
  },
  {
    satid: 35497,
    vmag: 2.5,
  },
  {
    satid: 35498,
    vmag: 6.5,
  },
  {
    satid: 35501,
    vmag: 4.5,
  },
  {
    satid: 35633,
    vmag: 0.1,
  },
  {
    satid: 35635,
    vmag: 6,
  },
  {
    satid: 35637,
    vmag: 5,
  },
  {
    satid: 35688,
    vmag: 5,
  },
  {
    satid: 35691,
    vmag: 8.5,
  },
  {
    satid: 35698,
    vmag: 3.5,
  },
  {
    satid: 35754,
    vmag: 5.5,
  },
  {
    satid: 35758,
    vmag: 3.5,
  },
  {
    satid: 35865,
    vmag: 4,
  },
  {
    satid: 35866,
    vmag: 7.5,
  },
  {
    satid: 35867,
    vmag: 4,
  },
  {
    satid: 35875,
    vmag: 3.5,
  },
  {
    satid: 35936,
    vmag: 5.5,
  },
  {
    satid: 35937,
    vmag: 3.5,
  },
  {
    satid: 35938,
    vmag: 3.5,
  },
  {
    satid: 35939,
    vmag: 3.5,
  },
  {
    satid: 35945,
    vmag: 3.5,
  },
  {
    satid: 35946,
    vmag: 5,
  },
  {
    satid: 35951,
    vmag: 4.5,
  },
  {
    satid: 36034,
    vmag: 2,
  },
  {
    satid: 36036,
    vmag: 5.5,
  },
  {
    satid: 36038,
    vmag: 8,
  },
  {
    satid: 36039,
    vmag: 6,
  },
  {
    satid: 36088,
    vmag: 4.5,
  },
  {
    satid: 36089,
    vmag: 2.5,
  },
  {
    satid: 36095,
    vmag: 2.5,
  },
  {
    satid: 36097,
    vmag: 5,
  },
  {
    satid: 36102,
    vmag: 3.5,
  },
  {
    satid: 36103,
    vmag: 3.5,
  },
  {
    satid: 36104,
    vmag: 4,
  },
  {
    satid: 36105,
    vmag: 3.5,
  },
  {
    satid: 36107,
    vmag: 3,
  },
  {
    satid: 36108,
    vmag: 4,
  },
  {
    satid: 36120,
    vmag: 4,
  },
  {
    satid: 36121,
    vmag: 4.5,
  },
  {
    satid: 36123,
    vmag: 5,
  },
  {
    satid: 36125,
    vmag: 3,
  },
  {
    satid: 36133,
    vmag: 3.5,
  },
  {
    satid: 36288,
    vmag: 2,
  },
  {
    satid: 36360,
    vmag: 3.5,
  },
  {
    satid: 36396,
    vmag: 2.5,
  },
  {
    satid: 36397,
    vmag: 5,
  },
  {
    satid: 36412,
    vmag: 2,
  },
  {
    satid: 36413,
    vmag: 5,
  },
  {
    satid: 36414,
    vmag: 5,
  },
  {
    satid: 36415,
    vmag: 5,
  },
  {
    satid: 36416,
    vmag: 2,
  },
  {
    satid: 36417,
    vmag: 5,
  },
  {
    satid: 36418,
    vmag: 5,
  },
  {
    satid: 36500,
    vmag: 3.5,
  },
  {
    satid: 36501,
    vmag: 3.5,
  },
  {
    satid: 36508,
    vmag: 4.5,
  },
  {
    satid: 36509,
    vmag: 4.5,
  },
  {
    satid: 36510,
    vmag: 4.5,
  },
  {
    satid: 36511,
    vmag: 3,
  },
  {
    satid: 36514,
    vmag: 3.5,
  },
  {
    satid: 36518,
    vmag: 3.5,
  },
  {
    satid: 36519,
    vmag: 5,
  },
  {
    satid: 36520,
    vmag: 4,
  },
  {
    satid: 36583,
    vmag: 3,
  },
  {
    satid: 36586,
    vmag: 2,
  },
  {
    satid: 36587,
    vmag: 3.5,
  },
  {
    satid: 36588,
    vmag: 7,
  },
  {
    satid: 36589,
    vmag: 4,
  },
  {
    satid: 36591,
    vmag: 1.5,
  },
  {
    satid: 36593,
    vmag: 2.5,
  },
  {
    satid: 36594,
    vmag: 3.5,
  },
  {
    satid: 36596,
    vmag: 4.5,
  },
  {
    satid: 36597,
    vmag: 4,
  },
  {
    satid: 36601,
    vmag: 6.5,
  },
  {
    satid: 36602,
    vmag: 5.5,
  },
  {
    satid: 36605,
    vmag: 6,
  },
  {
    satid: 36607,
    vmag: 4.5,
  },
  {
    satid: 36608,
    vmag: 7.5,
  },
  {
    satid: 36609,
    vmag: 7.5,
  },
  {
    satid: 36746,
    vmag: 3,
  },
  {
    satid: 36793,
    vmag: 3,
  },
  {
    satid: 36794,
    vmag: 3,
  },
  {
    satid: 36800,
    vmag: 4.5,
  },
  {
    satid: 36829,
    vmag: 2,
  },
  {
    satid: 36832,
    vmag: 3,
  },
  {
    satid: 36833,
    vmag: 3.5,
  },
  {
    satid: 36835,
    vmag: 5,
  },
  {
    satid: 36868,
    vmag: 3,
  },
  {
    satid: 36869,
    vmag: 1.5,
  },
  {
    satid: 37152,
    vmag: 6,
  },
  {
    satid: 37153,
    vmag: 6.3,
  },
  {
    satid: 37154,
    vmag: 6.3,
  },
  {
    satid: 37155,
    vmag: 4.5,
  },
  {
    satid: 37159,
    vmag: 2,
  },
  {
    satid: 37162,
    vmag: 2.5,
  },
  {
    satid: 37165,
    vmag: 4.5,
  },
  {
    satid: 37168,
    vmag: 6,
  },
  {
    satid: 37169,
    vmag: 5,
  },
  {
    satid: 37180,
    vmag: 5.5,
  },
  {
    satid: 37181,
    vmag: 4.5,
  },
  {
    satid: 37182,
    vmag: 5.5,
  },
  {
    satid: 37186,
    vmag: 3,
  },
  {
    satid: 37187,
    vmag: 3.5,
  },
  {
    satid: 37188,
    vmag: 5.5,
  },
  {
    satid: 37189,
    vmag: 5.5,
  },
  {
    satid: 37190,
    vmag: 5.5,
  },
  {
    satid: 37191,
    vmag: 5.5,
  },
  {
    satid: 37192,
    vmag: 5.5,
  },
  {
    satid: 37206,
    vmag: 4,
  },
  {
    satid: 37208,
    vmag: 3,
  },
  {
    satid: 37209,
    vmag: 4,
  },
  {
    satid: 37212,
    vmag: 2.5,
  },
  {
    satid: 37213,
    vmag: 3.5,
  },
  {
    satid: 37216,
    vmag: 5.5,
  },
  {
    satid: 37217,
    vmag: 3.5,
  },
  {
    satid: 37218,
    vmag: 1.5,
  },
  {
    satid: 37220,
    vmag: 3,
  },
  {
    satid: 37222,
    vmag: 5,
  },
  {
    satid: 37225,
    vmag: 8,
  },
  {
    satid: 37228,
    vmag: 5,
  },
  {
    satid: 37229,
    vmag: 5.5,
  },
  {
    satid: 37233,
    vmag: 3,
  },
  {
    satid: 37235,
    vmag: 2,
  },
  {
    satid: 37239,
    vmag: 2,
  },
  {
    satid: 37253,
    vmag: 2,
  },
  {
    satid: 37259,
    vmag: 3.5,
  },
  {
    satid: 37266,
    vmag: 2.5,
  },
  {
    satid: 37267,
    vmag: 3,
  },
  {
    satid: 37361,
    vmag: 2.5,
  },
  {
    satid: 37363,
    vmag: 5,
  },
  {
    satid: 37375,
    vmag: 3.5,
  },
  {
    satid: 37378,
    vmag: 2.5,
  },
  {
    satid: 37385,
    vmag: 2.5,
  },
  {
    satid: 37386,
    vmag: 3,
  },
  {
    satid: 37387,
    vmag: 5,
  },
  {
    satid: 37390,
    vmag: 5,
  },
  {
    satid: 37391,
    vmag: 3,
  },
  {
    satid: 37395,
    vmag: 3.5,
  },
  {
    satid: 37604,
    vmag: 3.5,
  },
  {
    satid: 37673,
    vmag: 4.5,
  },
  {
    satid: 37678,
    vmag: 2,
  },
  {
    satid: 37728,
    vmag: 6,
  },
  {
    satid: 37729,
    vmag: 6,
  },
  {
    satid: 37739,
    vmag: 5,
  },
  {
    satid: 37740,
    vmag: 5,
  },
  {
    satid: 37741,
    vmag: 5,
  },
  {
    satid: 37742,
    vmag: 5,
  },
  {
    satid: 37743,
    vmag: 5,
  },
  {
    satid: 37744,
    vmag: 5,
  },
  {
    satid: 37750,
    vmag: 3,
  },
  {
    satid: 37755,
    vmag: 1,
  },
  {
    satid: 37756,
    vmag: 4.5,
  },
  {
    satid: 37766,
    vmag: 4,
  },
  {
    satid: 37777,
    vmag: 2.5,
  },
  {
    satid: 37781,
    vmag: 4,
  },
  {
    satid: 37782,
    vmag: 5,
  },
  {
    satid: 37795,
    vmag: 5.5,
  },
  {
    satid: 37798,
    vmag: 4,
  },
  {
    satid: 37799,
    vmag: 4,
  },
  {
    satid: 37800,
    vmag: 3.5,
  },
  {
    satid: 37805,
    vmag: 1.5,
  },
  {
    satid: 37809,
    vmag: 5,
  },
  {
    satid: 37811,
    vmag: 3,
  },
  {
    satid: 37819,
    vmag: 5,
  },
  {
    satid: 37820,
    vmag: 2.5,
  },
  {
    satid: 37827,
    vmag: 4,
  },
  {
    satid: 37828,
    vmag: 3.5,
  },
  {
    satid: 37835,
    vmag: 3,
  },
  {
    satid: 37842,
    vmag: 6,
  },
  {
    satid: 37844,
    vmag: 3,
  },
  {
    satid: 37845,
    vmag: 4,
  },
  {
    satid: 37849,
    vmag: 3.5,
  },
  {
    satid: 37859,
    vmag: 1.5,
  },
  {
    satid: 37871,
    vmag: 3.5,
  },
  {
    satid: 37883,
    vmag: 4,
  },
  {
    satid: 37930,
    vmag: 6,
  },
  {
    satid: 37931,
    vmag: 6,
  },
  {
    satid: 37932,
    vmag: 2,
  },
  {
    satid: 37949,
    vmag: 1.5,
  },
  {
    satid: 37955,
    vmag: 3.5,
  },
  {
    satid: 38015,
    vmag: 3.5,
  },
  {
    satid: 38040,
    vmag: 6,
  },
  {
    satid: 38041,
    vmag: 6,
  },
  {
    satid: 38042,
    vmag: 6,
  },
  {
    satid: 38043,
    vmag: 6,
  },
  {
    satid: 38044,
    vmag: 6,
  },
  {
    satid: 38045,
    vmag: 6,
  },
  {
    satid: 38086,
    vmag: 4.5,
  },
  {
    satid: 38088,
    vmag: 4,
  },
  {
    satid: 38089,
    vmag: 3.5,
  },
  {
    satid: 38092,
    vmag: 3,
  },
  {
    satid: 38094,
    vmag: 2.5,
  },
  {
    satid: 38109,
    vmag: 2.5,
  },
  {
    satid: 38222,
    vmag: 3.5,
  },
  {
    satid: 38246,
    vmag: 3.3,
  },
  {
    satid: 38247,
    vmag: 3,
  },
  {
    satid: 38249,
    vmag: 4.5,
  },
  {
    satid: 38252,
    vmag: 4,
  },
  {
    satid: 38253,
    vmag: 2,
  },
  {
    satid: 38341,
    vmag: 2.5,
  },
  {
    satid: 38342,
    vmag: 5,
  },
  {
    satid: 38344,
    vmag: 4,
  },
  {
    satid: 38349,
    vmag: 2,
  },
  {
    satid: 38354,
    vmag: 4,
  },
  {
    satid: 38355,
    vmag: 4,
  },
  {
    satid: 38529,
    vmag: 2,
  },
  {
    satid: 38550,
    vmag: 3.5,
  },
  {
    satid: 38733,
    vmag: 6.5,
  },
  {
    satid: 38735,
    vmag: 7.5,
  },
  {
    satid: 38736,
    vmag: 7,
  },
  {
    satid: 38737,
    vmag: 4,
  },
  {
    satid: 38744,
    vmag: 5,
  },
  {
    satid: 38745,
    vmag: 4,
  },
  {
    satid: 38747,
    vmag: 5.5,
  },
  {
    satid: 38749,
    vmag: 5,
  },
  {
    satid: 38758,
    vmag: 3,
  },
  {
    satid: 38770,
    vmag: 2,
  },
  {
    satid: 38773,
    vmag: 3,
  },
  {
    satid: 38777,
    vmag: 4.5,
  },
  {
    satid: 38846,
    vmag: 2,
  },
  {
    satid: 38951,
    vmag: 3.5,
  },
  {
    satid: 38997,
    vmag: 4.5,
  },
  {
    satid: 39000,
    vmag: 2.5,
  },
  {
    satid: 39011,
    vmag: 5.5,
  },
  {
    satid: 39012,
    vmag: 5.5,
  },
  {
    satid: 39013,
    vmag: 5.5,
  },
  {
    satid: 39023,
    vmag: 4,
  },
  {
    satid: 39025,
    vmag: 3.5,
  },
  {
    satid: 39026,
    vmag: 7.5,
  },
  {
    satid: 39027,
    vmag: 6,
  },
  {
    satid: 39080,
    vmag: 2.5,
  },
  {
    satid: 39081,
    vmag: 3.5,
  },
  {
    satid: 39093,
    vmag: 5,
  },
  {
    satid: 39175,
    vmag: 2,
  },
  {
    satid: 39192,
    vmag: 3,
  },
  {
    satid: 39194,
    vmag: 3.5,
  },
  {
    satid: 39198,
    vmag: 6,
  },
  {
    satid: 39207,
    vmag: 2,
  },
  {
    satid: 39208,
    vmag: 7,
  },
  {
    satid: 39210,
    vmag: 5,
  },
  {
    satid: 39211,
    vmag: 4,
  },
  {
    satid: 39232,
    vmag: 4,
  },
  {
    satid: 39239,
    vmag: 6,
  },
  {
    satid: 39240,
    vmag: 6,
  },
  {
    satid: 39580,
    vmag: 2,
  },
  {
    satid: 39771,
    vmag: 4,
  },
  {
    satid: 40083,
    vmag: 4,
  },
  {
    satid: 40102,
    vmag: 2,
  },
  {
    satid: 40138,
    vmag: 2,
  },
  {
    satid: 40354,
    vmag: 3.5,
  },
  {
    satid: 40368,
    vmag: 2.5,
  },
  {
    satid: 40382,
    vmag: 2,
  },
  {
    satid: 40651,
    vmag: 2,
  },
  {
    satid: 41334,
    vmag: 2.5,
  },
  {
    satid: 41395,
    vmag: 2.5,
  },
  {
    satid: 41622,
    vmag: 2,
  },
  {
    satid: 42689,
    vmag: 3.5,
  },
  {
    satid: 43145,
    vmag: 2.5,
  },
  {
    satid: 43173,
    vmag: 2,
  },
  {
    satid: 43941,
    vmag: 3.5,
  },
  {
    satid: 45606,
    vmag: 2,
  },
  {
    satid: 45873,
    vmag: 3.5,
  },
  {
    satid: 45874,
    vmag: 3.5,
  },
  {
    satid: 45875,
    vmag: 3.5,
  },
  {
    satid: 45876,
    vmag: 3.5,
  },
];

export { satVmagManager };
