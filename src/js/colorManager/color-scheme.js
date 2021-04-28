class ColorScheme {
  // colorRuleSet is the rules that define which dots are what this.colors -- better name?
  constructor(gl, satSet, objectManager, colorRuleSet) {
    // Setup our references to the outside world when the ColorSchemeFactory first makes this Scheme
    this.colorRuleSet = colorRuleSet;
    this.gl = gl;
    this.satSet = satSet;
    this.iSensor = 0;
    this.lastCalculation = 0;
    this.hoverSat = objectManager.hoveringSat;
    this.selectSat = objectManager.selectedSat;

    // Generate some public buffers
    this.colorBuffer = gl.createBuffer();
    this.pickableBuffer = gl.createBuffer();
  }

  async calculateColorBuffers(isForceRecolor) {
    // These two variables only need to be set once, but we want to make sure they aren't called before the satellites
    // are loaded into satSet. Don't move the buffer data creation into the constructor!
    if (!this.pickableData || !this.colorData) {
      this.lastCalculation = this.now;
      this.colorData = new Float32Array(this.satSet.numSats * 4);
      this.pickableData = new Float32Array(this.satSet.numSats);
    }
    const gl = this.gl;

    // Determine what time it is so we know if its time to recolor everything
    this.now = Date.now();

    // Unless we are forcing a recolor
    // If there hasn't been enough time between the last recoloring skip it (performance boost)
    // Unless its the first draw - otherwise we will never color in anything
    if (!isForceRecolor && this.now - this.lastCalculation < settingsManager.reColorMinimumTime && this.lastCalculation !== 0) return;

    // Record this as the last time we calculated this.colors
    this.lastCalculation = this.now;

    // We need to know what all the satellites currently look like - ask satSet to give that information
    this.satData = this.satSet.getSatData();

    this.satInView = this.satSet.getSatInView();

    // We also need the velocity data if we are trying to colorizing that
    if (this.isVelocityColorScheme) {
      this.satVel = this.satSet.getSatVel();
    }

    // If we want to color things based on sunlight we need to get that info from satSet
    if (this.isSunlightColorScheme) {
      this.satInSun = this.satSet.getSatInSun();
    }

    // Don't Calculate the colors of things you can't see
    if (!settingsManager.isFOVBubbleModeOn && !settingsManager.isShowSurvFence && !settingsManager.isSatOverflyModeOn) {
      this.tempNumOfSats = this.satSet.numSats - settingsManager.maxFieldOfViewMarkers;
    } else {
      this.tempNumOfSats = this.satSet.numSats;
    }

    // Reset Which Sensor we are coloring before the loop begins
    this.iSensor = 0;

    // Lets loop through all the satellites and color them in one by one
    for (this.i = 0; this.i < this.tempNumOfSats; this.i++) {
      // In View data is stored in a separate array
      if (this.satInView) {
        this.satData[this.i].inView = this.satInView[this.i];
      }

      // Sun values are stored separately from the rest of satSet so it needs to be combined
      if (this.satInSun) {
        this.satData[this.i].inSun = this.satInSun[this.i];
      }

      // Velocity is stored separate from satellite details - so add in the velocity
      if (this.isVelocityColorScheme) {
        this.satData[this.i].velocity.total = Math.sqrt(this.satVel[this.i * 3] * this.satVel[this.i * 3] + this.satVel[this.i * 3 + 1] * this.satVel[this.i * 3 + 1] + this.satVel[this.i * 3 + 2] * this.satVel[this.i * 3 + 2]);
      }

      // Run the colorRuleSet function we used to create this schematic
      this.colors = this.colorRuleSet(this.satData[this.i]);

      // Don't let one bad color break the buffer
      // if (typeof this.colors == 'undefined') continue;

      // We got a Vec4 back, but we need to flatten it
      this.colorData[this.i * 4] = this.colors.color[0]; // R
      this.colorData[this.i * 4 + 1] = this.colors.color[1]; // G
      this.colorData[this.i * 4 + 2] = this.colors.color[2]; // B
      this.colorData[this.i * 4 + 3] = this.colors.color[3]; // A
      this.pickableData[this.i] = this.colors.pickable ? 1 : 0;

      // If we don't do this then everytime the color refreshes it will undo any effect being applied outside of this loop
      if (this.i == this.selectSat) {
        // Selected satellites are always one color so forget whatever we just did
        this.colorData[this.i * 4] = settingsManager.selectedColor[0]; // R
        this.colorData[this.i * 4 + 1] = settingsManager.selectedColor[1]; // G
        this.colorData[this.i * 4 + 2] = settingsManager.selectedColor[2]; // B
        this.colorData[this.i * 4 + 3] = settingsManager.selectedColor[3]; // A
      }

      if (this.i == this.hoverSat) {
        // Hover satellites are always one color so forget whatever we just did
        // We check this last so you can hover over the selected satellite
        this.colorData[this.i * 4] = settingsManager.hoverColor[0]; // R
        this.colorData[this.i * 4 + 1] = settingsManager.hoverColor[1]; // G
        this.colorData[this.i * 4 + 2] = settingsManager.hoverColor[2]; // B
        this.colorData[this.i * 4 + 3] = settingsManager.hoverColor[3]; // A
      }
    }

    // Now that we have all the information, load the color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    // And update it
    if (!this.colorBufferOneTime) {
      gl.bufferData(gl.ARRAY_BUFFER, this.colorData, gl.DYNAMIC_DRAW);
      this.colorBufferOneTime = true;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.colorData);
    }

    // Next the buffer for which objects can be picked -- different than what color they are on the pickable frame (that is in the dots class)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pickableBuffer);
    if (!this.pickableBufferOneTime) {
      gl.bufferData(gl.ARRAY_BUFFER, this.pickableData, gl.DYNAMIC_DRAW);
      this.pickableBufferOneTime = true;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pickableData);
    }
  }
}

export { ColorScheme };
