export const convertA5to6Digit = (sccNum: string): string => {
  if (sccNum[0].match(/[a-z]/iu)) {
    // Extract the trailing 4 digits
    const rest = sccNum.slice(1, 5);

    // Convert the first letter to a two digit number. Skip I and O as they look too similar to 1 and 0
    // A=10, B=11, C=12, D=13, E=14, F=15, G=16, H=17, J=18, K=19, L=20, M=21, N=22, P=23, Q=24, R=25, S=26, T=27, U=28, V=29, W=30, X=31, Y=32, Z=33
    let first = sccNum[0].toUpperCase().charCodeAt(0) - 55;
    const iPlus = first >= 18 ? 1 : 0;
    const tPlus = first >= 24 ? 1 : 0;
    first = first - iPlus - tPlus;

    return `${first}${rest}`;
  } else {
    return sccNum;
  }
};
