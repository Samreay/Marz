
console.log("Loading dependencies for algorithms");
var dependencies = ['../js/methods', '../js/helio'];
for (var i = 0; i < dependencies.length; i++) {
    require(dependencies[i])();
}
console.log("Dependencies loaded\n");
var tests = [];

/**
 * Tests for heliocentric corrections
 */

tests.push({
    name: "getHeliocentricVelocityCorrection test (1)",
    fn: function() { return getHeliocentricVelocityCorrection(20, 20, 2457356.5, 254.17958, 32.780361, 2788, 2000); },
    expected: -20.051029});
tests.push({
    name: "getHeliocentricVelocityCorrection test (2)",
    fn: function() { return getHeliocentricVelocityCorrection(0, 0, 2457400, 100, -40, 4000, 1900); },
    expected: -28.284173});
tests.push({
    name: "getHeliocentricVelocityCorrection test (3)",
    fn: function() { return getHeliocentricVelocityCorrection(0, 0, 2457400, 100, -40, 4000, 2000); },
    expected: -28.023990});
tests.push({
    name: "getHeliocentricVelocityCorrection test (4)",
    fn: function() { return getHeliocentricVelocityCorrection(-30, -30, 2457400, 100, -40, 4000, 2000); },
    expected: -14.316080});
tests.push({
    name: "getHeliocentricVelocityCorrection test (5)",
    fn: function() { return getHeliocentricVelocityCorrection(-30, -30, 2457400, 100, -40, 8000, 2000); },
    expected: -14.315910});
tests.push({
    name: "getHeliocentricVelocityCorrection test (6)",
    fn: function() { return getHeliocentricVelocityCorrection(0, 0, 2457401.5, 254.179583, 32.780361, 4000, 2000); },
    expected: -27.856910});
tests.push({
    name: "getHeliocentricVelocityCorrection test (7)",
    fn: function() { return getHeliocentricVelocityCorrection(80, -50, 2457400, 254.179583, -50, 2000, 2000); },
    expected: -6.0071908});
tests.push({
    name: "getHeliocentricVelocityCorrection test (8)",
    fn: function() { return getHeliocentricVelocityCorrection(0, 0, 2457400, 254.179583, 32.780361, 4000, 2000); },
    expected: -28.248393});
tests.push({
    name: "getHeliocentricVelocityCorrection test (9)",
    fn: function() { return getHeliocentricVelocityCorrection(14.2802944, -30.2514324, 2457302.0273, 149.0661, -31.27704, 1164, 2000); },
    expected: -6.1508151});







tests.push({
    name: "precess test (1)",
    fn: function() { return precess(0,0,2000,2000,false); },
    expected: [0.0, 0.0]});
tests.push({
    name: "precess test (2)",
    fn: function() { return precess(0,0,2000,2000,true); },
    expected: [0.0, 0.0]});
tests.push({
    name: "precess test (3)",
    fn: function() { return precess(40,-10,1990,2000,false); },
    expected: [40.121815, -9.9573874]});
tests.push({
    name: "precess test (4)",
    fn: function() { return precess(40,-10,1990,2000,true); },
    expected: [40.121785, -9.9573976]});
tests.push({
    name: "precess test (5)",
    fn: function() { return precess(40,-10,2010,2000,false); },
    expected: [39.878189, -10.042687]});
tests.push({
    name: "precess test (6)",
    fn: function() { return precess(40,-10,2010,2000,true); },
    expected: [39.878219, -10.042677]});
tests.push({
    name: "precess test (7)",
    fn: function() { return precess(383.2,77.7,2010,2000,false); },
    expected: [22.971964, 77.648784]});
tests.push({
    name: "precess test (8)",
    fn: function() { return precess(383.2,77.7,2010,2000,true); },
    expected: [22.972019, 77.648797]});


tests.push({
    name: "bprecess test (1)",
    fn: function() { return bprecess(0.0,0.0); },
    expected: [359.35927463427, -0.278349472209]});
tests.push({
    name: "bprecess test (2)",
    fn: function() { return bprecess(10.0,10.0); },
    expected: [9.35116153180137, 9.725621998403]});
tests.push({
    name: "bprecess test (3)",
    fn: function() { return bprecess(100.0,100.0); },
    expected: [280.9071874005737, 79.949490115037]});
tests.push({
    name: "bprecess test (4)",
    fn: function() { return bprecess(100.0,100.0); },
    expected: [280.9071874005737, 79.949490115037]});
tests.push({
    name: "bprecess test (5)",
    fn: function() { return bprecess(100.0,-22.0); },
    expected: [99.470108816407, -21.952943409067]});
tests.push({
    name: "bprecess test (6)",
    fn: function() { return bprecess(10.0,10.0,1990); },
    expected: [9.35116780677422, 9.72561014200179]});
tests.push({
    name: "bprecess test (7)",
    fn: function() { return bprecess(10.0,10.0,2010); },
    expected: [9.3511552568280, 9.72563385480417]});








module.exports = tests;