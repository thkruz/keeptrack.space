/*! For license information please see main.23271af117285ac03015.js.LICENSE.txt */
          <ul id="nav-mobile">
            <li id="jday"></li>
            <div id="${this.divContainerId}" class="tooltipped" data-position="bottom" data-delay="50" data-tooltip="Time Menu">
              <div id="datetime-text">Placeholder Text</div>
              <div id="datetime-input">
                <form id="datetime-input-form">
                  <input type="text" id="${this.dateTimeInputTbId}" readonly="true" />
                </form>
              </div>
            </div>
          </ul>
          `)}uiManagerFinal(){(0,r.G)("datetime-text").addEventListener("click",this.datetimeTextClick.bind(this)),u()("#datetime-input-form").on("change",(e=>{this.datetimeInputFormChange(),e.preventDefault()}));const e=this;u()("#datetime-input-tb").datetimepicker({dateFormat:"yy-mm-dd",timeFormat:"HH:mm:ss",timezone:"+0000",gotoCurrent:!0,addSliderAccess:!0,sliderAccessArgs:{touchonly:!1}}).on("change.dp",(function(){if(e.isEditTimeOpen){(0,r.G)("datetime-input").style.display="none",e.isEditTimeOpen=!1;try{a.I.get(i.Yv.UiManager).updateNextPassOverlay(!0)}catch(e){}}}))}datetimeInputFormChange(e){const t=a.I.get(i.Yv.TimeManager),n=a.I.get(i.Yv.ColorSchemeManager);let s;s=e||u()(`#${this.dateTimeInputTbId}`).datepicker("getDate");const c=new Date,d=(0,l.Bk)(t.simulationTimeObj);(0,r.G)("jday").innerHTML=d.toString(),t.changeStaticOffset(s.getTime()-c.getTime()),n.setColorScheme(settingsManager.currentColorScheme,!0),t.calculateSimulationTime(),t.lastBoxUpdateTime=t.realTime;try{o.keepTrackApi.getPlugin(p._).lastOverlayUpdateTime=1*t.realTime-7e3,a.I.get(i.Yv.UiManager).updateNextPassOverlay(!0)}catch(e){}}}m.PLUGIN_NAME="Top Menu";const g=new m},769:(e,t,n)=>{"use strict";n.d(t,{s:()=>d,x:()=>h});var a=n(2573),i=n(5460);const o=n.p+"../img/debug.png";var r=n(9640),l=n(7727),s=n(2007),c=n.n(s),u=n(9959);class d extends u.c{constructor(){super(d.PLUGIN_NAME),this.isErudaVisible=!1,this.bottomIconImg=o,this.bottomIconElementName="menu-debug",this.bottomIconLabel="Debug",this.dragOptions={isDraggable:!0,minWidth:300,maxWidth:500},this.helpTitle="Debug Menu",this.helpBody=r.keepTrackApi.html`The Debug Menu is used for debugging the app. It is probably not very useful unless you are assisting me with debugging an issue
  <br><br>
  Open Debug Menu allows you to access the console even when it is blocked by the browser. This is useful for debugging issues that only occur in the browser console.
  <br><br>
  Run Gremlins will run a series of tests to try to break the app. This kind of fuzz testing is useful for testing the app's robustness.`,this.sideMenuElementName="debug-menu",this.sideMenuElementHtml=r.keepTrackApi.html`
    <div id="debug-menu" class="side-menu-parent start-hidden text-select">
      <div id="debug-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Debug Menu</h5>
          <div class="center-align row">
            <button id="debug-console" class="btn btn-ui waves-effect waves-light" type="button">Open Debug Menu &#9658;</button>
          </div>
          <div class="center-align row">
            <button id="debug-gremlins" class="btn btn-ui waves-effect waves-light" type="button">Unleash Gremlins &#9658;</button>
          </div>
        </div>
        <div class="row">
          <h6 class="center-align">Camera</h5>
          <div class="center-align row">
            <span id="debug-camera-position-x"></span>
          </div>
          <div class="center-align row">
            <span id="debug-camera-position-y"></span>
          </div>
          <div class="center-align row">
            <span id="debug-camera-position-z"></span>
          </div>
          <div class="center-align row">
            <span id="debug-camera-distance-from-earth"></span>
          </div>
          <div class="center-align row">
            <button id="debug-cam-to-center" class="btn btn-ui waves-effect waves-light" type="button">Draw Cam to Center Line &#9658;</button>
          </div>
          <div class="center-align row">
            <button id="debug-cam-to-sat" class="btn btn-ui waves-effect waves-light" type="button">Draw Cam to Sat Line &#9658;</button>
          </div>
        </div>
        <div class="row">
          <h6 class="center-align">Satellite</h5>
          <div class="center-align row">
            <span id="debug-sat-position-x"></span>
          </div>
          <div class="center-align row">
            <span id="debug-sat-position-y"></span>
          </div>
          <div class="center-align row">
            <span id="debug-sat-position-z"></span>
          </div>
        </div>
    </div>
  `,this.gremlinsSettings={nb:1e5,delay:5},this.delayForCameraUpdates=1e3,this.lastCameraUpdate=0}addHtml(){super.addHtml(),r.keepTrackApi.register({method:r.M8.uiManagerFinal,cbName:this.PLUGIN_NAME,cb:()=>{(0,i.G)("debug-console").addEventListener("click",(()=>{this.isErudaVisible?(c().hide(),this.isErudaVisible=!1):(c().show(),this.isErudaVisible=!0)})),(0,i.G)("debug-gremlins").addEventListener("click",(()=>{this.runGremlins()})),(0,i.G)("debug-cam-to-sat").addEventListener("click",(()=>{if(r.keepTrackApi.getMainCamera()){const e=r.keepTrackApi.getCatalogManager().selectedSat;if(-1===e)return;const t=r.keepTrackApi.getCatalogManager().getSat(e);if(t){const n=r.keepTrackApi.getMainCamera().getCameraPosition(t.position,r.keepTrackApi.getMainCamera().getCameraOrientation()),a=[t.position.x+n[0],t.position.y+n[1],t.position.z+n[2]];l.B.create("sat2",[e,a[0],a[1],a[2]],"o")}}})),(0,i.G)("debug-cam-to-center").addEventListener("click",(()=>{const e=r.keepTrackApi.getMainCamera();if(e){const t=e.getCameraPosition();l.B.create("ref",[t[0],t[1],t[2]],"r")}}))}})}addJs(){super.addJs(),r.keepTrackApi.register({method:r.M8.updateLoop,cbName:this.PLUGIN_NAME,cb:()=>{if((new Date).getTime()-this.lastCameraUpdate<this.delayForCameraUpdates)return;const e=r.keepTrackApi.getMainCamera();if(e){const t=r.keepTrackApi.getCatalogManager().selectedSat,n=-1!==t?r.keepTrackApi.getCatalogManager().getSat(t):null,a=e.getCameraPosition(null==n?void 0:n.position);(0,i.G)("debug-camera-position-x").innerHTML=`X: ${a[0].toFixed(2)}`,(0,i.G)("debug-camera-position-y").innerHTML=`Y: ${a[1].toFixed(2)}`,(0,i.G)("debug-camera-position-z").innerHTML=`Z: ${a[2].toFixed(2)}`,(0,i.G)("debug-camera-distance-from-earth").innerHTML=`Distance from Center: ${e.getCameraDistance().toFixed(2)} km`,this.lastCameraUpdate=(new Date).getTime()}if(r.keepTrackApi.getCatalogManager().selectedSat>=0){const e=r.keepTrackApi.getCatalogManager().getSat(r.keepTrackApi.getCatalogManager().selectedSat).position;(0,i.G)("debug-sat-position-x").innerHTML=`X: ${e.x.toFixed(2)}`,(0,i.G)("debug-sat-position-y").innerHTML=`Y: ${e.y.toFixed(2)}`,(0,i.G)("debug-sat-position-z").innerHTML=`Z: ${e.z.toFixed(2)}`}}})}static getRandomInt_(e,t){return e=Number.isNaN(e)?0:Math.ceil(e),t=Number.isNaN(t)?100:Math.floor(t),Math.floor(Math.random()*(t-e+1))+e}static defaultPositionSelector_(){return[d.getRandomInt_(0,Math.max(0,document.documentElement.clientWidth-1)),d.getRandomInt_(Math.max(0,document.documentElement.clientHeight-100),Math.max(0,document.documentElement.clientHeight-1))]}static canClick_(e){return void 0===e.parentElement||null==e.parentElement?null:"bmenu-item"===e.parentElement.className}startGremlins(){const e=a.species.clicker({canClick:d.canClick_,defaultPositionSelector:d.defaultPositionSelector_}),t=a.species.toucher({touchTypes:["gesture"],defaultPositionSelector:d.defaultPositionSelector_}),n=a.strategies.distribution({distribution:[.3,.3,.1,.1,.1,.1],delay:this.gremlinsSettings.delay});a.createHorde({species:[e,t,a.species.clicker(),a.species.toucher(),a.species.formFiller(),a.species.typer({log:!0,logger:console})],mogwais:[a.mogwais.alert(),a.mogwais.fps(),a.mogwais.gizmo({maxErrors:1e3})],strategies:[n]}).unleash()}runGremlins(){(0,i.G)("nav-footer").style.height="200px",(0,i.G)("nav-footer-toggle").style.display="none",(0,i.G)("bottom-icons-container").style.height="200px",(0,i.G)("bottom-icons").style.height="200px",this.startGremlins()}}d.PLUGIN_NAME="Debug Menu";const h=new d},4378:(e,t,n)=>{"use strict";n.d(t,{CC:()=>A});var a=n(9640),i=n(1874),o=n(2590),r=n(6349),l=n(3991),s=n(4427);let c,u,d,h,p,m,g,f;const k=[],S=e=>101325*Math.exp(-.2841957*e/2394.57888),v=(e,t,n,a,i,o,r,l,s,k,v,C)=>{let A;A=a<12e5?.0174533*(90-C*(1.5336118956+.00443173537387*a-9.30373890848*Math.pow(10,-8)*Math.pow(a,2)+8.37838197732*Math.pow(10,-13)*Math.pow(a,3)-2.71228576626*Math.pow(10,-18)*Math.pow(a,4))):30;const b=c+a,y=Math.atan2(r,l);let _=0;t>0?(_=d*e*h,t+=(v-_)*f):t=0;const T=t+i+p,P=(e=>(e/=1e3)<12.5?276.642857143-5.02285714286*e:e<20?213:e<47.5?171.224358974+2.05384615385*e:e<52.5?270:e<80?435.344405594-3.13916083916*e:e<90?183:e<110?4.47*e-221.111111111:e<120?10.6*e-894:378)(a),x=S(a),G=x/(m*P),L=Math.pow(1.4*m*P,.5),w=Math.sqrt(Math.pow(r,2)+Math.pow(l,2))/L,M=(e=>e<.5?.125:e<1.1875?2.30117394072*e-.329086061307+-4.06597222013*Math.pow(e,2)+3.01851851676*Math.pow(e,3)+-.666666666129*Math.pow(e,4):e<1.625?.10937644721+-4.61979595244*e+9.72917139612*Math.pow(e,2)+-6.33333563852*Math.pow(e,3)+1.33333375211*Math.pow(e,4):e<3.625?.97916002909+-.540978181863*e+.125235817144*Math.pow(e,2)+-.00666103733277*Math.pow(e,3)+-.000558009790208*Math.pow(e,4):.25)(Math.abs(w));let O=0;t>0&&(O=((e,t,n,a)=>{const i=1.2,o=25*Math.pow(10,6),r=e,l=S(a),s=S(t),c=r/Math.pow(1.1*o,-i/(i-1))*Math.sqrt(1059349.509986226),u=Math.sqrt(2/(i-1)*Math.pow(o/l,(i-1)/i-1));let d=c/u*Math.pow(1+(i-1)/2*Math.pow(u,2)/1.1,2.2/(2*(i-1)));d>n&&(d=n);const h=16780096.238181822*Math.pow(1-s/o,(i-1)/i);return r*Math.sqrt(h)+(s-l)*d})(_,a,e,o));const E=.5*G*(Math.pow(r,2)+Math.pow(l,2))*n*M,R=g*u*T/Math.pow(b,2),D=(O*Math.sin(A)-E*Math.sin(y)-R)/T+b*Math.pow(l/b,2);a+=(r+=D*f)*f,s+=l*f;const N=l*c/b;k+=N*f;const B=(O*Math.cos(A)-E*Math.cos(y))/T-2*r*(l/b);return[t,T,P,x,G,L,w,M,O,E,R,D,r,a,s,N,k,B,l+=B*f]},C=(e,t,n,a,i,o,r,l,s,c,u,h,p,m,g,f)=>{let k,S,C=[];const A=[];for(;n/d/a>.4&&o>=0;)C=v(e,n,i,o,r,c,u,h,p,m,g,f),n=C[0],u=C[12],o=C[13],A.push(o),p=C[14],m=C[16],h=C[18],k=o;for(;n/d/a>.19&&o>=0;)C=v(e,n,i,o,l,k,u,h,p,m,g,f),n=C[0],u=C[12],o=C[13],A.push(o),p=C[14],m=C[16],h=C[18],S=o;for(;n/d/a>0&&o>=0;)C=v(t,n,i,o,s,S,u,h,p,m,g,f),n=C[0],u=C[12],o=C[13],A.push(o),p=C[14],m=C[16],h=C[18];for(;o>0;)C=v(t,n=0,i,o,s,S,u,h,p,m,g,f),n=C[0],u=C[12],o=C[13],A.push(o),p=C[14],m=C[16],h=C[18];let b=0;for(let e=0;e<A.length;e++)A[e]>b&&(b=A[e]);return p},A={isLoaded:!0,lastMissileErrorType:"",missilesInUse:0,lastMissileError:"",RussianICBM:[52.5000001,82.75000015,"Aleysk (SS-18)",16e3,50.75000015,59.5000001,"Dombarovskiy (SS-18)",16e3,55.3333334,89.80000016,"Uzhur (SS-18)",16e3,53+58*.01666667,57.8333335,"Kartaly (SS-18)",16e3,52.31666673,104.23333338,"Irkutsk (SS-25)",10500,56.36666674,95.46666676,"Kansk (SS-25)",10500,54.03333334,35.76666682,"Kozel`sk (SS-19)",1e4,56.36666674,92.41666675,"Krasnoyarsk (SS-25)",10500,58.06666668,60.55000011,"Nizhniy Tagil (SS-25)",10500,55.3333334,83,"Novosibirsk (SS-25)",10500,51.6666668,45.56666678,"Tatishchevo (SS-19)",1e4,51.6666668,45.56666678,"Tatishchevo (SS-27)",10500,56.85000017,40.53333344,"Teykovo (SS-25)",10500,56.63333346,47.85000017,"Yoshkar Ola (SS-25)",10500,72.039545,42.696683,"Verkhoturye (SS-N-23A)",8300,73.902056,3.133463,"Ekaterinburg (SS-N-23A)",8300,76.502284,-158.871984,"Tula (SS-N-23A)",8300,82.25681,-10.161045,"Bryansk (SS-N-23A)",8300,81.564646,32.553796,"Karelia (SS-N-23A)",8300,74.67366,6.538173,"Novomoskovsk (SS-N-23A)",8300,71.920763,41.039876,"Borei Sub (Bulava)",9300,71.920763,41.039876,"Delta IV Sub (Sineva)",8300,71.920763,41.039876,"Delta IV Sub (Layner)",12e3],ChinaICBM:[32.997534,112.537904,"Nanyang (DF-31)",8e3,36.621398,101.773908,"Xining (DF-31)",8e3,37.797257,97.079547,"Delingha (DF-31A)",11e3,37.07045,100.805779,"Haiyan (DF-31A)",11e3,40.079969,113.29994,"Datong (DF-31A)",11e3,34.583156,105.724525,"Tainshui (DF-31A)",11e3,38.552936,106.020538,"Xixia (DF-31A)",11e3,27.242253,111.465223,"Shaoyang (DF-31A)",11e3,24.34658,102.527838,"Yuxi (DF-31A)",11e3,34.345845,111.491062,"Luoyang (DF-5A/B)",13e3,38.917086,111.847057,"Wuzhai (DF-5A/B)",13e3,40.615707,115.107604,"Xuanhua (DF-5A/B)",13e3,26.163848,109.790408,"Tongdao (DF-5A/B)",13e3,34.061291,111.054379,"Lushi (DF-5A/B)",13e3,30.691542,118.437169,"Jingxian (DF-5A/B)",13e3,37.707532,116.271994,"Jingxian (DF-5A/B)",13e3,27.415932,111.792471,"Hunan (DF-5A/B)",13e3,46.585153,125.104037,"Daqing City (DF-41)",13500,32.154153,114.099875,"Xinyang City (DF-41)",13500,40.4417,85.530745,"Xinjiang Province (DF-41)",13500,31.271257,88.699152,"Tibet Province (DF-41)",13500,29.573548,122.923151,"Type 092 Sub (JL-2)",8e3],NorthKoreanBM:[40,128.3,"Sinpo Sub (Pukkŭksŏng-1)",2500,40.019,128.193,"Sinpo (KN-14)",8e3,39.365,126.165,"P`yong`an (KN-20)",1e4,39.046,125.667,"Pyongyang (KN-22)",13e3],UsaICBM:[48.420079,-101.33356,"Ohio Sub (Trident II)",12e3,48.420079,-101.33356,"Minot (Minuteman III)",13e3,47.505958,-111.181776,"Malmstrom (Minuteman III)",13e3,41.149931,-104.860645,"F.E. Warren (Minuteman III)",13e3],FraSLBM:[47.878,-4.263,"Triomphant Sub (M51)",1e4,47.878,-4.263,"Triomphant Sub (M51)",1e4],ukSLBM:[56.066111,-4.8175,"Vanguard Sub (Trident II)",12e3,56.066111,-4.8175,"HMNB Clyde (Trident II)",12e3],globalBMTargets:[38.951,-77.013,"Washington DC",40.679,-73.947,"New York City",34.073,-118.248,"Los Angeles",41.877,-87.622,"Chicago",42.361,-71.058,"Boston",47.749,-122.317,"Seattle",25.784,-80.196,"Miami",32.828,-96.759,"Dallas",38.765,-104.837,"Colorado Springs",41.33,-96.054,"Omaha",19.832,-155.491,"Hawaii",13.588,144.922,"Guam",51.50634,-.097485,"London",48.874195,2.378987,"Paris",24.503,-66.127,"French Caribean",40.449889,-3.717309,"Madrid",41.931955,12.520198,"Rome",52.501746,13.416486,"Berlin",43.706946,-79.423854,"Toronto",55.750246,37.691525,"Moscow",59.887535,30.38409,"St. Petersburg",55.017165,82.965879,"Novosibirsk",39.974338,116.396057,"Beijing",39.044051,125.735244,"Pyongyang"],USATargets:[40.679,-73.947,42.361,-71.058,41.755,-70.539,41.763,-72.684,42.101,-72.59,39.408,-74.441,39.191,-75.534,39.331,-76.671,38.951,-77.013,37.608,-77.378,42.36,-83.048,39.844,-86.172,40.008,-83,40.538,-79.934,40.034,-75.131,47.749,-122.317,45.7,-122.581,47.732,-117.389,37.889,-122.562,36.257,-115.159,48.034,-101.295,49.134,-101.495,48.234,-100.295,48.334,-101.095,48.434,-101.295,47.948,-97.027,45.107,-93.306,47.092,-110.334,47.292,-111.834,47.592,-111.934,46.792,-111.334,47.992,-111.534,47.792,-110.734,48.592,-111.534,47.292,-111.334,46.092,-111.134,47.592,-110.034,40.21,-104.811,41.51,-105.811,41.21,-104.211,40.51,-104.211,41.21,-105.611,41.51,-104.611,41.21,-103.011,42.21,-104.011,41.91,-104.811,41.91,-104.811,34.048,-118.28,19.832,-155.491,13.588,144.922,36.318,-86.718,32.782,-97.343,32.584,-99.707,35.208,-101.837,35.188,-106.595,33.603,-111.965,38.765,-104.837,38.737,-104.883,39.847,-104.902,40.684,-105.059,40.852,-111.827,61.343,-150.187,64.94,-147.881,58.488,-134.238,30.46,-86.549,41.33,-96.054,39.113276,-121.356137,64.303735,-149.148768,76.534322,-68.718288,41.875523,-87.634038,35.145865,-89.979153,43.663448,-70.278127,43.612156,-116.231845],missileArray:k,clearMissiles:()=>{const e=a.keepTrackApi.getUiManager(),t=a.keepTrackApi.getCatalogManager();e.doSearch("");const n=t.missileSats;for(let e=0;e<500;e++){const i=n-500+e,o=t.getSat(i);o.active=!1,o.latList=[],o.lonList=[],o.name="",o.startTime=0,t.setSat(i,o),t.satCruncher.postMessage({id:o.id,typ:"newMissile",ON:"RV_"+o.id,satId:o.id,static:o.static,missile:o.missile,active:o.active,type:o.type,name:o.id,latList:o.latList,lonList:o.lonList,altList:o.altList,startTime:o.startTime}),o.id&&a.keepTrackApi.getOrbitManager().updateOrbitBuffer(o.id,{missile:!0,latList:[],lonList:[],altList:[]})}A.missilesInUse=0},Missile:(e,t,n,i,r,l,s,S,b,y,_,T,P,x)=>{const G=a.keepTrackApi.getCatalogManager().getSat(l);if(b=b||17,y=y||3.1,e>90||e<-90)return 0;if(t>180||t<-180)return 0;if(n>90||n<-90)return A.lastMissileErrorType="critical",A.lastMissileError="Error: Target Latitude must be<br>between 90 and -90 degrees",0;if(i>180||i<-180)return A.lastMissileErrorType="critical",A.lastMissileError="Error: Target Longitude must be<br>between 90 and -90 degrees",0;if(r>12)return 0;if(r%1>0)return 0;void 0===x&&(x=0),c=6371e3,m=287,g=6.67384*Math.pow(10,-11),u=5.9726*Math.pow(10,24);const L=[],w=[],[M,O,,E,R,D]=((e,t,n,a)=>{const i=c,o=e*Math.PI/180,r=t*Math.PI/180,l=n*Math.PI/180,s=a*Math.PI/180;let u;s-r>=-180&&s-r<=180&&(u=s-r),s-r>180&&(u=s-r-2*Math.PI),s-r<-180&&(u=s-r+2*Math.PI);const d=Math.atan2(Math.sin(u),Math.cos(o)*Math.tan(l)-Math.sin(o)*Math.cos(u)),h=Math.acos(Math.sin(o)*Math.sin(l)+Math.cos(o)*Math.cos(l)*Math.cos(u)),p=h*i,m=Math.asin(Math.sin(d)*Math.cos(o)),g=Math.atan2(Math.tan(o),Math.cos(d)),f=g+h,k=r-Math.atan2(Math.sin(m)*Math.sin(g),Math.cos(g)),S=[],v=[],C=[],A=[],b=[],y=[],_=[],T=[],P=[];let x;for(let e=0;e<=2400;e++){const t=g+e*(f-g)/2e3,n=180*Math.asin(Math.cos(m)*Math.sin(t))/Math.PI,a=180*(k+Math.atan2(Math.sin(m)*Math.sin(t),Math.cos(t)))/Math.PI;2e3===e&&(x=(t-g)*i),P.push((t-g)*i/1e3),a>=-180&&a<=180?(y.push(a),v.push(n)):a<-180?(T.push(a+360),A.push(n)):a>180&&(_.push(a-360),C.push(n))}for(const e of v)S.push(e);for(const e of C)S.push(e);for(const e of A)S.push(e);for(const e of y)b.push(e);for(const e of _)b.push(e);for(const e of T)b.push(e);return[S,b,180*d/Math.PI,p,P,x]})(e,t,n,i);if(E<32e4)return A.lastMissileErrorType="critical",A.lastMissileError="Error: This missile has a minimum distance of 320 km.",0;if(E>1e3*T)return A.lastMissileErrorType="critical",A.lastMissileError=`Error: This missile has a maximum distance of ${T} km.`,0;const N=x*(Math.min(3,T/(E/1e3))/2);p=500*r;const B=.050389573*y,U=.25*Math.PI*Math.pow(y,2),I=.25*Math.PI*b*(Math.pow(y,2)-Math.pow(y-B,2))*1628.75,W=407.1875*Math.PI*(.4937*b)*(Math.pow(y,2)-Math.pow(y-B,2)),F=407.1875*Math.PI*(.157*b)*(Math.pow(.75*y,2)-(Math.pow(B/2,2),2));h=_||.042,d=1750;const Y=.25*Math.PI*Math.pow(y-B,2),H=.25*Math.PI*Math.pow(.75*y-B,2),z=Y*(.651*b)+H*(.178*b);let j=d*z,V=.001,K=.001,$=0,J=0,q=0;f=1;const X=[],Z=[];let Q,ee;const te=((e,t,n,a,i,o,r,l,s,c,u,d,h,p,m,g,f)=>{const k=[];let S=0,v=0,A=0,b=0;const y=500;for(let g=0;g<y;g++)S=1*g/y/2+.5,k.push(C(e,t,n,a,i,o,r,l,s,c,u,d,h,p,m,S));let _=k[0],T=Math.abs(k[0]-f);for(let e=0;e<k.length;e++){const t=Math.abs(k[e]-f);t<T&&(T=t,_=k[e])}for(let e=0;e<y;e++)if(k[e]===_){v=e;break}S=1*v/y/2+.5,A=(v-2)/y/2+.5,b=(v+2)/y/2+.5;let P=(A+b)/2;const x=C(e,t,n,a,i,o,r,l,s,c,u,d,h,p,m,P);let G=100*Math.abs((f-x)/f);for(;G>.01&&Math.abs(b-A)>=1e-4;)P=(A+b)/2,G=100*Math.abs((f-C(e,t,n,a,i,o,r,l,s,c,u,d,h,p,m,P))/f),C(e,t,n,a,i,o,r,l,s,c,u,d,h,p,m,P)>f?b=P:A=P;return S=P,S})(Y,H,j,z,U,$,I,W,F,0,K,V,J,q,0,0,D);for(;j/d/z>.4&&$>=0;){const e=v(Y,j,U,$,I,0,K,V,J,q,0,te);j=e[0],K=e[12],$=e[13],J=e[14],q=e[16],V=e[18],Q=$,X.push(Math.round($/1e3*100)/100);for(let e=0;e<R.length;e++)if(R[e]<=J/1e3&&!(R[e+1]<=J/1e3)){L.push(Math.round(100*M[e])/100),w.push(Math.round(100*O[e])/100);break}let t=0;for(let e=0;e<Z.length;e++)t+=Z[e];Z.push(f+t)}for(;j/d/z>.19&&$>=0;){const e=v(Y,j,U,$,W,Q,K,V,J,q,0,te);j=e[0],K=e[12],$=e[13],J=e[14],q=e[16],V=e[18],ee=$,X.push(Math.round($/1e3*100)/100);for(let e=0;e<R.length;e++)if(R[e]<=J/1e3&&!(R[e+1]<=J/1e3)){L.push(Math.round(100*M[e])/100),w.push(Math.round(100*O[e])/100);break}let t=0;for(let e=0;e<Z.length;e++)t+=Z[e];Z.push(f+t)}for(;j/d/z>0&&$>=0;){const e=v(H,j,U,$,F,ee,K,V,J,q,0,te);j=e[0],K=e[12],$=e[13],J=e[14],q=e[16],V=e[18],X.push(Math.round($/1e3*100)/100);for(let e=0;e<R.length;e++)if(R[e]<=J/1e3&&!(R[e+1]<=J/1e3)){L.push(Math.round(100*M[e])/100),w.push(Math.round(100*O[e])/100);break}let t=0;for(let e=0;e<Z.length;e++)t+=Z[e];Z.push(f+t)}for(;$>0;){j=0;const e=v(H,j,U,$,F,ee,K,V,J,q,0,te);j=e[0],K=e[12],$=e[13],J=e[14],q=e[16],V=e[18],X.push(Math.round($/1e3*100)/100);for(let e=0;e<R.length;e++)if(R[e]<=J/1e3&&!(R[e+1]<=J/1e3)){L.push(Math.round(100*M[e])/100),w.push(Math.round(100*O[e])/100);break}}const ne=X.reduce((function(e,t){return Math.max(e,t)}));if(ne<N){const a=Math.min(3,N/ne);return A.Missile(e,t,n,i,r,l,s,S,b,y,_*a,T,P,x),0}return N===3*x/2?(A.lastMissileErrorType="critical",A.lastMissileError="Error: This distance is too close for the selected missile.",0):(G&&(G.static=!1,G.altList=X,G.latList=L,G.lonList=w,G.active=!0,G.missile=!0,G.type=o.g.UNKNOWN,G.id=l,G.name="RV_"+G.id,G.maxAlt=ne,G.startTime=s,P&&(G.country=P),G.apogee&&delete G.apogee,G.argPe&&delete G.argPe,G.eccentricity&&delete G.eccentricity,G.inclination&&delete G.inclination,G.meanMotion&&delete G.meanMotion,G.perigee&&delete G.perigee,G.period&&delete G.period,G.raan&&delete G.raan,G.semiMajorAxis&&delete G.semiMajorAxis,G.semiMinorAxis&&delete G.semiMinorAxis,S&&(G.desc=S),k.push(G),a.keepTrackApi.getCatalogManager().satCruncher.postMessage({id:G.id,typ:"newMissile",ON:"RV_"+G.id,satId:G.id,static:G.static,missile:G.missile,active:G.active,type:G.type,name:G.id,latList:G.latList,lonList:G.lonList,altList:G.altList,startTime:G.startTime}),a.keepTrackApi.getOrbitManager().updateOrbitBuffer(l,{missile:!0,latList:G.latList,lonList:G.lonList,altList:G.altList}),A.missileArray=k),A.missilesInUse++,A.lastMissileErrorType="normal",A.lastMissileError="Missile Named RV_"+G.id+"<br>has been created.",1)},MassRaidPre:(e,t)=>{return n=void 0,i=void 0,r=function*(){A.clearMissiles(),yield fetch(t).then((e=>e.json())).then((t=>{const n=a.keepTrackApi.getCatalogManager(),i=n.missileSats;A.missilesInUse=i;for(let o=0;o<t.length;o++){const r=i-500+o;t[o].startTime=e,t[o].name=t[o].ON,t[o].country=t[o].C,n.setSat(r,t[o]);const l=n.getSat(r);l&&(l.id=i-500+o,n.satCruncher.postMessage({id:l.id,typ:"newMissile",name:"M00"+l.id,satId:l.id,static:l.static,missile:l.missile,active:l.active,type:l.type,latList:l.latList,lonList:l.lonList,altList:l.altList,startTime:l.startTime}),a.keepTrackApi.getOrbitManager().updateOrbitBuffer(l.id,{missile:!0,latList:l.latList,lonList:l.lonList,altList:l.altList}))}A.missileArray=t})),a.keepTrackApi.getUiManager().doSearch("RV_")},new((o=void 0)||(o=Promise))((function(e,t){function a(e){try{s(r.next(e))}catch(e){t(e)}}function l(e){try{s(r.throw(e))}catch(e){t(e)}}function s(t){var n;t.done?e(t.value):(n=t.value,n instanceof o?n:new o((function(e){e(n)}))).then(a,l)}s((r=r.apply(n,i||[])).next())}));var n,i,o,r},getMissileTEARR:(e,t)=>{const n={},o=a.keepTrackApi.getTimeManager().simulationTimeObj;let c=(0,r.J0)(o.getUTCFullYear(),o.getUTCMonth()+1,o.getUTCDate(),o.getUTCHours(),o.getUTCMinutes(),o.getUTCSeconds());c+=o.getUTCMilliseconds()*i.c1;const u=l.Sgp4.gstime(c);if(void 0===t){const e=a.keepTrackApi.getSensorManager();if(void 0===e.currentSensors)throw new Error("getTEARR requires a sensor or for a sensor to be currently selected.");t=e.currentSensors}if(void 0===t[0].observerGd)try{t[0].observerGd={alt:t[0].alt,lat:t[0].lat*i.qW,lon:t[0].lon*i.qW}}catch(e){throw new Error("observerGd is not set and could not be guessed.")}const d=t[0];let h;for(let t=0;t<e.altList.length;t++)if(e.startTime+1e3*t>o.getTime()){h=t;break}const p=Math.cos(e.latList[h]*i.qW),m=Math.sin(e.latList[h]*i.qW),g=Math.cos(e.lonList[h]*i.qW+u),f=Math.sin(e.lonList[h]*i.qW+u),k=(i.pq+e.altList[h])*p*g,S=(i.pq+e.altList[h])*p*f,v=(i.pq+e.altList[h])*m;let C,A;try{const e=l.Transforms.eci2lla({x:k,y:S,z:v},u);n.alt=e.alt,n.lon=e.lon,n.lat=e.lat,C=l.Transforms.eci2ecf({x:k,y:S,z:v},u),A=l.Transforms.ecf2rae(d.observerGd,C),n.az=A.az*i.I3,n.el=A.el*i.I3,n.rng=A.rng}catch(e){n.alt=0,n.lon=0,n.lat=0,n.az=0,n.el=0,n.rng=0}d.obsminaz>d.obsmaxaz?(n.az>=d.obsminaz||n.az<=d.obsmaxaz)&&n.el>=d.obsminel&&n.el<=d.obsmaxel&&n.rng<=d.obsmaxrange&&n.rng>=d.obsminrange||(n.az>=d.obsminaz2||n.az<=d.obsmaxaz2)&&n.el>=d.obsminel2&&n.el<=d.obsmaxel2&&n.rng<=d.obsmaxrange2&&n.rng>=d.obsminrange2?n.inView=!0:n.inView=!1:n.az>=d.obsminaz&&n.az<=d.obsmaxaz&&n.el>=d.obsminel&&n.el<=d.obsmaxel&&n.rng<=d.obsmaxrange&&n.rng>=d.obsminrange||n.az>=d.obsminaz2&&n.az<=d.obsmaxaz2&&n.el>=d.obsminel2&&n.el<=d.obsmaxel2&&n.rng<=d.obsmaxrange2&&n.rng>=d.obsminrange2?n.inView=!0:n.inView=!1;const b=a.keepTrackApi.getPlugin(s.O);return b&&(b.currentTEARR=n),n}}},8028:(e,t,n)=>{"use strict";n.d(t,{H:()=>D,P:()=>N});var a=n(8461),i=n(2349),o=n(9640),r=n(5999),l=n(1874),s=n(5460),c=n(2590),u=n(6349),d=n(7727),h=n(5980),p=n(3235),m=n(2171),g=n(7374),f=n(8384),k=n.n(f),S=n(3991),v=n(9959),C=n(3379),A=n.n(C),b=n(7795),y=n.n(b),_=n(569),T=n.n(_),P=n(3565),x=n.n(P),G=n(9216),L=n.n(G),w=n(4589),M=n.n(w),O=n(5739),E={};E.styleTagTransform=M(),E.setAttributes=x(),E.insert=T().bind(null,"head"),E.domAPI=y(),E.insertStyleElement=L(),A()(O.Z,E),O.Z&&O.Z.locals&&O.Z.locals;var R=n(5704);class D extends v.c{constructor(){super(D.PLUGIN_NAME),this.dependencies=[R.P.PLUGIN_NAME],this.isorbitalDataLoaded=!1,this.issecondaryDataLoaded=!1,this.issensorInfoLoaded=!1,this.islaunchDataLoaded=!1,this.issatMissionDataLoaded=!1,this.isintelDataLoaded=!1,this.secondaryData=e=>{null!=e&&(this.issecondaryDataLoaded||(D.createSecondaryData(),this.issecondaryDataLoaded=!0))},this.satMissionData=e=>{null!=e&&(this.issatMissionDataLoaded||(D.createSatMissionData(),this.issatMissionDataLoaded=!0),D.updateSatMissionData(e))},this.intelData=(e,t)=>{-1!==t&&(this.isintelDataLoaded||(D.createIntelData(),this.isintelDataLoaded=!0),D.updateIntelData(e))}}addHtml(){super.addHtml(),o.keepTrackApi.register({method:o.M8.selectSatData,cbName:`${this.PLUGIN_NAME}_orbitalData`,cb:this.orbitalData.bind(this)}),o.keepTrackApi.register({method:o.M8.selectSatData,cbName:`${this.PLUGIN_NAME}_secondaryData`,cb:this.secondaryData.bind(this)}),o.keepTrackApi.register({method:o.M8.selectSatData,cbName:`${this.PLUGIN_NAME}_sensorInfo`,cb:this.sensorInfo.bind(this)}),o.keepTrackApi.register({method:o.M8.selectSatData,cbName:`${this.PLUGIN_NAME}_launchData`,cb:this.launchData.bind(this)}),o.keepTrackApi.register({method:o.M8.selectSatData,cbName:`${this.PLUGIN_NAME}_satMissionData`,cb:this.satMissionData.bind(this)}),o.keepTrackApi.register({method:o.M8.selectSatData,cbName:`${this.PLUGIN_NAME}_intelData`,cb:this.intelData.bind(this)}),o.keepTrackApi.register({method:o.M8.selectSatData,cbName:`${this.PLUGIN_NAME}_objectData`,cb:D.updateObjectData})}orbitalData(e){null!=e&&(this.isorbitalDataLoaded||(D.createOrbitalData(),this.isorbitalDataLoaded=!0,setTimeout((()=>{this.orbitalData(e)}),500)),D.updateOrbitData(e))}static nearObjectsLinkClick(e=100){const t=o.keepTrackApi.getCatalogManager();if(-1===t.selectedSat)return;const n=t.selectedSat,a=[];let r=t.getSat(n,i.C_.POSITION_ONLY).position;const l=r.x-e,c=r.x+e,u=r.y-e,d=r.y+e,h=r.z-e,p=r.z+e;(0,s.G)("search").value="";for(let e=0;e<t.numSats;e++)r=t.getSat(e,i.C_.POSITION_ONLY).position,r.x<c&&r.x>l&&r.y<d&&r.y>u&&r.z<p&&r.z>h&&a.push(t.getSat(e,i.C_.EXTRA_ONLY).sccNum);for(let e=0;e<a.length;e++)(0,s.G)("search").value+=e<a.length-1?a[e]+",":a[e];o.keepTrackApi.getUiManager().doSearch((0,s.G)("search").value.toString())}static nearOrbitsLink(){const e=a.I.get(i.Yv.CatalogManager),t=p.w.findObjsByOrbit(e.satData,e.getSat(e.selectedSat)),n=h.R.doArraySearch(e,t);o.keepTrackApi.getUiManager().searchManager.doSearch(n,!1)}static allObjectsLink(){const e=a.I.get(i.Yv.CatalogManager);if(-1===e.selectedSat)return;const t=e.getSat(e.selectedSat,i.C_.EXTRA_ONLY).intlDes.slice(0,8);o.keepTrackApi.getUiManager().doSearch(t),(0,s.G)("search").value=t}static drawLineToSun(){const e=a.I.get(i.Yv.DrawManager);d.B.create("sat2",[o.keepTrackApi.getCatalogManager().selectedSat,e.sceneManager.sun.drawPosition[0],e.sceneManager.sun.drawPosition[1],e.sceneManager.sun.drawPosition[2]],"o")}static drawLineToEarth(){d.B.create("sat",o.keepTrackApi.getCatalogManager().selectedSat,"p")}static drawLineToSat(){const e=a.I.get(i.Yv.CatalogManager);-1==e.secondarySat&&o.keepTrackApi.getUiManager().toast("No Secondary Satellite Selected","caution"),d.B.create("sat5",[e.selectedSat,e.secondarySat],"b")}launchData(e){null!=e&&(this.islaunchDataLoaded||(D.createLaunchData(),this.islaunchDataLoaded=!0),D.updateLaunchData(e))}static updateLaunchData(e){D.updateCountryCorrelationTable(e);let{missileLV:t,satLvString:n}=D.updateLaunchSiteCorrelationTable(e);D.updateLaunchVehicleCorrelationTable(e,t,n),(0,s.G)("sat-configuration").innerHTML=""!==e.configuration?e.configuration:"Unknown"}static updateLaunchVehicleCorrelationTable(e,t,n){return e.missile?(e.launchVehicle=t,(0,s.G)("sat-vehicle").innerHTML=e.launchVehicle):((0,s.G)("sat-vehicle").innerHTML=e.launchVehicle,"U"===e.launchVehicle&&((0,s.G)("sat-vehicle").innerHTML="Unknown"),n=g.n.extractLiftVehicle(e.launchVehicle),(0,s.G)("sat-vehicle").innerHTML=n,"Unknown"!==n&&(0,s.G)("sat-vehicle").addEventListener("click",(e=>{e.preventDefault(),(0,r.Us)((0,s.G)("sat-vehicle").href)}))),n}static updateLaunchSiteCorrelationTable(e){let t,n,a=[],i={};return e.missile?(a=e.desc.split("("),n=a[0].substr(0,a[0].length-1),t=e.desc.split("(")[1].split(")")[0],i.site=n,i.sitec=e.country):i=g.n.extractLaunchSite(e.launchSite),(0,s.G)("sat-site").innerHTML=i.site,(0,s.G)("sat-sitec").innerHTML=i.sitec,{missileLV:t,satLvString:void 0}}static updateCountryCorrelationTable(e){var t;if((null===(t=e.country)||void 0===t?void 0:t.length)>4)(0,s.G)("sat-country").innerHTML=e.country;else{const t=g.n.extractCountry(e.country);(0,s.G)("sat-country").innerHTML=t}}static createLaunchData(){(0,s.G)("sat-infobox").insertAdjacentHTML("beforeend",o.keepTrackApi.html`
            <div class="sat-info-section-header">Object Data</div>
            <div class="sat-info-row">
              <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                data-tooltip="Type of Object">Type</div>
              <div class="sat-info-value" id="sat-type">PAYLOAD</div>
            </div>
            <div class="sat-info-row sat-only-info">
              <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                data-tooltip="Country That Owns the Object">Country</div>
              <div class="sat-info-value" id="sat-country">COUNTRY</div>
            </div>
            <div class="sat-info-row" id="sat-site-row">
              <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                data-tooltip="Location Where Object Launched From">Site</div>
              <div class="sat-info-value" id="sat-site">SITE</div>
              </div>
            <div class="sat-info-row">
              <div class="sat-info-keytooltipped" data-position="top" data-delay="50"
                data-tooltip="Country Where Object Launched From"></div>
              <div class="sat-info-value" id="sat-sitec">LAUNCH COUNTRY</div>
            </div>
            <div class="sat-info-row">
              <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                data-tooltip="Space Lift Vehicle That Launched Object">Rocket</div>
              <div class="sat-info-value" id="sat-vehicle">VEHICLE</div>
            </div>
            <div class="sat-info-row sat-only-info">
            <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
              data-tooltip="Configuration of the Rocket">
              Configuration
            </div>
            <div class="sat-info-value" id="sat-configuration">
              NO DATA
            </div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
              data-tooltip="Radar Cross Section - How reflective the object is to a radar">
              RCS
            </div>
            <div class="sat-info-value tooltipped" data-position="top" data-delay="50" id="sat-rcs">NO DATA</div>
          </div>
          <div class="sat-info-row sat-only-info">
            <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
              data-tooltip="Standard Magnitude - Smaller Numbers Are Brighter">
              Standard Mag
            </div>
            <div class="sat-info-value" id="sat-stdmag">
              NO DATA
            </div>
          </div>
          `)}static createSecondaryData(){(0,s.G)("sat-infobox").insertAdjacentHTML("beforeend",o.keepTrackApi.html`
          <div id="secondary-sat-info">
            <div class="sat-info-section-header">Secondary Satellite</div>
            <div class="sat-info-row">
              <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                data-tooltip="Linear Distance from Secondary Satellite">
                Linear
              </div>
              <div class="sat-info-value" id="sat-sec-dist">xxxx km</div>
            </div>
            <div class="sat-info-row">
              <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                data-tooltip="Radial Distance">
                Radial
              </div>
              <div class="sat-info-value" id="sat-sec-rad">XX deg</div>
            </div>
            <div class="sat-info-row">
              <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                data-tooltip="In-Track Distance from Secondary Satellite">
                In-Track
              </div>
              <div class="sat-info-value" id="sat-sec-intrack">XX deg</div>
            </div>
            <div class="sat-info-row">
              <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                data-tooltip="Cross-Track Distance from Secondary Satellite">
                Cross-Track
              </div>
              <div class="sat-info-value" id="sat-sec-crosstrack">xxxx km</div>
            </div>
          </div>
          `)}static createOrbitalData(){(0,s.G)("ui-wrapper").insertAdjacentHTML("beforeend",o.keepTrackApi.html`
            <div id="sat-infobox" class="text-select satinfo-fixed start-hidden">
              <div id="sat-info-top-links">
                <div id="sat-info-title" class="center-text sat-info-section-header sat-info-title-header">This is a title</div>
                <div id="all-objects-link" class="link sat-infobox-links sat-only-info tooltipped" data-position="top" data-delay="50"
                data-tooltip="Find Related Objects">Find all objects from this launch...</div>
                <div id="near-orbits-link" class="link sat-infobox-links sat-only-info tooltipped" data-position="top" data-delay="50"
                data-tooltip="Find Objects in Orbital Plane">Find all objects near this orbit...</div>
                <div id="near-objects-link1" class="link sat-infobox-links tooltipped" data-position="top" data-delay="50"
                data-tooltip="Find Nearby Objects">Find all objects within 100km...</div>
                <div id="near-objects-link2" class="link sat-infobox-links tooltipped" data-position="top" data-delay="50"
                data-tooltip="Find Nearby Objects">Find all objects within 200km...</div>
                <div id="near-objects-link4" class="link sat-infobox-links tooltipped" data-position="top" data-delay="50"
                data-tooltip="Find Nearby Objects">Find all objects within 400km...</div>
                <div id="sun-angle-link" class="link sat-infobox-links tooltipped" data-position="top" data-delay="50"
                data-tooltip="Visualize Angle to Sun">Draw sat to sun line...</div>
                <div id="nadir-angle-link" class="link sat-infobox-links tooltipped" data-position="top" data-delay="50"
                data-tooltip="Visualize Angle to Earth">Draw sat to nadir line...</div>
                <div id="sec-angle-link" class="link sat-infobox-links tooltipped" data-position="top" data-delay="50"
                data-tooltip="Visualize Angle to Secondary Satellite">Draw sat to second sat line...</div>
              </div>
              <div id="sat-identifier-data">
                <div class="sat-info-section-header">Identifiers</div>
                <div class="sat-info-row sat-only-info">
                  <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                  data-tooltip="International Designator - Launch Year, Launch Number, and Piece Designator">COSPAR</div>
                  <div class="sat-info-value" id="sat-intl-des">xxxx-xxxA</div>
                </div>
                <div class="sat-info-row sat-only-info">
                  <div class="sat-info-key" tooltipped" data-position="top" data-delay="50"
                  data-tooltip="USSF Catalog Number - Originally North American Air Defense (NORAD)">NORAD</div>
                  <div class="sat-info-value" id="sat-objnum">99999</div>
                </div>
                <div class="sat-info-row sat-only-info">
                  <div class="sat-info-key">Alt ID</div>
                  <div class="sat-info-value" id="sat-altid">99999</div>
                </div>
                <div class="sat-info-row sat-only-info">
                  <div class="sat-info-key">Source</div>
                  <div class="sat-info-value" id="sat-source">USSF</div>
                </div>
              </div>
              <div class="sat-info-section-header">Orbit Data</div>
              <div class="sat-info-row sat-only-info">
                <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                  data-tooltip="Highest Point in the Orbit">
                  Apogee
                </div>
                <div class="sat-info-value" id="sat-apogee">xxx km</div>
              </div>
              <div class="sat-info-row sat-only-info">
                <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                  data-tooltip="Lowest Point in the Orbit">
                  Perigee
                </div>
                <div class="sat-info-value" id="sat-perigee">xxx km</div>
              </div>
              <div class="sat-info-row sat-only-info">
                <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                  data-tooltip="Angle Measured from Equator on the Ascending Node">
                  Inclination
                </div>
                <div class="sat-info-value" id="sat-inclination">xxx.xx</div>
              </div>
              <div class="sat-info-row sat-only-info">
                <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                  data-tooltip="How Circular the Orbit Is (0 is a Circle)">
                  Eccentricity
                </div>
                <div class="sat-info-value" id="sat-eccentricity">x.xx</div>
              </div>
              <div class="sat-info-row sat-only-info">
                <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                  data-tooltip="Where it Rises Above the Equator">
                  Right Asc.
                </div>
                <div class="sat-info-value" id="sat-raan">x.xx</div>
              </div>
              <div class="sat-info-row sat-only-info">
                <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                  data-tooltip="Where the Lowest Part of the Orbit Is">
                  Arg of Perigee
                </div>
                <div class="sat-info-value" id="sat-argPe">x.xx</div>
              </div>
              <div class="sat-info-row">
                <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                  data-tooltip="Current Latitude Over Earth">
                  Latitude
                </div>
                <div class="sat-info-value" id="sat-latitude">x.xx</div>
              </div>
              <div class="sat-info-row">
                <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                  data-tooltip="Current Longitude Over Earth">
                  Longitude
                </div>
                <div class="sat-info-value" id="sat-longitude">x.xx</div>
              </div>
              <div class="sat-info-row">
                <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                  data-tooltip="Current Altitude Above Sea Level">
                  Altitude
                </div>
                <div class="sat-info-value" id="sat-altitude">xxx km</div>
              </div>
              <div class="sat-info-row sat-only-info">
                <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                  data-tooltip="Time for One Complete Revolution Around Earth">
                  Period
                </div>
                <div class="sat-info-value" id="sat-period">xxx min</div>
              </div>
              <div class="sat-info-row sat-only-info">
                <div class="sat-info-key tooltipped" data-position="top" data-delay="50"
                  data-tooltip="Current Velocity of the Satellite (Higher the Closer to Earth it Is)">
                  Velocity
                </div>
                <div class="sat-info-value" id="sat-velocity">xxx km/s</div>
    <p>

