/* Acceptance tests from the pipework sizer change specification.
   Reference: 16 l/s, 100.0 mm ID, stainless new ε = 0.015 mm. Tolerance ±1%.
   Viscosity is always temperature-corrected (Al-Shemmeri, clamped 0–100 °C). */
function waterRho(T) {
  return ((1.051865e-05 * T - 5.171329e-03) * T - 6.179237e-03) * T + 1000.068;
}

function clampTempC(T_C) {
  if (!(T_C >= 0)) return 0;
  if (T_C > 100) return 100;
  return T_C;
}

function waterMuDerived(T_C) {
  const T_K = clampTempC(T_C) + 273.15;
  return 2.414e-5 * Math.pow(10, 247.8 / (T_K - 140));
}

function resolveMu(T_C) {
  const inRange = T_C >= 0 && T_C <= 100;
  return {
    mu: waterMuDerived(T_C),
    source: 'temperature corrected',
    warning: !inRange
  };
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
  const muRes = resolveMu(5);
  const r = calcPD(Q, id_m, rho, muRes.mu, eps);
  ok(within(muRes.mu, 0.0015), 'Test 3 µ ' + muRes.mu.toFixed(6) + ' ≈ 0.001500');
  ok(muRes.source === 'temperature corrected', 'Test 3 source is temperature corrected');
  ok(within(r.Re, 135800), 'Test 3 Re ' + r.Re.toFixed(0) + ' ≈ 135800');
  ok(within(r.f, 0.01779), 'Test 3 f ' + r.f.toFixed(5) + ' ≈ 0.01779');
  ok(within(r.pd, 369), 'Test 3 Δp/m ' + r.pd.toFixed(1) + ' ≈ 369');
}

{
  const rho = waterRho(70);
  const muRes = resolveMu(70);
  const rT = calcPD(Q, id_m, rho, muRes.mu, eps);
  ok(within(muRes.mu, 0.0004), 'Test 4 µ ' + muRes.mu.toFixed(6) + ' ≈ 0.000400');
  ok(within(rT.pd, 305), 'Test 4 temperature Δp/m ' + rT.pd.toFixed(1) + ' ≈ 305');
}

{
  const rho = waterRho(5);
  const r = calcPD(Q, id_m, rho, resolveMu(5).mu, 0);
  // Swamee–Jain at ε = 0 is ~349 Pa/m. The third-party smooth-pipe
  // figure of 353 Pa/m uses a slightly higher f (0.0170 vs 0.0168).
  ok(within(r.pd, 349, 0.015), 'Test 6 Swamee–Jain ε=0 Δp/m ' + r.pd.toFixed(1) + ' ≈ 349');
  ok(within(r.pd, 353, 0.02), 'Test 6 within 2% of third-party 353 Pa/m (' + r.pd.toFixed(1) + ')');
}

{
  const low = resolveMu(-10);
  const high = resolveMu(140);
  ok(within(low.mu, waterMuDerived(0)), 'Out-of-range low T clamps to 0 °C');
  ok(low.warning, 'Out-of-range low T sets warning');
  ok(within(high.mu, waterMuDerived(100)), 'Out-of-range high T clamps to 100 °C');
  ok(high.warning, 'Out-of-range high T sets warning');
}

{
  const CS = [
    {dn:15, od:21.3, wall:2.0, id:17.3, kgm:0.947},
    {dn:20, od:26.9, wall:2.3, id:22.3, kgm:1.380},
    {dn:25, od:33.7, wall:2.6, id:28.5, kgm:1.980},
    {dn:32, od:42.4, wall:2.6, id:37.2, kgm:2.540},
    {dn:40, od:48.3, wall:2.9, id:42.5, kgm:3.230},
    {dn:50, od:60.3, wall:2.9, id:54.5, kgm:4.080},
    {dn:65, od:76.1, wall:3.2, id:69.7, kgm:5.710},
    {dn:80, od:88.9, wall:3.2, id:82.5, kgm:6.720},
    {dn:100, od:114.3, wall:3.6, id:107.1, kgm:9.750},
    {dn:125, od:139.7, wall:4.0, id:131.7, kgm:13.39},
    {dn:150, od:168.3, wall:4.5, id:159.3, kgm:18.18},
    {dn:200, od:219.1, wall:5.0, id:209.1, kgm:26.40},
    {dn:250, od:273.0, wall:5.0, id:263.0, kgm:33.05},
    {dn:300, od:323.9, wall:5.6, id:312.7, kgm:43.97},
    {dn:350, od:355.6, wall:5.6, id:344.4, kgm:48.34}
  ];
  ok(CS.length === 15, 'CS table has 15 sizes including DN350');
  ok(CS[8].id === 107.1 && CS[8].od === 114.3 && CS[8].kgm === 9.750, 'CS DN100 is 114.3 / 107.1 / 9.750');
  CS.forEach(p => {
    ok(Math.abs((p.od - 2 * p.wall) - p.id) < 0.05, 'CS DN' + p.dn + ' ID = OD − 2×wall');
  });
}

{
  const SS = [
    {dn:15, od:18, wall:1.5, id:15, kgm:0.62},
    {dn:20, od:23, wall:1.5, id:20, kgm:0.81},
    {dn:25, od:28, wall:1.5, id:25, kgm:0.99},
    {dn:32, od:35, wall:1.5, id:32, kgm:1.26},
    {dn:40, od:43, wall:1.5, id:40, kgm:1.56},
    {dn:50, od:53, wall:1.5, id:50, kgm:1.93},
    {dn:65, od:69, wall:2.0, id:65, kgm:3.30},
    {dn:80, od:84, wall:2.0, id:80, kgm:4.10},
    {dn:100, od:104, wall:2.0, id:100, kgm:5.01},
    {dn:125, od:129, wall:2.0, id:125, kgm:6.35},
    {dn:150, od:154, wall:2.0, id:150, kgm:7.60},
    {dn:200, od:204, wall:2.0, id:200, kgm:10.30},
    {dn:250, od:254, wall:2.0, id:250, kgm:12.60},
    {dn:300, od:304, wall:2.0, id:300, kgm:15.12}
  ];
  ok(SS.length === 14, 'SS table has 14 sizes, DN15–DN300');
  ok(SS[8].od === 104 && SS[8].id === 100 && SS[8].kgm === 5.01, 'SS DN100 is 104 / 100 / 5.01');
  ok(SS[0].od === 18 && SS[0].kgm === 0.62, 'SS DN15 published infill 18 / 0.62');
  ok(SS[3].od === 35 && SS[3].kgm === 1.26, 'SS DN32 published infill 35 / 1.26');
  ok(SS[13].od === 304 && SS[13].kgm === 15.12, 'SS DN300 published infill 304 / 15.12');
  SS.forEach(p => {
    ok(p.id === p.dn, 'SS DN' + p.dn + ' ID = DN (true bore)');
    ok(Math.abs((p.od - 2 * p.wall) - p.id) < 0.05, 'SS DN' + p.dn + ' ID = OD − 2×wall');
  });
}

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall acceptance checks passed');
