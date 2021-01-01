class Schematic {
  #gl;
  #satSet;
  #iSensor;
  #hoverSat;
  #selectSat;
  constructor(gl, satSet, iSensor, objectManager, colorizer) {
    this.colorizer = colorizer;
    this.#gl = gl;
    this.#satSet = satSet;
    this.#iSensor = iSensor;
    this.#hoverSat = objectManager.hoveringSat;
    this.#selectSat = objectManager.selectedSat;
    this.colorBuf = gl.createBuffer();
    this.pickableBuf = gl.createBuffer();
  }

  // Removed from function to reduce memory leak
  calculateColorBuffers(isForceRecolor) {
    var numSats, colorData, pickableData, colors, i;
    var lastCalculation = 0;
    var now = Date.now();
    if (!pickableData || !colorData) {
      this.lastCalculation = now;
      numSats = this.#satSet.numSats;
      colorData = new Float32Array(numSats * 4);
      pickableData = new Float32Array(numSats); // Broke as an Int8
    }

    if (!isForceRecolor && now - lastCalculation < settingsManager.reColorMinimumTime && lastCalculation !== 0) {
      return {
        colorBuf: this.colorBuf,
        pickableBuf: this.pickableBuf,
      };
    }
    lastCalculation = now;

    var satData = this.#satSet.getSatData();
    var satInView = this.#satSet.getSatInView();
    var satInSun, satVel;
    if (this.isVelocityColorScheme) {
      satVel = this.#satSet.getSatVel();
    }
    this.#iSensor = -1; // Start at -1 so the first use is 0

    // Don't Calculate the Colors of things you can't see
    if (!settingsManager.isFOVBubbleModeOn && !settingsManager.isShowSurvFence && !settingsManager.isSatOverflyModeOn) numSats -= settingsManager.maxFieldOfViewMarkers;

    if (this.default) {
      // debugger;
    }

    if (this.isSunlightColorScheme) {
      satInSun = this.#satSet.getSatInSun();
    }

    let sat;
    for (i = 0; i < numSats; i++) {
      sat = satData[i];
      if (satInView) sat.inView = satInView[i];
      if (satInSun) sat.inSun = satInSun[i];

      if (this.isVelocityColorScheme) {
        sat.velocity.total = Math.sqrt(satVel[i * 3] * satVel[i * 3] + satVel[i * 3 + 1] * satVel[i * 3 + 1] + satVel[i * 3 + 2] * satVel[i * 3 + 2]);
      }

      // if (!isFirstMarkerChecked) { // Markers Color Can't Change so Don't Keep Checking
      colors = this.colorizer(sat); // Run the colorscheme below

      // }
      // isFirstMarkerChecked = colors.marker; // First Marker Checked Returns True
      if (typeof colors == 'undefined') continue;
      try {
        colorData[i * 4] = colors.color[0]; // R
        colorData[i * 4 + 1] = colors.color[1]; // G
        colorData[i * 4 + 2] = colors.color[2]; // B
        colorData[i * 4 + 3] = colors.color[3]; // A
        pickableData[i] = colors.pickable ? 1 : 0;
      } catch (e) {
        continue;
      }

      // debugger
      if (i == this.#selectSat) {
        colorData[i * 4] = settingsManager.selectedColor[0]; // R
        colorData[i * 4 + 1] = settingsManager.selectedColor[1]; // G
        colorData[i * 4 + 2] = settingsManager.selectedColor[2]; // B
        colorData[i * 4 + 3] = settingsManager.selectedColor[3]; // A
      }

      try {
        if (i == this.#hoverSat) {
          colorData[i * 4] = settingsManager.hoverColor[0]; // R
          colorData[i * 4 + 1] = settingsManager.hoverColor[1]; // G
          colorData[i * 4 + 2] = settingsManager.hoverColor[2]; // B
          colorData[i * 4 + 3] = settingsManager.hoverColor[3]; // A
        }
      } catch (e) {
        // Don't let one bad color setting break everything
      }
    }

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.colorBuf);
    this.#gl.bufferData(this.#gl.ARRAY_BUFFER, colorData, this.#gl.STATIC_DRAW);
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.pickableBuf);
    this.#gl.bufferData(this.#gl.ARRAY_BUFFER, pickableData, this.#gl.STATIC_DRAW);

    return {
      colorBuf: this.colorBuf,
      pickableBuf: this.pickableBuf,
    };
  }
}

export { Schematic };
