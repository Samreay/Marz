
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
    expected: -28.24839});
tests.push({
    name: "getHeliocentricVelocityCorrection test (9)",
    fn: function() { return getHeliocentricVelocityCorrection(14.2802944, -30.2514324, 2457302.0273, 149.0661, -31.27704, 1164, 2000); },
    expected: -6.1508151});







module.exports = tests;