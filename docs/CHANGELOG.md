### Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

#### v8.1.1

>  

- 772 right click create sensor here
- Develop
- Develop
- refactor: :fire: revert to google analytics
- feat: :sparkles: new splash screens
- feat: :sparkles: add searchLimit param to settings
- Develop
- feat: :sparkles: abstract camera and add dark-clouds preset
- fix: :bug: fix issue in mobile logic
- feat: :sparkles: update gamepad logic
- Develop
- fix: :bug: fixes for iframes
- feat: :sparkles: update iframe example
- Develop
- feat: :sparkles: update readme
- fix: :bug: fix illegal return
- Develop
- ci: :rotating_light: fix minor linter error
- ci: :construction_worker: expand ignore list for deploy
- ci: :construction_worker: fix ignore list for sftp
- ci: :construction_worker: fix ignore list for sftp
- ci: :construction_worker: fix sftp typo
- ci: :construction_worker: fix sftp ignore list
- ci: :construction_worker: fix sftp settings
- ci: :construction_worker: use new sftp deployer
- ci: :construction_worker: fix ci/cd increase timeout
- Develop
- ci: :pencil2: sftp to ftps
- Develop
- ci: :construction_worker: fix ci/cd sftp
- ci: :construction_worker: update ci/cd pipeline
- fix gh-pages deployment
- fix ci/cd
- ci: :construction_worker: update ci/cd pipeline
- Minor updates
- Keep Track Version 8
- refactor: :art: put catalog loader in class for more clear loading
- refactor: :recycle: refactor format-tle class for standardization
- refactor: :label: add clear difference between catalog objects and sat objects
- fix: :bug: fix custom sensor errors
- docs: :memo: update changelog
- fix: :bug: add checks for missing data in satInfoboxCore
- fix: :bug: fix position cruncher not calculating star positions
- feat: :sparkles: add hires skybox and have skybox follow camera
- fix: :bug: update year or less logic to make large fragmentation events match date it occurred
- fix: :bug: add defensive code to block infinite loops
- feat: :sparkles: add new altitudes settings and disable stars by default
- fix: :white_check_mark: fix failing catalog-loader testing
- feat: :sparkles: scale dots during auto zoom out
- refactor: :label: add better type support for catalog
- refactor: :recycle: refactor to reduce code
- fix: :bug: fix star index calculations
- feat: :sparkles: make vimpel catalog available by default
- fix: :bug: fix race condition found in #793
- fix: :green_heart: fix build error
- refactor: :wastebasket: remove debug code
- refactor: :recycle: refactor for better type support
- feat: :sparkles: allow disabling the moon
- refactor: :coffin: remove old reference
- fix: :bug: fix Right Click &gt; Create Sensor Here error #772
- refactor: :recycle: update cruncher interfaces
- fix: :bug: reduce unnecessary logging in default settings
- docs: :memo: update version date
- fix: :recycle: update texture url for hires earth
- fix: :pencil2: fix typo in star indexs
- fix: :bug: fix typo in time-machine logic
- fix: :bug: fix satinfobox appearing on first static object clicked
- fix: :white_check_mark: fix test issue caused by new settingsManager
- build: :lock: fix security issues

#### v8.1.0

>  

- fix: :bug: fix controller disconnected crash
- feat: :sparkles: add external catalog loader
- feat: :sparkles: abstract camera and add dark-clouds preset
- fix: :bug: fix mobile controls
- feat: :sparkles: update gamepad logic
- feat: :zap: improve performance on mobile
- fix: :bug: fix satinfobox crashing with missiles
- fix: :bug: fixes for iframes
- feat: :children_crossing: add improved debug menu
- feat: :children_crossing: improved camera controls
- feat: :sparkles: add video director menu
- fix: :bug: fix string extractor
- docs: :memo: update changelog
- feat: :sparkles: add support for external TLE files
- feat: :sparkles: update to setting defaults
- feat: :lipstick: update site manifest and favicons
- feat: :zap: improve notional debris logic
- feat: :sparkles: improve mobile experience
- refactor: :recycle: add skip when mesh can't be seen anyway
- refactor: :fire: revert to google analytics
- feat: :sparkles: add auto rotate pan and zoom settings
- feat: :sparkles: force presets for facsat2
- fix: :bug: fix hovermanager not available in KeepTrackApi
- feat: :sparkles: add presets for facsat2
- refactor: :label: update settings type
- test: :bug: move analytics to fix jest hanging
- fix: :bug: fix analytics error
- test: :bug: fix catalog test
- feat: :sparkles: filter out objects that appear to have reentered
- feat: :sparkles: new splash screens
- fix: :bug: fix issue in mobile logic
- test: :bug: fix failing tests
- feat: :sparkles: add iframe example
- fix: :bug: fixed notional satellites being found in search
- fix: :bug: dont use orbit manager if it isn't available
- fix: :bug: fix bug with legend menu showing empty
- test: :bug: make getEl optional for select-sat-manager tests
- fix: :zap: better camera zooming controls
- feat: :sparkles: add searchLimit param to settings
- feat: :sparkles: add iframe check
- feat: :sparkles: update readme splash screen and meta data
- fix: :bug: fix time machine not stopping correctly
- fix: :bug: better handling of prop rate on load
- feat: :sparkles: update notional debris coloring
- feat: :sparkles: update iframe example
- fix: :bug: fix search results
- fix: :zap: remove debug code
- fix: :adhesive_bandage: quick fix for TLEs without leading 0s
- fix: :bug: fix coloring issue with video-director plugin
- refactor: :recycle: use sputnik as extra satellite
- refactor: :recycle: make use of keepTrackApi
- fix: :bug: fix mesh shaders turning white
- fix: :bug: fix crash caused by sat-sun being missing
- chore: :card_file_box: update default catalog
- refactor: :coffin: hide debug only code
- refactor: :recycle: move event listener for keyboard to document level
- fix: :bug: reduce scrolling errors
- refactor: :card_file_box: update default settingsOverride
- docs: :memo: update build date
- fix: :bug: fix hover id error caused by id 0
- build: :lock: fix audit issues

#### v8.0.0

>  

- feat: :sparkles: add preset functions to settings
- ci: :construction_worker: add dev site to ci/cd pipeline
- fix: :bug: fix errors when plugins disabled
- build: :construction_worker: update dependencies
- ci: :construction_worker: use new sftp deployer
- feat: :sparkles: replace google analytics
- fix: :bug: move analytics to html
- feat: :sparkles: update readme
- ci: :construction_worker: use new sftp deployer
- ci: :pencil2: fix typo in ci/cd pipeline
- ci: :construction_worker: update ci/cd pipeline
- fix: :label: fix type issue
- ci: :construction_worker: fix sftp ignore list
- fix: :bug: fix limitsat functionality
- fix: :bug: fix issue with sun colorscheme
- ci: :construction_worker: fix ci/cd directory names
- fix: :bug: fix illegal return
- feat: :sparkles: update readme
- ci: :rotating_light: fix formatting on ci/cd pipe
- ci: :construction_worker: expand ignore list for deploy
- feat: :fire: remove old license text
- ci: :construction_worker: fix ignore list for sftp
- ci: :construction_worker: fix ignore list for sftp
- ci: :construction_worker: fix sftp typo
- ci: :construction_worker: update dependabot
- ci: :pencil2: sftp to ftps
- ci: :rotating_light: fix minor linter error
- feat: :sparkles: improve errorManager logic for easier offline testing
- fix: :bug: catch setHover errors where index is null
- test: :white_check_mark: improve tests
- ci: :construction_worker: update ci/cd pipeline
- test: :white_check_mark: fix dependency errors on tests
- ci: :construction_worker: fix sftp settings
- ci: :construction_worker: fix ci/cd sftp
- fix: :bug: fix bug in settings for new url
- ci: :construction_worker: update ci dependencies
- feat: :sparkles: add getHoverManager to keepTrackApi
- ci: :construction_worker: reduce unnecessary visaulizer runs
- fix: :bug: fix splash screen not showing up
- ci: :construction_worker: fix ci/cd increase timeout
- fix: :bug: dont overwrite dist/settings/settingsOverride.js
- ci: :pencil2: fix typo in ci/cd
- fix: :adhesive_bandage: fix build script
- ci: :construction_worker: rebuild on PR from dependabot
- ci: :bug: fix gh-pages deployment
- fix: :bug: fix colorscheme when limitedsats in effect
- Delete .github/workflows/build.workflow
- Create build.workflow

#### v8.0.0-0

>  

- Update
- v7.2
- Add .circleci/config.yml
- New version
- feat: :sparkles: give user option to hide toasts
- fix: :bug: fixed error when sensor not selected
- feat: :sparkles: add 2030 catalog tools and 3d cone draft
- feat: :fire: Convert to class based system for code part 1
- ci: :sparkles: add visualizer workflow
- refactor: :recycle: split missileManager.ts and convert to classes
- feat: :technologist: convert settingsManager to a class
- refactor: :recycle: split watchlist plugin and convert to classes for better modularity
- refactor: :recycle: convert dots to classes and implement vao
- feat: :sparkles: add new gray political map and color scheme
- style: :art: fix minor formatting and linter errors
- test: :white_check_mark: improve test coverage
- style: :art: format saveVariable.ts
- chore: :technologist: update changelog
- build: :green_heart: add missing tsconfig file
- build: :construction_worker: update github pipeline to use modern node versions
- feat: :sparkles: enable toggles for orbital regime independent of color scheme
- feat: :lipstick: warn/prevent user trying non-circular orbits for breakups
- ci: :arrow_up: update ci/cd pipeline dependencies
- build: :construction_worker: clean up build pipeline
- fix: :bug: trap bug when satInSun cant be calculated
- Create SECURITY.md
- feat: :sparkles: maintain sensor filter and rerun on satellite change for multisite lookangles
- build: :lock: update all unsecure dependencies
- feat: :sparkles: update lookangles on time change
- refactor: :recycle: migrate setting to stereo-map plugin
- style: :art: remove trailing spaces
- style: :art: remove trailing spaces
- fix: :bug: fix error calculating meanA in non-circular orbits
- build: :art: fix yaml formatting
- build: :wrench: update vscode settings
- ci: :bug: update yml
- ci: :construction_worker: update sonarcloud and CodeQL
- ci: :green_heart: fix yaml formatting caused by github
- fix: :bug: fix missing ground objects
- feat: :sparkles: resize mesh models to support pizza box 3D model
- feat: :sparkles: add close side menu to KeepTrackPlugin class
- ci: :rotating_light: fix linter issue
- feat: :sparkles: rerun search when opening search bar
- ci: :green_heart: remove watch from npm test
- Update SECURITY.md
- ci: :bug: update yml
- ci: :bug: update yml
- build: :lock: fix npm security issues
- fix: :pencil2: fix bug in test due to typo
- chore: fixing tags
- fix: :bug: fix search dropdown not showing when search icon clicked
- build: :arrow_up: upgrade Orbital Object Toolkit (ootk)
- ci: :adhesive_bandage: fix typo in yaml
- Update visualizer.yml
- ci: :green_heart: reduce unnecessary automatic PRs
- Repo visualizer: update diagram
- Repo visualizer: update diagram
- Repo visualizer: update diagram
- Repo visualizer: update diagram
- Repo visualizer: update diagram
- Repo visualizer: update diagram
- Update SECURITY.md
- Repo visualizer: update diagram
- Repo visualizer: update diagram
- Update visualizer.yml
- Update visualizer.yml
- feat: :sparkles: add staticOffsetChange keepTrackApi callback
- Repo visualizer: update diagram

#### v7.2.0

>  

- Main
- test: :adhesive_bandage: fix testing issue causing jest to fail on gi…
- Update
- Update
- minor bug fixes
- Version 7.1
- Update to 7.0
- Update
- Update
- Upgrade dependencies
- Develop
- Develop
- Develop
- refactor: :label: convert om-manager to typescript
- Develop
- Develop3
- feat: :card_file_box: update catalog
- fix: :green_heart: update docker.google instructions
- Develop
- feat: :zap: optimize milky way textures and rotate
- Develop
- Develop
- Develop
- Develop
- fix: :ambulance: fix photomanager icon not loading
- fix: :ambulance: fix image not found on linux ending in /
- Develop
- Develop
- build: :arrow_up: upgrade dependencies
- Develop
- chore: :card_file_box: update database
- fix: :zap: remove jquery and fix open bugs
- feat: :sparkles: add eci ecf ric inc2lon and time2lon plots
- refactor: :zap: remove jquery
- feat: :sparkles: add satellite search on control site clicked
- style: :art: replace all camelCase files with hyphens for better git detection
- feat: :sparkles: add scenario-creator scaffold
- docs: :page_facing_up: clear AGPL notice
- feat: :sparkles: add 2nd sat selection + update selectbox
- fix: :rotating_light: fix sonarcube findings
- feat: :sparkles: add ECI plots
- refactor: :zap: remove more jquery
- fix: :zap: reduce complexity of legend color code
- feat: :zap: optimize cruncher loops
- build: :construction_worker: add google cloud support
- fix: :bug: fix loading + legend + add more settings
- refactor: :zap: remove jquery from adviceManager
- test: :white_check_mark: fix all failing tests
- fix: :zap: improve loading times
- fix: :bug: safeguard functions against bad values
- feat: :sparkles: add RIC frame 3D scatter plots
- refactor: :zap: change base64 images to delayedsrc images
- feat: :sparkles: add ecf analysis plot
- fix: :bug: fix time not moving at correct speed
- feat: :sparkles: add better breakup logic
- fix: :rotating_light: fix minor sonarcube findings
- fix: :rotating_light: fix minor sonarcube findings
- refactor: :zap: remove jquery
- refactor: :label: add more typing to colorSchemeManager
- fix: :zap: fix minor issues with stf menu
- docs: :memo: update changelog
- docs: :memo: update changelog
- fix: :beers: start fixing trend analysis menu
- fix: :bug: fix lookangles menu
- feat: :sparkles: add find reentries function
- feat: :triangular_flag_on_post: modify breakup options to be more realistic
- fix: :bug: fix ray casting on earth functionality
- fix: :sparkles: add color scheme for notional debris
- feat: :sparkles: new loading screen
- fix: :bug: fix premature filtering in findsat
- feat: :sparkles: add ability to use ECF for satellite orbits
- chore: :bookmark: update to version 5.4
- fix: :bug: fix socrates
- fix: :lipstick: fix bug with sat-infobox being sluggish
- fix: :bug: fix countries filters
- fix: :label: better typing
- test: :camera_flash: update snapshots
- docs: :memo: add better notes on how dot interpolation works
- fix: :bug: fix next pass time not updating
- fix: :bug: include TBA sats as Special
- fix deploy
- chore: :bookmark: change to 6.0.1
- fix: :sparkles: update SRP FOV
- fix: :bug: fix missing top menu icons
- fix: :bug: fix umbral not showing
- Update deploy-pipeline.yml
- fix: :pencil2: fix capitialization issue with constellations.ts
- test: :bug: fix settingsmenu tests
- chore: :lock: add gpg signing
- build: :lock: update npm packages
- fix: :lock: bump async

#### v7.1.2

>  

- feat: :sparkles: add func to show selected object as large red dot
- fix: :bug: fixes #630
- feat: :sparkles: add skeleton for new help menus
- test: :white_check_mark: update tests
- feat: :sparkles: fix issues on mobile devices
- test: :adhesive_bandage: fix testing issue causing jest to fail on github
- feat: :sparkles: add neighbors color scheme for orbit density
- feat: :sparkles: add sensors help menu
- feat: :sparkles: enable legend functions for orbit density scheme
- feat: :sparkles: new splash screens
- feat: :sparkles: add orbit density color scheme
- test: :camera_flash: update snapshots for testing
- feat: :sparkles: add help to plot menus
- feat: :sparkles: add main help menu
- feat: :sparkles: add help to edit sat menu
- feat: :sparkles: add meanmo to period conversions on edit sat
- feat: :sparkles: add help to constellations menu and fix constellation search code
- feat: :sparkles: add sensors help
- feat: :sparkles: add help for breakup menu
- feat: :sparkles: add help menu to colors menu
- fix: :bug: fix bug where lookangles enabled with no sensor
- feat: :sparkles: add analysis help menu
- fix: :bug: fix incorrect lookangles caused by caching satrec
- feat: :sparkles: add help to new launch menu
- feat: :sparkles: add help to missile menu
- feat: :sparkles: add help to dop menu
- feat: :sparkles: add watchlist help menu
- feat: :sparkles: add help to initial orbit menu
- feat: :sparkles: add help to find sat menu
- feat: :sparkles: add help to debug menu
- feat: :sparkles: add help to stf menu
- feat: :sparkles: add help to satellite photo menu
- feat: :sparkles: add help for collisions menu
- fix: :bug: add error logging for possible bug #635
- test: :clown_face: add missing mock data to tests
- feat: :sparkles: add help to twitter menu
- feat: :sparkles: add help to next launch menu
- feat: :sparkles: add help to external source
- feat: :sparkles: add help to countries menu
- feat: :sparkles: add help to map menu
- feat: :sparkles: add help to settings menu
- fix: :bug: fix error on loading related to tle4.js
- fix: :bug: fix bug in sat-fov menu when plugins disabled
- fix: :bug: fix bug with color menu plugin being disabled
- refactor: :recycle: simplify help menu code
- fix: :bug: fix bug with sat url param not being found
- fix: :bug: fix texture issue after undoing black earth
- feat: :sparkles: add about page help menu
- fix: :lock: fix security issue

#### v7.1.1

>  

- fix: :bug: fix error with TLE when editing satellite
- fix: fix error setting value of null in analysis menu
- fix: :bug: fix error in updateSatInfo
- feat: :sparkles: add inc vs alt plots
- test: :white_check_mark: add manual jest inline testing for debugging on github
- build: :lock: fix security issue
- fix: :bug: fix tests
- fix: :bug: fix ecentricity formatting
- test: :white_check_mark: update how jest is run

#### v7.1.0

>  

- feat: :card_file_box: update catalog
- feat: :sparkles: add code for extended catalog
- feat: :sparkles: add new optional settings
- fix: :bug: fix contries and constellations menus
- feat: :label: update types
- feat: :wrench: update default settings
- docs: :memo: update changelog
- fix: :children_crossing: delay error sound to prevent constant repeats
- fix: :bug: fix bug on mobile
- feat: :sparkles: add faster searching

#### v7.0.3

>  

- fix: :bug: fix issue caused by clicking a non-satellite first
- refactor: :label: update camera typing
- fix: :bug: add error trapping for uniformMatrix4fv failure

#### v7.0.2

>  

- fix: :bug: fix sorting issue with null satellites
- fix: :bug: fix issue with sun calculations
- fix: :bug: remove old reference to uiManager.resize2DMap
- fix: :bug: fix testing bugs
- refactor: remove jquery get request
- chore: :memo: update version number
- fix: :lock: remove vulnerability

#### v7.0.1

>  

- fix: :bug: fix satellite fov not showing up
- fix: :bug: fix lostobjects colorscheme hanging
- fix: :bug: fix bug in getlookangles with null for satellite
- refactor: :recycle: refactor to allow use as a react component
- build: :see_no_evil: add npmignore for lib builds
- fix: :bug: fix search issues
- feat: :sparkles: add bulk add/remove to watchlist
- docs: :memo: update changelog
- test: :white_check_mark: fix broken watchlist tests
- docs: :memo: update readme
- feat: :sparkles: add prefetching of splash screens on initial run

#### v7.0.0

>  

- fix: :bug: fix country menu not working
- fix: :bug: fix timeMachine showing other objects
- refactor: :label: add better type checking
- fix: :bug: complete country matching code
- test: :white_check_mark: add testing for colorSchemeChangeAlerts
- feat: :sparkles: add settings to hide agency dots
- feat: :sparkles: add debug menu
- feat: :sparkles: add filter settings for various orbits
- docs: :memo: update changelog
- feat: :sparkles: add labels to watchlist items in fov
- feat: :sparkles: add new splash screen wallpapers
- feat: :goal_net: add TLE validation when creating TLEs
- fix: :bug: fix bug where search results dont respond
- feat: :sparkles: add new logo and loading screen
- refactor: :recycle: change default lookangles to 2 days from 7
- fix: :bug: fix watchlist line to satellite
- docs: :memo: update readme
- fix: :bug: fix bug in error catching
- fix: :bug: fix memory leak in line-factory
- fix: :bug: fix screenshot resolution
- build: :arrow_up: upgrade serve

#### v6.2.0

>  

- build(deps-dev): bump @babel/plugin-proposal-private-methods from 7.16.11 to 7.18.6
- build(deps): bump echarts from 5.3.2 to 5.3.3
- build(deps-dev): bump mini-css-extract-plugin from 2.6.0 to 2.6.1
- build(deps-dev): bump husky from 7.0.4 to 8.0.1
- build(deps-dev): bump @testing-library/jest-dom from 5.16.2 to 5.16.4
- build(deps-dev): bump @typescript-eslint/parser from 5.12.1 to 5.30.7
- build(deps-dev): bump ponicode from 0.61.3 to 0.70.11
- chore: :card_file_box: update TLE databases
- refactor: :heavy_minus_sign: replace suncalc with ootk
- feat: :sparkles: add new sensors
- fix: :bug: fix tle exporters
- fix: :bug: fix bug when creating sensor or observer from rmb
- fix: :bug: fix edit sat menu
- feat: :sparkles: add error reporting feature
- refactor: :recycle: simplify tle formatting
- feat: :sparkles: add basic sounds
- test: :white_check_mark: fix failing jest tests
- docs: update changelog
- feat: :sparkles: add additional tle export options
- fix: :bug: fix initial orbits menu
- fix: :bug: fix breakup creator
- feat: :sparkles: add mute button
- fix: :bug: fix bug new launch time mismatch
- feat: :sparkles: add sound effects
- feat: :sparkles: update sounds
- fix: :bug: update apogee when edit sat in positionCruncher
- feat: :sparkles: add sounds to settings menu
- fix: :bug: update default colorscheme to catch unknown types
- fix: :goal_net: add defensive code to satCalculate
- build: :arrow_up: update all dependencies
- fix: :bug: fix bottom menu ui not responding when edges clicked
- fix: :bug: fix watchlist issues
- feat: :sparkles: update about page
- fix: :bug: fix bug caused by depricated fov text
- build: :arrow_up: update ootk
- fix: :bug: fix breakup menu
- fix: :bug: fix new launch menu
- fix: :bug: correct tle formatting in orbitReferencesLinkClick
- fix: :bug: fix earth becoming background
- fix: :bug: fix TLE formatting bug in getOrbitByLatLon
- fix: :goal_net: add defensive code to setSelectedSat
- fix: :goal_net: add defensive code to snapToSat
- chore: :card_file_box: update SOCRATES example
- fix: :bug: fix typo in stfOnObjectLinkClick
- fix: :lock: update node-fetch
- build(deps-dev): bump @babel/plugin-proposal-private-methods

#### v6.1.0

>  

- refactor: :recycle: split SatMath into pieces
- refactor: :truck: split uiManager into smaller pieces
- docs: :page_facing_up: clear AGPL notice
- refactor: :recycle: split satMath
- perf: :zap: improve color calculation speed
- fix: :lock: remove security false postives
- fix: :rotating_light: fix sonarcube findings
- style: :art: add more granular prettier ignore directives
- feat: :sparkles: add better embeded support
- refactor: :label: convert om-manager to typescript
- refactor: :heavy_minus_sign: migrate from satellite.js to ootk for all orbital math
- feat: :sparkles: update color scheme menus
- perf: :zap: add caching of satrec object
- feat: :zap: optimize find close objects code
- fix: :rotating_light: fix minor sonarcube findings
- feat: :sparkles: add group countries color scheme
- feat: :sparkles: update orbit manager
- refactor: :recycle: update embeded example
- refactor: :zap: optimize age of elset color scheme
- feat: :sparkles: add vismag calculations to satbox
- docs: :memo: update changelog
- refactor: :recycle: update sat group class
- feat: :heavy_minus_sign: migrate from satellite.js to ootk
- refactor: :recycle: reduce unnecessary code in meshManager
- feat: :sparkles: update time machine
- feat: :sparkles: update group color scheme
- fix: :arrow_up: upgarde critical dependencies to fix build issue
- feat: :heavy_minus_sign: migrate from satellite.js to ootk
- test: :camera_flash: update snapshots
- build: :arrow_up: bump dependencies
- feat: :sparkles: update hover manager
- fix: :sparkles: update object manager
- fix: :adhesive_bandage: remove debugger call
- fix: :adhesive_bandage: remove unnecessary logging
- test: :white_check_mark: fix api mocks

#### v6.0.3

>  

- fix: :zap: remove jquery and fix open bugs
- feat: :sparkles: add eci ecf ric inc2lon and time2lon plots
- refactor: :zap: remove jquery
- feat: :sparkles: add satellite search on control site clicked
- style: :art: replace all camelCase files with hyphens for better git detection
- feat: :sparkles: add scenario-creator scaffold
- feat: :sparkles: add 2nd sat selection + update selectbox
- test: :zap: improve jest speed and reliability
- feat: :sparkles: add ECI plots
- refactor: :zap: remove more jquery
- fix: :zap: reduce complexity of legend color code
- build: :construction_worker: add google cloud support
- fix: :bug: fix loading + legend + add more settings
- refactor: :zap: remove jquery from adviceManager
- feat: :card_file_box: update catalog
- feat: :zap: optimize milky way textures and rotate
- test: :white_check_mark: fix all failing tests
- fix: :zap: improve loading times
- feat: :sparkles: add RIC frame 3D scatter plots
- refactor: :zap: change base64 images to delayedsrc images
- feat: :sparkles: add ecf analysis plot
- fix: :bug: fix time not moving at correct speed
- feat: :sparkles: add better breakup logic
- fix: :ambulance: fix image not found on linux ending in /
- refactor: :zap: remove jquery
- fix: :zap: fix minor issues with stf menu
- fix: :beers: start fixing trend analysis menu
- fix: :bug: fix lookangles menu
- feat: :sparkles: add find reentries function
- feat: :triangular_flag_on_post: modify breakup options to be more realistic
- fix: :bug: fix ray casting on earth functionality
- feat: :sparkles: new loading screen
- fix: :bug: fix premature filtering in findsat
- feat: :sparkles: add ability to use ECF for satellite orbits
- chore: :bookmark: update to version 5.4
- fix: :bug: fix socrates
- fix: :bug: fix countries filters
- test: :camera_flash: update snapshots
- fix: :bug: fix next pass time not updating
- fix: :bug: include TBA sats as Special
- chore: :bookmark: change to 6.0.1
- fix: :sparkles: update SRP FOV
- fix: :bug: fix missing top menu icons
- fix: :bug: fix umbral not showing
- fix: :green_heart: update docker.google instructions
- fix: :ambulance: fix photomanager icon not loading
- fix: :pencil2: fix capitialization issue with constellations.ts
- test: :bug: fix settingsmenu tests
- chore: :lock: add gpg signing
- fix: :lock: bump async

#### v6.0.2

>  

- feat: :zap: optimize milky way textures and rotate
- chore: :bookmark: change to 6.0.1

#### v6.0.1

>  

- fix: :bug: fix loading + legend + add more settings
- feat: :sparkles: new loading screen

#### v6.0.0

>  

- fix: :zap: remove jquery and fix open bugs
- refactor: :zap: remove jquery
- refactor: :zap: remove more jquery
- refactor: :zap: remove jquery from adviceManager
- test: :white_check_mark: fix all failing tests
- refactor: :zap: remove jquery
- chore: :bookmark: update to version 5.4

#### v5.4.0

>  

- feat: :sparkles: add satellite search on control site clicked
- style: :art: replace all camelCase files with hyphens for better git detection
- feat: :sparkles: add scenario-creator scaffold
- fix: :zap: reduce complexity of legend color code
- fix: :zap: improve loading times
- fix: :bug: fix time not moving at correct speed
- feat: :sparkles: add better breakup logic
- fix: :zap: fix minor issues with stf menu
- fix: :beers: start fixing trend analysis menu
- feat: :triangular_flag_on_post: modify breakup options to be more realistic
- fix: :bug: fix ray casting on earth functionality
- fix: :bug: fix socrates
- fix: :bug: fix countries filters
- fix: :bug: fix next pass time not updating
- fix: :bug: include TBA sats as Special
- fix: :sparkles: update SRP FOV
- fix: :bug: fix missing top menu icons
- fix: :bug: fix umbral not showing
- test: :bug: fix settingsmenu tests
- fix: :lock: bump async

#### v5.3.0

>  

- ci: :construction_worker: add cypress to pipeline
- Develop
- refactor: :heavy_minus_sign: remove old dependencies
- ci: :construction_worker: update codecov settings
- Develop
- ci: :construction_worker: add github actions back to main branch
- Develop
- Develop
- fix: :ambulance: fixed post processing manager
- fix: :rotating_light: fixed sonarqube errors
- Develop
- build: :rotating_light: ignore database file
- build: :rotating_light: minor fixes for sonarlint warnings
- Develop
- fix: :bug: fix moon position errors
- feat: :sparkles: add eci ecf ric inc2lon and time2lon plots
- feat: :sparkles: add 2nd sat selection + update selectbox
- test: :white_check_mark: increase test coverage of uiInput
- feat: :sparkles: add ECI plots
- ci: :fire: remove github actions from develop branch
- feat: :sparkles: allow multiple STFs to be created
- refactor: :recycle: split analysis into components
- test: :white_check_mark: increase test coverage of uiInput
- test: :white_check_mark: increase coverage of calculations.ts
- feat: :sparkles: add RIC frame 3D scatter plots
- refactor: :zap: change base64 images to delayedsrc images
- feat: :sparkles: add ecf analysis plot
- test: :white_check_mark: increase test coverage
- fix: :ambulance: fix image not found on linux ending in /
- ci: :rocket: add cypress testing
- fix: :adhesive_bandage: fix sensors appearing selected when not selected
- fix: :bug: fix multisite lookangles
- refactor: :lock: use separate func for keyboardEvt
- fix: :bug: fix lookangles menu
- refactor: :art: use constant for key pressed
- feat: :sparkles: add find reentries function
- fix: :adhesive_bandage: fix find near orbit when raan 350+
- refactor: :heavy_minus_sign: remove perfect-scrollbar
- fix: :zap: add limits to all searches with findSat
- fix: :bug: fix premature filtering in findsat
- feat: :sparkles: add ability to use ECF for satellite orbits
- docs: :memo: update changelog
- refactor: :label: add typing of findBestPass
- refactor: :rotating_light: address sonarqube findings
- fix: :adhesive_bandage: fix searching by orbit near 359 raan
- refactor: :rotating_light: address sonarqube findings
- ci: :construction_worker: fix cypress pipeline
- build: :arrow_up: upgrade dependencies
- fix: :adhesive_bandage: align three buttons in custom sensor
- ci: :construction_worker: add alternate http server for cypress testing
- refactor: :rotating_light: address sonarqube finding
- test: :rotating_light: fix trufflehog finding
- ci: :truck: rename master to main
- fix: :adhesive_bandage: fix alignment of rows in sensor lists
- fix: :ambulance: fix photomanager icon not loading
- fix: :pencil2: fix capitialization issue with constellations.ts
- fix: :bug: fix searches in URL not working on load
- ci: :pencil2: add "npm run" to build pipeline
- fix: :adhesive_bandage: remove duplicate css
- fix: :bug: fix right mouse click not working
- chore: :lock: add gpg signing
- ci: :package: add placeholder for e2e tests
- build: :package: updated npm packages

#### v5.2.1

>  

- refactor: :heavy_minus_sign: remove materialize.js in favor of npm package
- docs: :memo: new changelog for 5.2
- test: :camera_flash: snapshots updated to UTC timezone
- style: :art: fixed sonarqube findings
- test: :white_check_mark: increase test coverage in satMath
- test: :white_check_mark: expand testing of uiInput.ts
- test: :white_check_mark: increase test coverage of positionCruncher
- test: :white_check_mark: increase test coverage
- test: :white_check_mark: add tests for cruncherInteractions.ts
- test: :white_check_mark: set time using UTC to ensure standardized timezone settings
- test: :white_check_mark: increase test coverage of orbitCruncher
- test: :white_check_mark: increase test coverage of classification.ts
- test: :white_check_mark: increase test coverage of findSat and positionCruncher
- docs: :page_facing_up: update copyright dates
- test: :white_check_mark: add more test coverage to satInfoboxCore
- fix: :bug: replace getFullYear with getUTCFullYear
- ci: :camera_flash: remove snapshot tripping trufflehog
- test: :white_check_mark: standardize time in colorschememanager
- test: :camera_flash: remove obsolute snapshots
- ci: :heavy_plus_sign: add husky to package
- ci: :white_check_mark: added run lint on commit
- test: :camera_flash: remove obsolete snapshots

#### v5.2.0

>  

- fix: :bug: fix undefined error in positionCruncher
- Develop
- build(deps-dev): bump @babel/core from 7.16.5 to 7.16.7
- build(deps-dev): bump jest from 27.4.5 to 27.4.7
- build(deps-dev): bump @babel/preset-typescript from 7.16.5 to 7.16.7
- build(deps-dev): bump @types/jquery from 3.5.12 to 3.5.13
- build(deps-dev): bump webpack from 5.65.0 to 5.66.0
- build(deps-dev): bump http-server from 14.0.0 to 14.1.0
- build(deps-dev): bump ponicode from 0.60.0 to 0.61.3
- build(deps-dev): bump @typescript-eslint/eslint-plugin from 5.9.0 to 5.9.1
- build(deps-dev): bump @types/node from 17.0.7 to 17.0.8
- build(deps-dev): bump source-map-loader from 3.0.0 to 3.0.1
- build(deps-dev): bump @typescript-eslint/parser from 5.9.0 to 5.9.1
- build(deps-dev): bump retire from 3.0.3 to 3.0.6
- build(deps-dev): bump @babel/plugin-proposal-private-methods from 7.16.5 to 7.16.7
- build(deps-dev): bump eslint-plugin-jest from 25.3.0 to 25.3.4
- build(deps-dev): bump @types/jest from 27.0.3 to 27.4.0
- build(deps-dev): bump @babel/preset-env from 7.16.5 to 7.16.8
- build(deps-dev): bump @types/jquery from 3.5.10 to 3.5.12
- Develop
- feat: :sparkles: add RIC frame on hover
- build: :arrow_up: bump all dependencies
- Develop
- fix: :bug: fix meshManager selecting correct mesh
- refactor: :recycle: positionCruncher overhauled to be less complex
- chore: :children_crossing: undo last commit
- Develop
- build: :construction_worker: codecov is info only
- Develop
- Develop
- refactor: :rotating_light: fixed sonar findings
- refactor: :rotating_light: fixed sonar finding on input complexity
- Develop
- build: :coffin: admin folder will now be handled by a separate repo
- build: :green_heart: updated build scripts for gitlab pipeline
- Develop
- Develop
- Develop
- build(deps-dev): bump @types/node from 16.11.12 to 17.0.0
- Develop
- Develop
- fix: :bug: fix moon position errors
- refactor: :heavy_minus_sign: remove locally hosted dependencies
- refactor: :recycle: refactor uiManager.ts to look cleaner
- feat: :bento: add flock, lemur, oneweb, spacebee and search by bus
- refactor: :recycle: refactor hoverbox code out of drawManager
- docs: :memo: changelog bump
- style: :rotating_light: code cleanup to fix sonarqube findings
- refactor: :recycle: refactor legend change code
- refactor: :recycle: refactor camera.ts
- style: :rotating_light: reformat to reduce sonarqube code smells
- feat: :sparkles: add more search filters and minor bug fixes
- fix: :bug: add installDirectory settings for staging.dso.mil
- build: :rotating_light: minor fixes for sonarlint warnings
- fix: :rotating_light: fixed sonarqube errors
- refactor: :recycle: refactor screenshot code
- build: :lock: add explicit ignore for incorrect trufflehog warnings
- test: :white_check_mark: replace all js tests with ts
- refactor: :technologist: update catalog searches
- style: :art: sonarqube findings fixed
- style: :art: removed unused code
- fix: :bug: fixed bug with ignoring trufflehog and added sonarqube fixes
- docs: :rotating_light: explicitly identify intentionally high complexity functions
- docs: :memo: updated readme and contributing guidelines
- fix: :rotating_light: fixed minor css sonarqube findings
- test: :white_check_mark: replaced js test with ts
- refactor: :recycle: reduce complexity
- style: :rotating_light: fixed sonarqube findings
- style: :zap: reduce unnecessary missileManager actions
- refactor: :truck: migrate more scripts to TypeScript
- fix: :adhesive_bandage: fixed sonarqube issues
- test: :white_check_mark: add better tests for tleformater
- fix: :bug: fix show sensors with fov link not working
- refactor: :fire: remove uiLimited code
- style: :rotating_light: remove unnecessary comments
- test: :white_check_mark: convert js tests to ts
- refactor: :fire: remove duplicate code
- build: :construction_worker: fix build env and update dependencies
- feat: :sparkles: add search for star and panToStar functionality
- Update issue templates
- fix: :children_crossing: removed extra spacing when sat-infobox is dragged
- chore: :children_crossing: feature request template
- test: :white_check_mark: tests are now timezone agnostic
- test: :white_check_mark: expand code coverage on positionCruncher
- chore: :rotating_light: added explicit ignores for sonarqube
- build: :art: cleaned up build files
- feat: :zap: add more dynamic reference orbit satellites
- fix: :ambulance: fixed post processing manager
- fix: :lock: addressed sonarqube security findings
- test: :camera_flash: update snapshots
- test: :bug: add consistent time when testing in different timezones
- feat: :children_crossing: provide feedback on getorbitbylatlon errors to user
- Create bug.md
- Delete feature-request.md
- 403 error fix: changed htm files to html files to address 403 error. Updated fiveserver, package.json, and build.mjs
- Update user-story.md
- feat: :children_crossing: change collision time to slightly before event
- fix: :ambulance: fix typo breaking drawManager
- fix: :bug: fix race condition in findSat plugin
- test: :camera_flash: update snapshots
- ci: :construction_worker: update github pipeline
- test: :camera_flash: update snapshots
- feat: :children_crossing: provide user feedback on editsat failures
- test: fixed failing tests
- test: :alien: change code coverage directory for sonarcube
- docs: :memo: update readme
- build: :rotating_light: addressed yaml lint findings
- ci: :green_heart: add new york timezone for deployment
- build: :rotating_light: second try at addressing yaml lint issues
- docs: :memo: added a link on cognitive complexity
- ci: :green_heart: add github token
- ci: :green_heart: use different method for changing timezone
- build: :lock: added trufflehog regex
- refactor: :rotating_light: reduce complexity in getters.ts
- fixing deployment: updating dockerfile to more closely match frontend.
- build: :green_heart: use New York timezone
- fix: :bug: fix bug where object id 0 has no orbit
- ci: :adhesive_bandage: reverted change to sonar key
- build: :rotating_light: ignore database file
- ci: :green_heart: use with vs env
- ci: :pencil2: lowercase github token
- chore: :children_crossing: update bat file for index.html
- ci: :wrench: update babel config
- fix: :bug: fix reference orbits having wrong rasc
- test: :adhesive_bandage: fix moon tests
- build: :heavy_minus_sign: remove five-server until security update is made
- refactor: :rotating_light: fix sonar lint error
- Update deploy-pipeline.yml
- build: :arrow_up: remove vulnerability
- build: :arrow_up: security fix
- build: :lock: fix vulnerability
- build(deps-dev): bump @typescript-eslint/eslint-plugin
- build(deps-dev): bump @babel/plugin-proposal-private-methods

#### v5.1.0

>  

- build(deps-dev): bump @types/node from 16.11.12 to 17.0.0
- Develop
- build: :hammer: cleaned up all the build scripts to use node API
- fix: :label: type error preventing build
- build: :construction_worker: add code coverage settings for sonarcloud
- build: :construction_worker: better github pipeline
- Develop2
- build: :green_heart: allow but dont require node 17
- fix: :bug: fixed use of strings instead of SpaceObjectType enum
- Develop
- Develop
- build(package): downgraded typescript and referenced local build in vscode
- refactor(keeptrackapi): refactored api + removed all &lt;any&gt;keepTrackApi references
- build(dockerfile): got docker to start the npm install but need to remove github dependencies
- build(deps-dev): bump jsdom from 17.0.0 to 19.0.0
- Develop
- Develop
- Develop
- fix(catalogloader): fixed offline catalog loading with JSON parse
- Develop
- Add CodeSee architecture diagram workflow to repository
- Develop
- Develop
- test(settingsmanager): fixed tests to work with non-module settingsMa…
- fix: :rotating_light: fixed multiple sonarqube findings
- feat: :children_crossing: better feedback on 404/500 errors
- refactor: :fire: removed duplicate code
- fix: :bug: fixed some sonarqube findings
- fix: :bug: fixed bugs related to legacy end of world json sims
- fix: :rotating_light: extra file breaking linter
- test: :white_check_mark: added testing to positionCruncher
- fix: :bug: new launch now displays error if no sat selected
- test: :white_check_mark: increased satSet test coverage
- test: :white_check_mark: increased test coverage on menuController
- refactor: :rotating_light: fixed sonarqube findings
- build: :construction_worker: sonarcloud fixes and deploy pipeline
- refactor: :coffin: removed WIP radarDataManager
- ci: :construction_worker: new deployment pipeline
- ci: :construction_worker: add checkout of code to each job
- build: :rotating_light: yaml linting
- perf: :lock: addressed multiple sonarqube findings
- build: :green_heart: changed build pipeline order
- refactor: :rotating_light: fixed sonar finding on input complexity
- ci: :pencil2: added missing "run" command
- test: :coffin: removed obsolete jest snapshots
- ci: :rotating_light: fixed linting errors in yml files
- ci: :white_check_mark: generate code coverage for sonarcloud
- build: :wastebasket: removed unnecessary build calls
- refactor: :rotating_light: fixed sonar findings
- test: :adhesive_bandage: make tests pass
- build: :construction_worker: linting build-pipeline.yml
- build: :construction_worker: run on push OR pull not both
- fix: :art: minor changes to redundant css code
- build: :lock: add sonarcube scans to master on push
- test: :bug: fixed jest tests
- build: :green_heart: updated build scripts for gitlab pipeline
- build: :ambulance: watch command is locking up build in CI
- ci: :construction_worker: no node restrictions for better interoperability
- fix: :bug: fixed bug where 404 was always displayed
- fix: :lipstick: fixed bug in materialize.css
- fix: :lock: address sonarqube finding for client-side redirection
- build: :bug: webpack ignores catalog admin files
- fix: :pencil2: error page now redirects back to home page
- test: :bug: fixed test running after jest teardown
- ci: :construction_worker: changed npm-audit-action
- build: :green_heart: yml issue
- ci: :pencil2: removed extra -
- build: :coffin: admin folder will now be handled by a separate repo
- chore: :coffin: removed unused images
- refactor: :label: type incorrect
- ci: :pencil2: fixed port for ftp deployment
- ci: :construction_worker: clarify pipeline order
- build: :pencil2: yml not yaml
- build: :green_heart: workspace directory "fixed" again
- build: :coffin: removed duplicate test script
- Merge branches 'master' and 'master' of https://code.il4.dso.mil/spacecamp/delta4/darts/keeptrack-space
- feat(multiple): merging with the current github code base
- fix(timemanager): improved time sync between satCruncher orbitCruncher and main thread
- refactor: :fire: removed old php scripts that are no longer used
- test: :white_check_mark: fixed test dependencies and use of SatObject
- refactor: :truck: split satSet into multiple files
- test(multiple): increased code coverage
- test: :white_check_mark: improved coverage of default ruleSet
- test(multiple): fixed tests
- refactor(timemanager): consolidated all propRate propOffset and satCruncher time communication
- build: :hammer: implemented five-server (live-server) and webpack --watch
- test: :white_check_mark: increased code coverage
- feat: :sparkles: convert SpaceObjectType enum to string
- refactor: :rotating_light: fixed eslint warnings
- test: :heavy_plus_sign: added missing imports
- test: :white_check_mark: improved main.ts tests
- chore(changelog): updated changelog
- test: :white_check_mark: code coverage for group ruleset
- refactor(timemanager/transforms.ts): refactored time conversion functions out of timeManager.ts
- refactor: :label: created &lt;KeepTrackPrograms&gt; interface to reduce use of &lt;any&gt;
- refactor: :heavy_minus_sign: removed some @app references
- refactor: :fire: removed old cypress e2e tools
- test(multiple): improved code coverage
- test(multiple): increase code coverage
- build: :coffin: removed old scripts that are no longer needed
- test: :white_check_mark: 100% coverage in countries colorscheme
- test: :white_check_mark: added code coverage to main.ts and embed.ts
- Delete codesee-arch-diagram.yml
- refactor: :recycle: cleaned up breakup code
- test(multiple): fixed tests for no EST test servers
- build: :lock: removed vulnerabilities in devdependencies
- build: :arrow_up: upgraded multiple dependencies
- fix(initialorbit): creating an analyst satellite automatically searches for it now
- Delete .gitlab-ci.yml
- Update .gitlab-ci.yml file
- SH: added dockerfile, added npm install to build script (not functional yet)
- build(dockerfile): reworked dependencies to get docker working
- fix: :bug: analyst satellites were not defaulting with correct SpaceObjectType
- fix(watchlist): load watchlist now calls the correct function
- test: :lock: false positive for secret
- fix(selectsatmanager): fixed bug where search box was displayed empty and updated political map
- build: :arrow_up: requiring node 17 to mitigate bug in node 16
- build(package.json): added test:unit
- refactor(multiple): minor ts errors fixed or hidden
- changelog
- fix(sensor): sensor reset button now sets the sensor back to defaults
- Update node-ci.yml
- build: :bug: CI now relies on previous step
- build: :green_heart: wrong yaml path
- Update Dockerfile per MDO request (may need to double check npm i removal)
- fix: :bug: enabled local testing without https
- build: :construction_worker: wrong yml filename
- ci: :green_heart: added package-lock.json back in for pipelines npm ci
- SH: updated dockerfile to look at output dist instead of build

#### v5.0.1

>  

- build(deps-dev): bump cypress from 7.7.0 to 8.2.0
- build(deps-dev): bump http-server from 0.12.3 to 13.0.0
- build(deps-dev): bump jest from 26.6.3 to 27.0.6
- Develop
- feat(settingsmanager.js): settings.js now compiles separate from othe…
- Develop
- feat(sensor.ts): added link to show all sensors with fov on a satellite
- thkruz/issue295
- build(deps-dev): bump css-loader from 5.2.7 to 6.2.0
- Version 5
- feat(meshes): added new meshes
- added new  catalog loader
- test(multiple): a lot of ponicode created unit tests
- fix(multiple): improved code to allow more unit tests and catch async errors
- refactor(camera): migrated camera to typescript
- feat(multiple): improved error detection and reporting for webgl issues
- test(multiple): added many new Jest tests
- fix(get_data.php): patched vulnerability
- build(configs): updated configuration settings
- refactor(satset): cleaned up satSet code
- refactor(sun): implement vao and move to typescript
- refactor(moon): add vao and move to typescript
- feat(extra.json): better offline catalog management
- fix(multiple): implemented Snyk and fixed multiple minor errors
- refactor(camera): renamed cameraManager to setup future multi camera modes
- build(embed): created an embedable version of KeepTrack
- feat(settingsmanager.js): settings.js now compiles separate from other files for easy offline edits
- feat(gamepad): initial gamepad support
- test(multiple): fixed failing tests
- feat(settingsmanager.js): add passing of URI with settings overrides
- refactor(camera): refactor cameraTypes to be like enums
- update settingsManager to not be a module
- test(apimocks.ts): consolidated mocks for jest testing
- fix(positioncruncher): fixed issue with full FOV not working with fence update
- test(settingsmanager): improved settingsManager testing
- test(multiple): added additional unit tests
- test(ui-input.ts): improved ui-input testing and error catching
- test(externalapi): added new stub file for tests
- test(moon): added test for the moon
- feat(line-factory.js): added lines for showing scanning by satellite or ground sensor
- feat(ui-input.ts): added political maps and upgraded surveillance fence view
- feat(settingsoverride): added an override so that settings stay consistent after updates
- docs(changelog.md): version bump
- fix(uimanager): shift f to find and shift h to hide UI
- feat(main.js): added more visible error checking to the loading screen
- fix(satset): getTEARR now works on missile objects
- test(main.js): removed unnecessary console statements and improved testing
- ascii catalog edits
- fix(starmanager): fixed bug where webGl lags hard after highlighting certain stars
- feat(settingsmanager): added new settings for overriding defaults to support making movies
- fix(satset.js): added more descriptive error messages
- feat(meshmanager.js): added new meshes, mesh rotation settings, sbirs options, and mesh overrides
- feat(sensormanager.js): added drawFov function for animating radars surveillance fences
- fix(color-scheme-factory.js): show stars when searching for objects
- feat(camera.js): added autopan, zoom speed settings, and zooming on missiles
- fix(shorttermfences.ts): fixed scoping issue with one time only flag
- build(settings.js): enabled offline version
- fix(satinfoboxcore): hide sunlight status if no sensor
- changelog
- build(package.json): improved npm scripts
- fix(sensorlist.js): removed cobra danes secondary sensor
- build(package): upgraded jsdom
- fix(webgl-obj-loader.js): migrated fetch to $.get for offline support
- fix(package.json): fixed http-server issue with new default ip address
- feat(atmosphere.ts): allow mesh to be moved with a position override
- fix(satinfoboxcore): fixed bug when selecting a missile
- test(test-env): migrated from require to import
- fix(satmath): fixed issue with ecf calculations breaking sun and moon
- Update README.md
- fix(catalogloader): fixed offline catalog loading with JSON parse
- github actions
- feat(moon.js): allow moon position to be modified with an override
- test(settingsmanager): fixed tests to work with non-module settingsManager
- no admin folder required
- feat(ui-input.ts): added override to allow zooming while auto rotate is on
- build(tsconfig.json): build to es3
- test(camera.test.ts): unneeded import
- settingsManager fixed
- refactor(timemanager.ts): changed warning to debug to reduce unecessary messages in the console
- build(.gitignore): added embed folder
- fix(catalogloader.ts): give static dots an id property
- fix(index.htm): removed modernizr since it provided no value
- fix jest to use jsdom

#### v4.1.0

>  

- Main
- Develop
- Develop
- build(typescript): started migration to typescript
- fix(sensor.ts): fixes #295
- fix(satinfoboxcore): only show sensor info if a sensor is selected
- docs(changelog): version officially bumped to 4.0
- chore(commitizen): added commitizen to package.json
- updated dependencies

#### v4.0.0

>  

- feat(keeptrack): complete overhaul to TypeScript and implement KeepTrackApi
- feat(astroux): implemented astroux css and soundManager
- fix(nextlaunchmanager): upgraded to launch library 2 api
- test(integration tests): updated integration tests to support keeptrackApi
- feat(main): updated main.js to use keeptrackApi
- feat(multiple): implemented keeptrackApi instead of passing variables to functions
- fix(satinfoboxcore): provided a fix for when isInSun is unavailable (testing only so far)
- fix(tle.js): fixed missing export call in offline TLEs
- fix(ui-input.ts): fixed DOP calculation bug
- fix(lookangles.js): fixed dop calculation bug
- build(package.json): changed jest testing to stop on first failure
- chore(launch.json): changed vscode config for debugging

#### v3.5.0

>  

- refactor(settingsmanager): converted settingsmanager from js to ts
- refactor(uimanager): ui-input converted to ts and uiManager updated to be more dynamic
- feat(satinfoboxcore): refactored satInfoBox as plugin
- chore(contributing.md): removed contributing.md file
- refactor(multiple): standardized use of lat, lon, alt vs lat, long, obshei
- refactor(selectsatmanager): refactored selectSatManager as a plugin to keeptrackApi
- feat(externalapi): implemented API for external plugins
- chore(tsconfig.json): updated tsconfig rules
- chore(tle): updated TLEs
- chore(declaration.d.ts): enabled css for typescript
- chore(.eslintrc): removed no-explicit-any rule

#### v3.4.3

>  

- feat(uimanager.js): added Short Term Fence menu
- build(deps-dev): bump style-loader from 2.0.0 to 3.0.0
- feat(satvmagmanager): expanded sunlight color scheme, fixed propagati…
- fix(analysis-tools): fixed analysis tools to work with OOTK
- fix(style.css): bottom menu was hiding some input selection options. …
- fix(uimanager): fixed find objects in this orbit and orbit remaining …
- docs(changelog): generated auto changelog
- docs(readme.md): updated readme for version 3
- feat(satvmagmanager): expanded sunlight color scheme, fixed propagation speed code and line to sat
- fix(ui-input.ts): migrated ui-input to typescript. fixed on click and create sensor/observer bugs
- build(typescript): started migration to typescript
- refactor(helpers.ts): migrated helper module to typescript
- refactor(nextlaunchmanager.ts): fixed typing errors during build
- test(integration1): increased code coverage
- build(typescript): updated types and lint rules
- fix(uimanager): fixed find objects in this orbit and orbit remaining after watchlist item removed
- fix(nextlaunchmanager.ts): fixed type error
- test(integration1.test.js): increased lookangles code coverage
- build(uimanager.js): fixed import to use new typescript file
- Autofix issues in 2 files
- chore(changelog): updated changelog
- fix(style.css): bottom menu was hiding some input selection options. changed max-heigh of popups
- build(package.json): updated version npm scripts to include git tag
- fix(nextlaunchmanager): removed race condition involving launchList
- build(helper.ts): fixed type error
- chore(package.json): bumped version number
- build(auto-changelog): added changelog dependency
- ci(deepsource): fixed exclude to ignore external libraries

#### v3.2.0

>  

- feat(uimanager.js): improved alerts for watchlist items entering/exit…
- build(release.yml): fixed github publishing reference
- chore(package.json): version bump
- fix(uimanager): fixes issues #223 and #237
- ci(github workflows): updated to match package.json new script names
- feat(photomanager.js): added on orbit imagery to close #14
- test(integration tests): split integration testing into 3 files
- feat(ui-input.js): added draw sat to sun line feature
- test(integration1.test.js): added menu-sat-photo testing

#### v3.1.3

>  

- feat(uimanager.js): improved alerts for watchlist items entering/exiting fov
- fix(satset.js): fixed color of overlay icon when loading saved watchlist

#### v3.1.2

- build(release.yml): fixed github publishing reference

#### v3.1.1

- chore(package.json): version bump

#### v3.1.0

>  

- fix(uimanager): fixes issues #223 and #237
- ci(github workflows): updated to match package.json new script names
- build(deps-dev): bump jest from 26.6.3 to 27.0.1
- build(deps-dev): bump imports-loader from 2.0.0 to 3.0.0
- Develop
- Develop
- develop
- test(color-scheme.unit.test.js): increased code coverage
- test(dots.unit.test.js): increased test coverage
- Develop
- perf(drawmanager.js): removed extra meshManager.draw calls and fixed …
- perf(positioncruncher.js): longer time between propagation loops
- Develop
- test(integration.test.js): increased test coverage
- Develop
- test(search-box): add 90% code coverage
- Develop
- Develop
- Bump imports-loader from 1.2.0 to 2.0.0
- Ootk
- feat(ootk): integrated ootk to replace satellite.js
- Develop
- Version bump
- Twgl
- Develop
- Twgl
- Added getSunPosition and Fixed getStarPosition
- Color factory
- Private variables in camera
- Clear entry point
- Clear entry point
- Class extraction
- Development
- Update version number
- Private Methods and Fields added
- Create Camera Class
- fix(uimanager): fixes issues #223 and #237
- Fixed #217
- README Update
- test(cypress): added cypress E2E testing
- chore(out.json): remove unneded output
- fix(ui): various bugfixes to UI menus
- Offline fixes for Firefox 52
- test(integration.js): increased code coverage
- refactor(uimanager.js): consolidated sensor selection code
- feat(analysis): added analysis features and move ootk to a separate location
- fix(orbitmanager.js): fixed orbit not updating on new launch generation
- test(integration.js): raised to 80% code coverage
- fix(graphics): reduced use of framebuffers and overall number of drawing calls
- chore(package.json): version bump
- Reorganize Files
- test(integration.test.js): added integration testing to increase code coverage
- fix(babel.config.js): cleaned up minor errors that had no impact on code
- feat(webgl): upgrade to webgl2
- refactor(multiple): increased code coverage and fixed fringe cases
- test(integration.test.js): increased code coverage
- Ocular Occlusion for Earth
- feat(ui): resizeable menus added
- Added ocular occlusion for mesh models
- refactor(sidemenumanager.js): consolidated side menu code from uiManager
- meshManager fixes
- dlManager updated
- library separated internal vs external
- Renamed dlManager drawManager
- refactor(helpers.js): extracted color parsing and conversion functions
- Moved webworkers
- Godrays
- test(all): added working jest support for doms, webworkers, and canvas
- Consolidated constants
- Consolidated sceneManager and Removed jQuery
- feat(post-processing): added FXAA support
- Made mapManager part of uiManager
- Fixes for offfline tles, atmosphere, camera, meshes
- Post Processing Resize Fix
- refactor(ui-validation): extracted validation jquery code from uiManager
- fix(sidemenumanager): fixed references to depricated sMM functions
- perf(drawloop): reduced GPU commands
- perf(dots.js): reduced number of dots in buffer to speed up readpixel calls
- build(package.json): automatic version and build date scripts added
- Reduce readPixel calls
- Remove unused libraries
- Screenshots, timepicker, and sat-hoverbox bugfixes
- build(npm scripts): cleaned up npm scripts naming
- Fixed meshManager webgl error
- fix(camera.js): fixed issue where reseting camera could get stuck spinning in a circle
- build(cypress.yml): removed cypress github action
- Depricated modules folder
- test(cypress.yml): remove firefox testing
- fix(dots.js): moved mat4 multiplication from vert shader to js
- build(startup.js): simplified cypress testing
- build(e2e.js): disable e2e for now
- build(webworker): disable webworkers during testing
- Libraries merged into lib folder
- build(package.json): added start-server-and-test
- build(package.json): added npm-run-all
- build(package.json): downgraded jest
- selectSatManager moved to drawManager
- Improved desktop performance
- build(webworkers): skip workers when in CI mode on github
- search-box moved
- Fixed hover and select colors
- test(cypress.yml): fixed spacing issue
- test(cypress.yml): fixed formatting
- Enabled mipmaps
- test(package.json): added http-server
- test(cypress.yml): remove last firefox test
- fix(materialize-local.css): fixed load order of colors
- test(startup.js): simplified cypress test
- fix(startup.js): removed redundant global variable references
- fix(drawmanager.js): fixed resizing from small screen to big screen that caused gpupicking to break
- test(startup.js): added error handling
- test(cypress.yml): updated working-directory
- build(github actions): typo in build command
- perf(drawmanager.js): removed extra meshManager.draw calls and fixed earthBumpMap
- test(missilemananger.unit.test.js): removed unnecessary test
- Reduce DOM Lookups
- fix(tle.js): added export for offline TLEs
- build(gpr.js): reenabled linter
- build(node-ci.yml): simplified node-ci
- test(node-ci.yml): removed cypress from node-ci
- orbitManager moved
- build(package.json): use start-server-and-test for jest
- chore(package.json): bumped version number
- build(cypress.yml): made cypress run headless
- build(node-ci.yml): node version bump
- chore(package.json): update version number
- sideMenuManager moved to uiManager
- readpixels throttle
- build(node-ci): added build:dev
- build(node-ci.yml): fix gl issue
- build(node-ci.yml): remove CI variable
- test(meshmanager.js): removed testing of meshManager init
- build(package.json): fixed issue with jest
- chore(version.js): bump version number
- test(startup.js): increase wait to 10s
- chore(package.json): updated version number
- docs(settingsmanager): updated version number
- build(node-ci.yml): fixed typo
- fix(babel.config.js): bugs found in deepsource removed
- fix(sidemenumanager.js): fixed issue when less than 20 collision events
- ci(package.json): removed outdated package
- build(webworker): changed to array
- build(node-ci.yml): convert node-ci to windows runner
- build(node-ci.yml): fixed typo
- test(startup.js): increased waiting to 30s
- test(cypress.yml): fixed typo
- fix(satset.js): fixed calculation on how many dots to draw
- Update node-ci.yml
- fix(drawmanager.js): typo removed
- Update is-website-vulnerable.yml
- fix(sidemenumanager.js): dOM text reinterpreted as HTML
- Update README.md
- build(node-ci.yml): added local server
- test(package.json): added cypress
- test(cypress.yml): fixed typo
- build(package.json): created a script for starting a test server on localhost
- merge conflicts
- Revert "Revert "Fix DOMContentLoaded issue""
- Revert "Fix DOMContentLoaded issue"
- Fix DOMContentLoaded issue
- Extracted starManager and Made LineFactory
- Extracted SunCalc and More Explicit Start Order
- Refactored main.js
- No ColorScheme Globals and Fixed Sunlight Status
- ColorSchemeFactory
- Automatic ES6 Conversion
- dots class created
- keeptrack-head renammed settings
- Established Clear Loading Order
- Smarter dots buffer use
- Decoupled parseCatalog
- twgl for Moon
- Moon and Atmosphere Switched to TWGL
- Cleanup SatSet.init
- Fixed pMatrix Not Updating
- Class for Satellite gl Actions
- Reduce Dependencies
- Fixed bug with appending hoverbox
- Separated Update Draw and Drawpicking
- Fix Star Sizes
- Private Fields Removed
- Stable SunCalc
- Removed jQuery from main.js
- Separate Picking from Positions
- Revert "Private variables in camera"
- Clean main.js
- Separate catalog loading
- Separated gpu buffer setup
- Reduce Dependencies
- Fixed daysold calculations
- Added gl.DYNAMIC_DRAW
- Moved webworkers to own folder
- Fixed raycasting bug when clicking earth
- Revert "Lint fix for camera.js"
- Lint fix for camera.js
- satVmag moved
- Archived unused js code

#### v3.0.4

>  

- Fix .gitattributes Issue
- Include All Req Image
- Remove unused files from deepsource
- Development
- Github Packages fix
- Create codeql-analysis.yml
- Create release.yml
- Delete npm-publish.yml
- Create deploy-ghpages.yml
- Create .deepsource.toml
- Fix codecov
- Update release.yml
- Fix coverage
- Update .deepsource.toml
- Add codecov
- Update README.md
- Update node-ci.yml
- Delete npm.yml
- Create npm.yml
- Update node-ci.yml
- Add coverage to package

#### v3.0.3

>  

- Development
- Create CONTRIBUTING.md
- Fixed Gitattributes
- Update README.md
- .gitignore Update
- Update README.md
- Example automatic todo
- Fix Images
- Update README.md
- Update README.md
- Update npm-publish.yml
- Update npm-publish.yml
- Update npm-publish.yml
- Update npm-publish.yml
- Bump to 3.0.3
- Update npm-publish.yml
- Update npm-publish.yml
- Update npm-publish.yml
- Update node-ci.yml
- Update README.md
- Update npm-publish.yml
- Update README.md

#### v3.0.2

>  

- cameraManager testing added
- Development
- Refactor main.js
- Fixed loading screen issues
- Update and rename npm.yml to npm-publish.yml
- Update and rename lint.yml to node-ci.yml
- Fixed tests
- Create npm.yml
- Configured for CI
- Update node-ci.yml
- Update node-ci.yml
- Update node-ci.yml
- Update lint.yml
- Update node-ci.yml
- Update lint.yml
- Ignore coverage
- Update npm.yml
- Update is-website-vulnerable.yml

#### v3.0.1

>  

- updateRadarData script
- Remove highres images
- Remove radar data
- Remove radar data
- Remove 8k images
- Remove highres images
- Remove 8k images

#### v3.0.0

>  

- Bump mkdirp from 0.5.5 to 1.0.4
- Upgrade to ES6+
- eslint rename
- npm publishing
- Create dependabot.yml
- Update lint.yml
- gitignore
- Remove hires images
- Rm package-lock.json

#### v2.8.1

>  

- satellite.js to 4.1.3
- Implement npm
- PropRate 0 bugfix.
- Package update

#### v2.8.0

>  

- Missile bugfixes. Error toasts. New loading messages.

#### v2.7.5

>  

- Better orbit lines. Mobile scrolling bufix.

#### v2.7.4

>  

- Fixed to Satellite camera mode bugfixes

#### v2.7.3

>  

- Reduce memory leaks

#### v2.7.2

>  

- Selected dot color fix

#### v2.7.1

>  

- Initial Orbit Determination
- Numerous bugfixes.
- 16K images and satellite fixed camera
- Astronomy and Planetarium fixes. Shader updates.
- Time propagation bug fixes.
- Version updated
- Mobile webgl fixes

#### v2.5.1

>  

- RadarData toggle
- Performance fixes
- Mobile fixes.
- frag depth extension fixes
- radarData auto-import
- Console Toggle

#### v2.4.0

>  

- Create LICENSE
- Faster indexing and more radarData colors.
- GNU GPL copyright update
- Update README.md
- Bugfixes
- Update README.md
- Update README.md
- license folder rename

#### v2.3.0

>  

- Moon fixed. GS database added.
- radarData module updates

#### v2.2.0

>  

- RadarData module updated

#### v2.1.0

>  

- Offline fixes and rmManager

#### v2.0.0

>  

- Feature locks and bugfixes
- Fixed running without webserver
- Right click menu color fix

#### v1.20.12

>  

- Relative velocity added

#### v1.20.11

>  

- Fix line to satellite from sensor

#### v1.20.10

>  

- External data fix
- Fixed edit satellite menu

#### v1.20.9

>  

- External data fix

#### v1.20.8

>  

- Show sensor to satellite link. Fix external sensor requests.
- Missing min files

#### v1.20.7

>  

- Zoom more friendly. Fixes #182
- Multisite lookangles fix
- Starlink control sites
- Fixed timeRate handling, missile events, and colorbox issues
- Galileo satLinkManager
- External Sources menu
- Sub 1 Second Loading
- Lighthouse Report fixes
- PWA update
- Version Number Update
- Service worker update.
- Fix which assets preloaded
- Fixed toasts for limitedUI without all the extras of materialize
- Progressive Web App test
- Improved PWA
- Thinner orbit lines when the UI is disabled
- Increased visibility when searching for satellites
- Better search menu handling
- PWA bugfix
- Ensure a default earth texture loads
- Manifest files
- Fix duplicate suns #185
- Service worker installed first
- Prevent zoom NaN errors
- Clear lines too when the screen is cleared
- Search list dropdown fix
- Breakup generator fixes
- PWA update
- Add license file template
- Missile manager updated to use new timeManager
- PWA fix
- Multisite Lookangles fixed with new timeManager
- https redirect
- Alpha settings in webgl off
- Provide a valid apple-touch-icon
- webmanifest update
- PWA update
- PWA fix
- PWA remove extra file
- Unecessary CSS in limitedUI mode is overriding other websites CSS files
- Multisite lookangles fix 2
- Charset declaration earlier in page load
- Fullscreen PWA
- Bugfix on manifest
- Favorite icon update
- Add an Apple touch icon
- Add a theme-color meta tag
- Better Apple Touch icon

#### v1.20.1

>  

- Pr/179
- Merge Le-Roi Changes
- Constellations
- Footer Nav Style Updates
- format update
- code formatting
- format update
- Repo Update
- Fixed formatter issues.
- Latest From Master
- working on code format
- Minimize loading times and add prettier
- CSS issues and response.html
- O3b and debris
- AEHF and auto face Nadir
- Minified js loading
- Bugfixes
- Galileo satellite added
- Gps satellite model added
- Add orbcomm and globalstar constellations
- Added PNames to stars HR3 to HR1003
- Javascript standard style.
- Added additional constellations
- Add sensors and fix sun
- Embed testing and image preloading
- Bugfixes
- Enable draw-less setting
- Refactor sensorManager attributes
- Update checker-script.js
- Updates
- Reverted json loading
- pre-multiplied alphas disabled for firefox compatibility
- Better loading order
- working on sensor manager
- Fixed css and time
- json updates
- Fix bug from merge
- Folder Cleanup
- footer nav tweaks
- Update checker-script.js
- Improved atmosphere shader
- Working on embeded.htnl
- Skip minified version of satSet
- Update sensorManager.js
- typo
- Typo
- Missing semicolon
- Missing missileManager icon
- Fix conflicts. We need to fix your linter.
- Update style.css

#### v1.19.10

>  

- Fixed mobile clock and unlinked datestring to close #169 and #170
- More 3D models
- More meshes and improved camera controls
- Colored Meshes
- Astro Space UXDS update
- Fixed bug
- Case sensitive Satellite.obj (rename later).
- Bugfixes
- Color fixes

#### v1.19.7

>  

- After loading updated with readystate function
- 17-08-2020 keeptrack.space response and compatibility update.
- Updated UI colors. Close #166
- Added right click menu on mobile to close #132
- Close #150
- revert??
- update
- loading update
- response and compatibility update
- Update index.htm
- response update
- Improved camera controls
- testing error scripts
- Working on content loaded
- Fixed rest of #132
- response updates
- Look for an essential file rather than the index.htm
- Merged changes. Hides analytics and adds https requirement.
- some tweaks
- trail and error
- Performance update for limitedUI mode.
- Combined Ignores
- My ignores
- footer menu fix (SEE LINE COMMENT 2148 UI.JS )
- Fixed github.io

#### v1.19.3

>  

- mesh cleanup
- Merged sun.js and earth.js
- meshManager implemented!
- Updates for limitedUI
- Mobile resizing and width calculation ignoring scroll bar fixed
- Better mobile device detection and canvas resize locking #154
- Remove debug comments
- Update README.md
- Updated preview image.
- Fixed issue with satellite shaders too small until zoom changes
- Fixed bug that kept reloading previous sensor even after clearing it
- Update README.md
- Update README.md
- timeManager file rename

#### v1.18.3

>  

- Added constellations
- meshManager added with 3d satellite
- Panning controls implemented
- Cleaned up settings manager
- Shader improvements, bump maps, specular lighting
- Update index.htm
- response update
- Limited UI Enhancements
- response updates
- Made analytics only turn on when on keeptrack.space #141
- Local rotation implemented
- Removed background forced coloring
- Github Version
- footer menu fix (SEE LINE COMMENT 2148 UI.JS )
- Typos in constellations
- Typos in constellations
- Fixed bug with time drifting backwards.
- Fixed typo
- Removed comma

#### v1.17.0

>  

- Atmosphere, performance improvements, and embed support.
- Atmosphere, Time Machine, and Optional Modules System
- Added Sun, Moon, and install directory settings
- Remove Sat Class. Add French SLBM. Fix TruSat Map.
- Better shaders
- Better shaders
- Search and Socrates bug fixes.
- Local to utc fixed in lookangles formatting
- updateURL overhaul
- Fixed install directory code
- Hi-Res Screenshots
- Submarine settings in MissileManager
- satellite.satSensorFOV
- get parameters updated to use date variable
- sat-cruncher error catching
- Notify of color scheme changes
- github.io Compatibility
- Dynamic missile apogee added.
- MissileManager updates
- Dynamic install location code.
- Debris only and photo button
- Match protocol for colorbox
- TruSat Correction
- Remove logging
- Remove .min reference

#### v1.11.2

>  

- Bugfixes and persistent sensor. Fixes #138
- CSO Search added. Group colorscheme fixed.
- lookangles.js reorganized
- Code cleanup
- Best pass times calculator
- Fix issue #137
- Age of Elset colorscheme added
- Fix screen recorder and rise/set lookangles
- Search slider update
- Delete todo-issues.yml
- Create todo-issues.yml
- Test todo bot
- Delete to-do-to-issues.yml
- Update todo-issues.yml

#### v1.10.1

>  

- jQuery update and removed depricated references
- Next Launch Manager added to solve #97
- Cleanup TODO comments
- Decayed satellite checks
- Create Linter
- is-website-vulnerable
- Create to-do-to-issues.yml
- jQquery 3.5.1 update
- Update README.md
- Update README.md

#### v1.9.3

>  

- Red theme fixes #125
- Dynamic object colors and color picker in settings
- SatChng Menu and fixed multiple TODOs
- Clean lookangles and multisitelooks. Add catalog exports.
- Cleanup file organization
- Cleanup file organization
- Cleanup minor syntax errors
- Add debugging mode
- Dynamic mobile mode
- Force Cache Refresh
- Analyst Satellite Fixes
- Update README.md
- Sensor parameter fixes.
- Merge
- Update README.md
- Update README.md
- Update README.md
- Update README.md

#### v1.8.0

>  

- fix JS math expression
- Bug fixes.
- Visual Magnitudes for satellites. Right Click Menu Changes.
- Dynamic object colors and color picker in settings
- Stars Updates, Earth Map Adds, and Breakup/New Launch Fixes
- Additional Map options from the right click menu.
- TruSat tie-in
- TruSat Integration Update
- Keep last map settings on reload.

#### v1.5.1

>  

- Updated video recording (now includes UI) and added sunlight view
- Added Video Recorder
- IE bug fixes
- Reduced position calculations.

#### v1.2.6

>  

- Reorganized Files
- Improved Responsive UI/CSS
- Added Launch Sites
- Updated social links.

#### v1.2.4

>  

- Added Constellations
- drawLoop Fix
- drawLoop Fix

#### v1.2.2

>  

- Improved Stars and Constellations
- Stars and Constellations
- Astronomy View Improvements

#### v1.1.1

>  

- Fixes for offline mode.
- Support for Mike McCant's TLEs
- Delete .gitignore
- Delete .htaccess
- Cross-browser support for satbox-info
- Delete .gitattributes
- Offline bugfix
- License Typo
- Remove some files.
- Delete .jshintrc
- License Typo

#### v1.0.0

>  

- License System Implemented
- DOP Table Added
- Small Bugfixes
- Update README.md
- Removed offline scripts.
- Delete keeptrackPreview.jpg
- Delete dayearth-10800.jpg
- Delete dayearth-43200.jpg
- Delete 6_night_16k.jpg
- Delete 2_earth_16k.jpg

#### v0.48.2

>  

- PDOP function finished
- Started PDOP Calculator

#### v0.48.1

>  

- Surveillance and FOV Bubble modes.
- Right Click Menu Added
- Enabled multisat satoverfly mode. Minor UI fixes.
- Partial undo of IE11 Fix.

#### v0.42.7

>  

- Performance Updates
- Bug Fixes
- Updated Libraries.
- Moved group creation to a web worker and drastically increased load time
- More Performance Updates
- Fixed group creation and coloring.
- Fixed group-cruncher bugs + added performance scaling for sat-cruncher.
- Performance Improvements
- Performance Improvements
- Planetarium view bug fixes.
- Added satellite overfly options.
- Added satellite overfly options.
- Fixed infinite loop in mobile.hidesearch
- Low Performance Mode
- Reducing performance hit on recoloring
- Fixed missile conflicts with new markers
- Downgraded unneeded Float32Array to Int8Array
- Fixed issue with single click on mobile.
- Less DOM Creation
- Fixed bug in satcruncher related to satellite overfly.
- IE11 Bugfix.
- Bugfix for mobile.
- Update version number
- SatCruncher ignore markers unless enabled.
- Ignore markers unless enabled during satSet.draw
- Canvas bugfix.
- Update Version

#### v0.36.1

>  

- Reworked mobile controls and consolidated html files.
- Reworked mobile controls and consolidated html files.
- SOCRATES fixed. Border added to menus.
- ESA sensors added. Mobile CSS improved.
- Improved mobile UI
- Sat Label and Demo Modes added. New HiRes images.
- Moved colorscheme to a side menu.
- Added Sensor FOV Bubbles
- Countries color scheme added.
- Consolidated legend menu changes.
- Moved colors from color-scheme to settingsManager.
- Consolidated files.
- New loading screen, slimmer ui, and mobile controls.
- Fullscreen mobile interface.
- Fixes to date picker and mobile menus.
- Fixed bugs in satinfobox menu.
- Fixed minor UI issues with Multi Sensor menu.
- Fixed bug with 2D map resizing on mobile.
- UI Updates
- Fixed bug with bottom menu.
- Fixed mobile touch sensitivity.
- Fixed desktop movement and legend color toggles.
- Fixed bug with launch facilities not displaying full names.
- Better caching prevention.
- Fixed scroll on bottom icons when mobile.
- Variable sized fragment shaders
- Better hires images.
- Fixed bug that crashes multitouch on mobile.

#### v0.34.0

>  

- Fixed #89 and #90
- Fixed #89 and #90
- Changes to Planetarium Camera Mode. Fixed #83.
- Changes to Planetarium Camera Mode. Fixed #83.
- Fixed #81. Map settings needed updated on load.
- Downgraded satcruncher from satellite.js 2.0.2 to 1.3 for better speed
- Vertex Shader can now be changed realtime.
- Legend UI is now a toggle for satellite visibility.
- Added geolocation options when using https.
- Added license info from James Yoder/thingsinspace.
- Add hires option from GET variable.
- Adjusted cameraType.SATELLITE movement. Q and E for rotation.
- Allow passing mw, retro, vec, etc via GET instead of different filenames
- Update .igtignore
- Harder to deselect selectedsat when in satellite camera view.
- Fixed fieldOfView code.
- Fixed fieldOfView code.
- Fixed fieldOfView code.

#### v0.33.0

>  

- Added planetarium and satellite camera views

#### v0.32.0

>  

- Minor fixes.
- Added an vector version of the offline version.
- Added vector image.
- Added vector image.
- Fixed bug in view sats in FOV. Started multithreading SGP4.
- Fixed timeManager.now errors and added Editor.htm
- Changed offline satbox update interval. Added more optional information for offline versions.
- Planetarium Camera View Added
- Fixed error in offline only version due to load order.
- Corrected date error in settings.

#### v0.30.7

>  

- Updated merging function for offline use.

#### v0.30.6

>  

- Separated UI from main.js
- InView for all SSN sensors added.
- Fixed performance issue with sat-cruncher and overlay.
- Overlay updated to recalculate times when needed.
- _updateOverlay causes jittering
- Reduce garbage collection in sat-cruncher.js
- Fixed theme problems
- In default view only calculate colors if inview changes.
- Fixed bug with legend reseting colorscheme

#### v0.30.5

>  

- Develop
- Develop
- Develop
- Develop
- Develop
- Develop
- Develop
- Rise Set Lookangle Times
- Organize
- Upgraded to satellite.js 1.4.0
- Separated main functions into separate files. Trying to reduce global variables and optimize each of the main functions.
- Remove admin folder.
- Replacing strings with single references in variable.js. Addresses issue #72
- Fixed multisite propagation and added Cobra Dane
- Missile Generator added.
- Renamed internal functions.
- Minor Changes
- Fixed some red theme problems.
- Added Offline Version
- Added a retro version set to March 13, 2000. Fixed a few incorrect launch sites.
- Added MW page to display only missiles.
- No External Sources
- Material Font, SSN Lookangles, and Custom Sensors
- Updated ballistic missiles.
- Added mini loading screen and touch controls for date/time picker.
- Stereographic Map and Telescopes
- Integrated lookangles.js with satellite.js.
- Standardize variable names.
- Created timeManager and reduced jQuery calls during drawLoop.
- About Author Icon
- Optimizations to reduce garbage collection. Ugly code.
- timeManager organized and unnecessary public functions and variables hidden
- Cleaned up extra satellite functions.
- Updated editor to allow additional satellite information and a URL to be added.
- New Interface Finished
- Reduced need for garbage collection on loops.
- Created custom objects with static variable to display launch sites
- Added overlay for watchlist items and yellow highlighting for inview watchlist items.
- Mobile Version
- Added more launch sites for nominal creator and fixed some styling problems on side menus where bottom 50px were cutoff.
- Fixed nominal creator functions. Main error was caused by converting string to a number - leftover from old version.
- Optimized the search function. Remove a lot of unnecessary extra variables.
- Add three camera modes (default, offset, FPS).
- Reduced unnecessary variables in lookangles methods.
- Few bugfixes where proprealtime was off by a few milliseconds.
- Added limitSats GET variable to filter out extra satellites
- Added ability to have additional satellites in a local file for offline mode.
- Added mobile controls
- Added legend to the top right to address issue "Legend for Colors".
- Added legend to the top right to address issue #23 (Legend for Colors).
- Organized braun.js and renammed mapper.
- Custom Sensor Menu
- Removed Changelog. Pulled drawLoop variables to global scope. Fixed altitude check for calculating zoom.
- Custom Sensor Menu
- Combined FOV-bubble.js and line.js into drawLoop-shapes.js
- Fixed orbit search. Added watchlist red theme when inview.
- TLE saving and loading added.
- Progress on Breakup Simulator
- Fixed map for IE 9 & 10.
- Add watchlist menu.
- Missile creation page updated to add premade list of targets.
- Added show distance on hover feature and fixed jday calculation glitch in elset age.
- Mobile controls tapandhold functionality added.
- Code cleanup
- North or South Option on Nominals
- Error Checking on Satellite Edit
- Added setting to increase sharpness of satellties
- Optimized search time and groups.js code. Related to issue #10
- Deconflict with Master Branch
- Added different legends depending on the current colorscheme
- Enabled bottom menus when sensor is selected from the map.
- Added License Key for Offline Only users.
- Updated About Info
- Socrates optimization.
- Removed Ligatures for IE Compatibility
- Added watchlist save and load buttons.
- Fixed glitch preventing launches to the north.
- Added filter options to the settings menu for convienence.
- Added JDAY to the top left.
- Reorganized js libraries to a separate folder.
- search-box.js reorganized.
- Text Highlighting Fixed
- Cleaned up settings menu.
- Added alert text when camera mode changed.
- Optimized syncing mechanism for multiple catalogues.
- Formatted sun.js like other functions.
- Updated version number.
- Removed multiple declarations of the current time "now" that were causing incorrect values in the satbox when proprate was not 1.
- SensorSelected Variable
- Added current time check to nominal creator. Solves issue #67.
- Removed admin folder from github.
- Show Next Pass in Sat Box
- More Launch Sites
- Fixed sun exclusion times.
- Cleanup main folder.
- Removed unnecessary getSatIdFromCoord calls from drawloop.
- Fixed edit satellite function.
- Social Media Links
- Updated about page.
- Made show distance default
- Reorganized settingsManager.
- Moved simulations to cleanup main folder.
- Less choppy mobile controls
- Removing duplicate jday functions.
- Fixed 2d map.
- Fixed multisensorlookangles
- Updated gitignore
- Fixed bug where all dropdown menus had extra bottom padding
- Fixed map update override.
- Added check to hide SOCRATES menu if the limitSats filter is on.
- Fixed error message in timeManager that was in the wrong spot.
- RCS color display fixed to account for actual RCS values not size groups
- Readd satData copy to searchBox.init
- Fixed mobile sliders color and prevented default keyboard popup.
- Right Mouse Click Fixed
- Red theme removed if last object from watchlist is removed while inview.
- Update version number.
- Added public github link.
- Adjusted RCS check in colorscheme so that Small Satellites now display correctly.
- Updated index Date
- Updated gitignore
- Version Fixed
- Fixed bug on index.htm where side menus were missing.
- This should fix issue #70.
- Updated version number.
- Increment version number
- Updated version number.
- Shortened option description in settings menu.
- Updated version number
- Updated version number
- Updated version number.
- Version number updated.
- Cleanup github
- Fixed glitch caused by static objects in satcache.
- Right Mouse Click Fixed

#### v0.10.0

>  

- Develop
- Develop
- UI Overhaul
- TLE Minification
- UI Overhaul
- Only FOV Option
- Optional Show Next Pass

#### v0.9.2

>  

- Develop
- TLE Update
- Satellite Editor
- Fixed iframes
- Alternate Launch Menu
- Edit Satellites
- ISS Stream, Launch Updater, and Socrates Improvements
- MultiSite Lookangles
- sat-cruncher Semi-Standard
- Improved Multi Site Lookangles
- Disable Bottom Icons Initially
- Country Menu Improved
- Variable Cleanup
- Settings Menu
- Settings Menu Update
- Future Next Pass Feature and Removed Memory Leak
- TAGs Updated
- Version Number Menu
- Socrates Menu Functionality
- Default Messages Changed\nChanged the default messages to make them more obvious if there is a js error.
- Prevent Shake Effect Failures
- Fixed Tooltips
- NORAD Number Search
- Find Near Objects Fixed
- Disable Look Angles Until Sensor Selected
- Proprate Fixed
- Links and Version Number Box
- Disable Weather if No Weather Maps
- Variables Optional
- Version Number Updated
- Updated Ignore
- Updated Ignore File
- Fixed Index.htm
- Testing Git Commit
- Version Box Fixed
- Version Box Updated
- Reduced Max Orbits
- Default Messages Changed
- Default Messages Changed" -m "Changed the default messages to make them more obvious if there is a js error.
- FIxed ELSET Parser
- Renamed Images

#### v0.5.2

>  

- Fixed Open Issues

#### v0.5.1

>  

- Admin Section Added
- Updated README for v0.5.0

#### v0.5.0

>  

- Revert "Javascript Semi-Standard Compliant"
- Revert "SOCRATES"
- SOCRATES
- SOCRATES
- Remove Old Files

#### v0.4.0

>  

- Javascript Semi-Standard Compliant
- Create README.md
- Update README.md

#### v0.3.0

>  

- 12 October 2016
- 21 December 2016
- 7 December 2016
- 20 December 2016
- :neckbeard: Added .gitattributes & .gitignore files
- Delete dot-blue.png
