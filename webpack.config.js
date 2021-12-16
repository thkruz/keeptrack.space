[
  {
    "resolve": {
      "extensions": [
        ".ts",
        ".js"
      ],
      "alias": {
        "@app": "E:\\gitlab\\keeptrack-space\\scripts/../src"
      }
    },
    "module": {
      "rules": [
        {
          "test": {},
          "include": [
            {}
          ],
          "type": "asset/resource"
        },
        {
          "test": {},
          "include": [
            {}
          ],
          "use": [
            "style-loader",
            "css-loader"
          ]
        },
        {
          "test": {},
          "include": [
            {}
          ],
          "use": {
            "loader": "worker-loader"
          }
        },
        {
          "test": {},
          "loader": "ts-loader",
          "exclude": [
            {},
            {},
            {},
            {}
          ],
          "options": {
            "transpileOnly": false
          }
        },
        {
          "test": {},
          "include": [
            {}
          ],
          "exclude": [
            {},
            {},
            {},
            {},
            {}
          ],
          "use": {
            "loader": "babel-loader"
          }
        },
        {
          "test": {},
          "include": [
            {}
          ],
          "type": "asset/resource"
        }
      ],
      "ignoreWarnings": [
        {},
        {}
      ],
      "stats": "errors-warnings",
      "plugins": [
        {
          "profile": false,
          "modulesCount": 5000,
          "dependenciesCount": 10000,
          "showEntries": true,
          "showModules": true,
          "showDependencies": true,
          "showActiveModules": true,
          "options": {
            "name": "webpack",
            "color": "green",
            "reporters": [
              "fancy"
            ],
            "reporter": null,
            "fancy": true,
            "profile": true
          },
          "reporters": [
            {}
          ]
        },
        {
          "definitions": {
            "$": "jquery",
            "jQuery": "jquery",
            "windows.jQuery": "jquery"
          }
        },
        {
          "userOptions": {
            "filename": "../index.htm",
            "template": "./src/index.htm"
          },
          "version": 5
        },
        {
          "onlyInWatchMode": true,
          "skipFirstRun": false,
          "beforeCompile": true,
          "firstRun": true
        }
      ],
      "experiments": {
        "topLevelAwait": true
      }
    },
    "mode": "development",
    "cache": true,
    "devtool": "source-map",
    "optimization": {
      "minimize": false
    },
    "name": "MainFiles",
    "entry": {
      "main": [
        "./src/js/main.ts"
      ]
    },
    "output": {
      "filename": "[name].[contenthash].js",
      "path": "E:\\gitlab\\keeptrack-space\\scripts/../dist/js",
      "publicPath": "./js/"
    }
  },
  {
    "resolve": {
      "extensions": [
        ".ts",
        ".js"
      ],
      "alias": {
        "@app": "E:\\gitlab\\keeptrack-space\\scripts/../src"
      }
    },
    "module": {
      "rules": [
        {
          "test": {},
          "include": [
            {}
          ],
          "type": "asset/resource"
        },
        {
          "test": {},
          "include": [
            {}
          ],
          "use": [
            "style-loader",
            "css-loader"
          ]
        },
        {
          "test": {},
          "include": [
            {}
          ],
          "use": {
            "loader": "worker-loader"
          }
        },
        {
          "test": {},
          "loader": "ts-loader",
          "exclude": [
            {},
            {},
            {},
            {}
          ],
          "options": {
            "transpileOnly": false
          }
        },
        {
          "test": {},
          "include": [
            {}
          ],
          "exclude": [
            {},
            {},
            {},
            {},
            {}
          ],
          "use": {
            "loader": "babel-loader"
          }
        },
        {
          "test": {},
          "include": [
            {}
          ],
          "type": "asset/resource"
        }
      ],
      "ignoreWarnings": [
        {},
        {}
      ],
      "stats": "errors-warnings",
      "plugins": [
        {
          "profile": false,
          "modulesCount": 5000,
          "dependenciesCount": 10000,
          "showEntries": true,
          "showModules": true,
          "showDependencies": true,
          "showActiveModules": true,
          "options": {
            "name": "webpack",
            "color": "green",
            "reporters": [
              "fancy"
            ],
            "reporter": null,
            "fancy": true,
            "profile": true
          },
          "reporters": [
            {}
          ]
        },
        {
          "definitions": {
            "$": "jquery",
            "jQuery": "jquery",
            "windows.jQuery": "jquery"
          }
        },
        {
          "userOptions": {
            "filename": "../index.htm",
            "template": "./src/index.htm"
          },
          "version": 5
        },
        {
          "onlyInWatchMode": true,
          "skipFirstRun": false,
          "beforeCompile": true,
          "firstRun": true
        }
      ],
      "experiments": {
        "topLevelAwait": true
      }
    },
    "mode": "development",
    "cache": true,
    "devtool": "source-map",
    "optimization": {
      "minimize": false
    },
    "name": "WebWorkers",
    "entry": {
      "positionCruncher": [
        "./src/js/webworker/positionCruncher.ts"
      ],
      "orbitCruncher": [
        "./src/js/webworker/orbitCruncher.js"
      ]
    },
    "output": {
      "filename": "[name].js",
      "path": "E:\\gitlab\\keeptrack-space\\scripts/../dist/keepTrack/js",
      "publicPath": "./keepTrack/js/"
    }
  },
  {
    "resolve": {
      "extensions": [
        ".ts",
        ".js"
      ],
      "alias": {
        "@app": "E:\\gitlab\\keeptrack-space\\scripts/../src"
      }
    },
    "module": {
      "rules": [
        {
          "test": {},
          "include": [
            {}
          ],
          "type": "asset/resource"
        },
        {
          "test": {},
          "include": [
            {}
          ],
          "use": [
            "style-loader",
            "css-loader"
          ]
        },
        {
          "test": {},
          "include": [
            {}
          ],
          "use": {
            "loader": "worker-loader"
          }
        },
        {
          "test": {},
          "loader": "ts-loader",
          "exclude": [
            {},
            {},
            {},
            {}
          ],
          "options": {
            "transpileOnly": false
          }
        },
        {
          "test": {},
          "include": [
            {}
          ],
          "exclude": [
            {},
            {},
            {},
            {},
            {}
          ],
          "use": {
            "loader": "babel-loader"
          }
        },
        {
          "test": {},
          "include": [
            {}
          ],
          "type": "asset/resource"
        }
      ],
      "ignoreWarnings": [
        {},
        {}
      ],
      "stats": "errors-warnings",
      "plugins": [
        {
          "profile": false,
          "modulesCount": 5000,
          "dependenciesCount": 10000,
          "showEntries": true,
          "showModules": true,
          "showDependencies": true,
          "showActiveModules": true,
          "options": {
            "name": "webpack",
            "color": "green",
            "reporters": [
              "fancy"
            ],
            "reporter": null,
            "fancy": true,
            "profile": true
          },
          "reporters": [
            {}
          ]
        },
        {
          "definitions": {
            "$": "jquery",
            "jQuery": "jquery",
            "windows.jQuery": "jquery"
          }
        },
        {
          "userOptions": {
            "filename": "../index.htm",
            "template": "./src/index.htm"
          },
          "version": 5
        },
        {
          "onlyInWatchMode": true,
          "skipFirstRun": false,
          "beforeCompile": true,
          "firstRun": true
        }
      ],
      "experiments": {
        "topLevelAwait": true
      }
    },
    "mode": "development",
    "cache": true,
    "devtool": "source-map",
    "optimization": {
      "minimize": false
    },
    "name": "Libraries",
    "entry": {
      "analysis-tools": [
        "./src/analysis/js/analysis-tools.js"
      ]
    },
    "plugins": [
      {
        "definitions": {
          "$": "jquery",
          "jQuery": "jquery",
          "windows.jQuery": "jquery"
        }
      },
      {
        "userOptions": {
          "filename": "../index.htm",
          "template": "./src/analysis/index.htm"
        },
        "version": 5
      }
    ],
    "output": {
      "filename": "[name].js",
      "path": "E:\\gitlab\\keeptrack-space\\scripts/../dist/analysis/js/",
      "publicPath": "./js/"
    }
  }
]