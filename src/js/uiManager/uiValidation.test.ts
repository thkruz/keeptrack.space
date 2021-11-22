import * as uiValidation from './uiValidation';
describe('uiValidation.validateNumOnly', () => {
  test('0', () => {
    let result = uiValidation.validateNumOnly(<KeyboardEvent>{ code: 'Numpad0', preventDefault: () => {} });
    expect(result).toMatchSnapshot();
  });
  test('1', () => {
    let result = uiValidation.validateNumOnly(<KeyboardEvent>{ code: 'Digit5', preventDefault: () => {} });
    expect(result).toMatchSnapshot();
  });
  test('2', () => {
    let result = uiValidation.validateNumOnly(<KeyboardEvent>{ code: 'Home', preventDefault: () => {} });
    expect(result).toMatchSnapshot();
  });
  test('3', () => {
    let result = uiValidation.validateNumOnly(<KeyboardEvent>{ code: 'Backspace', preventDefault: () => {} });
    expect(result).toMatchSnapshot();
  });
  test('4', () => {
    let result = uiValidation.validateNumOnly(<KeyboardEvent>{ code: 'Enter', preventDefault: () => {} });
    expect(result).toMatchSnapshot();
  });
  test('5', () => {
    let result = uiValidation.validateNumOnly(<KeyboardEvent>{ code: 'KeyA', ctrlKey: true, preventDefault: () => {} });
    expect(result).toMatchSnapshot();
  });
  test('6', () => {
    let result = uiValidation.validateNumOnly(<KeyboardEvent>{ code: 'KeyA', ctrlKey: false, preventDefault: () => {} });
    expect(result).toMatchSnapshot();
  });
});

describe('uiValidation.allowPeriod', () => {
  test('0', () => {
    let result = uiValidation.allowPeriod(<KeyboardEvent>{ code: 'KeyA', ctrlKey: false, preventDefault: () => {} });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result = uiValidation.allowPeriod(<KeyboardEvent>{ code: 'Period', preventDefault: () => {} });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result = uiValidation.allowPeriod(<KeyboardEvent>{ code: 'NumpadDecimal', preventDefault: () => {} });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiValidation.esDay366', () => {
  test('0', () => {
    let result: any = uiValidation.esDay366();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    document.body.innerHTML = `<input id="es-day" value="367" />`;
    let result: any = uiValidation.esDay366();
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    document.body.innerHTML = `<input id="es-day" value="-1" />`;
    let result: any = uiValidation.esDay366();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiValidation.esInc180', () => {
  test('0', () => {
    let result: any = uiValidation.esInc180();
    expect(result).toMatchSnapshot();
  });
  test('1', () => {
    document.body.innerHTML = `<input id="es-inc" value="181" />`;
    let result: any = uiValidation.esInc180();
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    document.body.innerHTML = `<input id="es-inc" value="-1" />`;
    let result: any = uiValidation.esInc180();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiValidation.esRasc360', () => {
  test('0', () => {
    let result: any = uiValidation.esRasc360();
    expect(result).toMatchSnapshot();
  });
  test('1', () => {
    document.body.innerHTML = `<input id="es-rasc" value="361" />`;
    let result: any = uiValidation.esRasc360();
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    document.body.innerHTML = `<input id="es-rasc" value="-1" />`;
    let result: any = uiValidation.esRasc360();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiValidation.esMeanmo18', () => {
  test('0', () => {
    let result: any = uiValidation.esMeanmo18();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    document.body.innerHTML = `<input id="es-meanmo" value="361" />`;
    let result: any = uiValidation.esMeanmo18();
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    document.body.innerHTML = `<input id="es-meanmo" value="-1" />`;
    let result: any = uiValidation.esMeanmo18();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiValidation.esArgPe360', () => {
  test('0', () => {
    let result: any = uiValidation.esArgPe360();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    document.body.innerHTML = `<input id="es-argPe" value="361" />`;
    let result: any = uiValidation.esArgPe360();
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    document.body.innerHTML = `<input id="es-argPe" value="-1" />`;
    let result: any = uiValidation.esArgPe360();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiValidation.esMeana360', () => {
  test('0', () => {
    let result: any = uiValidation.esMeana360();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    document.body.innerHTML = `<input id="es-meana" value="361" />`;
    let result: any = uiValidation.esMeana360();
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    document.body.innerHTML = `<input id="es-meana" value="-1" />`;
    let result: any = uiValidation.esMeana360();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiValidation.msLat90', () => {
  test('0', () => {
    let result: any = uiValidation.msLat90();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    document.body.innerHTML = `<input id="ms-lat" value="-91" />`;
    let result: any = uiValidation.msLat90();
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    document.body.innerHTML = `<input id="ms-lat" value="91" />`;
    let result: any = uiValidation.msLat90();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiValidation.msLon180', () => {
  test('0', () => {
    let result: any = uiValidation.msLon180();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    document.body.innerHTML = `<input id="ms-lon" value="181" />`;
    let result: any = uiValidation.msLon180();
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    document.body.innerHTML = `<input id="ms-lon" value="-181" />`;
    let result: any = uiValidation.msLon180();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiValidation.initUiValidation', () => {
  test('0', () => {
    let result: any = uiValidation.initUiValidation();
    expect(result).toMatchSnapshot();
  });
});
