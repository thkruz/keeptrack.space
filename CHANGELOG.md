### Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

### [v4.0.0](https://github.com/thkruz/keeptrack.space/compare/v3.5.0...v4.0.0)

> 28 July 2021 

- feat(keeptrack): complete overhaul to TypeScript and implement KeepTrackApi [`dc7c26e`](https://github.com/thkruz/keeptrack.space/commit/dc7c26ed778a92faca7416efa2ed9d96c568dc2b)
- feat(astroux): implemented astroux css and soundManager [`3a0b6a2`](https://github.com/thkruz/keeptrack.space/commit/3a0b6a2eb1969409f8f32e68e7bc1df0f75a05bd)
- fix(nextlaunchmanager): upgraded to launch library 2 api [`0c4e9f8`](https://github.com/thkruz/keeptrack.space/commit/0c4e9f8f5cf8b8aa42e2e25c7dc8d3ecc3273b99)
- test(integration tests): updated integration tests to support keeptrackApi [`27e3538`](https://github.com/thkruz/keeptrack.space/commit/27e3538ffc860ed03f51916c42b35fc9dd4e0e91)
- feat(main): updated main.js to use keeptrackApi [`b3296cc`](https://github.com/thkruz/keeptrack.space/commit/b3296cc020af641e9d382c934fa08bf3dfc33fdb)
- feat(multiple): implemented keeptrackApi instead of passing variables to functions [`d54e04a`](https://github.com/thkruz/keeptrack.space/commit/d54e04a918a41b8fe3286898d75f0f630321446f)
- fix(satinfoboxcore): provided a fix for when isInSun is unavailable (testing only so far) [`7815b9e`](https://github.com/thkruz/keeptrack.space/commit/7815b9ef67ce35d72d6346f03785a1617b646955)
- fix(tle.js): fixed missing export call in offline TLEs [`2efdb66`](https://github.com/thkruz/keeptrack.space/commit/2efdb662e905796d939ffabdaa61a30e9dbd3b8f)
- fix(ui-input.ts): fixed DOP calculation bug [`56808d3`](https://github.com/thkruz/keeptrack.space/commit/56808d37cd58532f856c9c79cc7bd9c03138e8f5)
- fix(lookangles.js): fixed dop calculation bug [`86654ad`](https://github.com/thkruz/keeptrack.space/commit/86654add1d020826111049d2989c77827e616047)
- build(package.json): changed jest testing to stop on first failure [`f666e4b`](https://github.com/thkruz/keeptrack.space/commit/f666e4ba0956b79f71ae06cc7c7f279185d19fe5)
- chore(launch.json): changed vscode config for debugging [`c6fbb11`](https://github.com/thkruz/keeptrack.space/commit/c6fbb1126dea69c372c80ae20240050e997d972f)

#### [v3.5.0](https://github.com/thkruz/keeptrack.space/compare/v3.4.3...v3.5.0)

> 17 July 2021 

- refactor(settingsmanager): converted settingsmanager from js to ts [`2f55ca8`](https://github.com/thkruz/keeptrack.space/commit/2f55ca8d39643e66fd8d646cf32b664504389e9f)
- refactor(uimanager): ui-input converted to ts and uiManager updated to be more dynamic [`3098853`](https://github.com/thkruz/keeptrack.space/commit/30988533d261bcf9e1532c9eff71cfc67227edbf)
- feat(satinfoboxcore): refactored satInfoBox as plugin [`eff0c50`](https://github.com/thkruz/keeptrack.space/commit/eff0c503457abbd9871c5f79eb51de4f34e60087)
- chore(contributing.md): removed contributing.md file [`d6f0ed5`](https://github.com/thkruz/keeptrack.space/commit/d6f0ed5340129d48921aadea325088bfc3c30ee8)
- refactor(multiple): standardized use of lat, lon, alt vs lat, long, obshei [`74f3b3f`](https://github.com/thkruz/keeptrack.space/commit/74f3b3faa2349576935f8b2d1c3bf512c05903a4)
- refactor(selectsatmanager): refactored selectSatManager as a plugin to keeptrackApi [`7a5a789`](https://github.com/thkruz/keeptrack.space/commit/7a5a789414d9018349147c540feb15ebeeb6ca4d)
- feat(externalapi): implemented API for external plugins [`27ed24e`](https://github.com/thkruz/keeptrack.space/commit/27ed24e57849ca3eec8bcbf63ac4330d99ea54a6)
- chore(tsconfig.json): updated tsconfig rules [`d5a901f`](https://github.com/thkruz/keeptrack.space/commit/d5a901f895932e622eb3eade8fc5a694afe83706)
- chore(tle): updated TLEs [`09b691f`](https://github.com/thkruz/keeptrack.space/commit/09b691fa93c0f1d4c66a7ea13672b9e6881cdf35)
- chore(declaration.d.ts): enabled css for typescript [`743bff7`](https://github.com/thkruz/keeptrack.space/commit/743bff7eb0a1e7d071024cb237b99d7fd6a01557)
- chore(.eslintrc): removed no-explicit-any rule [`c1426ef`](https://github.com/thkruz/keeptrack.space/commit/c1426efa225a02c774344af1247d86542b3ae0d9)

#### [v3.4.3](https://github.com/thkruz/keeptrack.space/compare/v3.4.1...v3.4.3)

> 15 July 2021 

- fix(nextlaunchmanager.ts): fixed type error [`95deee4`](https://github.com/thkruz/keeptrack.space/commit/95deee49257b6de422d21cf6e2d1a96fcc774e2e)
- build(package.json): updated version npm scripts to include git tag [`ac16981`](https://github.com/thkruz/keeptrack.space/commit/ac1698195d65c52771305814372ec1af47c8f257)

#### [v3.4.1](https://github.com/thkruz/keeptrack.space/compare/v3.2.1...v3.4.1)

> 26 June 2021 

- feat(uimanager.js): added Short Term Fence menu [`#275`](https://github.com/thkruz/keeptrack.space/pull/275)
- build(deps-dev): bump style-loader from 2.0.0 to 3.0.0 [`#272`](https://github.com/thkruz/keeptrack.space/pull/272)
- feat(satvmagmanager): expanded sunlight color scheme, fixed propagati… [`#273`](https://github.com/thkruz/keeptrack.space/pull/273)
- fix(analysis-tools): fixed analysis tools to work with OOTK [`#269`](https://github.com/thkruz/keeptrack.space/pull/269)
- fix(style.css): bottom menu was hiding some input selection options. … [`#268`](https://github.com/thkruz/keeptrack.space/pull/268)
- fix(uimanager): fixed find objects in this orbit and orbit remaining … [`#267`](https://github.com/thkruz/keeptrack.space/pull/267)
- docs(changelog): generated auto changelog [`#259`](https://github.com/thkruz/keeptrack.space/pull/259)
- docs(readme.md): updated readme for version 3 [`#258`](https://github.com/thkruz/keeptrack.space/pull/258)
- feat(uimanager.js): improved alerts for watchlist items entering/exit… [`#256`](https://github.com/thkruz/keeptrack.space/pull/256)
- build(release.yml): fixed github publishing reference [`#255`](https://github.com/thkruz/keeptrack.space/pull/255)
- chore(package.json): version bump [`#254`](https://github.com/thkruz/keeptrack.space/pull/254)
- fix(uimanager): fixes issues #223 and #237 [`#252`](https://github.com/thkruz/keeptrack.space/pull/252)
- ci(github workflows): updated to match package.json new script names [`#251`](https://github.com/thkruz/keeptrack.space/pull/251)
- feat(satvmagmanager): expanded sunlight color scheme, fixed propagation speed code and line to sat [`6604b8d`](https://github.com/thkruz/keeptrack.space/commit/6604b8d4fc628f141a989fe53de44bcda1e34d0d)
- fix(ui-input.ts): migrated ui-input to typescript. fixed on click and create sensor/observer bugs [`03175c7`](https://github.com/thkruz/keeptrack.space/commit/03175c7943e0724d85cb5959384f6207b154242a)
- build(typescript): started migration to typescript [`49932b0`](https://github.com/thkruz/keeptrack.space/commit/49932b056d32c58379814201e09dc75436d89630)
- refactor(helpers.ts): migrated helper module to typescript [`34cc7f5`](https://github.com/thkruz/keeptrack.space/commit/34cc7f5118961b7a07a0ce1ef06ef1d8af233467)
- refactor(nextlaunchmanager.ts): fixed typing errors during build [`1a16244`](https://github.com/thkruz/keeptrack.space/commit/1a16244a84cc13691f8f96d8dea0081c1ad56dbe)
- test(integration1): increased code coverage [`b4096c3`](https://github.com/thkruz/keeptrack.space/commit/b4096c3d7368ec71755eda356118800088deb18e)
- build(typescript): updated types and lint rules [`dcccb6e`](https://github.com/thkruz/keeptrack.space/commit/dcccb6e4959ea1f3f2b577b0fb7d2cec0334b145)
- test(integration1.test.js): increased lookangles code coverage [`a4888bf`](https://github.com/thkruz/keeptrack.space/commit/a4888bfdae4511f538114845957d06872d4bdac1)
- build(uimanager.js): fixed import to use new typescript file [`fedf20f`](https://github.com/thkruz/keeptrack.space/commit/fedf20fab697b5ffb9f616d762da2d95f3a33dc8)
- Autofix issues in 2 files [`b84ff87`](https://github.com/thkruz/keeptrack.space/commit/b84ff8731f9fa4b88781259cf87dd74bc9f49be2)
- chore(changelog): updated changelog [`2ab055e`](https://github.com/thkruz/keeptrack.space/commit/2ab055ebb1525c1ee69a3672ff74ad8b2e5b4afa)
- fix(nextlaunchmanager): removed race condition involving launchList [`357ea3c`](https://github.com/thkruz/keeptrack.space/commit/357ea3c174e849a9edb1d8d6ffb7c7d7abbc20b5)
- build(helper.ts): fixed type error [`85c83d1`](https://github.com/thkruz/keeptrack.space/commit/85c83d1d495d24e0022d21f764579521d62e72b9)
- ci(deepsource): fixed exclude to ignore external libraries [`0ad6ba8`](https://github.com/thkruz/keeptrack.space/commit/0ad6ba8efee563b3a22865cc817f748c6278d666)

#### [v3.2.1](https://github.com/thkruz/keeptrack.space/compare/v3.2.0...v3.2.1)

> 1 June 2021 

- docs(changelog): generated auto changelog [`257101e`](https://github.com/thkruz/keeptrack.space/commit/257101e0ca01d187b016baf394c762101d569dbd)
- docs(readme.md): updated readme for version 3 [`53b120d`](https://github.com/thkruz/keeptrack.space/commit/53b120d97b4db708e7de2f531a4378c67559516d)
- fix(uimanager): fixed find objects in this orbit and orbit remaining after watchlist item removed [`e0a79b4`](https://github.com/thkruz/keeptrack.space/commit/e0a79b4969f9ed1d6507efe451d75cd00e37dc01)
- fix(style.css): bottom menu was hiding some input selection options. changed max-heigh of popups [`6d6d119`](https://github.com/thkruz/keeptrack.space/commit/6d6d119eed60d90472946fc0ade6b36d32f8d397)
- chore(package.json): bumped version number [`0d52ce5`](https://github.com/thkruz/keeptrack.space/commit/0d52ce551dae48e50adcd1435671220ed5e5149f)
- build(auto-changelog): added changelog dependency [`9d83296`](https://github.com/thkruz/keeptrack.space/commit/9d83296a8e3d2b4d4e16b6a27c6edd8cb81a8ff5)

#### [v3.2.0](https://github.com/thkruz/keeptrack.space/compare/v3.1.3...v3.2.0)

> 31 May 2021 

- feat(uimanager.js): improved alerts for watchlist items entering/exit… [`#256`](https://github.com/thkruz/keeptrack.space/pull/256)
- build(release.yml): fixed github publishing reference [`#255`](https://github.com/thkruz/keeptrack.space/pull/255)
- chore(package.json): version bump [`#254`](https://github.com/thkruz/keeptrack.space/pull/254)
- fix(uimanager): fixes issues #223 and #237 [`#252`](https://github.com/thkruz/keeptrack.space/pull/252)
- ci(github workflows): updated to match package.json new script names [`#251`](https://github.com/thkruz/keeptrack.space/pull/251)
- feat(photomanager.js): added on orbit imagery to close #14 [`#14`](https://github.com/thkruz/keeptrack.space/issues/14)
- test(integration tests): split integration testing into 3 files [`e31966a`](https://github.com/thkruz/keeptrack.space/commit/e31966a7cb6601082cea70e9b88d4b196d4181f9)
- feat(ui-input.js): added draw sat to sun line feature [`315e17c`](https://github.com/thkruz/keeptrack.space/commit/315e17cf50bd6e6eee2be23da2e171dd9b33bfe6)
- test(integration1.test.js): added menu-sat-photo testing [`43e7ffc`](https://github.com/thkruz/keeptrack.space/commit/43e7ffcab8326ca8297fb5855ec68df2e40830df)

#### [v3.1.3](https://github.com/thkruz/keeptrack.space/compare/v3.1.2...v3.1.3)

> 30 May 2021 

- feat(uimanager.js): improved alerts for watchlist items entering/exiting fov [`09ea302`](https://github.com/thkruz/keeptrack.space/commit/09ea30239dd37bf0c6e4704caabfaffc8d04f6a0)
- fix(satset.js): fixed color of overlay icon when loading saved watchlist [`3ae4701`](https://github.com/thkruz/keeptrack.space/commit/3ae4701c4c0cd19a2bf7f2f99b521c16f1215d2f)

#### [v3.1.2](https://github.com/thkruz/keeptrack.space/compare/v3.1.1...v3.1.2)

- build(release.yml): fixed github publishing reference [`#255`](https://github.com/thkruz/keeptrack.space/pull/255)

#### [v3.1.1](https://github.com/thkruz/keeptrack.space/compare/v3.1.0...v3.1.1)

- chore(package.json): version bump [`#254`](https://github.com/thkruz/keeptrack.space/pull/254)

#### [v3.1.0](https://github.com/thkruz/keeptrack.space/compare/v3.0.4...v3.1.0)

> 12 May 2021 

- fix(uimanager): fixes issues #223 and #237 [`#252`](https://github.com/thkruz/keeptrack.space/pull/252)
- ci(github workflows): updated to match package.json new script names [`#251`](https://github.com/thkruz/keeptrack.space/pull/251)
- build(deps-dev): bump jest from 26.6.3 to 27.0.1 [`#250`](https://github.com/thkruz/keeptrack.space/pull/250)
- build(deps-dev): bump imports-loader from 2.0.0 to 3.0.0 [`#248`](https://github.com/thkruz/keeptrack.space/pull/248)
- Develop [`#249`](https://github.com/thkruz/keeptrack.space/pull/249)
- Develop [`#247`](https://github.com/thkruz/keeptrack.space/pull/247)
- develop [`#246`](https://github.com/thkruz/keeptrack.space/pull/246)
- test(color-scheme.unit.test.js): increased code coverage [`#245`](https://github.com/thkruz/keeptrack.space/pull/245)
- test(dots.unit.test.js): increased test coverage [`#244`](https://github.com/thkruz/keeptrack.space/pull/244)
- Develop [`#243`](https://github.com/thkruz/keeptrack.space/pull/243)
- perf(drawmanager.js): removed extra meshManager.draw calls and fixed … [`#242`](https://github.com/thkruz/keeptrack.space/pull/242)
- perf(positioncruncher.js): longer time between propagation loops [`#241`](https://github.com/thkruz/keeptrack.space/pull/241)
- Develop [`#240`](https://github.com/thkruz/keeptrack.space/pull/240)
- test(integration.test.js): increased test coverage [`#238`](https://github.com/thkruz/keeptrack.space/pull/238)
- Develop [`#236`](https://github.com/thkruz/keeptrack.space/pull/236)
- test(search-box): add 90% code coverage [`#235`](https://github.com/thkruz/keeptrack.space/pull/235)
- Develop [`#234`](https://github.com/thkruz/keeptrack.space/pull/234)
- Develop [`#233`](https://github.com/thkruz/keeptrack.space/pull/233)
- Bump imports-loader from 1.2.0 to 2.0.0 [`#232`](https://github.com/thkruz/keeptrack.space/pull/232)
- Ootk [`#231`](https://github.com/thkruz/keeptrack.space/pull/231)
- feat(ootk): integrated ootk to replace satellite.js [`#230`](https://github.com/thkruz/keeptrack.space/pull/230)
- Develop [`#229`](https://github.com/thkruz/keeptrack.space/pull/229)
- Version bump [`#228`](https://github.com/thkruz/keeptrack.space/pull/228)
- Twgl [`#227`](https://github.com/thkruz/keeptrack.space/pull/227)
- Develop [`#226`](https://github.com/thkruz/keeptrack.space/pull/226)
- Twgl [`#225`](https://github.com/thkruz/keeptrack.space/pull/225)
- Added getSunPosition and Fixed getStarPosition [`#224`](https://github.com/thkruz/keeptrack.space/pull/224)
- Color factory [`#220`](https://github.com/thkruz/keeptrack.space/pull/220)
- Private variables in camera [`#218`](https://github.com/thkruz/keeptrack.space/pull/218)
- Clear entry point [`#219`](https://github.com/thkruz/keeptrack.space/pull/219)
- Clear entry point [`#216`](https://github.com/thkruz/keeptrack.space/pull/216)
- Class extraction [`#215`](https://github.com/thkruz/keeptrack.space/pull/215)
- Development [`#213`](https://github.com/thkruz/keeptrack.space/pull/213)
- Update version number [`#210`](https://github.com/thkruz/keeptrack.space/pull/210)
- Private Methods and Fields added [`#211`](https://github.com/thkruz/keeptrack.space/pull/211)
- Create Camera Class [`#208`](https://github.com/thkruz/keeptrack.space/pull/208)
- fix(uimanager): fixes issues #223 and #237 [`#223`](https://github.com/thkruz/keeptrack.space/issues/223) [`#237`](https://github.com/thkruz/keeptrack.space/issues/237)
- Fixed #217 [`#217`](https://github.com/thkruz/keeptrack.space/issues/217)
- README Update [`#200`](https://github.com/thkruz/keeptrack.space/issues/200)
- test(cypress): added cypress E2E testing [`96250fb`](https://github.com/thkruz/keeptrack.space/commit/96250fb38c29f8fcc8ef94fbb1fc53ffec796f7b)
- chore(out.json): remove unneded output [`81ce7dc`](https://github.com/thkruz/keeptrack.space/commit/81ce7dc2a865036bb0a158d152edc8d80189b405)
- fix(ui): various bugfixes to UI menus [`1d9c9e3`](https://github.com/thkruz/keeptrack.space/commit/1d9c9e328048e4e2310622fdae547a5f1baf383f)
- Offline fixes for Firefox 52 [`1a214bc`](https://github.com/thkruz/keeptrack.space/commit/1a214bc8d241fb4bc9730b148916fd5ca3f2f6d6)
- test(integration.js): increased code coverage [`9f25244`](https://github.com/thkruz/keeptrack.space/commit/9f252440b503dfec74663190fc848526d7750cfd)
- refactor(uimanager.js): consolidated sensor selection code [`8f060c9`](https://github.com/thkruz/keeptrack.space/commit/8f060c9aaad655a4194d814e7c185d414f69f3ef)
- feat(analysis): added analysis features and move ootk to a separate location [`0edba5f`](https://github.com/thkruz/keeptrack.space/commit/0edba5f079fd178d93a53d166978935119a70a04)
- fix(orbitmanager.js): fixed orbit not updating on new launch generation [`47884a4`](https://github.com/thkruz/keeptrack.space/commit/47884a413ba5ea521c8c729fba3ba901eedb808c)
- test(integration.js): raised to 80% code coverage [`6bdac8a`](https://github.com/thkruz/keeptrack.space/commit/6bdac8aced2aae232c6d6dd379ca6e65cb13d546)
- fix(graphics): reduced use of framebuffers and overall number of drawing calls [`5040222`](https://github.com/thkruz/keeptrack.space/commit/504022246243bc3b328843fe810477c72486ebe4)
- chore(package.json): version bump [`5681609`](https://github.com/thkruz/keeptrack.space/commit/5681609acee4d16f4930f9788acf8a32480e1db2)
- Reorganize Files [`25af676`](https://github.com/thkruz/keeptrack.space/commit/25af6765447473f5fccfda5ed4b4549949d5331b)
- test(integration.test.js): added integration testing to increase code coverage [`c6dea63`](https://github.com/thkruz/keeptrack.space/commit/c6dea63a111899dfaeb23e6bc1b9a8d5bf04c23d)
- fix(babel.config.js): cleaned up minor errors that had no impact on code [`2ee2d2f`](https://github.com/thkruz/keeptrack.space/commit/2ee2d2f4c9b7b44638b04fb930379bae20eb6438)
- feat(webgl): upgrade to webgl2 [`b0b1c51`](https://github.com/thkruz/keeptrack.space/commit/b0b1c5155cdc5e77c3620586cb2e38e2eab15a99)
- refactor(multiple): increased code coverage and fixed fringe cases [`13eb800`](https://github.com/thkruz/keeptrack.space/commit/13eb800db340c5c5795a4a04ae6c232986673d1e)
- test(integration.test.js): increased code coverage [`299e16f`](https://github.com/thkruz/keeptrack.space/commit/299e16fc41854fd231d055306e90cd381681699a)
- Ocular Occlusion for Earth [`32fbca6`](https://github.com/thkruz/keeptrack.space/commit/32fbca62796f7f6a2f4ec613f86e95a66c320055)
- feat(ui): resizeable menus added [`dbce88c`](https://github.com/thkruz/keeptrack.space/commit/dbce88c6d0950245cffa713243bd0cc08097cddc)
- Added ocular occlusion for mesh models [`33a4802`](https://github.com/thkruz/keeptrack.space/commit/33a48020b5a9f313eb1eab7aa223185b4f60d07c)
- refactor(sidemenumanager.js): consolidated side menu code from uiManager [`f331a0d`](https://github.com/thkruz/keeptrack.space/commit/f331a0dd6accc670ef875849c4e7f755c7fa4004)
- meshManager fixes [`4ebcd69`](https://github.com/thkruz/keeptrack.space/commit/4ebcd69989a5d39ac1eceb01f723986952e66907)
- dlManager updated [`bb5d6d1`](https://github.com/thkruz/keeptrack.space/commit/bb5d6d121569bc9c6dce6875db3996c23f0aa7af)
- library separated internal vs external [`74d6057`](https://github.com/thkruz/keeptrack.space/commit/74d6057815131d2abfcde3407181465eba27bd36)
- Renamed dlManager drawManager [`61b2b6e`](https://github.com/thkruz/keeptrack.space/commit/61b2b6e20003033b7719bcf758297ca7a84e3164)
- refactor(helpers.js): extracted color parsing and conversion functions [`6eb4594`](https://github.com/thkruz/keeptrack.space/commit/6eb45948062527545194b08f54bc157ca699cde7)
- Moved webworkers [`e935dfc`](https://github.com/thkruz/keeptrack.space/commit/e935dfc03221393e323149ad2970adcfac5c4d1a)
- Godrays [`90b933d`](https://github.com/thkruz/keeptrack.space/commit/90b933dcf0eebdb119e90ff488a0cbc2150d1238)
- test(all): added working jest support for doms, webworkers, and canvas [`ba66463`](https://github.com/thkruz/keeptrack.space/commit/ba66463d1ede9535a56cd3c712480563ed9b79fb)
- Consolidated constants [`b6616f6`](https://github.com/thkruz/keeptrack.space/commit/b6616f6ca2a4a05c4dcaa2d0060f0a7de144d534)
- Consolidated sceneManager and Removed jQuery [`122165c`](https://github.com/thkruz/keeptrack.space/commit/122165c45060f49632681dc2147a9a3064d1acda)
- feat(post-processing): added FXAA support [`cd4ea08`](https://github.com/thkruz/keeptrack.space/commit/cd4ea0819e91af21326c64dc8be91c48d6fc7bde)
- Made mapManager part of uiManager [`375b603`](https://github.com/thkruz/keeptrack.space/commit/375b6038b70ad86442d5e5ddfac1459fd6e9bab1)
- Fixes for offfline tles, atmosphere, camera, meshes [`3396c64`](https://github.com/thkruz/keeptrack.space/commit/3396c646e52b045332321ef9db778396ff4f989b)
- Post Processing Resize Fix [`14e2223`](https://github.com/thkruz/keeptrack.space/commit/14e22239750dae9394695b2326aad89a251499bc)
- refactor(ui-validation): extracted validation jquery code from uiManager [`dd106a8`](https://github.com/thkruz/keeptrack.space/commit/dd106a8b3f381e44a0e987858f8760b783b39b6a)
- fix(sidemenumanager): fixed references to depricated sMM functions [`454d26c`](https://github.com/thkruz/keeptrack.space/commit/454d26c47b3cd152b0c922319fa4f8246c6a251c)
- perf(drawloop): reduced GPU commands [`51784d1`](https://github.com/thkruz/keeptrack.space/commit/51784d17622f4b03edb8a259496dddfdf9b2b0af)
- perf(dots.js): reduced number of dots in buffer to speed up readpixel calls [`7c11be1`](https://github.com/thkruz/keeptrack.space/commit/7c11be155b267ca4d98f91322f7bad6479a951d7)
- build(package.json): automatic version and build date scripts added [`0c174d9`](https://github.com/thkruz/keeptrack.space/commit/0c174d986f5300bba4727d4cc3333fabcc549c68)
- Reduce readPixel calls [`f809105`](https://github.com/thkruz/keeptrack.space/commit/f809105d99573702fb821487768f98e5b253155c)
- Remove unused libraries [`cbb0537`](https://github.com/thkruz/keeptrack.space/commit/cbb05371a5e182119c5eed0b80599bd0f7313bb4)
- Screenshots, timepicker, and sat-hoverbox bugfixes [`f2cf24d`](https://github.com/thkruz/keeptrack.space/commit/f2cf24d1722db6ca2994f31b012d2e12f30af50a)
- build(npm scripts): cleaned up npm scripts naming [`ada59ad`](https://github.com/thkruz/keeptrack.space/commit/ada59ad53e96d66037f2c6529d7f611c17eec1ce)
- Fixed meshManager webgl error [`165b64c`](https://github.com/thkruz/keeptrack.space/commit/165b64c6d6f32b5f283f461e7aab35a0e43215ad)
- fix(camera.js): fixed issue where reseting camera could get stuck spinning in a circle [`61230ca`](https://github.com/thkruz/keeptrack.space/commit/61230ca7c950ed14fba932960906067ca4847eaf)
- build(cypress.yml): removed cypress github action [`2989292`](https://github.com/thkruz/keeptrack.space/commit/298929253bca54d7372e8f8f3239e44dc45bf823)
- Depricated modules folder [`db27955`](https://github.com/thkruz/keeptrack.space/commit/db2795582c319a1c39b2f18770859beaf3347288)
- test(cypress.yml): remove firefox testing [`be583bf`](https://github.com/thkruz/keeptrack.space/commit/be583bfd14ef84cf2b4909e53d6db638ed9fd643)
- fix(dots.js): moved mat4 multiplication from vert shader to js [`07900c0`](https://github.com/thkruz/keeptrack.space/commit/07900c0e74670d8a18fbe51915ad2379e240b07b)
- build(startup.js): simplified cypress testing [`ade5895`](https://github.com/thkruz/keeptrack.space/commit/ade589524923cbc669b831aab4cede812cb91415)
- build(e2e.js): disable e2e for now [`3d8f262`](https://github.com/thkruz/keeptrack.space/commit/3d8f2628985dae4ab9357cfd752eeee5564d067f)
- build(webworker): disable webworkers during testing [`6e88d43`](https://github.com/thkruz/keeptrack.space/commit/6e88d43ecb6ce069a4f6c8ea1124ff19aab9f6a0)
- Libraries merged into lib folder [`276d8e2`](https://github.com/thkruz/keeptrack.space/commit/276d8e2c4a3d50dd6a3fe92ee336c39b79ef7549)
- build(package.json): added start-server-and-test [`705a980`](https://github.com/thkruz/keeptrack.space/commit/705a98084a99d16ceb6d6b54c017f149f9f59603)
- build(package.json): added npm-run-all [`d278cf0`](https://github.com/thkruz/keeptrack.space/commit/d278cf04f30cb8887bc352fc6c1f4b92957170ea)
- build(package.json): downgraded jest [`981ec87`](https://github.com/thkruz/keeptrack.space/commit/981ec879051d33d0fcb9460575167c9ef71fb3b4)
- selectSatManager moved to drawManager [`de8ef42`](https://github.com/thkruz/keeptrack.space/commit/de8ef4234dff6608c72ab5fd361de56654702c7c)
- Improved desktop performance [`4b7bc87`](https://github.com/thkruz/keeptrack.space/commit/4b7bc87843d40f7f349a7b288ca3e6cfc7e5e7ea)
- build(webworkers): skip workers when in CI mode on github [`36d3554`](https://github.com/thkruz/keeptrack.space/commit/36d355458618483bab3d6aaf4ed486a1120b1a15)
- search-box moved [`9095c8a`](https://github.com/thkruz/keeptrack.space/commit/9095c8abfaf5d897b3351c72ee3f07aa177d2a32)
- Fixed hover and select colors [`0fdcd12`](https://github.com/thkruz/keeptrack.space/commit/0fdcd1260447fe409f8265957bf4d16d569a3072)
- test(cypress.yml): fixed spacing issue [`dfe6e20`](https://github.com/thkruz/keeptrack.space/commit/dfe6e20c534772831ef68519291e292986af1011)
- test(cypress.yml): fixed formatting [`c3655d6`](https://github.com/thkruz/keeptrack.space/commit/c3655d6e1f24a0fb5d3367472fc5bb47ddaad106)
- Enabled mipmaps [`7d0ed69`](https://github.com/thkruz/keeptrack.space/commit/7d0ed692288724948f3f0b7ba1a3a88d701981d2)
- test(package.json): added http-server [`547eb47`](https://github.com/thkruz/keeptrack.space/commit/547eb47b105a7e6c11df05adfc80cb41cca4f7a8)
- test(cypress.yml): remove last firefox test [`1ea5b51`](https://github.com/thkruz/keeptrack.space/commit/1ea5b51e034a98d5b3b765b503b4123442d8a7f6)
- fix(materialize-local.css): fixed load order of colors [`6bbc0bc`](https://github.com/thkruz/keeptrack.space/commit/6bbc0bc73ae97419cac2b2d21ae88684dc5ec1dd)
- test(startup.js): simplified cypress test [`27d4c58`](https://github.com/thkruz/keeptrack.space/commit/27d4c5850c55cec0ff3a7daaf6e8e31e677d1a8c)
- fix(startup.js): removed redundant global variable references [`d1108a4`](https://github.com/thkruz/keeptrack.space/commit/d1108a4de2d0dbc63085b6f0b5ad8d2824ac08ba)
- fix(drawmanager.js): fixed resizing from small screen to big screen that caused gpupicking to break [`c3d18fd`](https://github.com/thkruz/keeptrack.space/commit/c3d18fd2020a2f65f0e45271287ef11b1e08d219)
- test(startup.js): added error handling [`deeec91`](https://github.com/thkruz/keeptrack.space/commit/deeec91a9570a67f4b67df4ec8cecb950d5d45a8)
- test(cypress.yml): updated working-directory [`bedb9a2`](https://github.com/thkruz/keeptrack.space/commit/bedb9a28a02e7c0edb2d8e97ce1c434d9798ce02)
- build(github actions): typo in build command [`f2e05a4`](https://github.com/thkruz/keeptrack.space/commit/f2e05a4f1ccec0fe4fe6306b7784c6811cc715ff)
- perf(drawmanager.js): removed extra meshManager.draw calls and fixed earthBumpMap [`e72b571`](https://github.com/thkruz/keeptrack.space/commit/e72b57133561e946c007a93dcabc5ae6c75a9a6c)
- test(missilemananger.unit.test.js): removed unnecessary test [`5b86170`](https://github.com/thkruz/keeptrack.space/commit/5b86170c1742342e4af8e57be0d9a71135327d88)
- Reduce DOM Lookups [`96c85ab`](https://github.com/thkruz/keeptrack.space/commit/96c85ab0fb54be37779d50f14d6e466364dd6b61)
- fix(tle.js): added export for offline TLEs [`bd3b509`](https://github.com/thkruz/keeptrack.space/commit/bd3b509a35a85d3f18e8fbd5a4c108e9baeaa46b)
- build(gpr.js): reenabled linter [`a3a48f3`](https://github.com/thkruz/keeptrack.space/commit/a3a48f3375198fbbe08434525ab21f214e98af5f)
- build(node-ci.yml): simplified node-ci [`65b79d8`](https://github.com/thkruz/keeptrack.space/commit/65b79d845f8ae20e769cafb939acea0112a7f90a)
- test(node-ci.yml): removed cypress from node-ci [`ca32f10`](https://github.com/thkruz/keeptrack.space/commit/ca32f10211662da47aa072fe3d5c889686f6e20c)
- orbitManager moved [`7cb7136`](https://github.com/thkruz/keeptrack.space/commit/7cb71369294b1f6bc4c403710bf6f67dd83b4eb3)
- build(package.json): use start-server-and-test for jest [`1f45dbf`](https://github.com/thkruz/keeptrack.space/commit/1f45dbf96a5f73b3dcb37e5a5500aac1f489d524)
- chore(package.json): bumped version number [`be40903`](https://github.com/thkruz/keeptrack.space/commit/be409034aaa51b26adc892906079b095c713902c)
- build(cypress.yml): made cypress run headless [`cde89ba`](https://github.com/thkruz/keeptrack.space/commit/cde89ba7d41e34bd854ae5065bb1c947197e9c1e)
- build(node-ci.yml): node version bump [`9a60ec1`](https://github.com/thkruz/keeptrack.space/commit/9a60ec1fbecdfe6de874abb800ea54f01ede81dc)
- chore(package.json): update version number [`13a9828`](https://github.com/thkruz/keeptrack.space/commit/13a982834e445380824efe58df22bff54aa1cfcb)
- sideMenuManager moved to uiManager [`504b8bf`](https://github.com/thkruz/keeptrack.space/commit/504b8bf688c49fc965b2460689a7ec10a613254e)
- readpixels throttle [`f1b173e`](https://github.com/thkruz/keeptrack.space/commit/f1b173e55b0aa5d3d3671ac4bd927a5725187fe5)
- build(node-ci): added build:dev [`ba5123c`](https://github.com/thkruz/keeptrack.space/commit/ba5123cf1dc22e0bc26716b377631ca180b93667)
- build(node-ci.yml): fix gl issue [`d60a238`](https://github.com/thkruz/keeptrack.space/commit/d60a238a29c26e0aa683d8f7df353dfdced0ce7b)
- build(node-ci.yml): remove CI variable [`9a37091`](https://github.com/thkruz/keeptrack.space/commit/9a370916b1cccd30fd0098d940186e5d21df7d22)
- test(meshmanager.js): removed testing of meshManager init [`9371400`](https://github.com/thkruz/keeptrack.space/commit/93714005c3b71852a84840e035e4cb0dc44a3875)
- build(package.json): fixed issue with jest [`ebcd53a`](https://github.com/thkruz/keeptrack.space/commit/ebcd53a1b06b555712ac6ec60b7f019b69011043)
- chore(version.js): bump version number [`88a727b`](https://github.com/thkruz/keeptrack.space/commit/88a727b2ab4a0554a407ec21a9fe406a20911468)
- test(startup.js): increase wait to 10s [`94ae5ef`](https://github.com/thkruz/keeptrack.space/commit/94ae5ef24aed1117ad09a91b2703ca091824906d)
- chore(package.json): updated version number [`b7fe2e4`](https://github.com/thkruz/keeptrack.space/commit/b7fe2e44cd03887a3ac3a9431b983bd667df9db5)
- docs(settingsmanager): updated version number [`b2e4485`](https://github.com/thkruz/keeptrack.space/commit/b2e44852a71ed0aa903442c5443f7f5972e97e87)
- build(node-ci.yml): fixed typo [`9547471`](https://github.com/thkruz/keeptrack.space/commit/954747116873a7e3dbc95612e76981f39d0e2b0e)
- fix(babel.config.js): bugs found in deepsource removed [`8a1bf9b`](https://github.com/thkruz/keeptrack.space/commit/8a1bf9be99aaa9fc7228caccb06212935f6f12c9)
- fix(sidemenumanager.js): fixed issue when less than 20 collision events [`d26a0ff`](https://github.com/thkruz/keeptrack.space/commit/d26a0ff4be2fe73d253eab3a667f1e2211c9ef5a)
- ci(package.json): removed outdated package [`6c8e8d5`](https://github.com/thkruz/keeptrack.space/commit/6c8e8d5389ba19c4fa5d3aae21a0489ecebb5d01)
- build(webworker): changed to array [`6433f7f`](https://github.com/thkruz/keeptrack.space/commit/6433f7fda877341e52045db7afbd7662cdf02a28)
- build(node-ci.yml): convert node-ci to windows runner [`54c359f`](https://github.com/thkruz/keeptrack.space/commit/54c359f0f1277ac574dea16e75c9b5e83851077f)
- build(node-ci.yml): fixed typo [`60cbe01`](https://github.com/thkruz/keeptrack.space/commit/60cbe01b39f6b41086bf8e6d4ef68d1f334b7f66)
- test(startup.js): increased waiting to 30s [`e939a1a`](https://github.com/thkruz/keeptrack.space/commit/e939a1af8c272b4981bddd7541585108a1f86594)
- test(cypress.yml): fixed typo [`969376f`](https://github.com/thkruz/keeptrack.space/commit/969376f4eb4a3a6d02d3679906779dbf16b2887b)
- fix(satset.js): fixed calculation on how many dots to draw [`41e138a`](https://github.com/thkruz/keeptrack.space/commit/41e138a23aeb165d7c3bcff130a72da78d44fd7e)
- Update node-ci.yml [`3b1b767`](https://github.com/thkruz/keeptrack.space/commit/3b1b767f38295c65e2471b1440f0bcde09e17512)
- fix(drawmanager.js): typo removed [`31e98db`](https://github.com/thkruz/keeptrack.space/commit/31e98db8597caeecf7440906dfb5ffbc77a8a925)
- Update is-website-vulnerable.yml [`cf5c39d`](https://github.com/thkruz/keeptrack.space/commit/cf5c39d014dd9278fcce08c9ca03a609becc05e8)
- fix(sidemenumanager.js): dOM text reinterpreted as HTML [`a878496`](https://github.com/thkruz/keeptrack.space/commit/a87849675bf78a7a3e52883e6a215caf14da9926)
- Update README.md [`9ddaeb3`](https://github.com/thkruz/keeptrack.space/commit/9ddaeb329673e3ee814b9a29959bffbeb15e359a)
- build(node-ci.yml): added local server [`97af077`](https://github.com/thkruz/keeptrack.space/commit/97af0770f436b80bd5ef0790f871f758706e6985)
- test(package.json): added cypress [`a3734d9`](https://github.com/thkruz/keeptrack.space/commit/a3734d9088d953375f052d7005903a9317fa3e33)
- test(cypress.yml): fixed typo [`39d4478`](https://github.com/thkruz/keeptrack.space/commit/39d4478b11a7976b2bc16a7925c5270c7df209ff)
- build(package.json): created a script for starting a test server on localhost [`664a9c1`](https://github.com/thkruz/keeptrack.space/commit/664a9c1f65054c37c8650fa5ef601c583942d628)
- merge conflicts [`1d18a34`](https://github.com/thkruz/keeptrack.space/commit/1d18a3466edda9a8c5f7778bc03735ac281d920a)
- Revert "Revert "Fix DOMContentLoaded issue"" [`fdadcc4`](https://github.com/thkruz/keeptrack.space/commit/fdadcc407d17cbf42c65d07d4a0c9d6f9891ec14)
- Revert "Fix DOMContentLoaded issue" [`c8e74e9`](https://github.com/thkruz/keeptrack.space/commit/c8e74e9bf40b804192c873c89fa023ff16307012)
- Fix DOMContentLoaded issue [`30086c7`](https://github.com/thkruz/keeptrack.space/commit/30086c7e2d1b35e625f3c189810a20889a19cfb5)
- Extracted starManager and Made LineFactory [`b10ddb7`](https://github.com/thkruz/keeptrack.space/commit/b10ddb758fa94382328cd393806e70058aec883d)
- Extracted SunCalc and More Explicit Start Order [`5481c12`](https://github.com/thkruz/keeptrack.space/commit/5481c121172c44c7e4992597f8698aba4ede81a2)
- Refactored main.js [`1433181`](https://github.com/thkruz/keeptrack.space/commit/1433181cd9d95e9bc71a83b27b81fdae98f6511a)
- No ColorScheme Globals and Fixed Sunlight Status [`a709194`](https://github.com/thkruz/keeptrack.space/commit/a709194effe401c1f6daf879a544d7ec241f7575)
- ColorSchemeFactory [`6aa39bc`](https://github.com/thkruz/keeptrack.space/commit/6aa39bcfc791bcefe20c3e89bbe0bd73a06d991d)
- Automatic ES6 Conversion [`a1bcbeb`](https://github.com/thkruz/keeptrack.space/commit/a1bcbeb95f3429b1ac91050a9cc5e1fee4e8aa5b)
- dots class created [`592ff99`](https://github.com/thkruz/keeptrack.space/commit/592ff9919ebbdbce7686a1139903b53bc0025b24)
- keeptrack-head renammed settings [`99740d8`](https://github.com/thkruz/keeptrack.space/commit/99740d8d633672080022d52a566fa941abfdf16a)
- Established Clear Loading Order [`498498c`](https://github.com/thkruz/keeptrack.space/commit/498498c65bbf1540e0e090e7f3a15965d872da5a)
- Smarter dots buffer use [`1f3dc01`](https://github.com/thkruz/keeptrack.space/commit/1f3dc01882fef976dec409bb618e24ac15ab6a57)
- Decoupled parseCatalog [`e18db79`](https://github.com/thkruz/keeptrack.space/commit/e18db79b04dbb79816c594db1c458e1f235bbea1)
- twgl for Moon [`68a73ad`](https://github.com/thkruz/keeptrack.space/commit/68a73ad5f8c4e93817865b7f075fbace2bde393e)
- Moon and Atmosphere Switched to TWGL [`837a20d`](https://github.com/thkruz/keeptrack.space/commit/837a20dbc1f0d91983028cd693de0350eaf55a2d)
- Cleanup SatSet.init [`4e3b52b`](https://github.com/thkruz/keeptrack.space/commit/4e3b52b1e4d00a8ea8367c4769c08194d2acbf2b)
- Fixed pMatrix Not Updating [`ac79905`](https://github.com/thkruz/keeptrack.space/commit/ac7990534e87398e6e742a88594c9eb55a293462)
- Class for Satellite gl Actions [`1c3c002`](https://github.com/thkruz/keeptrack.space/commit/1c3c0020bcd093fc0c28abba3299e455960d1077)
- Reduce Dependencies [`5549172`](https://github.com/thkruz/keeptrack.space/commit/55491725c9d2c30a2a94fbcccfa8d3b0cd5c89e8)
- Fixed bug with appending hoverbox [`bb1585a`](https://github.com/thkruz/keeptrack.space/commit/bb1585a55ba41ec253a3852e67ddf198be75fa97)
- Separated Update Draw and Drawpicking [`52a8315`](https://github.com/thkruz/keeptrack.space/commit/52a8315ee7418e3395bd7b1ecc27cd57141efbea)
- Fix Star Sizes [`e47206c`](https://github.com/thkruz/keeptrack.space/commit/e47206cb3134f871b16016c03dd649f8def4b9f8)
- Private Fields Removed [`e5205ca`](https://github.com/thkruz/keeptrack.space/commit/e5205caac1db08ece7d6bdeca156ed9756742575)
- Stable SunCalc [`04db0c7`](https://github.com/thkruz/keeptrack.space/commit/04db0c7bc5bc028e19334acfbdbc1d3a7ec05b64)
- Removed jQuery from main.js [`62baf5b`](https://github.com/thkruz/keeptrack.space/commit/62baf5b40b8447dab3c1c692c4350f3bad9b9971)
- Separate Picking from Positions [`5747480`](https://github.com/thkruz/keeptrack.space/commit/574748025e5bba04ac5c190d59ad3d1986b82439)
- Revert "Private variables in camera" [`61ce939`](https://github.com/thkruz/keeptrack.space/commit/61ce93952463c50cfbd611b31e0b1d54327ad512)
- Clean main.js [`8c25049`](https://github.com/thkruz/keeptrack.space/commit/8c250491c990f0dba479514b102131f1d369a17a)
- Separate catalog loading [`16f5f1c`](https://github.com/thkruz/keeptrack.space/commit/16f5f1c909320e349cf2e36b73b6358d4a19d8d4)
- Separated gpu buffer setup [`6b65f3f`](https://github.com/thkruz/keeptrack.space/commit/6b65f3f6258aacaa8c52f0ff356614d6308e141c)
- Reduce Dependencies [`091c7db`](https://github.com/thkruz/keeptrack.space/commit/091c7db9e8727ed3bf41f68bfa5df6a941c52251)
- Fixed daysold calculations [`940dc5d`](https://github.com/thkruz/keeptrack.space/commit/940dc5db5d6b6626fd79eb27e75453f716dd62a7)
- Added gl.DYNAMIC_DRAW [`c11b255`](https://github.com/thkruz/keeptrack.space/commit/c11b2550516bb6217393792c48d12c1cfa5adaf3)
- Moved webworkers to own folder [`328d553`](https://github.com/thkruz/keeptrack.space/commit/328d553f2efddcd67d82b757add3ce07fbc38721)
- Fixed raycasting bug when clicking earth [`c2c4402`](https://github.com/thkruz/keeptrack.space/commit/c2c44027bf47a78657ce56c225da62afaf36141f)
- Revert "Lint fix for camera.js" [`a49dbec`](https://github.com/thkruz/keeptrack.space/commit/a49dbec324bc5757deec910d7724916b0c33c4fb)
- Lint fix for camera.js [`999e6cb`](https://github.com/thkruz/keeptrack.space/commit/999e6cb9e1f3e6141e5817d449d6266c6ad1df90)
- satVmag moved [`16b49ad`](https://github.com/thkruz/keeptrack.space/commit/16b49add6981bd7b93ea63a6237fa664558bc85c)
- Archived unused js code [`beaad64`](https://github.com/thkruz/keeptrack.space/commit/beaad647f052f6a1ede75aa0fcc6c5c3152ebc9d)

#### [v3.0.4](https://github.com/thkruz/keeptrack.space/compare/v3.0.3...v3.0.4)

> 28 December 2020 

- Fix .gitattributes Issue [`#206`](https://github.com/thkruz/keeptrack.space/pull/206)
- Include All Req Image [`#205`](https://github.com/thkruz/keeptrack.space/pull/205)
- Remove unused files from deepsource [`#204`](https://github.com/thkruz/keeptrack.space/pull/204)
- Development [`#203`](https://github.com/thkruz/keeptrack.space/pull/203)
- Github Packages fix [`#202`](https://github.com/thkruz/keeptrack.space/pull/202)
- Create codeql-analysis.yml [`6edac80`](https://github.com/thkruz/keeptrack.space/commit/6edac80be5f154cd0554fb95b6acea910ce111b0)
- Create release.yml [`a743d22`](https://github.com/thkruz/keeptrack.space/commit/a743d22c38b514ab6aee6d6cff2c3f07f9016de9)
- Delete npm-publish.yml [`675db45`](https://github.com/thkruz/keeptrack.space/commit/675db459d1156c9091392ea4106dd2a9d99246b7)
- Create deploy-ghpages.yml [`c599437`](https://github.com/thkruz/keeptrack.space/commit/c599437cd04346596614cbfba709d8819a2410c7)
- Create .deepsource.toml [`d0d6913`](https://github.com/thkruz/keeptrack.space/commit/d0d69137bfd9b52f65408d01d0c830aa0cbc4151)
- Fix codecov [`6836c2f`](https://github.com/thkruz/keeptrack.space/commit/6836c2fe2d1f48ec9e84699efaf1d6e1812b09d2)
- Update release.yml [`4edcd4f`](https://github.com/thkruz/keeptrack.space/commit/4edcd4f9db8b9def92bc1a65a23e492e86966f54)
- Fix coverage [`318e414`](https://github.com/thkruz/keeptrack.space/commit/318e41435db431f0b95fa058dd6f37e9eb4c8578)
- Update .deepsource.toml [`bd61b96`](https://github.com/thkruz/keeptrack.space/commit/bd61b96db6377505f812828b5fc6fcf003d5f61b)
- Add codecov [`75eb1fe`](https://github.com/thkruz/keeptrack.space/commit/75eb1fe9ee38561e7e6ea36850c3ceb717f4fb55)
- Update README.md [`9272854`](https://github.com/thkruz/keeptrack.space/commit/9272854ea1224598edd9d82563572139c079ee93)
- Update node-ci.yml [`5f1ee34`](https://github.com/thkruz/keeptrack.space/commit/5f1ee34e7e773dfb31a87264aefbb0bfeda6cb6c)
- Delete npm.yml [`2316039`](https://github.com/thkruz/keeptrack.space/commit/23160398ef33014c6a59e029ac8907201ef39ea7)
- Create npm.yml [`2ea763e`](https://github.com/thkruz/keeptrack.space/commit/2ea763ebb79de50b25063b81c0776dd4ad37db77)
- Update node-ci.yml [`6680443`](https://github.com/thkruz/keeptrack.space/commit/6680443acff11b55dcb436d7d3f224f12256fe3f)
- Add coverage to package [`e6f6494`](https://github.com/thkruz/keeptrack.space/commit/e6f64941194801aa2cbb519a97302b7b0270a85a)

#### [v3.0.3](https://github.com/thkruz/keeptrack.space/compare/v3.0.2...v3.0.3)

> 28 December 2020 

- Development [`#198`](https://github.com/thkruz/keeptrack.space/pull/198)
- Create CONTRIBUTING.md [`ddfbb28`](https://github.com/thkruz/keeptrack.space/commit/ddfbb285eed4f124b70330d14256d5f6c1eccf58)
- Fixed Gitattributes [`62821aa`](https://github.com/thkruz/keeptrack.space/commit/62821aa4a78d160d423cff0c0a563ca575e3e08e)
- Update README.md [`ae338ce`](https://github.com/thkruz/keeptrack.space/commit/ae338ce51884baa0d99a8fe22bd18115c3c51a1b)
- .gitignore Update [`3c9ec3d`](https://github.com/thkruz/keeptrack.space/commit/3c9ec3d2f7145abb8544a708cc3f0e09bad9e432)
- Update README.md [`5ab5866`](https://github.com/thkruz/keeptrack.space/commit/5ab58661eb2c994d806746e05c3d2c72507b7ac3)
- Example automatic todo [`c419ea0`](https://github.com/thkruz/keeptrack.space/commit/c419ea0593caf677e68f75b74bd0df3820fdd2ba)
- Fix Images [`d78687a`](https://github.com/thkruz/keeptrack.space/commit/d78687a85e15de91721af546cdc4dac13061bc7c)
- Update README.md [`f386bda`](https://github.com/thkruz/keeptrack.space/commit/f386bda7be238f4d62c9721343d2bbc79e2d1151)
- Update README.md [`1bcbcce`](https://github.com/thkruz/keeptrack.space/commit/1bcbcce521ce98f754e93a6e758da4053551d0e9)
- Update npm-publish.yml [`772e11c`](https://github.com/thkruz/keeptrack.space/commit/772e11c7f26c79e4972aa2f53443e98be6c9ccfa)
- Update npm-publish.yml [`de0e7a8`](https://github.com/thkruz/keeptrack.space/commit/de0e7a86b731b24a73ac0deb3f9f2c4930f6f981)
- Update npm-publish.yml [`2e627fd`](https://github.com/thkruz/keeptrack.space/commit/2e627fda77efee1719f377a3782a4e5e608afe70)
- Update npm-publish.yml [`59ae773`](https://github.com/thkruz/keeptrack.space/commit/59ae773752f493e854165eba5486e58d539db049)
- Bump to 3.0.3 [`b48646b`](https://github.com/thkruz/keeptrack.space/commit/b48646b6a448d8ecb1926697ea0f94054b53372e)
- Update npm-publish.yml [`8e9ff17`](https://github.com/thkruz/keeptrack.space/commit/8e9ff1775b8e17f0311ff65ca8ce2ca6299797f6)
- Update npm-publish.yml [`17d991b`](https://github.com/thkruz/keeptrack.space/commit/17d991b3e1cc49d9061390ccb2b1be21b9c211f2)
- Update npm-publish.yml [`fa71b4f`](https://github.com/thkruz/keeptrack.space/commit/fa71b4fd9afc1662ed91924685e6e4dc2e23b293)
- Update node-ci.yml [`7463dd1`](https://github.com/thkruz/keeptrack.space/commit/7463dd1bf76d111b244f4eb0881c71d0445fefd0)
- Update README.md [`451a7be`](https://github.com/thkruz/keeptrack.space/commit/451a7be112bd9339e72ce617ecfda4e38a15585e)
- Update npm-publish.yml [`d39d7b0`](https://github.com/thkruz/keeptrack.space/commit/d39d7b06db38a9e3d4a349c2b1bd84b664dd1148)
- Update README.md [`ceed013`](https://github.com/thkruz/keeptrack.space/commit/ceed013306ac4ec0b9124c1984de7fb5db76f792)

#### [v3.0.2](https://github.com/thkruz/keeptrack.space/compare/v3.0.1...v3.0.2)

> 27 December 2020 

- cameraManager testing added [`#195`](https://github.com/thkruz/keeptrack.space/pull/195)
- Development [`#194`](https://github.com/thkruz/keeptrack.space/pull/194)
- Refactor main.js [`2e34d1f`](https://github.com/thkruz/keeptrack.space/commit/2e34d1fe183ebd353835f08f7fdbe88f10f89f7a)
- Fixed loading screen issues [`9059c72`](https://github.com/thkruz/keeptrack.space/commit/9059c724f0fd85171b360fb1614523ac10f1c531)
- Update and rename npm.yml to npm-publish.yml [`0b9e93b`](https://github.com/thkruz/keeptrack.space/commit/0b9e93bb75fd2b44c014eb02d671a9867268ca4b)
- Update and rename lint.yml to node-ci.yml [`b47d8cd`](https://github.com/thkruz/keeptrack.space/commit/b47d8cdce874378c6ed196f8bf3427df7a91d21d)
- Fixed tests [`10b51f3`](https://github.com/thkruz/keeptrack.space/commit/10b51f3ecf3dd4dbcfb7cb59f79c7275fa6c5b26)
- Create npm.yml [`d9f0f52`](https://github.com/thkruz/keeptrack.space/commit/d9f0f5239a9ca18571b538b5e272d7490e3288c6)
- Configured for CI [`e1babe6`](https://github.com/thkruz/keeptrack.space/commit/e1babe6bcd42cb497aacd879774c9d2c0921a92f)
- Update node-ci.yml [`582e7c1`](https://github.com/thkruz/keeptrack.space/commit/582e7c19ad309f0e60cf202c5a5fc76418c76245)
- Update node-ci.yml [`03cea2b`](https://github.com/thkruz/keeptrack.space/commit/03cea2b462cf0c2bdc17311593f38e4453dfac22)
- Update node-ci.yml [`916e879`](https://github.com/thkruz/keeptrack.space/commit/916e8792060e0e214f066093a4c0d40114c0a53d)
- Update lint.yml [`58d06b5`](https://github.com/thkruz/keeptrack.space/commit/58d06b5226fc179a3d6c038b94e81880adfdc41b)
- Update node-ci.yml [`533b077`](https://github.com/thkruz/keeptrack.space/commit/533b07727def6cf1b53040c32be1a86af84cc296)
- Update lint.yml [`cfcf56b`](https://github.com/thkruz/keeptrack.space/commit/cfcf56bb4f9ce8025b18b18ae0fb84477e943159)
- Ignore coverage [`19c082f`](https://github.com/thkruz/keeptrack.space/commit/19c082f7d3022baeceefc583aedb59b430aa44ec)
- Update npm.yml [`2522b14`](https://github.com/thkruz/keeptrack.space/commit/2522b146bdbdaf534d771472bcb74fea65f4a5d1)
- Update is-website-vulnerable.yml [`5549425`](https://github.com/thkruz/keeptrack.space/commit/5549425dbfe5999027a6f777787e105d473c96eb)

#### [v3.0.1](https://github.com/thkruz/keeptrack.space/compare/v3.0.0...v3.0.1)

> 27 December 2020 

- updateRadarData script [`e08bc9f`](https://github.com/thkruz/keeptrack.space/commit/e08bc9ff410ee031eed9017f821ee943f02df842)
- Remove highres images [`86cffdc`](https://github.com/thkruz/keeptrack.space/commit/86cffdc3e1254c15274c64a35f746b2b834b614d)
- Remove radar data [`37160d2`](https://github.com/thkruz/keeptrack.space/commit/37160d2d44cf2492c2e346028eb43ccbfa16b0ed)
- Remove radar data [`75504ef`](https://github.com/thkruz/keeptrack.space/commit/75504ef94209c8f2419781196dd79f4af9169eb5)
- Remove 8k images [`5e1c4e0`](https://github.com/thkruz/keeptrack.space/commit/5e1c4e0f36a6e065e99b36efc24905435e619352)
- Remove highres images [`dfff3ef`](https://github.com/thkruz/keeptrack.space/commit/dfff3ef86cfd5d938e884df454012e337936d559)
- Remove 8k images [`51be69d`](https://github.com/thkruz/keeptrack.space/commit/51be69d83f2992a8df18794b5ebbca59b77b2a20)

### [v3.0.0](https://github.com/thkruz/keeptrack.space/compare/v2.8.1...v3.0.0)

> 27 December 2020 

- Bump mkdirp from 0.5.5 to 1.0.4 [`#193`](https://github.com/thkruz/keeptrack.space/pull/193)
- Upgrade to ES6+ [`f41ac76`](https://github.com/thkruz/keeptrack.space/commit/f41ac7630a77457a7920d5637650181670ff4ba0)
- eslint rename [`66ab9a7`](https://github.com/thkruz/keeptrack.space/commit/66ab9a7de8414607d110521c2a9bef41c45bc3e9)
- npm publishing [`4a499b3`](https://github.com/thkruz/keeptrack.space/commit/4a499b3a06d3701f5e73c865f186ac17fa80b5e3)
- Create dependabot.yml [`e43656d`](https://github.com/thkruz/keeptrack.space/commit/e43656dd505f4807f665972cf2078ddd60b0ab94)
- Update lint.yml [`bbba28d`](https://github.com/thkruz/keeptrack.space/commit/bbba28dd8d3ba3b7e21c978aa194e6996d6091b3)
- gitignore [`0c339c2`](https://github.com/thkruz/keeptrack.space/commit/0c339c24e6d6f08a1787b020abbf326720f33415)
- Remove hires images [`44e0201`](https://github.com/thkruz/keeptrack.space/commit/44e0201ef2dd7f082b750079949c1a1790d6d40e)
- Rm package-lock.json [`8e902da`](https://github.com/thkruz/keeptrack.space/commit/8e902da68d84569ab8ff77f7c54077293b338dfa)

#### [v2.8.1](https://github.com/thkruz/keeptrack.space/compare/v2.8.0...v2.8.1)

> 23 December 2020 

- satellite.js to 4.1.3 [`f278e8b`](https://github.com/thkruz/keeptrack.space/commit/f278e8bcae058f7a4312d21c78bb7405acd78cd3)
- Implement npm [`f172cda`](https://github.com/thkruz/keeptrack.space/commit/f172cda3e34182fa4cad21315474507699e54f44)
- PropRate 0 bugfix. [`6a75cbb`](https://github.com/thkruz/keeptrack.space/commit/6a75cbb9762167aa45dfa63fe6cc789414e4e182)
- Package update [`334aa9c`](https://github.com/thkruz/keeptrack.space/commit/334aa9c717581a321f5b4cd98c4ef9aa7a43467e)

#### [v2.8.0](https://github.com/thkruz/keeptrack.space/compare/v2.7.5...v2.8.0)

> 19 December 2020 

- Missile bugfixes. Error toasts. New loading messages. [`11addbf`](https://github.com/thkruz/keeptrack.space/commit/11addbf4d2c43137e6d60abab3e77de2b716b3f9)

#### [v2.7.5](https://github.com/thkruz/keeptrack.space/compare/v2.7.4...v2.7.5)

> 18 December 2020 

- Better orbit lines. Mobile scrolling bufix. [`9f2fe75`](https://github.com/thkruz/keeptrack.space/commit/9f2fe7524feec396d6b69171e41f64a295acd05e)

#### [v2.7.4](https://github.com/thkruz/keeptrack.space/compare/v2.7.3...v2.7.4)

> 18 December 2020 

- Fixed to Satellite camera mode bugfixes [`b552b68`](https://github.com/thkruz/keeptrack.space/commit/b552b68221559ebd1577a186d9076a022a49b431)

#### [v2.7.3](https://github.com/thkruz/keeptrack.space/compare/v2.7.2...v2.7.3)

> 18 December 2020 

- Reduce memory leaks [`e8e1baa`](https://github.com/thkruz/keeptrack.space/commit/e8e1baa642ab70e24d9c691e53960a9826a7de18)

#### [v2.7.2](https://github.com/thkruz/keeptrack.space/compare/v2.7.1...v2.7.2)

> 16 December 2020 

- Selected dot color fix [`22bbbb3`](https://github.com/thkruz/keeptrack.space/commit/22bbbb392a55ce42489fc7b449892855f8b64afe)

#### [v2.7.1](https://github.com/thkruz/keeptrack.space/compare/v2.5.1...v2.7.1)

> 27 November 2020 

- Initial Orbit Determination [`ae744f9`](https://github.com/thkruz/keeptrack.space/commit/ae744f9c46d6a759770a42dc1a771f3e1b7b7a3a)
- Numerous bugfixes. [`111c008`](https://github.com/thkruz/keeptrack.space/commit/111c008ea2fd1eecec84443ccbd3962c49f5d823)
- 16K images and satellite fixed camera [`f025e4e`](https://github.com/thkruz/keeptrack.space/commit/f025e4e20e39c6b77408698ec620eea44279e36c)
- Astronomy and Planetarium fixes. Shader updates. [`c854eaa`](https://github.com/thkruz/keeptrack.space/commit/c854eaabc79575b4d1cabef5fda89b914893e3ad)
- Time propagation bug fixes. [`aca6f42`](https://github.com/thkruz/keeptrack.space/commit/aca6f4243413ec6e63783dd19b94a9cdd4f071f7)
- Version updated [`a22e1ff`](https://github.com/thkruz/keeptrack.space/commit/a22e1ff5a97560e558ea521dd0c18bc138750e4d)
- Mobile webgl fixes [`8ef38bd`](https://github.com/thkruz/keeptrack.space/commit/8ef38bd13a254ea903e3fa7a5716dbb93de701ee)

#### [v2.5.1](https://github.com/thkruz/keeptrack.space/compare/v2.4.0...v2.5.1)

> 20 November 2020 

- RadarData toggle [`65a78d2`](https://github.com/thkruz/keeptrack.space/commit/65a78d2f7cd4f40bb8c11a1062e0f435a28e3ce8)
- Performance fixes [`55d9629`](https://github.com/thkruz/keeptrack.space/commit/55d9629598f8aa9da906cf4e9ca786848429d4bd)
- Mobile fixes. [`af3ef7c`](https://github.com/thkruz/keeptrack.space/commit/af3ef7cfc226afd2c698d434480fe3ffa7de6ca2)
- frag depth extension fixes [`8c7db7b`](https://github.com/thkruz/keeptrack.space/commit/8c7db7ba21abc20dc399b4c3c870d3252f5d6e4f)
- radarData auto-import [`1894b07`](https://github.com/thkruz/keeptrack.space/commit/1894b072c2a91e343670f7c4b9f09a3de73544fa)
- Console Toggle [`4dda570`](https://github.com/thkruz/keeptrack.space/commit/4dda5700f8f235d17730081abb85d0d0d5ee944d)

#### [v2.4.0](https://github.com/thkruz/keeptrack.space/compare/v2.3.0...v2.4.0)

> 19 November 2020 

- Create LICENSE [`183057b`](https://github.com/thkruz/keeptrack.space/commit/183057bff2f4e60ad30e3a242c6f86708f5f1484)
- Faster indexing and more radarData colors. [`367933d`](https://github.com/thkruz/keeptrack.space/commit/367933daac836ba185a48305e5f9bb68d059bafd)
- GNU GPL copyright update [`161d798`](https://github.com/thkruz/keeptrack.space/commit/161d798f3d2519ea5a5f263277f87eed55d7d457)
- Update README.md [`e766ca5`](https://github.com/thkruz/keeptrack.space/commit/e766ca5a5ffa0c2058c9604161776c53b0e1c2a0)
- Bugfixes [`b5d53e6`](https://github.com/thkruz/keeptrack.space/commit/b5d53e6d28aa8152624c47973eb1902ad0bc6b9f)
- Update README.md [`25675e1`](https://github.com/thkruz/keeptrack.space/commit/25675e1c6d09b4cd9e6fab5f0155a6d95ce94729)
- Update README.md [`01c374f`](https://github.com/thkruz/keeptrack.space/commit/01c374f760f2c4ae0938284dc21629ffa29aa080)
- license folder rename [`b53a5bf`](https://github.com/thkruz/keeptrack.space/commit/b53a5bfdddec7d59fa62b5763957ba89d239ca09)

#### [v2.3.0](https://github.com/thkruz/keeptrack.space/compare/v2.2.0...v2.3.0)

> 18 November 2020 

- Moon fixed. GS database added. [`e51e941`](https://github.com/thkruz/keeptrack.space/commit/e51e94193db21254906af5081dafee02817357e1)
- radarData module updates [`5aaa5d2`](https://github.com/thkruz/keeptrack.space/commit/5aaa5d2874dbe14dee09e1282a1d50863166bea2)

#### [v2.2.0](https://github.com/thkruz/keeptrack.space/compare/v2.1.0...v2.2.0)

> 14 November 2020 

- RadarData module updated [`d29783b`](https://github.com/thkruz/keeptrack.space/commit/d29783b134fb8003dc31f39d44990be5477d43cb)

#### [v2.1.0](https://github.com/thkruz/keeptrack.space/compare/v2.0.0...v2.1.0)

> 13 November 2020 

- Offline fixes and rmManager [`ec4d89f`](https://github.com/thkruz/keeptrack.space/commit/ec4d89fe9bd47db5fb6ee31402f72a32f3a4e447)

### [v2.0.0](https://github.com/thkruz/keeptrack.space/compare/v1.20.12...v2.0.0)

> 11 November 2020 

- Feature locks and bugfixes [`88d9afa`](https://github.com/thkruz/keeptrack.space/commit/88d9afa1b73589de3f9224bdb8827de07608d4f9)
- Fixed running without webserver [`56d7171`](https://github.com/thkruz/keeptrack.space/commit/56d71715b7a7522f23c74c6ab14cf0699025832c)
- Right click menu color fix [`409f442`](https://github.com/thkruz/keeptrack.space/commit/409f44291140cbbe91cda49de9191037251254bf)

#### [v1.20.12](https://github.com/thkruz/keeptrack.space/compare/v1.20.11...v1.20.12)

> 22 October 2020 

- Relative velocity added [`d09a627`](https://github.com/thkruz/keeptrack.space/commit/d09a627667744cdec528d4baaed6c0216cdc86a5)

#### [v1.20.11](https://github.com/thkruz/keeptrack.space/compare/v1.20.10...v1.20.11)

> 22 October 2020 

- Fix line to satellite from sensor [`54258b2`](https://github.com/thkruz/keeptrack.space/commit/54258b214c0fa20fa80969bee99beaefc2aa8008)

#### [v1.20.10](https://github.com/thkruz/keeptrack.space/compare/v1.20.9...v1.20.10)

> 22 October 2020 

- External data fix [`1181cbd`](https://github.com/thkruz/keeptrack.space/commit/1181cbd0e13d7eee91ed49b11ac7e5aa9094b6bb)
- Fixed edit satellite menu [`181214d`](https://github.com/thkruz/keeptrack.space/commit/181214d7a6cda00d0e342384e96abda9021c9da1)

#### [v1.20.9](https://github.com/thkruz/keeptrack.space/compare/v1.20.8...v1.20.9)

> 22 October 2020 

- External data fix [`5718d49`](https://github.com/thkruz/keeptrack.space/commit/5718d49bbad3585b85c1209e5d16ab519f4474e6)

#### [v1.20.8](https://github.com/thkruz/keeptrack.space/compare/v1.20.7...v1.20.8)

> 22 October 2020 

- Show sensor to satellite link. Fix external sensor requests. [`fab9ba2`](https://github.com/thkruz/keeptrack.space/commit/fab9ba28918eee2342089b75dfae4bf02f07918d)
- Missing min files [`519aad3`](https://github.com/thkruz/keeptrack.space/commit/519aad3e49938e5c6f0b7c713feba76bafab48c8)

#### [v1.20.7](https://github.com/thkruz/keeptrack.space/compare/v1.20.1...v1.20.7)

> 15 September 2020 

- Zoom more friendly. Fixes #182 [`#182`](https://github.com/thkruz/keeptrack.space/issues/182)
- Multisite lookangles fix [`7e26ed0`](https://github.com/thkruz/keeptrack.space/commit/7e26ed0f543bf701debdfec45ee7965eeb7aba52)
- Starlink control sites [`9fb0669`](https://github.com/thkruz/keeptrack.space/commit/9fb066998f4b3057c058ca405d5caba4f361cffd)
- Fixed timeRate handling, missile events, and colorbox issues [`e73605b`](https://github.com/thkruz/keeptrack.space/commit/e73605bdaa69f3cbcb43ecc0a5bb5a9538bb3dee)
- Galileo satLinkManager [`ee03f65`](https://github.com/thkruz/keeptrack.space/commit/ee03f651b3122896e26944dc74eee3a1de5f08f3)
- External Sources menu [`7555952`](https://github.com/thkruz/keeptrack.space/commit/75559525f565d2a3c50c02d8b09f94f19d007bd2)
- Sub 1 Second Loading [`e7b470e`](https://github.com/thkruz/keeptrack.space/commit/e7b470e3d74ca7bbc2208aa7d937d658c470a9a6)
- Lighthouse Report fixes [`f9b750b`](https://github.com/thkruz/keeptrack.space/commit/f9b750b5139fea747892526829e9cabe71e36b81)
- PWA update [`5c8eb64`](https://github.com/thkruz/keeptrack.space/commit/5c8eb64063d7894afbbea6b68d36877af1c0b8d4)
- Version Number Update [`28157fb`](https://github.com/thkruz/keeptrack.space/commit/28157fba9d5b65f86be83316533e30bd48f0e7c6)
- Service worker update. [`ae7503c`](https://github.com/thkruz/keeptrack.space/commit/ae7503cb2be4c63ad250139190fcf67f842a3a9e)
- Fix which assets preloaded [`6abd71b`](https://github.com/thkruz/keeptrack.space/commit/6abd71bee1d4a5ed7a20fe59122841c2ee4314fc)
- Fixed toasts for limitedUI without all the extras of materialize [`57a438e`](https://github.com/thkruz/keeptrack.space/commit/57a438e192b6649dce6fb2e014db94041af5ae15)
- Progressive Web App test [`cdcac80`](https://github.com/thkruz/keeptrack.space/commit/cdcac8047449ce80763a3b9b893d3dd22f3c18a6)
- Improved PWA [`348ff2c`](https://github.com/thkruz/keeptrack.space/commit/348ff2c702cf564c130fd031cfaffe29aa06fbc9)
- Thinner orbit lines when the UI is disabled [`fc14b4a`](https://github.com/thkruz/keeptrack.space/commit/fc14b4a89b0eb868ed257ec3c5a42d22dba69f0d)
- Increased visibility when searching for satellites [`e65e414`](https://github.com/thkruz/keeptrack.space/commit/e65e414f3b9558c910cdb107a17d7c7685289a92)
- Better search menu handling [`e295a08`](https://github.com/thkruz/keeptrack.space/commit/e295a08916b00b365074d425781730149189546b)
- PWA bugfix [`71b671c`](https://github.com/thkruz/keeptrack.space/commit/71b671c3508fdf5c020e222f1403b800a910400f)
- Ensure a default earth texture loads [`1519f8f`](https://github.com/thkruz/keeptrack.space/commit/1519f8fda494a1d3f55249b915fe81776095a6ac)
- Manifest files [`58ca021`](https://github.com/thkruz/keeptrack.space/commit/58ca02166ccc6a75b6161fd6a07be212c4bb9a72)
- Fix duplicate suns #185 [`886f698`](https://github.com/thkruz/keeptrack.space/commit/886f698273d171bf1cec9ef65d470cee16ec6e45)
- Service worker installed first [`8196a2d`](https://github.com/thkruz/keeptrack.space/commit/8196a2d101e962e1e1bd9afa06d75eaa988f29b0)
- Prevent zoom NaN errors [`e7245e8`](https://github.com/thkruz/keeptrack.space/commit/e7245e8713fa2f6d92e0677a779e1f7416a075e5)
- Clear lines too when the screen is cleared [`7f5af83`](https://github.com/thkruz/keeptrack.space/commit/7f5af83d56984a90ad409c9983cab9fa5ce5f5c5)
- Search list dropdown fix [`a8c9bfa`](https://github.com/thkruz/keeptrack.space/commit/a8c9bfa5339b315456c9d90e9f0698c44403025c)
- Breakup generator fixes [`186c4d0`](https://github.com/thkruz/keeptrack.space/commit/186c4d0122298f94a02e25106fdc3e832241ffbf)
- PWA update [`1b27e85`](https://github.com/thkruz/keeptrack.space/commit/1b27e85ab45a80cb3b09ca92d85cef78cf1923b7)
- Add license file template [`d999fc0`](https://github.com/thkruz/keeptrack.space/commit/d999fc018e3cce354818a6aeab8490b08bab8341)
- Missile manager updated to use new timeManager [`7a131d0`](https://github.com/thkruz/keeptrack.space/commit/7a131d0a7cb58241f4b6d8663575e80b256e3016)
- PWA fix [`55c7f69`](https://github.com/thkruz/keeptrack.space/commit/55c7f69a125b346bf20d382371190d97aa352af5)
- Multisite Lookangles fixed with new timeManager [`8f2dd7d`](https://github.com/thkruz/keeptrack.space/commit/8f2dd7d82aad47276dbbd4537deb2376397ae1c2)
- https redirect [`d219115`](https://github.com/thkruz/keeptrack.space/commit/d219115c59a39591b8992d1c2688198cfecde59f)
- Alpha settings in webgl off [`ddeb0e0`](https://github.com/thkruz/keeptrack.space/commit/ddeb0e05794b628aadf32a9cca67cfd6bebaa7d6)
- Provide a valid apple-touch-icon [`37a8640`](https://github.com/thkruz/keeptrack.space/commit/37a8640e264e795c7ec0ab554f3cfec0cf6dfdb2)
- webmanifest update [`8acf96e`](https://github.com/thkruz/keeptrack.space/commit/8acf96e54afd2d245ade7f3a1f5e5fdadeb65f82)
- PWA update [`8462fd0`](https://github.com/thkruz/keeptrack.space/commit/8462fd059e7bc85f2607fe00dfb3e422a3d6941f)
- PWA fix [`ef407d8`](https://github.com/thkruz/keeptrack.space/commit/ef407d870e9a18dee2c15fb8b7b6b688896db922)
- PWA remove extra file [`d2ea5e2`](https://github.com/thkruz/keeptrack.space/commit/d2ea5e2913018fb0c2ee4a14641530a9d4063003)
- Unecessary CSS in limitedUI mode is overriding other websites CSS files [`70c196c`](https://github.com/thkruz/keeptrack.space/commit/70c196c921f8e194a1626df756d64131a105c966)
- Multisite lookangles fix 2 [`f8bb8dc`](https://github.com/thkruz/keeptrack.space/commit/f8bb8dcea4222404999bb9693be033940ea47d1c)
- Charset declaration earlier in page load [`b6edcbe`](https://github.com/thkruz/keeptrack.space/commit/b6edcbeef7763e824482af2f5b3ddfa73c38f4a0)
- Fullscreen PWA [`11640c7`](https://github.com/thkruz/keeptrack.space/commit/11640c7bfec18ffe1f76dc323b831a1968e53b38)
- Bugfix on manifest [`eb664f9`](https://github.com/thkruz/keeptrack.space/commit/eb664f9c6e0c4f97642ae62db9231b8742fd010c)
- Favorite icon update [`e8afa58`](https://github.com/thkruz/keeptrack.space/commit/e8afa588f7c65dff07e2c73a9bbfbbf5a08e6caa)
- Add an Apple touch icon [`83209f2`](https://github.com/thkruz/keeptrack.space/commit/83209f217127a76b2301a57d7680df55e1af54f2)
- Add a theme-color meta tag [`45c7e5e`](https://github.com/thkruz/keeptrack.space/commit/45c7e5ebcf071b580e1681da28302e7208a4c8f1)
- Better Apple Touch icon [`8890438`](https://github.com/thkruz/keeptrack.space/commit/88904384e2b996c9a4068fe70eba76db60aa794b)

#### [v1.20.1](https://github.com/thkruz/keeptrack.space/compare/v1.19.10...v1.20.1)

> 3 September 2020 

- Pr/179 [`#180`](https://github.com/thkruz/keeptrack.space/pull/180)
- Merge Le-Roi Changes [`#178`](https://github.com/thkruz/keeptrack.space/pull/178)
- Constellations [`#176`](https://github.com/thkruz/keeptrack.space/pull/176)
- Footer Nav Style Updates [`#175`](https://github.com/thkruz/keeptrack.space/pull/175)
- format update [`36cf4ba`](https://github.com/thkruz/keeptrack.space/commit/36cf4ba46960bab207e7c3359a9e6285af36516c)
- code formatting [`49b2394`](https://github.com/thkruz/keeptrack.space/commit/49b23942949ad8a36e7eeed8a8168aa1c18d5061)
- format update [`f9b024d`](https://github.com/thkruz/keeptrack.space/commit/f9b024dfbbccd4c41915a99700cc727dfd049cec)
- Repo Update [`4a98c8a`](https://github.com/thkruz/keeptrack.space/commit/4a98c8a9d3219e7c6620f3b0a5e90615b84bd0f8)
- Fixed formatter issues. [`4139559`](https://github.com/thkruz/keeptrack.space/commit/4139559ff602c31a8364ed08a7de1854491208b6)
- Latest From Master [`2cc55ba`](https://github.com/thkruz/keeptrack.space/commit/2cc55baeadd7e8efd3f7bfcc7a85298a1667abdd)
- working on code format [`97a8b25`](https://github.com/thkruz/keeptrack.space/commit/97a8b250afdac0e14fc9df032560f64bb67792fb)
- Minimize loading times and add prettier [`95d3028`](https://github.com/thkruz/keeptrack.space/commit/95d30286f926fe130133d827b85156d7efd81ea4)
- CSS issues and response.html [`e1e0faa`](https://github.com/thkruz/keeptrack.space/commit/e1e0faa801a3b6281f2de7b627080572e94ebd8b)
- O3b and debris [`67bc689`](https://github.com/thkruz/keeptrack.space/commit/67bc689c25898935cb17ac96d1abf913d86ae8e1)
- AEHF and auto face Nadir [`4dd6720`](https://github.com/thkruz/keeptrack.space/commit/4dd672024c5ee76d9b33fa6f2c193cd9eb970fc8)
- Minified js loading [`6dfac3f`](https://github.com/thkruz/keeptrack.space/commit/6dfac3f79a75133feef28b21e403b7d48db58564)
- Bugfixes [`7bdf05d`](https://github.com/thkruz/keeptrack.space/commit/7bdf05de3e89040bd732b1955cc4c51c18c7487a)
- Galileo satellite added [`8184a8b`](https://github.com/thkruz/keeptrack.space/commit/8184a8bf285e9ab0cd56fd2b42f49e5f43d69960)
- Gps satellite model added [`c5770b8`](https://github.com/thkruz/keeptrack.space/commit/c5770b8145eebde8e87399775bd3f552938e2282)
- Add orbcomm and globalstar constellations [`36daa06`](https://github.com/thkruz/keeptrack.space/commit/36daa062b48ed6034f95a44fdeff5dcb8a3cc847)
- Added PNames to stars HR3 to HR1003 [`da092f7`](https://github.com/thkruz/keeptrack.space/commit/da092f74cd1c3366412aa65dc8f4c240856a826e)
- Javascript standard style. [`e06b119`](https://github.com/thkruz/keeptrack.space/commit/e06b1190c7d5edb7f193cddbea15d1c43a9dc024)
- Added additional constellations [`94cdd47`](https://github.com/thkruz/keeptrack.space/commit/94cdd470a476429626e44939b6229f16c93c8527)
- Add sensors and fix sun [`6c13c34`](https://github.com/thkruz/keeptrack.space/commit/6c13c34e2c21562ce596affb148a2dbc248ea2a1)
- Embed testing and image preloading [`fb508be`](https://github.com/thkruz/keeptrack.space/commit/fb508bee133e3c8ff73a3fa9070e08b0870a7842)
- Bugfixes [`10f95bb`](https://github.com/thkruz/keeptrack.space/commit/10f95bbd235512aa195a978d9bd91db8c4dcb32c)
- Enable draw-less setting [`d3984b3`](https://github.com/thkruz/keeptrack.space/commit/d3984b339b89e1afd53c154b4d507a20e4fabe5b)
- Refactor sensorManager attributes [`b78a1df`](https://github.com/thkruz/keeptrack.space/commit/b78a1dfd3f87f778b565c8648b32e2d4be5c65db)
- Update checker-script.js [`69a94f3`](https://github.com/thkruz/keeptrack.space/commit/69a94f39670671722b0054b0f5a7a3478e9f99ac)
- Updates [`b6c5be5`](https://github.com/thkruz/keeptrack.space/commit/b6c5be511b24a36a74c56206f94092aff882b005)
- Reverted json loading [`8f11870`](https://github.com/thkruz/keeptrack.space/commit/8f118707d0a830611595d28a55c013df80a52c94)
- pre-multiplied alphas disabled for firefox compatibility [`fc96c93`](https://github.com/thkruz/keeptrack.space/commit/fc96c93f4891b907ab927835ddc3b7f140888285)
- Better loading order [`a67c868`](https://github.com/thkruz/keeptrack.space/commit/a67c8683cf686e6722e0827f901157c80570a33e)
- working on sensor manager [`43f53aa`](https://github.com/thkruz/keeptrack.space/commit/43f53aaa904d8727f886d447eb4e77f45466ce4d)
- Fixed css and time [`b663b50`](https://github.com/thkruz/keeptrack.space/commit/b663b500dd62ec36c80ffe8328f6269a207928b7)
- json updates [`e03bcf1`](https://github.com/thkruz/keeptrack.space/commit/e03bcf174c9e5c1312702cc4270295cf301d4a94)
- Fix bug from merge [`f212282`](https://github.com/thkruz/keeptrack.space/commit/f21228264b56d0eb9c6406f7da1fbbd436092db0)
- Folder Cleanup [`6627316`](https://github.com/thkruz/keeptrack.space/commit/6627316fb0cbf845d7849d98e77e34595acb16ae)
- footer nav tweaks [`5400caa`](https://github.com/thkruz/keeptrack.space/commit/5400caa709eed9593669ec7e42475a53b2c7d8ab)
- Update checker-script.js [`75ad233`](https://github.com/thkruz/keeptrack.space/commit/75ad233604a710389164c46b9a08c83fb833df5c)
- Improved atmosphere shader [`5a70c03`](https://github.com/thkruz/keeptrack.space/commit/5a70c033fdf9fb63f7600693299dec10dec37ffa)
- Working on embeded.htnl [`e5a84e8`](https://github.com/thkruz/keeptrack.space/commit/e5a84e80745c16dbe8accf8f58ba0a33e805a024)
- Skip minified version of satSet [`fdf3303`](https://github.com/thkruz/keeptrack.space/commit/fdf3303405c8a01c73da91b4802d96db1c9857f5)
- Update sensorManager.js [`007cb24`](https://github.com/thkruz/keeptrack.space/commit/007cb245494ad59a698be42ad516859e1d9eac37)
- typo [`e99c98a`](https://github.com/thkruz/keeptrack.space/commit/e99c98a3cac3614a163e5fb574e59919014ad45f)
- Typo [`f4ab560`](https://github.com/thkruz/keeptrack.space/commit/f4ab560c84355326c68cb2486571e76f6e19697b)
- Missing semicolon [`db4b9c3`](https://github.com/thkruz/keeptrack.space/commit/db4b9c36d10dd0cc5229708af36230864fcdb240)
- Missing missileManager icon [`421a9e3`](https://github.com/thkruz/keeptrack.space/commit/421a9e3a6ec673088c5070c2f382d5a04c37c242)
- Fix conflicts. We need to fix your linter. [`342650d`](https://github.com/thkruz/keeptrack.space/commit/342650db83d8b57f2920ef02d1cdd1709f8c8781)
- Update style.css [`568f826`](https://github.com/thkruz/keeptrack.space/commit/568f82674c6391418c4dca1af6210ded89e48d95)

#### [v1.19.10](https://github.com/thkruz/keeptrack.space/compare/v1.19.7...v1.19.10)

> 23 August 2020 

- Fixed mobile clock and unlinked datestring to close #169 and #170 [`#169`](https://github.com/thkruz/keeptrack.space/issues/169)
- More 3D models [`26357b5`](https://github.com/thkruz/keeptrack.space/commit/26357b5c323755f0f7ad678d91ab8940c347c36f)
- More meshes and improved camera controls [`01b0571`](https://github.com/thkruz/keeptrack.space/commit/01b0571b10bf55c0e8fb9191ab97bdce67e00876)
- Colored Meshes [`4327db5`](https://github.com/thkruz/keeptrack.space/commit/4327db5ee1d574148aa371e9c102e5bf4ef1b777)
- Astro Space UXDS update [`4ebf233`](https://github.com/thkruz/keeptrack.space/commit/4ebf2336e80a9138d91722efdc3df5122ebab7c0)
- Fixed bug [`80bc53b`](https://github.com/thkruz/keeptrack.space/commit/80bc53bbe418c7a981f6844f57ee6cdbbfa0db67)
- Case sensitive Satellite.obj (rename later). [`ede37f0`](https://github.com/thkruz/keeptrack.space/commit/ede37f092264a59fd66afc8def59d692954d40af)
- Bugfixes [`53a6dc5`](https://github.com/thkruz/keeptrack.space/commit/53a6dc52aaa514da3692586cc3a469a3efed2a3b)
- Color fixes [`59fa6b3`](https://github.com/thkruz/keeptrack.space/commit/59fa6b3c378af50b3efabc06cd448ba61fb6cbf5)

#### [v1.19.7](https://github.com/thkruz/keeptrack.space/compare/v1.19.3...v1.19.7)

> 18 August 2020 

- After loading updated with readystate function [`#167`](https://github.com/thkruz/keeptrack.space/pull/167)
- 17-08-2020 keeptrack.space response and compatibility update. [`#158`](https://github.com/thkruz/keeptrack.space/pull/158)
- Updated UI colors. Close #166 [`#166`](https://github.com/thkruz/keeptrack.space/issues/166)
- Added right click menu on mobile to close #132 [`#132`](https://github.com/thkruz/keeptrack.space/issues/132)
- Close #150 [`#150`](https://github.com/thkruz/keeptrack.space/issues/150)
- revert?? [`48f53b0`](https://github.com/thkruz/keeptrack.space/commit/48f53b030aa414966c9c7f5e7e9c4e0293c6a7d4)
- update [`a23f6ab`](https://github.com/thkruz/keeptrack.space/commit/a23f6abdf828068e2a081c6de3e036af722acee5)
- loading update [`81b75ca`](https://github.com/thkruz/keeptrack.space/commit/81b75cad3331d8dcac850e98e6eeccab12274561)
- response and compatibility update [`eea3f6f`](https://github.com/thkruz/keeptrack.space/commit/eea3f6f923693211f2521c4c8d5e0a1321a05693)
- Update index.htm [`cd98c34`](https://github.com/thkruz/keeptrack.space/commit/cd98c347c9f4973a327ce346bd5930cee152904c)
- response update [`793b9f3`](https://github.com/thkruz/keeptrack.space/commit/793b9f3d7457842d659fa8d607191f946f06f037)
- Improved camera controls [`56fe518`](https://github.com/thkruz/keeptrack.space/commit/56fe518a06a334f0a30e646b2bb0a4a4afa423e4)
- testing error scripts [`c2ec4a0`](https://github.com/thkruz/keeptrack.space/commit/c2ec4a0bd290161b41435b6aa3122d85df1e4e71)
- Working on content loaded [`2dc1504`](https://github.com/thkruz/keeptrack.space/commit/2dc150432c0a94b144f2e74272fd5f5289933eaf)
- Fixed rest of #132 [`9ce50cc`](https://github.com/thkruz/keeptrack.space/commit/9ce50cccd457161f3729c1f6cbe9f5b2cfa1ea89)
- response updates [`08182d9`](https://github.com/thkruz/keeptrack.space/commit/08182d9777dde617790f3192003fdfe356444b09)
- Look for an essential file rather than the index.htm [`26f5c5b`](https://github.com/thkruz/keeptrack.space/commit/26f5c5b3101e0708dba37aa63cec496e80d70e6a)
- Merged changes. Hides analytics and adds https requirement. [`6f511eb`](https://github.com/thkruz/keeptrack.space/commit/6f511eb9a676e761995d28ce6bc878cc1892f04c)
- some tweaks [`66b3251`](https://github.com/thkruz/keeptrack.space/commit/66b3251712ee205bf9a4b83432f2efbf963b9e83)
- trail and error [`3bd01bb`](https://github.com/thkruz/keeptrack.space/commit/3bd01bb3ea01e69b08e7c897e39defe667ed29c2)
- Performance update for limitedUI mode. [`9eff50e`](https://github.com/thkruz/keeptrack.space/commit/9eff50ef9772e4c702ecd7d4d4d8df254c4bef2a)
- Combined Ignores [`4873b5c`](https://github.com/thkruz/keeptrack.space/commit/4873b5cbafef878600ec8b80976b7e328ac37ed8)
- My ignores [`89cad39`](https://github.com/thkruz/keeptrack.space/commit/89cad39e8f57ab6dd4a3338f8b0cecad0710204e)
- footer menu fix (SEE LINE COMMENT 2148 UI.JS ) [`72988b2`](https://github.com/thkruz/keeptrack.space/commit/72988b270be032fb071f790ff94b1f07bce8c157)
- Fixed github.io [`5b29a7c`](https://github.com/thkruz/keeptrack.space/commit/5b29a7c76943bb18e6460754ed11446259e35b92)

#### [v1.19.3](https://github.com/thkruz/keeptrack.space/compare/v1.18.3...v1.19.3)

> 17 August 2020 

- mesh cleanup [`1de8689`](https://github.com/thkruz/keeptrack.space/commit/1de868915024a95ff432cc3b9cf902d45d6c80dd)
- Merged sun.js and earth.js [`a92e8c7`](https://github.com/thkruz/keeptrack.space/commit/a92e8c725f652fed6fb77f58ee38c7732536604c)
- meshManager implemented! [`45c54bf`](https://github.com/thkruz/keeptrack.space/commit/45c54bf7a85a5bf834411c670a5e2e6c019d9165)
- Updates for limitedUI [`b1b851f`](https://github.com/thkruz/keeptrack.space/commit/b1b851ff6d8dd5f46d1f1ec429493ccd6b89212e)
- Mobile resizing and width calculation ignoring scroll bar fixed [`f8435ca`](https://github.com/thkruz/keeptrack.space/commit/f8435ca7540d9097f7c290e98568052d8c4107f7)
- Better mobile device detection and canvas resize locking #154 [`40c5d47`](https://github.com/thkruz/keeptrack.space/commit/40c5d47e7ab736ac9e28c65ebbbc95f163c68629)
- Remove debug comments [`b9398f4`](https://github.com/thkruz/keeptrack.space/commit/b9398f41719a63f02714540024077fe47411c18b)
- Update README.md [`118ff77`](https://github.com/thkruz/keeptrack.space/commit/118ff776f78781e988757679e92610b1c883c16f)
- Updated preview image. [`7f139ce`](https://github.com/thkruz/keeptrack.space/commit/7f139ce74501a5daf386e4e788e4371d7ae70a40)
- Fixed issue with satellite shaders too small until zoom changes [`b0c8b1c`](https://github.com/thkruz/keeptrack.space/commit/b0c8b1c42a5f933dc5b771fb46b8275cd4fd6d15)
- Fixed bug that kept reloading previous sensor even after clearing it [`ca923f4`](https://github.com/thkruz/keeptrack.space/commit/ca923f406648a6e8f6930467f8b4b09afb131576)
- Update README.md [`502b3c5`](https://github.com/thkruz/keeptrack.space/commit/502b3c51087ccd0d18ecbef0e8abfef94c45674a)
- Update README.md [`f6e8e79`](https://github.com/thkruz/keeptrack.space/commit/f6e8e7962d00f6aab7b4304bafdaa4d96338831b)
- timeManager file rename [`7e992bf`](https://github.com/thkruz/keeptrack.space/commit/7e992bfc655bafbfdc00280bb7b6766660c4511a)

#### [v1.18.3](https://github.com/thkruz/keeptrack.space/compare/v1.17.0...v1.18.3)

> 15 August 2020 

- Added constellations [`#151`](https://github.com/thkruz/keeptrack.space/pull/151)
- meshManager added with 3d satellite [`9adda07`](https://github.com/thkruz/keeptrack.space/commit/9adda0709e41481edb8a19fd69cb70739599248e)
- Panning controls implemented [`2b5e84d`](https://github.com/thkruz/keeptrack.space/commit/2b5e84d7e912d2d3b68da2e0b5979e17987b2119)
- Cleaned up settings manager [`c317dff`](https://github.com/thkruz/keeptrack.space/commit/c317dff37ccf8ab51fa4712366bcaf6905efc7de)
- Shader improvements, bump maps, specular lighting [`15d0da6`](https://github.com/thkruz/keeptrack.space/commit/15d0da667dca342baed48bddbb07e9f3f7afa7bf)
- Update index.htm [`f9924b8`](https://github.com/thkruz/keeptrack.space/commit/f9924b885290de544d6f8ef25f2c3ee942a4359c)
- response update [`4935833`](https://github.com/thkruz/keeptrack.space/commit/4935833f9e9ee64bd18fb8662b02e1a818ffb17f)
- Limited UI Enhancements [`680a00c`](https://github.com/thkruz/keeptrack.space/commit/680a00c3153af5c0ff4e8f1074d04be54047cdf8)
- response updates [`383bf71`](https://github.com/thkruz/keeptrack.space/commit/383bf7167525233a413ce8187ef16d761b8579f1)
- Made analytics only turn on when on keeptrack.space #141 [`bc0ec6c`](https://github.com/thkruz/keeptrack.space/commit/bc0ec6c66b7f6eba069a9c4dbd241a3827d4d0a4)
- Local rotation implemented [`914981a`](https://github.com/thkruz/keeptrack.space/commit/914981af8caf04f8af98293d8dc7d6e2a90a8098)
- Removed background forced coloring [`eed7a72`](https://github.com/thkruz/keeptrack.space/commit/eed7a72c3115390d903b372c58f2c593216043d6)
- Github Version [`4a8ff78`](https://github.com/thkruz/keeptrack.space/commit/4a8ff788a935e66fb126f3c1cabf5eabf07c1b1c)
- footer menu fix (SEE LINE COMMENT 2148 UI.JS ) [`fbf5bf4`](https://github.com/thkruz/keeptrack.space/commit/fbf5bf4df5391bd7467078f75ca1fe47d08abdf4)
- Typos in constellations [`3c713e6`](https://github.com/thkruz/keeptrack.space/commit/3c713e6e92363c6884e1d285411a1cbf6bdb6ae1)
- Typos in constellations [`5c0ade7`](https://github.com/thkruz/keeptrack.space/commit/5c0ade7980f182286cc3a94a273964a68e5a3f86)
- Fixed bug with time drifting backwards. [`03b301f`](https://github.com/thkruz/keeptrack.space/commit/03b301fa4f0ab42195aec8f16630630627ea568e)
- Fixed typo [`f3c8bdc`](https://github.com/thkruz/keeptrack.space/commit/f3c8bdcc808f0214a2c2dc09cb72677d16cd97f5)
- Removed comma [`8243d0a`](https://github.com/thkruz/keeptrack.space/commit/8243d0ab709a15b3ca8e1af6cb27ceefaa266ae6)

#### [v1.17.0](https://github.com/thkruz/keeptrack.space/compare/v1.11.2...v1.17.0)

> 14 August 2020 

- Atmosphere, performance improvements, and embed support. [`ab10303`](https://github.com/thkruz/keeptrack.space/commit/ab1030354d96c123e0241ef3fc4856b7de4ebe6b)
- Atmosphere, Time Machine, and Optional Modules System [`dffd8b7`](https://github.com/thkruz/keeptrack.space/commit/dffd8b77961f54faa9d9a36aae68094bdfa1b643)
- Added Sun, Moon, and install directory settings [`43f0b45`](https://github.com/thkruz/keeptrack.space/commit/43f0b45a708e1840570b7f548cdcbe7a0e5602bc)
- Remove Sat Class. Add French SLBM. Fix TruSat Map. [`ddfde20`](https://github.com/thkruz/keeptrack.space/commit/ddfde20f12099c23cb05ef8b3184a194d69fb1f3)
- Better shaders [`cff48d8`](https://github.com/thkruz/keeptrack.space/commit/cff48d801bb704c0a0631d74755ef25b08431cfd)
- Better shaders [`97b7ab0`](https://github.com/thkruz/keeptrack.space/commit/97b7ab0fe3789e37ec81f079415e27d3efde196c)
- Search and Socrates bug fixes. [`96c9e86`](https://github.com/thkruz/keeptrack.space/commit/96c9e8615b6dfd2dd34b2b5454c81e943a27fdf9)
- Local to utc fixed in lookangles formatting [`279fc89`](https://github.com/thkruz/keeptrack.space/commit/279fc894eb9cc48d69b8121753a66f38739df02d)
- updateURL overhaul [`4b29954`](https://github.com/thkruz/keeptrack.space/commit/4b29954ba7ea9ad2eda6dab168d0e79789104d8a)
- Fixed install directory code [`eef18e0`](https://github.com/thkruz/keeptrack.space/commit/eef18e03b9059a70da008639d7584b7c6d3b8d18)
- Hi-Res Screenshots [`700acb4`](https://github.com/thkruz/keeptrack.space/commit/700acb4083c8ebc6555a48b0a13f9f3f01528382)
- Submarine settings in MissileManager [`7d575ea`](https://github.com/thkruz/keeptrack.space/commit/7d575ead32d8f48d1ab1167e67cd32fc8c76b17f)
- satellite.satSensorFOV [`017a192`](https://github.com/thkruz/keeptrack.space/commit/017a192dbace2da7b2f01e33e2ed6a4616fb66b1)
- get parameters updated to use date variable [`cd93c4c`](https://github.com/thkruz/keeptrack.space/commit/cd93c4c211e1637ea8eeaeed7cda1ad577a4cb52)
- sat-cruncher error catching [`0f3ceb5`](https://github.com/thkruz/keeptrack.space/commit/0f3ceb5ba0e8bb9008c2621e758f0030dcc3eefc)
- Notify of color scheme changes [`1a59807`](https://github.com/thkruz/keeptrack.space/commit/1a5980734272cb4a34e0cb1efd4e286aa9ecda9b)
- github.io Compatibility [`b35a9c4`](https://github.com/thkruz/keeptrack.space/commit/b35a9c4fb92115a25ba0868afa36db7372416b85)
- Dynamic missile apogee added. [`6326af7`](https://github.com/thkruz/keeptrack.space/commit/6326af7dd7af8aefbce5b99f5ca75c45425a7e83)
- MissileManager updates [`bde5007`](https://github.com/thkruz/keeptrack.space/commit/bde5007967334a34bd3acf8f4a1a18a069f0d161)
- Dynamic install location code. [`19a8d6f`](https://github.com/thkruz/keeptrack.space/commit/19a8d6f4deead908b6ded9322ab64df07a0e3228)
- Debris only and photo button [`2468787`](https://github.com/thkruz/keeptrack.space/commit/2468787b62e93b537e4f56c6d1448077b3781bd2)
- Match protocol for colorbox [`452fa38`](https://github.com/thkruz/keeptrack.space/commit/452fa387f9a0b7a897bc2fe4b472be1a387443d1)
- TruSat Correction [`ee1dbe2`](https://github.com/thkruz/keeptrack.space/commit/ee1dbe260fc753b23d03760ae407566cb1ef8eab)
- Remove logging [`4e99664`](https://github.com/thkruz/keeptrack.space/commit/4e996645389f0e843bee28bd053ffe3c7883b230)
- Remove .min reference [`fca4f57`](https://github.com/thkruz/keeptrack.space/commit/fca4f572b387352ccba233e74164871c46a47888)

#### [v1.11.2](https://github.com/thkruz/keeptrack.space/compare/v1.10.1...v1.11.2)

> 2 June 2020 

- Bugfixes and persistent sensor. Fixes #138 [`#138`](https://github.com/thkruz/keeptrack.space/issues/138)
- CSO Search added. Group colorscheme fixed. [`9cc7137`](https://github.com/thkruz/keeptrack.space/commit/9cc7137bad65f245881364ba1fa85e9903600938)
- lookangles.js reorganized [`dfae3e8`](https://github.com/thkruz/keeptrack.space/commit/dfae3e882483cca662f4a3cac07c7381571fbdf9)
- Code cleanup [`fcc8d20`](https://github.com/thkruz/keeptrack.space/commit/fcc8d2079c4a20141ba849e6ab490a419ec0ac42)
- Best pass times calculator [`dc91b13`](https://github.com/thkruz/keeptrack.space/commit/dc91b133fe1b42c9d8b1d686c41410e25e41d95e)
- Fix issue #137 [`0a0e853`](https://github.com/thkruz/keeptrack.space/commit/0a0e853102579f13fd276c19598ce6acba912c74)
- Age of Elset colorscheme added [`e56a537`](https://github.com/thkruz/keeptrack.space/commit/e56a537e579f2a37404bc1a83f80a032e59b063d)
- Fix screen recorder and rise/set lookangles [`53b0bcf`](https://github.com/thkruz/keeptrack.space/commit/53b0bcfe57d1d0f5adbf9d01a1c1f69a2c85c954)
- Search slider update [`671cea9`](https://github.com/thkruz/keeptrack.space/commit/671cea9df5948fe0f9ba0590b1e5b84aa81791f2)
- Delete todo-issues.yml [`4304ccb`](https://github.com/thkruz/keeptrack.space/commit/4304ccbf484a4eeecab50c878bef4be342dd6a87)
- Create todo-issues.yml [`e85749c`](https://github.com/thkruz/keeptrack.space/commit/e85749cc107ff3afe01defa87c78e9a435e98c80)
- Test todo bot [`c4e1ecf`](https://github.com/thkruz/keeptrack.space/commit/c4e1ecf2e54173ad34d8b600369b49050eb1ac78)
- Delete to-do-to-issues.yml [`e8067fb`](https://github.com/thkruz/keeptrack.space/commit/e8067fb1640e2f6ffc32e838cbbf7cc2f09c5496)
- Update todo-issues.yml [`8a7c4f2`](https://github.com/thkruz/keeptrack.space/commit/8a7c4f277f11d6d36c38d0b43096740051aabb29)

#### [v1.10.1](https://github.com/thkruz/keeptrack.space/compare/v1.9.3...v1.10.1)

> 21 May 2020 

- jQuery update and removed depricated references [`ae42ec3`](https://github.com/thkruz/keeptrack.space/commit/ae42ec337dbc00955ce351eb42c85893ff8c48a2)
- Next Launch Manager added to solve #97 [`6c23270`](https://github.com/thkruz/keeptrack.space/commit/6c23270bf895ffd6ea3f73e27509f135b34caf23)
- Cleanup TODO comments [`8ba0601`](https://github.com/thkruz/keeptrack.space/commit/8ba06019d44a842a248d50b427685bc9ea290995)
- Decayed satellite checks [`2892497`](https://github.com/thkruz/keeptrack.space/commit/289249763205f24b66fef6a926531ca1c629d5a1)
- Create Linter [`fa2d075`](https://github.com/thkruz/keeptrack.space/commit/fa2d07506b1a8b5caa66a39180ddf4a254411628)
- is-website-vulnerable [`53741a6`](https://github.com/thkruz/keeptrack.space/commit/53741a6a5b2500d1632884b830e72913ab5befbd)
- Create to-do-to-issues.yml [`f99be8f`](https://github.com/thkruz/keeptrack.space/commit/f99be8f5e7c72fd2058f6321d27b0c9c600094f1)
- jQquery 3.5.1 update [`829d391`](https://github.com/thkruz/keeptrack.space/commit/829d391cfe3673f465b514a215ca1aae6a2515f7)
- Update README.md [`7b28b01`](https://github.com/thkruz/keeptrack.space/commit/7b28b01975df4e367a9dcc20cf3e2abbabfea0c1)
- Update README.md [`cc5f808`](https://github.com/thkruz/keeptrack.space/commit/cc5f808575431e9e5130848deadb5a021c67c8e3)

#### [v1.9.3](https://github.com/thkruz/keeptrack.space/compare/v1.8.0...v1.9.3)

> 10 May 2020 

- Red theme fixes #125 [`#125`](https://github.com/thkruz/keeptrack.space/issues/125)
- Dynamic object colors and color picker in settings [`f252b6a`](https://github.com/thkruz/keeptrack.space/commit/f252b6ae5d7b51fc23e608f4c3313dbd7f13d169)
- SatChng Menu and fixed multiple TODOs [`db79766`](https://github.com/thkruz/keeptrack.space/commit/db79766fb5852a2f80be9b172b758b53dedf81d4)
- Clean lookangles and multisitelooks. Add catalog exports. [`be6e622`](https://github.com/thkruz/keeptrack.space/commit/be6e6226281ae18daf78c10823e9b9de571d5281)
- Cleanup file organization [`0ae278f`](https://github.com/thkruz/keeptrack.space/commit/0ae278f186c5c34b11f4774e7ea78ef85955a602)
- Cleanup file organization [`dc1fd67`](https://github.com/thkruz/keeptrack.space/commit/dc1fd6772de28685f4ac9864bb50e6bfdae378c3)
- Cleanup minor syntax errors [`a663560`](https://github.com/thkruz/keeptrack.space/commit/a663560394d5a44f0551b9cb741a534aff93ce05)
- Add debugging mode [`14851c7`](https://github.com/thkruz/keeptrack.space/commit/14851c79cc5bbce7e7c052a494f81ea6917f03a7)
- Dynamic mobile mode [`0918261`](https://github.com/thkruz/keeptrack.space/commit/0918261d92b8db5fe2b08c4a473a269b68705981)
- Force Cache Refresh [`f83b351`](https://github.com/thkruz/keeptrack.space/commit/f83b351c16727a5c2692a1e259588f1fa4469ba3)
- Analyst Satellite Fixes [`ed9c228`](https://github.com/thkruz/keeptrack.space/commit/ed9c2288cc5b5ce62653a11eb353cdee4aadc8ce)
- Update README.md [`d33a697`](https://github.com/thkruz/keeptrack.space/commit/d33a6978f6ea3cf87a7ab2e4515429108acacbfb)
- Sensor parameter fixes. [`bafd7e4`](https://github.com/thkruz/keeptrack.space/commit/bafd7e4ed51a3c67c821f532bdc170eae6ceacea)
- Merge [`b6a92e3`](https://github.com/thkruz/keeptrack.space/commit/b6a92e33a8510a5f9a37175b8afbee661330e545)
- Update README.md [`e6eecea`](https://github.com/thkruz/keeptrack.space/commit/e6eeceae392280788eb96c097c4946251b15b7a0)
- Update README.md [`7e90c2f`](https://github.com/thkruz/keeptrack.space/commit/7e90c2f16d71b164bf2d670d7afdabfe26174dcc)
- Update README.md [`65add89`](https://github.com/thkruz/keeptrack.space/commit/65add89ecd37c0821f7cab3382a292049f428e2d)
- Update README.md [`f2cd64a`](https://github.com/thkruz/keeptrack.space/commit/f2cd64a01611b01451f3801f4cec3504ab090c44)

#### [v1.8.0](https://github.com/thkruz/keeptrack.space/compare/v1.5.1...v1.8.0)

> 9 May 2020 

- fix JS math expression [`#123`](https://github.com/thkruz/keeptrack.space/pull/123)
- Bug fixes. [`56f8ba4`](https://github.com/thkruz/keeptrack.space/commit/56f8ba4304621e08a1ac6c4c00a5c33a615b4cf9)
- Visual Magnitudes for satellites. Right Click Menu Changes. [`970a12a`](https://github.com/thkruz/keeptrack.space/commit/970a12a72d54034087c4352541710d8265686e3c)
- Dynamic object colors and color picker in settings [`cfd7749`](https://github.com/thkruz/keeptrack.space/commit/cfd774976930c63efb81579fa5c5b7cbfe9e2479)
- Stars Updates, Earth Map Adds, and Breakup/New Launch Fixes [`375b743`](https://github.com/thkruz/keeptrack.space/commit/375b743545683564873eb86837cf119b2f79412e)
- Additional Map options from the right click menu. [`63de5cd`](https://github.com/thkruz/keeptrack.space/commit/63de5cd614693b075b44d396f1c91b577d13dfa1)
- TruSat tie-in [`0794955`](https://github.com/thkruz/keeptrack.space/commit/07949554e9e59a8578434917e99c898e820a1ef6)
- TruSat Integration Update [`2d6dce2`](https://github.com/thkruz/keeptrack.space/commit/2d6dce2a8a86adae3259b260401436ae47e25a55)
- Keep last map settings on reload. [`7c19566`](https://github.com/thkruz/keeptrack.space/commit/7c195662f361dd31050cd29ed9f60ba6b54ef456)

#### [v1.5.1](https://github.com/thkruz/keeptrack.space/compare/v1.2.6...v1.5.1)

> 13 January 2020 

- Updated video recording (now includes UI) and added sunlight view [`d642002`](https://github.com/thkruz/keeptrack.space/commit/d64200274db9b72adee5ef8e64a08c161ac5fcde)
- Added Video Recorder [`583a912`](https://github.com/thkruz/keeptrack.space/commit/583a91277b2d719a7d4bf7f3cc20e326590bb8bd)
- IE bug fixes [`86757e2`](https://github.com/thkruz/keeptrack.space/commit/86757e254ddce2a62319c6f99ccb4330f2f85047)
- Reduced position calculations. [`b2a2293`](https://github.com/thkruz/keeptrack.space/commit/b2a2293044cfacab2ecee8303c5765ce8ba32bbd)

#### [v1.2.6](https://github.com/thkruz/keeptrack.space/compare/v1.2.4...v1.2.6)

> 14 June 2019 

- Reorganized Files [`0264b78`](https://github.com/thkruz/keeptrack.space/commit/0264b7892a9e938bca42296f13bf35b786aebada)
- Improved Responsive UI/CSS [`af8b526`](https://github.com/thkruz/keeptrack.space/commit/af8b52683aeb6b52b93d96a95d13591ada1e2cb7)
- Added Launch Sites [`905675d`](https://github.com/thkruz/keeptrack.space/commit/905675d28daa53831f05dbf980aa2b1cb0f7699b)
- Updated social links. [`3526d27`](https://github.com/thkruz/keeptrack.space/commit/3526d2778b941bae00370580db994edc2c0e0baa)

#### [v1.2.4](https://github.com/thkruz/keeptrack.space/compare/v1.2.2...v1.2.4)

> 14 June 2019 

- Added Constellations [`2ece33a`](https://github.com/thkruz/keeptrack.space/commit/2ece33adae5231160d180fc42d28cda5c015486f)
- drawLoop Fix [`dd2470e`](https://github.com/thkruz/keeptrack.space/commit/dd2470e0fb67a7714f29a148e4cda08de47b9664)
- drawLoop Fix [`8cc76ac`](https://github.com/thkruz/keeptrack.space/commit/8cc76ac55e459cd0ea3ce7c185d43d8e49c89c71)

#### [v1.2.2](https://github.com/thkruz/keeptrack.space/compare/v1.1.1...v1.2.2)

> 10 June 2019 

- Improved Stars and Constellations [`a54785b`](https://github.com/thkruz/keeptrack.space/commit/a54785b6a018ce5c6e782553f4872603d95e05f6)
- Stars and Constellations [`27ece8f`](https://github.com/thkruz/keeptrack.space/commit/27ece8f690e5b23f38f9a29d267048ecdaa36264)
- Astronomy View Improvements [`6d9c7cc`](https://github.com/thkruz/keeptrack.space/commit/6d9c7cc143945eb60b4dec6f62ed760132e539eb)

#### [v1.1.1](https://github.com/thkruz/keeptrack.space/compare/v1.0.0...v1.1.1)

> 5 June 2019 

- Fixes for offline mode. [`6290320`](https://github.com/thkruz/keeptrack.space/commit/6290320ece7af06e23351e073cbfc88694876e6c)
- Support for Mike McCant's TLEs [`b45a583`](https://github.com/thkruz/keeptrack.space/commit/b45a583ef791ea2e53ed5c375ee6bcb2a316ac89)
- Delete .gitignore [`287a5f7`](https://github.com/thkruz/keeptrack.space/commit/287a5f71c19568145f3b99301d3f2a1b32f8d8f4)
- Delete .htaccess [`dadb66a`](https://github.com/thkruz/keeptrack.space/commit/dadb66a9e524da3589006aeb4621ca567a8686e5)
- Cross-browser support for satbox-info [`06b7f61`](https://github.com/thkruz/keeptrack.space/commit/06b7f61a1a0fe257d1d2ad01f76a0d71a239dcb4)
- Delete .gitattributes [`b150a40`](https://github.com/thkruz/keeptrack.space/commit/b150a4017ddb282ffa65386a38e82b54b2211f14)
- Offline bugfix [`24b2015`](https://github.com/thkruz/keeptrack.space/commit/24b201570af636d856037933cf0b55bea9aea5ca)
- License Typo [`20a42fa`](https://github.com/thkruz/keeptrack.space/commit/20a42fa878edd8a2acfa77c764586da822a2b6c9)
- Remove some files. [`8c5410c`](https://github.com/thkruz/keeptrack.space/commit/8c5410cded10cb90b3ffc5a601ce39bf42565bf6)
- Delete .jshintrc [`246ef1e`](https://github.com/thkruz/keeptrack.space/commit/246ef1ef065b3d05e45d7cef48cd418e64443fed)
- License Typo [`d6d488f`](https://github.com/thkruz/keeptrack.space/commit/d6d488f3782bfe8eb294cb87227320a5dbb446c6)

### [v1.0.0](https://github.com/thkruz/keeptrack.space/compare/v0.48.2...v1.0.0)

> 5 June 2019 

- License System Implemented [`b013779`](https://github.com/thkruz/keeptrack.space/commit/b0137792f09c6b68077dc5bf43d06bc2ea7a9396)
- DOP Table Added [`f5f0bb8`](https://github.com/thkruz/keeptrack.space/commit/f5f0bb890d99e4eba3ab76d3828972121acd2691)
- Small Bugfixes [`80c5b32`](https://github.com/thkruz/keeptrack.space/commit/80c5b3288b9fe34a9b5f655ca862bd1ff554140f)
- Update README.md [`7acee49`](https://github.com/thkruz/keeptrack.space/commit/7acee490aba4bedff5b9bf829d78ebaf7ffa9a4d)
- Removed offline scripts. [`97511ae`](https://github.com/thkruz/keeptrack.space/commit/97511ae21ac69a3feed20df17b7e5bc1fcea1bb4)
- Delete keeptrackPreview.jpg [`de79e02`](https://github.com/thkruz/keeptrack.space/commit/de79e02e9bb36fa9e915f85881c96ca9a5addc36)
- Delete dayearth-10800.jpg [`bcb0793`](https://github.com/thkruz/keeptrack.space/commit/bcb0793eaa55fc38775e744c6946c279e50c6ca4)
- Delete dayearth-43200.jpg [`118adb8`](https://github.com/thkruz/keeptrack.space/commit/118adb8a0559f86d934e88317521efc29a127613)
- Delete 6_night_16k.jpg [`b94030e`](https://github.com/thkruz/keeptrack.space/commit/b94030e7705aaba5358bce073f29a40c23f1cd7d)
- Delete 2_earth_16k.jpg [`92de683`](https://github.com/thkruz/keeptrack.space/commit/92de6836b258a65606b34dd9d0ae7dab8bdd95c5)

#### [v0.48.2](https://github.com/thkruz/keeptrack.space/compare/v0.48.1...v0.48.2)

> 31 May 2019 

- PDOP function finished [`41ed04a`](https://github.com/thkruz/keeptrack.space/commit/41ed04af20155c7580d3757b4a76087d3159c31c)
- Started PDOP Calculator [`be0eeda`](https://github.com/thkruz/keeptrack.space/commit/be0eeda1a0ebcb33319c5713386a7da6b76f7da0)

#### [v0.48.1](https://github.com/thkruz/keeptrack.space/compare/v0.42.7...v0.48.1)

> 22 May 2019 

- Surveillance and FOV Bubble modes. [`a69043b`](https://github.com/thkruz/keeptrack.space/commit/a69043b7d8a68afb6f2eb51ad4b25cb115f4a190)
- Right Click Menu Added [`b78eead`](https://github.com/thkruz/keeptrack.space/commit/b78eead2a58f681782abce92c16816d4098094c7)
- Enabled multisat satoverfly mode. Minor UI fixes. [`6539209`](https://github.com/thkruz/keeptrack.space/commit/65392098542990c2d852f4fb1787cd1d368959ff)
- Partial undo of IE11 Fix. [`00e02be`](https://github.com/thkruz/keeptrack.space/commit/00e02beca370e972b681d694b2919a4a090c4e13)

#### [v0.42.7](https://github.com/thkruz/keeptrack.space/compare/v0.36.1...v0.42.7)

> 6 October 2018 

- Performance Updates [`b6e952b`](https://github.com/thkruz/keeptrack.space/commit/b6e952b61627d79e754c07ded18988cb5933511b)
- Bug Fixes [`f253a5c`](https://github.com/thkruz/keeptrack.space/commit/f253a5cc4f23d0f74e89814cb7b3dbf130f30687)
- Updated Libraries. [`bf2cac7`](https://github.com/thkruz/keeptrack.space/commit/bf2cac7e365d47f62756d5d5ebd9de5fdeb055d2)
- Moved group creation to a web worker and drastically increased load time [`f357888`](https://github.com/thkruz/keeptrack.space/commit/f357888134408792e936d7def9596a74d9a48e25)
- More Performance Updates [`c32c473`](https://github.com/thkruz/keeptrack.space/commit/c32c4732a16fc2d6a17a10028771e071f14af97c)
- Fixed group creation and coloring. [`d7cf34d`](https://github.com/thkruz/keeptrack.space/commit/d7cf34d8b2ff6b638360bd111e5ff98780ecadb7)
- Fixed group-cruncher bugs + added performance scaling for sat-cruncher. [`78d8000`](https://github.com/thkruz/keeptrack.space/commit/78d80005db66e13a28b2f729eda587bfe79d9ab0)
- Performance Improvements [`6b7aa37`](https://github.com/thkruz/keeptrack.space/commit/6b7aa37bd017591957ccd077cdd90b5263f2bdcf)
- Performance Improvements [`e6b5e45`](https://github.com/thkruz/keeptrack.space/commit/e6b5e45242301750264ddc8f8222b620d9a6cadc)
- Planetarium view bug fixes. [`3b5c915`](https://github.com/thkruz/keeptrack.space/commit/3b5c9152a793e0e4b43c76d8b4254b840885cfce)
- Added satellite overfly options. [`8447c66`](https://github.com/thkruz/keeptrack.space/commit/8447c66735a11acbf37166367afb76b88b84600f)
- Added satellite overfly options. [`693c3de`](https://github.com/thkruz/keeptrack.space/commit/693c3de27176f1e25b93723c594ba5dea4fecc33)
- Fixed infinite loop in mobile.hidesearch [`f9a7fe0`](https://github.com/thkruz/keeptrack.space/commit/f9a7fe0e195eb3dbf81d75332076781794b425e0)
- Low Performance Mode [`b9e27c6`](https://github.com/thkruz/keeptrack.space/commit/b9e27c6f4a171de3a13775a0e2e028b2ce2b1ccf)
- Reducing performance hit on recoloring [`74fedf5`](https://github.com/thkruz/keeptrack.space/commit/74fedf5e4d6588ca72c7d0c8c71297768f5da934)
- Fixed missile conflicts with new markers [`b9626c5`](https://github.com/thkruz/keeptrack.space/commit/b9626c5203d622dd58b3b0eef303776099b01f99)
- Downgraded unneeded Float32Array to Int8Array [`b6329e4`](https://github.com/thkruz/keeptrack.space/commit/b6329e4ccefb3c2a9305d20072c60430f4c8b9d0)
- Fixed issue with single click on mobile. [`b90a2ba`](https://github.com/thkruz/keeptrack.space/commit/b90a2ba781cd938ae7a04a5dc5aa39220b383e59)
- Less DOM Creation [`d514437`](https://github.com/thkruz/keeptrack.space/commit/d514437c150e19b41a4405eff4ad3e6e6b5e8f74)
- Fixed bug in satcruncher related to satellite overfly. [`f097d4b`](https://github.com/thkruz/keeptrack.space/commit/f097d4bb464e4e1d6816429b3099048ba813c2e2)
- IE11 Bugfix. [`3ddcf53`](https://github.com/thkruz/keeptrack.space/commit/3ddcf53f959ad17a5af874131d36412ec605fff1)
- Bugfix for mobile. [`fc3d862`](https://github.com/thkruz/keeptrack.space/commit/fc3d8629908e66b2f3c23ff747f1a154381e451b)
- Update version number [`53ae857`](https://github.com/thkruz/keeptrack.space/commit/53ae85791997d3d758a014bf680b6f57620ddfb4)
- SatCruncher ignore markers unless enabled. [`8809b4e`](https://github.com/thkruz/keeptrack.space/commit/8809b4e2614c4e06a4e472340ebe41a0a43179cf)
- Ignore markers unless enabled during satSet.draw [`d71623a`](https://github.com/thkruz/keeptrack.space/commit/d71623a243cc0ead7eb194caf9c10c9631ff861d)
- Canvas bugfix. [`6665358`](https://github.com/thkruz/keeptrack.space/commit/666535840ede09c15cd49bbf97e5f718cf907c6e)
- Update Version [`cf59961`](https://github.com/thkruz/keeptrack.space/commit/cf599611cf4ff9e529540dd7f4cd376e529520ea)

#### [v0.36.1](https://github.com/thkruz/keeptrack.space/compare/v0.34.0...v0.36.1)

> 12 August 2018 

- Reworked mobile controls and consolidated html files. [`e7b427a`](https://github.com/thkruz/keeptrack.space/commit/e7b427ad73367330380b9ab561e59fb8b51677bc)
- Reworked mobile controls and consolidated html files. [`42bf145`](https://github.com/thkruz/keeptrack.space/commit/42bf145f07a8e94d64e0b38a26a35b8e5de736e2)
- SOCRATES fixed. Border added to menus. [`9933643`](https://github.com/thkruz/keeptrack.space/commit/993364308cba7d6b8199f11bedb52001eb760412)
- ESA sensors added. Mobile CSS improved. [`e2e4658`](https://github.com/thkruz/keeptrack.space/commit/e2e465898dc4e2430e86f65c2e9fc620889ca1e2)
- Improved mobile UI [`b3fe464`](https://github.com/thkruz/keeptrack.space/commit/b3fe464ed31019194c183633cb02f8caeba22651)
- Sat Label and Demo Modes added. New HiRes images. [`69938ab`](https://github.com/thkruz/keeptrack.space/commit/69938abd31b37d0391f8ec0460eccf28dab9a018)
- Moved colorscheme to a side menu. [`459d024`](https://github.com/thkruz/keeptrack.space/commit/459d0245e9d8a83056b88d92be5a45cdf624a8c6)
- Added Sensor FOV Bubbles [`f8b947d`](https://github.com/thkruz/keeptrack.space/commit/f8b947d4c56ff957469b843b177a59568ddf621a)
- Countries color scheme added. [`e99ceea`](https://github.com/thkruz/keeptrack.space/commit/e99ceea17ce0cc56ae4be0a60432277ca0d0a815)
- Consolidated legend menu changes. [`1258164`](https://github.com/thkruz/keeptrack.space/commit/12581648fa17013cc54ca6d93c15b30c5499f000)
- Moved colors from color-scheme to settingsManager. [`e141d59`](https://github.com/thkruz/keeptrack.space/commit/e141d592b3d4ce64f8f68d1378131cdad027d9f9)
- Consolidated files. [`c4d361e`](https://github.com/thkruz/keeptrack.space/commit/c4d361eb09fe97b2404417f6eb113ed28dfc4f7e)
- New loading screen, slimmer ui, and mobile controls. [`0be3067`](https://github.com/thkruz/keeptrack.space/commit/0be3067725350d163f8fee5afe1dd3bf796084f5)
- Fullscreen mobile interface. [`5b15f3f`](https://github.com/thkruz/keeptrack.space/commit/5b15f3f9c057cef26b2ed6ad600b2fc0e50f45d4)
- Fixes to date picker and mobile menus. [`f5a212e`](https://github.com/thkruz/keeptrack.space/commit/f5a212e6bb90253f1dd4f27dcc96d15b9787d142)
- Fixed bugs in satinfobox menu. [`5812b37`](https://github.com/thkruz/keeptrack.space/commit/5812b37393586d86f3ee4ce5aa22e29800378049)
- Fixed minor UI issues with Multi Sensor menu. [`1b4bd0e`](https://github.com/thkruz/keeptrack.space/commit/1b4bd0e51afe70e5b1136a18815fd77c29446f9c)
- Fixed bug with 2D map resizing on mobile. [`70d4e46`](https://github.com/thkruz/keeptrack.space/commit/70d4e46db0fcdcb3161e5a76019e591fb248d67c)
- UI Updates [`9957d83`](https://github.com/thkruz/keeptrack.space/commit/9957d83eaa12d100c8bb1ec81012cd6cea43e0e3)
- Fixed bug with bottom menu. [`59d0565`](https://github.com/thkruz/keeptrack.space/commit/59d0565b9dda189ab641c6fa3298071f4c3ea22e)
- Fixed mobile touch sensitivity. [`8baac10`](https://github.com/thkruz/keeptrack.space/commit/8baac10a46b7da908c35d7e33141ae31ee345c78)
- Fixed desktop movement and legend color toggles. [`ad04257`](https://github.com/thkruz/keeptrack.space/commit/ad0425764313038d7ad21187a9e7d639e4182bf4)
- Fixed bug with launch facilities not displaying full names. [`90f244a`](https://github.com/thkruz/keeptrack.space/commit/90f244a78ee9ce572c5f1fea883b2e0272f5753e)
- Better caching prevention. [`b54e0d0`](https://github.com/thkruz/keeptrack.space/commit/b54e0d0b2986389918bba26194d0c88f9b96213d)
- Fixed scroll on bottom icons when mobile. [`f95e773`](https://github.com/thkruz/keeptrack.space/commit/f95e7733c470515614e94d901ad93c2a3048cf36)
- Variable sized fragment shaders [`4eff43b`](https://github.com/thkruz/keeptrack.space/commit/4eff43b2c86079863e4f888412c622b8342de2f8)
- Better hires images. [`a15bf29`](https://github.com/thkruz/keeptrack.space/commit/a15bf29646066d1eec3a0ab9b5cf7a7409eb4ba5)
- Fixed bug that crashes multitouch on mobile. [`5733aec`](https://github.com/thkruz/keeptrack.space/commit/5733aec384a94f6ec424b2cd9bbc1d5c042fac4d)

#### [v0.34.0](https://github.com/thkruz/keeptrack.space/compare/v0.33.0...v0.34.0)

> 10 August 2018 

- Fixed #89 and #90 [`#89`](https://github.com/thkruz/keeptrack.space/issues/89)
- Fixed #89 and #90 [`#89`](https://github.com/thkruz/keeptrack.space/issues/89)
- Changes to Planetarium Camera Mode. Fixed #83. [`#83`](https://github.com/thkruz/keeptrack.space/issues/83)
- Changes to Planetarium Camera Mode. Fixed #83. [`#83`](https://github.com/thkruz/keeptrack.space/issues/83)
- Fixed #81. Map settings needed updated on load. [`#81`](https://github.com/thkruz/keeptrack.space/issues/81)
- Downgraded satcruncher from satellite.js 2.0.2 to 1.3 for better speed [`13a83f7`](https://github.com/thkruz/keeptrack.space/commit/13a83f7e6db8dd4184aaaaeed4560bde85fe86bf)
- Vertex Shader can now be changed realtime. [`d2cb8e3`](https://github.com/thkruz/keeptrack.space/commit/d2cb8e3a40405ac11102203cdbdcee7a2ef4a0a7)
- Legend UI is now a toggle for satellite visibility. [`52c96c9`](https://github.com/thkruz/keeptrack.space/commit/52c96c907f99648c4d19a627d7a46c2cddc1e934)
- Added geolocation options when using https. [`d2167cb`](https://github.com/thkruz/keeptrack.space/commit/d2167cbdc56dd228ce859452ee084a4fef1599b5)
- Added license info from James Yoder/thingsinspace. [`37e722f`](https://github.com/thkruz/keeptrack.space/commit/37e722f72f1df4b1143f5abafd07ae0d5e95a55f)
- Add hires option from GET variable. [`24a3d57`](https://github.com/thkruz/keeptrack.space/commit/24a3d570c5855c3fc0a364365e769f2535b5f81d)
- Adjusted cameraType.SATELLITE movement. Q and E for rotation. [`07601d4`](https://github.com/thkruz/keeptrack.space/commit/07601d48ec54bef5aed4aaa6a5bbd9428cc09964)
- Allow passing mw, retro, vec, etc via GET instead of different filenames [`4c0b81a`](https://github.com/thkruz/keeptrack.space/commit/4c0b81ab4f4c09fbd2e8e1a29566055f4c356583)
- Update .igtignore [`09365cf`](https://github.com/thkruz/keeptrack.space/commit/09365cff6f81a36838c849e3576da7d7f8231547)
- Harder to deselect selectedsat when in satellite camera view. [`698b496`](https://github.com/thkruz/keeptrack.space/commit/698b496d16f34e6f40e742359203be415c6c1c80)
- Fixed fieldOfView code. [`54ef4c0`](https://github.com/thkruz/keeptrack.space/commit/54ef4c020f59fc9d0ca773ad082f7c3f3466ba3c)
- Fixed fieldOfView code. [`2b6708e`](https://github.com/thkruz/keeptrack.space/commit/2b6708ea64abe9787fd1157fbd9dd18ee3d0f6d6)
- Fixed fieldOfView code. [`28886d3`](https://github.com/thkruz/keeptrack.space/commit/28886d3550811c0f7afb68ea8c2b2b215c234f41)

#### [v0.33.0](https://github.com/thkruz/keeptrack.space/compare/v0.32.0...v0.33.0)

> 29 July 2018 

- Added planetarium and satellite camera views [`4ebf859`](https://github.com/thkruz/keeptrack.space/commit/4ebf859e9be34850e5b913a8ea8adf2e0b520c6a)

#### [v0.32.0](https://github.com/thkruz/keeptrack.space/compare/v0.30.7...v0.32.0)

> 14 February 2018 

- Minor fixes. [`e9ad616`](https://github.com/thkruz/keeptrack.space/commit/e9ad6161a8f6a2b9944a2a9f3977d2ee9d1b905b)
- Added an vector version of the offline version. [`30ed52c`](https://github.com/thkruz/keeptrack.space/commit/30ed52c4fd756f03224d3d8b8b87997ceb0daa53)
- Added vector image. [`4f4c4a6`](https://github.com/thkruz/keeptrack.space/commit/4f4c4a6c8ab6e2795839183a93ee2f7b5eb55a99)
- Added vector image. [`fbf7dd1`](https://github.com/thkruz/keeptrack.space/commit/fbf7dd18c014d7f332ce42c911728d3734d2d0ce)
- Fixed bug in view sats in FOV. Started multithreading SGP4. [`25518a8`](https://github.com/thkruz/keeptrack.space/commit/25518a811c0e7a113c6cbb483e8d46857aea9d30)
- Fixed timeManager.now errors and added Editor.htm [`04ed851`](https://github.com/thkruz/keeptrack.space/commit/04ed851a33058add9c74c6f2f34b1ecd2fdb482f)
- Changed offline satbox update interval. Added more optional information for offline versions. [`9669950`](https://github.com/thkruz/keeptrack.space/commit/9669950c94aa6913c8ccfe49543eaa5abf0df030)
- Planetarium Camera View Added [`5a02430`](https://github.com/thkruz/keeptrack.space/commit/5a0243015b3cc56f1da8787937cea2fff5e9b282)
- Fixed error in offline only version due to load order. [`a9fff1f`](https://github.com/thkruz/keeptrack.space/commit/a9fff1f4173a7986cb6491d1c4622ef2e929131f)
- Corrected date error in settings. [`b730de7`](https://github.com/thkruz/keeptrack.space/commit/b730de75afb7f6cca27208d7d4e39fed44762c9a)

#### [v0.30.7](https://github.com/thkruz/keeptrack.space/compare/v0.30.6...v0.30.7)

> 21 January 2018 

- Updated merging function for offline use. [`f665259`](https://github.com/thkruz/keeptrack.space/commit/f665259a7c0ae8edcf92400e1b5c2d749df0fc90)

#### [v0.30.6](https://github.com/thkruz/keeptrack.space/compare/v0.30.5...v0.30.6)

> 3 January 2018 

- Separated UI from main.js [`2295adb`](https://github.com/thkruz/keeptrack.space/commit/2295adbddb28b32134106bbf803aaf94ce4356f8)
- InView for all SSN sensors added. [`acd9da8`](https://github.com/thkruz/keeptrack.space/commit/acd9da8df57c89f987eef71b610630051ade553c)
- Fixed performance issue with sat-cruncher and overlay. [`8a59742`](https://github.com/thkruz/keeptrack.space/commit/8a59742b056f9fd3c573a14beab46aace057c1a0)
- Overlay updated to recalculate times when needed. [`cc50520`](https://github.com/thkruz/keeptrack.space/commit/cc505200f07ed3fcd51732c4374a8c9247465cdd)
- _updateOverlay causes jittering [`a051152`](https://github.com/thkruz/keeptrack.space/commit/a0511529daf113a9ad9bc665bcd2740b1175056b)
- Reduce garbage collection in sat-cruncher.js [`1a9a6eb`](https://github.com/thkruz/keeptrack.space/commit/1a9a6ebeffcd076552a0dcf7e8213d3ab9d29681)
- Fixed theme problems [`a3e93c1`](https://github.com/thkruz/keeptrack.space/commit/a3e93c1c2286a161b97bb2ac2930a9de0d3991db)
- In default view only calculate colors if inview changes. [`2a37f21`](https://github.com/thkruz/keeptrack.space/commit/2a37f2167d7b8b36c52c577fe2882a0a186381c1)
- Fixed bug with legend reseting colorscheme [`a9c8363`](https://github.com/thkruz/keeptrack.space/commit/a9c8363138e3b1881e5197c0ec381e087aab3a0b)

#### [v0.30.5](https://github.com/thkruz/keeptrack.space/compare/v0.10.0...v0.30.5)

> 28 April 2017 

- Develop [`#52`](https://github.com/thkruz/keeptrack.space/pull/52)
- Develop [`#50`](https://github.com/thkruz/keeptrack.space/pull/50)
- Develop [`#49`](https://github.com/thkruz/keeptrack.space/pull/49)
- Develop [`#48`](https://github.com/thkruz/keeptrack.space/pull/48)
- Develop [`#46`](https://github.com/thkruz/keeptrack.space/pull/46)
- Develop [`#43`](https://github.com/thkruz/keeptrack.space/pull/43)
- Develop [`#40`](https://github.com/thkruz/keeptrack.space/pull/40)
- Rise Set Lookangle Times [`8a1ab55`](https://github.com/thkruz/keeptrack.space/commit/8a1ab5584de5066701239d62309c7af84683ec8b)
- Organize [`12dcc31`](https://github.com/thkruz/keeptrack.space/commit/12dcc3125a57d4a9ebd3dc5acd815943d316116b)
- Upgraded to satellite.js 1.4.0 [`b13b232`](https://github.com/thkruz/keeptrack.space/commit/b13b2329717adc17e30932c6a457660b5bae239b)
- Separated main functions into separate files. Trying to reduce global variables and optimize each of the main functions. [`f2c7598`](https://github.com/thkruz/keeptrack.space/commit/f2c7598cc473f3db827985648ff67e9e97be4d39)
- Remove admin folder. [`1094b76`](https://github.com/thkruz/keeptrack.space/commit/1094b76f9c99b3d3a11462fc180b7bb970347b21)
- Replacing strings with single references in variable.js. Addresses issue #72 [`1426ce8`](https://github.com/thkruz/keeptrack.space/commit/1426ce8898187a66cd33926c7bd00c84f0152289)
- Fixed multisite propagation and added Cobra Dane [`61289f0`](https://github.com/thkruz/keeptrack.space/commit/61289f09e7ce10d8f82919cc985c281b435e6e49)
- Missile Generator added. [`7b67458`](https://github.com/thkruz/keeptrack.space/commit/7b674583f3947784abbd1757ece7213f9849ce39)
- Renamed internal functions. [`f2cf679`](https://github.com/thkruz/keeptrack.space/commit/f2cf679fe279d86255daf33783294a564fcc6d36)
- Minor Changes [`c9c6dff`](https://github.com/thkruz/keeptrack.space/commit/c9c6dff5208fb84637d131453e2827b7214d9845)
- Fixed some red theme problems. [`1b26f77`](https://github.com/thkruz/keeptrack.space/commit/1b26f771575e7a4c0218e3fe124ff0631b0b9dbf)
- Added Offline Version [`46ec933`](https://github.com/thkruz/keeptrack.space/commit/46ec9330c0995c7c8ce6181c349e405ca5cbfada)
- Added a retro version set to March 13, 2000. Fixed a few incorrect launch sites. [`f8f366a`](https://github.com/thkruz/keeptrack.space/commit/f8f366a8ae2f8722ee4ebe1d33547a17e9303f09)
- Added MW page to display only missiles. [`55b968f`](https://github.com/thkruz/keeptrack.space/commit/55b968fe22b5840272cd70ac1f87715014162274)
- No External Sources [`83c5c23`](https://github.com/thkruz/keeptrack.space/commit/83c5c23dc27bb4f83afd71d0ada39963c5294525)
- Material Font, SSN Lookangles, and Custom Sensors [`c61409d`](https://github.com/thkruz/keeptrack.space/commit/c61409da638e888e70dceca1c34dc229da74f96b)
- Updated ballistic missiles. [`e6a39b9`](https://github.com/thkruz/keeptrack.space/commit/e6a39b966951fc64e99f65127a9b1214cd8c9a4f)
- Added mini loading screen and touch controls for date/time picker. [`acf6972`](https://github.com/thkruz/keeptrack.space/commit/acf6972b06976ae52cfe3df4d9eea585562003d8)
- Stereographic Map and Telescopes [`ededb41`](https://github.com/thkruz/keeptrack.space/commit/ededb412a54478a9e074176af082239d5b51e207)
- Integrated lookangles.js with satellite.js. [`229ffb2`](https://github.com/thkruz/keeptrack.space/commit/229ffb23395788fe23eea8906d003ffb876a6c9d)
- Standardize variable names. [`61adacd`](https://github.com/thkruz/keeptrack.space/commit/61adacd71a326d1c785c762c2e746e2e5e884c95)
- Created timeManager and reduced jQuery calls during drawLoop. [`51d3f2d`](https://github.com/thkruz/keeptrack.space/commit/51d3f2d1fc5cf6a35e21aca1736783a73f2ba6a0)
- About Author Icon [`e7d2d91`](https://github.com/thkruz/keeptrack.space/commit/e7d2d910937c09e40b3c874278301cce5c7574f3)
- Optimizations to reduce garbage collection. Ugly code. [`aaed2bf`](https://github.com/thkruz/keeptrack.space/commit/aaed2bf7c6160dccbd88828ab86b99efa11d4706)
- timeManager organized and unnecessary public functions and variables hidden [`ad78954`](https://github.com/thkruz/keeptrack.space/commit/ad7895466c47ad4af5fb4f4b4d088a6bb62de9bb)
- Cleaned up extra satellite functions. [`fc20364`](https://github.com/thkruz/keeptrack.space/commit/fc20364461d7122db9f65cf08f40e60e55bec557)
- Updated editor to allow additional satellite information and a URL to be added. [`5c43e82`](https://github.com/thkruz/keeptrack.space/commit/5c43e824c75555a89b770ab83aa1443ac4cbb2f7)
- New Interface Finished [`eae6e54`](https://github.com/thkruz/keeptrack.space/commit/eae6e541b47834010631b0f7a2ca2c6a31203ef4)
- Reduced need for garbage collection on loops. [`8c77a81`](https://github.com/thkruz/keeptrack.space/commit/8c77a815559a00f91b409783782cb864a58e992b)
- Created custom objects with static variable to display launch sites [`c5bdf4d`](https://github.com/thkruz/keeptrack.space/commit/c5bdf4d3be19100d7329bdc5f9a3082df6c901d7)
- Added overlay for watchlist items and yellow highlighting for inview watchlist items. [`39fa773`](https://github.com/thkruz/keeptrack.space/commit/39fa7730cf4a049b36837e4c5f29ed9446f26670)
- Mobile Version [`20f01b3`](https://github.com/thkruz/keeptrack.space/commit/20f01b36eae23f1fd26c97381a14844c98e0bd95)
- Added more launch sites for nominal creator and fixed some styling problems on side menus where bottom 50px were cutoff. [`0057b35`](https://github.com/thkruz/keeptrack.space/commit/0057b35d55fd61c6a292d0749143ff80645ac4d9)
- Fixed nominal creator functions. Main error was caused by converting string to a number - leftover from old version. [`b620290`](https://github.com/thkruz/keeptrack.space/commit/b62029097d3d55b5e51964bc44802fca74868d48)
- Optimized the search function. Remove a lot of unnecessary extra variables. [`a4a55a2`](https://github.com/thkruz/keeptrack.space/commit/a4a55a219ae60e15f14ee3cf8f886f8f863923c1)
- Add three camera modes (default, offset, FPS). [`01c68f5`](https://github.com/thkruz/keeptrack.space/commit/01c68f53f5c6e3fc6e74793bb47d34650b1884ea)
- Reduced unnecessary variables in lookangles methods. [`928ec71`](https://github.com/thkruz/keeptrack.space/commit/928ec712e2d184f9247fba1c55908bda9ca57515)
- Few bugfixes where proprealtime was off by a few milliseconds. [`46c844f`](https://github.com/thkruz/keeptrack.space/commit/46c844fed1d6354d6ab50345937eb921ca391295)
- Added limitSats GET variable to filter out extra satellites [`e53a566`](https://github.com/thkruz/keeptrack.space/commit/e53a56661122e8dc913f9459dcc02aae5a3f989e)
- Added ability to have additional satellites in a local file for offline mode. [`6ab627c`](https://github.com/thkruz/keeptrack.space/commit/6ab627c4142fc250db13b4a1059188d4ea8626d9)
- Added mobile controls [`347a425`](https://github.com/thkruz/keeptrack.space/commit/347a4256e245f53662bd31ddd5015395b0bcb531)
- Added legend to the top right to address issue "Legend for Colors". [`2604efa`](https://github.com/thkruz/keeptrack.space/commit/2604efa154975cfdb83df9f48635ce3c9c94c0f2)
- Added legend to the top right to address issue #23 (Legend for Colors). [`1b2f8b5`](https://github.com/thkruz/keeptrack.space/commit/1b2f8b50ee6724372a9828c36139ef76a04c8504)
- Organized braun.js and renammed mapper. [`76343d4`](https://github.com/thkruz/keeptrack.space/commit/76343d408991834a94b10766fbeb93accfde7b46)
- Custom Sensor Menu [`643cd61`](https://github.com/thkruz/keeptrack.space/commit/643cd614c53dc086ffbe075483e277d3d83c6924)
- Removed Changelog. Pulled drawLoop variables to global scope. Fixed altitude check for calculating zoom. [`1b8770c`](https://github.com/thkruz/keeptrack.space/commit/1b8770c90def8ba4a957c56b844de6cab02f7832)
- Custom Sensor Menu [`ba29d2f`](https://github.com/thkruz/keeptrack.space/commit/ba29d2f667c7a1949e7d6cd209788f389ebd99e4)
- Combined FOV-bubble.js and line.js into drawLoop-shapes.js [`fb66ee4`](https://github.com/thkruz/keeptrack.space/commit/fb66ee420ac88b552145e82f623c396275d228d4)
- Fixed orbit search. Added watchlist red theme when inview. [`282e53e`](https://github.com/thkruz/keeptrack.space/commit/282e53ea6c08957c44dd01781364f5c5f398a016)
- TLE saving and loading added. [`f447b70`](https://github.com/thkruz/keeptrack.space/commit/f447b7060e0d234cebb8fa400f5fb6547784398a)
- Progress on Breakup Simulator [`be41087`](https://github.com/thkruz/keeptrack.space/commit/be410874a460275aa385083507208c037fd25182)
- Fixed map for IE 9 & 10. [`1ad61bf`](https://github.com/thkruz/keeptrack.space/commit/1ad61bf6bdeb287dd248fbec7b73e3f21a4b2b68)
- Add watchlist menu. [`987ef6b`](https://github.com/thkruz/keeptrack.space/commit/987ef6b18a8b73264157044478be3c1027cba933)
- Missile creation page updated to add premade list of targets. [`d69c84a`](https://github.com/thkruz/keeptrack.space/commit/d69c84a31523deedeeb1a875ee6ce451bb6bfc9f)
- Added show distance on hover feature and fixed jday calculation glitch in elset age. [`06b4738`](https://github.com/thkruz/keeptrack.space/commit/06b4738cf7249267eba398c50e302d208a0c1065)
- Mobile controls tapandhold functionality added. [`2ee7039`](https://github.com/thkruz/keeptrack.space/commit/2ee7039720f9d4259d7cd5acd5ffe770969293b8)
- Code cleanup [`a669adf`](https://github.com/thkruz/keeptrack.space/commit/a669adf9a46201fe275fc2565878e341c41321fe)
- North or South Option on Nominals [`a31f886`](https://github.com/thkruz/keeptrack.space/commit/a31f886d6b34aa77b39bb08f8cd871910887a529)
- Error Checking on Satellite Edit [`5fb5fd4`](https://github.com/thkruz/keeptrack.space/commit/5fb5fd489280a8c280f63529f16dfee37bbd39bd)
- Added setting to increase sharpness of satellties [`3d0fdda`](https://github.com/thkruz/keeptrack.space/commit/3d0fddafe448dec51603067174a64fe51fcf91f4)
- Optimized search time and groups.js code. Related to issue #10 [`915e462`](https://github.com/thkruz/keeptrack.space/commit/915e462064239a7034c35064c02025418b117338)
- Deconflict with Master Branch [`3000e36`](https://github.com/thkruz/keeptrack.space/commit/3000e36f33ab9741c9c88cb6efb5e39a3bc79561)
- Added different legends depending on the current colorscheme [`c56377d`](https://github.com/thkruz/keeptrack.space/commit/c56377dc693f6b523b3cbe652abbdc48c9f36ba7)
- Enabled bottom menus when sensor is selected from the map. [`df796ab`](https://github.com/thkruz/keeptrack.space/commit/df796ab84c2854c0c0c4f93db5f768649310f68d)
- Added License Key for Offline Only users. [`350f56c`](https://github.com/thkruz/keeptrack.space/commit/350f56c9e8012b850da7116f20c183803723c931)
- Updated About Info [`f9c2c1d`](https://github.com/thkruz/keeptrack.space/commit/f9c2c1d3ecaf29caed1f2acd7fee8a8b07b31106)
- Socrates optimization. [`9e88030`](https://github.com/thkruz/keeptrack.space/commit/9e8803073b4aad4ba95e2dc70352ddc234e8e7a1)
- Removed Ligatures for IE Compatibility [`08b91aa`](https://github.com/thkruz/keeptrack.space/commit/08b91aa3db62792b8bd3f7984bc2d32bf722f025)
- Added watchlist save and load buttons. [`89944ae`](https://github.com/thkruz/keeptrack.space/commit/89944ae7470e1fe3a54c3e9f716b2e5579d15230)
- Fixed glitch preventing launches to the north. [`31388be`](https://github.com/thkruz/keeptrack.space/commit/31388bead679efb73ab4581ba19ed603a41a7603)
- Added filter options to the settings menu for convienence. [`b71ae3e`](https://github.com/thkruz/keeptrack.space/commit/b71ae3e5005aea7b3767506116f250e4ba21b97b)
- Added JDAY to the top left. [`1989c90`](https://github.com/thkruz/keeptrack.space/commit/1989c90ff2751ae4db1728243e142f8cff2efebc)
- Reorganized js libraries to a separate folder. [`7aab201`](https://github.com/thkruz/keeptrack.space/commit/7aab20124d69e2d1c2dc2a37b703112928b002bf)
- search-box.js reorganized. [`acdfeb2`](https://github.com/thkruz/keeptrack.space/commit/acdfeb2d1528dcd041b8517a423c3064e78606fc)
- Text Highlighting Fixed [`aabca08`](https://github.com/thkruz/keeptrack.space/commit/aabca08275d69d3d111b7b04fe4f7997af5d8ddb)
- Cleaned up settings menu. [`011a9c8`](https://github.com/thkruz/keeptrack.space/commit/011a9c8a92e6c240c763768fcfe116d47cc2fbbf)
- Added alert text when camera mode changed. [`63d2fa5`](https://github.com/thkruz/keeptrack.space/commit/63d2fa5b16637206cc47b03f0d4e10e043a5c15b)
- Optimized syncing mechanism for multiple catalogues. [`83976f0`](https://github.com/thkruz/keeptrack.space/commit/83976f00c575ef6d602f9b6b736564afed33fe94)
- Formatted sun.js like other functions. [`4d1e4fb`](https://github.com/thkruz/keeptrack.space/commit/4d1e4fbeaf0377af1db047e70115d9c4c23d16be)
- Updated version number. [`aa39fa7`](https://github.com/thkruz/keeptrack.space/commit/aa39fa75e182eb7749aa08934deff82801f43a70)
- Removed multiple declarations of the current time "now" that were causing incorrect values in the satbox when proprate was not 1. [`7558bee`](https://github.com/thkruz/keeptrack.space/commit/7558bee55c2a6b6dfb325fd0d4abfaf48a7d7dc8)
- SensorSelected Variable [`c99df75`](https://github.com/thkruz/keeptrack.space/commit/c99df7513350b60522e12055cf3098bca22bb000)
- Added current time check to nominal creator. Solves issue #67. [`d1a38f2`](https://github.com/thkruz/keeptrack.space/commit/d1a38f2db2aff6c31458d8de4a83e7f63d5da030)
- Removed admin folder from github. [`34d2f2e`](https://github.com/thkruz/keeptrack.space/commit/34d2f2e895c8c891c22a3b97b36196bb2b5e03d6)
- Show Next Pass in Sat Box [`067c3ad`](https://github.com/thkruz/keeptrack.space/commit/067c3ade8add45983e03c76f578556f6cacafdd7)
- More Launch Sites [`d95ea87`](https://github.com/thkruz/keeptrack.space/commit/d95ea8710c7e4e2c168d73b49ef9407892ced4a4)
- Fixed sun exclusion times. [`6623d1d`](https://github.com/thkruz/keeptrack.space/commit/6623d1d7329a428182d61da5697301df5a0a17d1)
- Cleanup main folder. [`500b1fd`](https://github.com/thkruz/keeptrack.space/commit/500b1fd16f53a18d2e412ac505da750431fb1f2a)
- Removed unnecessary getSatIdFromCoord calls from drawloop. [`603cbc3`](https://github.com/thkruz/keeptrack.space/commit/603cbc38bdbba0330e034c5cbb2ea4d2a2e3d306)
- Fixed edit satellite function. [`df75981`](https://github.com/thkruz/keeptrack.space/commit/df7598105647fe8895e4f91f596f411439b9ec81)
- Social Media Links [`0a58a14`](https://github.com/thkruz/keeptrack.space/commit/0a58a14b8c77000ebccf441d23b84be629bb9ff6)
- Updated about page. [`2860759`](https://github.com/thkruz/keeptrack.space/commit/286075949cb32a422cf154810fbe4503155bc5dc)
- Made show distance default [`3f087a9`](https://github.com/thkruz/keeptrack.space/commit/3f087a9ac3d093c98dd7113e1a27eb452c0e9f0f)
- Reorganized settingsManager. [`b447b0e`](https://github.com/thkruz/keeptrack.space/commit/b447b0ee150b2f19ff1eb5ce79816c15176aeabe)
- Moved simulations to cleanup main folder. [`e163030`](https://github.com/thkruz/keeptrack.space/commit/e16303064a02538fa790d59206f26d71bb919b10)
- Less choppy mobile controls [`ab4ffed`](https://github.com/thkruz/keeptrack.space/commit/ab4ffed6398788399f64a300eba9bac324b4309c)
- Removing duplicate jday functions. [`9a402e2`](https://github.com/thkruz/keeptrack.space/commit/9a402e20a2a0e90c1fab61266ef1cad38f09f4e2)
- Fixed 2d map. [`408634d`](https://github.com/thkruz/keeptrack.space/commit/408634d72cf8734f0d22853f4d2b65af12a36e06)
- Fixed multisensorlookangles [`d0226cc`](https://github.com/thkruz/keeptrack.space/commit/d0226cc99886a15bfea1864c0debd707baf48cc2)
- Updated gitignore [`d9b037d`](https://github.com/thkruz/keeptrack.space/commit/d9b037dfdf1669d1610a50519ae8a5d43f0262f9)
- Fixed bug where all dropdown menus had extra bottom padding [`b18b04a`](https://github.com/thkruz/keeptrack.space/commit/b18b04acf83eb4108d5acc48938d7cef79943ca2)
- Fixed map update override. [`e6db5a2`](https://github.com/thkruz/keeptrack.space/commit/e6db5a27d6d238c993e86039667f51838dc1b99b)
- Added check to hide SOCRATES menu if the limitSats filter is on. [`0e13cf8`](https://github.com/thkruz/keeptrack.space/commit/0e13cf81f405bf01d42785ab0da9d43019408acd)
- Fixed error message in timeManager that was in the wrong spot. [`d4e91c2`](https://github.com/thkruz/keeptrack.space/commit/d4e91c2fb1bab8fd4db0eed79a30b3e502254b9d)
- RCS color display fixed to account for actual RCS values not size groups [`4774e58`](https://github.com/thkruz/keeptrack.space/commit/4774e584bd438a38bfd1adc19fa4d0360fb4326c)
- Readd satData copy to searchBox.init [`dc9de13`](https://github.com/thkruz/keeptrack.space/commit/dc9de13c13bfbaf036f9f25d3407af64adfb9c41)
- Fixed mobile sliders color and prevented default keyboard popup. [`f7a6aab`](https://github.com/thkruz/keeptrack.space/commit/f7a6aab41a51eb612fca1f1b74bc897274b4cb0a)
- Right Mouse Click Fixed [`0246292`](https://github.com/thkruz/keeptrack.space/commit/0246292569d59a99ebe16093f091ccd1341494c1)
- Red theme removed if last object from watchlist is removed while inview. [`d0c749f`](https://github.com/thkruz/keeptrack.space/commit/d0c749ff70ffca0f86709694bc0ef0c69cdf23fa)
- Update version number. [`5385218`](https://github.com/thkruz/keeptrack.space/commit/5385218fc8e8bcd2805e0781eb8ec1c7e5ddae9c)
- Added public github link. [`142ec27`](https://github.com/thkruz/keeptrack.space/commit/142ec2778ca0b00231240450e036ceffce21be79)
- Adjusted RCS check in colorscheme so that Small Satellites now display correctly. [`5e10b41`](https://github.com/thkruz/keeptrack.space/commit/5e10b413b15d39f4cb385ac223a6234b7fa81a68)
- Updated index Date [`6edab9f`](https://github.com/thkruz/keeptrack.space/commit/6edab9f25b74a6df93d1421e02cc09d142a9bab4)
- Updated gitignore [`f452ba8`](https://github.com/thkruz/keeptrack.space/commit/f452ba8ff7a7e1db65a9d806a2fb49e078bc1f00)
- Version Fixed [`f4fa941`](https://github.com/thkruz/keeptrack.space/commit/f4fa941ce169e4e901e27e26e7533ce7d76ea87c)
- Fixed bug on index.htm where side menus were missing. [`b3b2d4d`](https://github.com/thkruz/keeptrack.space/commit/b3b2d4dca19cd9fe863085b7030d2f204596e203)
- This should fix issue #70. [`7915a75`](https://github.com/thkruz/keeptrack.space/commit/7915a7521e422a75e8f65bb1338e2fc668b629b1)
- Updated version number. [`7231c97`](https://github.com/thkruz/keeptrack.space/commit/7231c978bc07b4d5117b3ab83bb4962d995470bf)
- Increment version number [`8f339a4`](https://github.com/thkruz/keeptrack.space/commit/8f339a48854c66c7845313c44a6f267bb289bf8e)
- Updated version number. [`56fd23e`](https://github.com/thkruz/keeptrack.space/commit/56fd23e8ce66196100d8dd684e0ebf91d4bba30f)
- Shortened option description in settings menu. [`4c7e9aa`](https://github.com/thkruz/keeptrack.space/commit/4c7e9aae13ac6d356908c07393b1b91c1284e5ce)
- Updated version number [`a0618d2`](https://github.com/thkruz/keeptrack.space/commit/a0618d2014734b9b40fa29c7a982c9a2660f280a)
- Updated version number [`c1700e8`](https://github.com/thkruz/keeptrack.space/commit/c1700e8e1a1ba2fa13762ddce59431c4d2deb0cc)
- Updated version number. [`6e4727d`](https://github.com/thkruz/keeptrack.space/commit/6e4727d4ad91f91279f6877a20cc7a16a3b8f422)
- Version number updated. [`8af1af9`](https://github.com/thkruz/keeptrack.space/commit/8af1af9506f6dddc9333ef09e40e060fadb49a6c)
- Cleanup github [`a35b86c`](https://github.com/thkruz/keeptrack.space/commit/a35b86cdc64d46d73c35be90d9301db716e22e08)
- Fixed glitch caused by static objects in satcache. [`90082f1`](https://github.com/thkruz/keeptrack.space/commit/90082f187ed1baa9b82d24b6e846a258b658d4d7)
- Right Mouse Click Fixed [`e7e82a8`](https://github.com/thkruz/keeptrack.space/commit/e7e82a814734e89dafe0d99fa3c3fb4c97c61cb0)

#### [v0.10.0](https://github.com/thkruz/keeptrack.space/compare/v0.9.2...v0.10.0)

> 12 March 2017 

- Develop [`#39`](https://github.com/thkruz/keeptrack.space/pull/39)
- Develop [`#38`](https://github.com/thkruz/keeptrack.space/pull/38)
- UI Overhaul [`286b580`](https://github.com/thkruz/keeptrack.space/commit/286b58092d67467e9e2e385106f4d7e21b2acb21)
- TLE Minification [`1045201`](https://github.com/thkruz/keeptrack.space/commit/104520168e500b83813521b4c03bd47a50c6ac7f)
- UI Overhaul [`2b771b5`](https://github.com/thkruz/keeptrack.space/commit/2b771b5ebbe0e23f4ef0fb3fb46182306aa46a1e)
- Only FOV Option [`26c2cff`](https://github.com/thkruz/keeptrack.space/commit/26c2cff3dc9feaf19ddc31e3ea94ce7f9791e00b)
- Optional Show Next Pass [`27aee7e`](https://github.com/thkruz/keeptrack.space/commit/27aee7e1672e8c3e554e412f01f29dd962e67e4b)

#### [v0.9.2](https://github.com/thkruz/keeptrack.space/compare/v0.5.2...v0.9.2)

> 4 January 2017 

- Develop [`#35`](https://github.com/thkruz/keeptrack.space/pull/35)
- TLE Update [`350e4de`](https://github.com/thkruz/keeptrack.space/commit/350e4de4f9f873b8649c32d98792dd279e919aac)
- Satellite Editor [`15d13fd`](https://github.com/thkruz/keeptrack.space/commit/15d13fd43bb42ee7472dc5b262497578a51bebd1)
- Fixed iframes [`fb96a92`](https://github.com/thkruz/keeptrack.space/commit/fb96a922762ebe7e3f3980f9e6c401ca7cbe0568)
- Alternate Launch Menu [`8655468`](https://github.com/thkruz/keeptrack.space/commit/8655468664918f900a1bc27206abff55ed98484e)
- Edit Satellites [`322776e`](https://github.com/thkruz/keeptrack.space/commit/322776eee88c1bd7f468b785e7e953728e696001)
- ISS Stream, Launch Updater, and Socrates Improvements [`2d4e442`](https://github.com/thkruz/keeptrack.space/commit/2d4e442b68493deb684a694f893504e5614ed7a1)
- MultiSite Lookangles [`8f117dd`](https://github.com/thkruz/keeptrack.space/commit/8f117ddc7ad80b72d485eb4607d9b3f572bdcb90)
- sat-cruncher Semi-Standard [`67821ed`](https://github.com/thkruz/keeptrack.space/commit/67821ed7f5359c31fc913af52f42ee7b8300b7bd)
- Improved Multi Site Lookangles [`fe28ebe`](https://github.com/thkruz/keeptrack.space/commit/fe28ebeebb6ec515d62e6173f553d70042f72435)
- Disable Bottom Icons Initially [`eda4158`](https://github.com/thkruz/keeptrack.space/commit/eda4158fcc07b07f74b5c2d51ba578e86f554960)
- Country Menu Improved [`b85bfea`](https://github.com/thkruz/keeptrack.space/commit/b85bfea9d1365a99f7ce7da4c9354820a8e486a2)
- Variable Cleanup [`7dba8d4`](https://github.com/thkruz/keeptrack.space/commit/7dba8d438c0acd8b4385a282ef758602a45b590e)
- Settings Menu [`8ca15fc`](https://github.com/thkruz/keeptrack.space/commit/8ca15fc5a8d9a2ad1a2f15e2e5b0eac9b5f91ee2)
- Settings Menu Update [`3a5febc`](https://github.com/thkruz/keeptrack.space/commit/3a5febc93951336db394d72f63f5bff8ba3668ef)
- Future Next Pass Feature and Removed Memory Leak [`a8c9f31`](https://github.com/thkruz/keeptrack.space/commit/a8c9f31353bcccdeaec560d369e2cc1811d5894d)
- TAGs Updated [`eb5c7b6`](https://github.com/thkruz/keeptrack.space/commit/eb5c7b63214408a66e46122ef7eb83916e2ca1b3)
- Version Number Menu [`d5626f5`](https://github.com/thkruz/keeptrack.space/commit/d5626f5524f5d2ab9240802952b7f0ecabcd8cd7)
- Socrates Menu Functionality [`08b81c3`](https://github.com/thkruz/keeptrack.space/commit/08b81c32263bc1ff9cabb8c99a8ba1beec0e312e)
- Default Messages Changed\nChanged the default messages to make them more obvious if there is a js error. [`f7b2b41`](https://github.com/thkruz/keeptrack.space/commit/f7b2b41eb38d1478f3709b21625ec5bb94c4b2bb)
- Prevent Shake Effect Failures [`b6d70e5`](https://github.com/thkruz/keeptrack.space/commit/b6d70e59e138ff921799d40ff997b206ff087727)
- Fixed Tooltips [`65e1d65`](https://github.com/thkruz/keeptrack.space/commit/65e1d65d7ac846993c23058ef113c05d62378a11)
- NORAD Number Search [`040336f`](https://github.com/thkruz/keeptrack.space/commit/040336f3d79b8e6f64d9165fa6aa058130284877)
- Find Near Objects Fixed [`bae37d2`](https://github.com/thkruz/keeptrack.space/commit/bae37d2f1e71fa790b022e1582bdb2d585275f53)
- Disable Look Angles Until Sensor Selected [`c62f9c9`](https://github.com/thkruz/keeptrack.space/commit/c62f9c969b1a8dc2f893df7f663d73c057e17cb0)
- Proprate Fixed [`3a3f7ab`](https://github.com/thkruz/keeptrack.space/commit/3a3f7ab01877c10113a09dd869f7e4074823471f)
- Links and Version Number Box [`63242a6`](https://github.com/thkruz/keeptrack.space/commit/63242a6f5633802259d0cf6f923827a5398e0c4b)
- Disable Weather if No Weather Maps [`a2b87a6`](https://github.com/thkruz/keeptrack.space/commit/a2b87a60e1fb988084a523a96fedc87ec8b8986a)
- Variables Optional [`3bec372`](https://github.com/thkruz/keeptrack.space/commit/3bec372df4e187664097708842beb3c149c8211d)
- Version Number Updated [`123f7e1`](https://github.com/thkruz/keeptrack.space/commit/123f7e1d710f95b7a599b1b24e0fe1c91659eb9a)
- Updated Ignore [`523f6ca`](https://github.com/thkruz/keeptrack.space/commit/523f6ca8bdac57900ad90faa536c8903333b62e9)
- Updated Ignore File [`211addb`](https://github.com/thkruz/keeptrack.space/commit/211addb28043441ca4639fccb803589970bd7109)
- Fixed Index.htm [`9d24e20`](https://github.com/thkruz/keeptrack.space/commit/9d24e2068c1cfd9924f8c1e5f4c34051b1dcb491)
- Testing Git Commit [`8e37cdb`](https://github.com/thkruz/keeptrack.space/commit/8e37cdb3d7ec0e3e15ce1f973e4404ba627dd5f7)
- Version Box Fixed [`d1ab85b`](https://github.com/thkruz/keeptrack.space/commit/d1ab85b1fb93f82f9dd714bc1db59ab795c46cab)
- Version Box Updated [`2d96846`](https://github.com/thkruz/keeptrack.space/commit/2d96846bb6efdb4093031b7bfc869b6138fc56d1)
- Reduced Max Orbits [`48f8515`](https://github.com/thkruz/keeptrack.space/commit/48f85154822b806dfebba6e9341266b5a96da256)
- Default Messages Changed [`3905b80`](https://github.com/thkruz/keeptrack.space/commit/3905b8039b63f40306624a75d804337e7afde9da)
- Default Messages Changed" -m "Changed the default messages to make them more obvious if there is a js error. [`5ecfcdb`](https://github.com/thkruz/keeptrack.space/commit/5ecfcdbbbcf606d83d0c7f19e4a28e60b8268901)
- FIxed ELSET Parser [`3bd96f7`](https://github.com/thkruz/keeptrack.space/commit/3bd96f7d746107062fa843bce3c57b5a9275c924)
- Renamed Images [`8758965`](https://github.com/thkruz/keeptrack.space/commit/8758965d51b76225e5d218ae5ced3a1f960724d3)

#### [v0.5.2](https://github.com/thkruz/keeptrack.space/compare/v0.5.1...v0.5.2)

> 31 December 2016 

- Fixed Open Issues [`5ac84bc`](https://github.com/thkruz/keeptrack.space/commit/5ac84bc38a336e44f204a4618eed5e583fb4d8db)

#### [v0.5.1](https://github.com/thkruz/keeptrack.space/compare/v0.5.0...v0.5.1)

> 24 December 2016 

- Admin Section Added [`51855bd`](https://github.com/thkruz/keeptrack.space/commit/51855bd9cb9a141da505d43f2016b1779a0362f3)
- Updated README for v0.5.0 [`1b972f2`](https://github.com/thkruz/keeptrack.space/commit/1b972f2c76b55384c77a34e098d02b48a441c0d7)

#### [v0.5.0](https://github.com/thkruz/keeptrack.space/compare/v0.4.0...v0.5.0)

> 23 December 2016 

- Revert "Javascript Semi-Standard Compliant" [`8288258`](https://github.com/thkruz/keeptrack.space/commit/8288258dd96be79d362d2b04d4616ceee8e1ec81)
- Revert "SOCRATES" [`2702ca4`](https://github.com/thkruz/keeptrack.space/commit/2702ca4c2d0692f9897252f9be28deb27812f36e)
- SOCRATES [`a87aea3`](https://github.com/thkruz/keeptrack.space/commit/a87aea373fcd25bc5f76dc11e59f21a641c958c2)
- SOCRATES [`1931cfc`](https://github.com/thkruz/keeptrack.space/commit/1931cfc2a35a4c20f95b53171ceccf6b9e510974)
- Remove Old Files [`cebd8d1`](https://github.com/thkruz/keeptrack.space/commit/cebd8d190a928028b9b63af3a1287199701eb820)

#### [v0.4.0](https://github.com/thkruz/keeptrack.space/compare/v0.3.0...v0.4.0)

> 22 December 2016 

- Javascript Semi-Standard Compliant [`7681f65`](https://github.com/thkruz/keeptrack.space/commit/7681f655571d6a2030a6fdd5d82795790e925c12)
- Create README.md [`fad74a3`](https://github.com/thkruz/keeptrack.space/commit/fad74a32786f09c8320a36f40fb91c50f32e739b)
- Update README.md [`bea73af`](https://github.com/thkruz/keeptrack.space/commit/bea73af86955decdf66eb08e8b61634c7d82a5b2)

#### v0.3.0

> 21 December 2016 

- 12 October 2016 [`e6df11c`](https://github.com/thkruz/keeptrack.space/commit/e6df11c2b2d0a433338b6a1f4f9db5040c692fe3)
- 21 December 2016 [`8a58715`](https://github.com/thkruz/keeptrack.space/commit/8a58715cab410026d017f3cd8ac91bdecd7c5d83)
- 7 December 2016 [`133e919`](https://github.com/thkruz/keeptrack.space/commit/133e919bf8672c89ccd8bca9179cc67e2e49b62e)
- 20 December 2016 [`468a1ff`](https://github.com/thkruz/keeptrack.space/commit/468a1ffa2057849cfe9c3461ee138f84e8781b98)
- :neckbeard: Added .gitattributes & .gitignore files [`b5c0df8`](https://github.com/thkruz/keeptrack.space/commit/b5c0df8b6619f9bb27ffba78f0011c44d79d44b1)
- Delete dot-blue.png [`afad161`](https://github.com/thkruz/keeptrack.space/commit/afad16136e8b4e36370bbc4776871df06e2ce9de)
