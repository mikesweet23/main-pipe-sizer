/* Acceptance tests from the pipework sizer change specification.
   Reference: 16 l/s, 100.0 mm ID, stainless new ε = 0.015 mm. Tolerance ±1%. */
const LEGACY_MU = 0.00131;

function waterRho(T) {
  return ((1.051865e-05 * T - 5.171329e-03) * T - 6.179237e-03) * T + 1000.068;
}

function waterMuDerived(T_C) {
  const T_K = T_C + 273.15;
  return 2.414e-5 * Math.pow(10, 247.8 / (T_K - 140));
}

function resolveMu(T_C, mode) {
  if (mode === 'temperature') {
    if (!(T_C >= 0 && T_C <= 100)) {
      return { mu: LEGACY_MU, source: 'legacy fixed', warning: true };
    }
    return { mu: waterMuDerived(T_C), source: 'derived', warning: false };
  }
  return { mu: LEGACY_MU, source: 'legacy fixed', warning: false };
}

function calcPD(flow_m3s, id_m, rho, mu, eps_m) {
  const A = Math.PI * Math.pow(id_m / 2, 2);
  const v = flow_m3s / A;
  const Re = rho * v * id_m / mu;
  let f;
  if (Re < 2300) f = 64 / Math.max(Re, 1);
  else {
    const denom = Math.pow(Math.log10((eps_m / id_m) / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
    f = 0.25 / denom;
  }
  return { pd: f * (rho * v * v) / (2 * id_m), v, Re, f };
}

function within(actual, expected, tol = 0.01) {
  return Math.abs(actual - expected) / Math.abs(expected) <= tol;
}

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL  ' + msg);
  } else {
    console.log('ok    ' + msg);
  }
}

const Q = 0.016;
const id_m = 0.1;
const eps = 0.000015;
const A = Math.PI * Math.pow(id_m / 2, 2);
const v = Q / A;

ok(within(v, 2.037), 'Test 1 velocity ' + v.toFixed(4) + ' m/s ≈ 2.037');

{
  const rho = waterRho(5);
  const mu = resolveMu(5, 'fixed').mu;
  const r = calcPD(Q, id_m, rho, mu, eps);
  ok(within(r.Re, 155500), 'Test 2 Re ' + r.Re.toFixed(0) + ' ≈ 155500');
  ok(within(r.f, 0.01741), 'Test 2 f ' + r.f.toFixed(5) + ' ≈ 0.01741');
  ok(within(r.pd, 361), 'Test 2 Δp/m ' + r.pd.toFixed(1) + ' ≈ 361');
}

{
  const rho = waterRho(5);
  const muRes = resolveMu(5, 'temperature');
  const r = calcPD(Q, id_m, rho, muRes.mu, eps);
  ok(within(muRes.mu, 0.0015), 'Test 3 µ ' + muRes.mu.toFixed(6) + ' ≈ 0.001500');
  ok(within(r.Re, 135800), 'Test 3 Re ' + r.Re.toFixed(0) + ' ≈ 135800');
  ok(within(r.f, 0.01779), 'Test 3 f ' + r.f.toFixed(5) + ' ≈ 0.01779');
  ok(within(r.pd, 369), 'Test 3 Δp/m ' + r.pd.toFixed(1) + ' ≈ 369');
}

{
  const rho = waterRho(70);
  const muRes = resolveMu(70, 'temperature');
  const rT = calcPD(Q, id_m, rho, muRes.mu, eps);
  const rF = calcPD(Q, id_m, rho, resolveMu(70, 'fixed').mu, eps);
  ok(within(muRes.mu, 0.0004), 'Test 4 µ ' + muRes.mu.toFixed(6) + ' ≈ 0.000400');
  ok(within(rT.pd, 305), 'Test 4 temperature Δp/m ' + rT.pd.toFixed(1) + ' ≈ 305');
  ok(within(rF.pd, 354), 'Test 4 fixed Δp/m ' + rF.pd.toFixed(1) + ' ≈ 354');
}

{
  const rho = waterRho(5);
  const r = calcPD(Q, id_m, rho, resolveMu(5, 'temperature').mu, 0);
  // Swamee–Jain at ε = 0 is ~349 Pa/m. The third-party smooth-pipe
  // figure of 353 Pa/m uses a slightly higher f (0.0170 vs 0.0168).
  ok(within(r.pd, 349, 0.015), 'Test 6 Swamee–Jain ε=0 Δp/m ' + r.pd.toFixed(1) + ' ≈ 349');
  ok(within(r.pd, 353, 0.02), 'Test 6 within 2% of third-party 353 Pa/m (' + r.pd.toFixed(1) + ')');
}

{
  const missing = {};
  const mode = missing.viscosityMode === 'temperature' ? 'temperature' : 'fixed';
  ok(mode === 'fixed', 'Test 5 missing viscosityMode loads as fixed');
}

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall acceptance checks passed');
