/** Pure valuation math. Rates in percent on input, ratios on output. No DOM or provenance. */
((root) => {
  const finite = (n) => Number.isFinite(n) ? n : null;
  const positive = (n) => Number.isFinite(n) && n > 0;
  const toPercent = (ratio) => Number.isFinite(ratio) ? finite(ratio * 100) : null;
  const multiple = (price, earnings) => positive(price) && positive(earnings) ? finite(price / earnings) : null;
  const future = (value, percent, years) => Number.isFinite(value) && Number.isFinite(percent)
    && percent >= -100 && Number.isFinite(years) && years >= 0 ? finite(value * Math.pow(1 + percent / 100, years)) : null;
  const cagr = (start, end, years) => positive(start) && Number.isFinite(end) && end >= 0 && positive(years)
    ? finite(Math.pow(end / start, 1 / years) - 1) : null;
  function scenario(price, eps, growth, years, pe) {
    const futureEPS = future(eps, growth, years);
    const currentPE = multiple(price, eps);
    const targetPrice = positive(futureEPS) && positive(pe) ? finite(futureEPS * pe) : null;
    return { currentPE, futureEPS, targetPrice,
      totalReturn: targetPrice !== null && positive(price) ? finite(targetPrice / price - 1) : null,
      cagr: targetPrice === null ? null : cagr(price, targetPrice, years),
      peg: currentPE !== null && positive(growth) ? finite(currentPE / growth) : null };
  }
  function reverse(price, eps, years, requiredReturn, exitPE) {
    const futurePriceRequired = positive(price) ? future(price, requiredReturn, years) : null;
    const requiredFutureEPS = futurePriceRequired !== null && positive(exitPE) ? finite(futurePriceRequired / exitPE) : null;
    return { futurePriceRequired, requiredFutureEPS,
      requiredEPSCAGR: requiredFutureEPS === null ? null : cagr(eps, requiredFutureEPS, years) };
  }
  const api = Object.freeze({ multiple, future, cagr, scenario, reverse, toPercent });
  root.NTMValuation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
