
//console.log("Loading dependencies for translations");
var dependencies = ['../js/methods', '../js/helio', './test'];
for (var i = 0; i < dependencies.length; i++) {
    require(dependencies[i])();
}
//console.log("Dependencies loaded\n");
var tests = new TestSuite("translation");

/**
 * Tests for heliocentric corrections
 */
tests.addTest(new Test("getHeliocentricVelocityCorrection test (1)",
    function() {
        return getHeliocentricVelocityCorrection(20, 20, 2457356.5, 254.17958, 32.780361, 2788, 2000);
    }).setExpectedEquals(-20.051029));

tests.addTest(new Test("getHeliocentricVelocityCorrection test (2)",
    function() {
        return getHeliocentricVelocityCorrection(0, 0, 2457400, 100, -40, 4000, 1900);
    }).setExpectedEquals(-28.284173));

tests.addTest(new Test("getHeliocentricVelocityCorrection test (3)",
    function() {
        return getHeliocentricVelocityCorrection(0, 0, 2457400, 100, -40, 4000, 2000);
    }).setExpectedEquals(-28.023990));

tests.addTest(new Test("getHeliocentricVelocityCorrection test (4)",
    function() {
        return getHeliocentricVelocityCorrection(-30, -30, 2457400, 100, -40, 4000, 2000);
    }).setExpectedEquals(-14.316080));

tests.addTest(new Test("getHeliocentricVelocityCorrection test (5)",
    function() {
        return getHeliocentricVelocityCorrection(-30, -30, 2457400, 100, -40, 8000, 2000);
    }).setExpectedEquals(-14.315910));

tests.addTest(new Test("getHeliocentricVelocityCorrection test (6)",
    function() {
        return getHeliocentricVelocityCorrection(0, 0, 2457401.5, 254.179583, 32.780361, 4000, 2000);
    }).setExpectedEquals(-27.856910));

tests.addTest(new Test("getHeliocentricVelocityCorrection test (7)",
    function() {
        return getHeliocentricVelocityCorrection(80, -50, 2457400, 254.179583, -50, 2000, 2000);
    }).setExpectedEquals(-6.0071908));

tests.addTest(new Test("getHeliocentricVelocityCorrection test (8)",
    function() {
        return getHeliocentricVelocityCorrection(0, 0, 2457400, 254.179583, 32.780361, 4000, 2000);
    }).setExpectedEquals(-28.248393));

tests.addTest(new Test("getHeliocentricVelocityCorrection test (9)",
    function() {
        return getHeliocentricVelocityCorrection(14.2802944, -30.2514324, 2457302.0273, 149.0661, -31.27704, 1164, 2000);
    }).setExpectedEquals(-6.1508151));








tests.addTest(new Test("precess test (1)",
    function() {
        return precess(0,0,2000,2000,false);
    }).setExpectedEquals([0.0, 0.0]));

tests.addTest(new Test("precess test (2)",
    function() {
        return precess(0,0,2000,2000,true);
    }).setExpectedEquals([0.0, 0.0]));

tests.addTest(new Test("precess test (3)",
    function() {
        return precess(40,-10,1990,2000,false);
    }).setExpectedEquals([40.121815, -9.9573874]));

tests.addTest(new Test("precess test (4)",
    function() {
        return precess(40,-10,1990,2000,true);
    }).setExpectedEquals([40.121785, -9.9573976]));

tests.addTest(new Test("precess test (5)",
    function() {
        return precess(40,-10,2010,2000,false);
    }).setExpectedEquals([39.878189, -10.042687]));

tests.addTest(new Test("precess test (6)",
    function() {
        return precess(40,-10,2010,2000,true);
    }).setExpectedEquals([39.878219, -10.042677]));

tests.addTest(new Test("precess test (7)",
    function() {
        return precess(383.2,77.7,2010,2000,false);
    }).setExpectedEquals([22.971964, 77.648784]));

tests.addTest(new Test("precess test (8)",
    function() {
        return precess(383.2,77.7,2010,2000,true);
    }).setExpectedEquals([22.972019, 77.648797]));



tests.addTest(new Test("bprecess test (1)",
    function() {
        return bprecess(0.0,0.0);
    }).setExpectedEquals([359.35927463427, -0.278349472209]));

tests.addTest(new Test("bprecess test (2)",
    function() {
        return bprecess(10.0,10.0);
    }).setExpectedEquals([9.35116153180137, 9.725621998403]));

tests.addTest(new Test("bprecess test (3)",
    function() {
        return bprecess(100.0,100.0);
    }).setExpectedEquals([280.9071874005737, 79.949490115037]));

tests.addTest(new Test("bprecess test (4)",
    function() {
        return bprecess(100.0,100.0);
    }).setExpectedEquals([280.9071874005737, 79.949490115037]));

tests.addTest(new Test("bprecess test (5)",
    function() {
        return bprecess(100.0,-22.0);
    }).setExpectedEquals([99.470108816407, -21.952943409067]));

tests.addTest(new Test("bprecess test (6)",
    function() {
        return bprecess(10.0,10.0,1990);
    }).setExpectedEquals([9.35116780677422, 9.72561014200179]));

tests.addTest(new Test("bprecess test (7)",
    function() {
        return bprecess(10.0,10.0,2010);
    }).setExpectedEquals([9.3511552568280, 9.72563385480417]));



tests.addTest(new Test("celestialToGalactic test (1)",
    function() {
        return celestialToGalactic(0.0, 0.0, 2000.0, true);
    }).setExpectedEquals([96.3372141633617, -60.18848302656439]));

tests.addTest(new Test("celestialToGalactic test (2)",
    function() {
        return celestialToGalactic(0.0, 0.0, 2000.0, false);
    }).setExpectedEquals([96.33788885880096, -60.1886115962646]));

tests.addTest(new Test("celestialToGalactic test (3)",
    function() {
        return celestialToGalactic(0.0, 0.0, 1990.0, true);
    }).setExpectedEquals([96.6182034830445673, -60.1881654987349748]));

tests.addTest(new Test("celestialToGalactic test (4)",
    function() {
        return celestialToGalactic(0.0, 0.0, 1990.0, false);
    }).setExpectedEquals([96.6188099695406777, -60.1882924408349567]));

tests.addTest(new Test("celestialToGalactic test (5)",
    function() {
        return celestialToGalactic(0.0, 0.0, 2010.0, true);
    }).setExpectedEquals([96.0562121269150424, -60.1882008352895284]));

tests.addTest(new Test("celestialToGalactic test (6)",
    function() {
        return celestialToGalactic(0.0, 0.0, 2010.0, false);
    }).setExpectedEquals([96.0569549886245113, -60.1883313186408202]));

tests.addTest(new Test("celestialToGalactic test (7)",
    function() {
        return celestialToGalactic(10.0, 10.0);
    }).setExpectedEquals([118.2743723329215300, -52.7682124150604324]));

tests.addTest(new Test("celestialToGalactic test (8)",
    function() {
        return celestialToGalactic(10.0, -10.0);
    }).setExpectedEquals([113.4435690856713848, -72.6606623285910729]));

tests.addTest(new Test("celestialToGalactic test (9)",
    function() {
        return celestialToGalactic(423.1, 88.80, 2001.0, true);
    }).setExpectedEquals([123.9597976503729910, 26.3515569418066349]));



tests.addTest(new Test("ct2lst test (1)",
    function() {
        return ct2lst(0.0, 0.0);
    }).setExpectedEquals(16.2228996455669403));

tests.addTest(new Test("ct2lst test (2)",
    function() {
        return ct2lst(0.0, 2400000.5);
    }).setExpectedEquals(3.7173812857363373));

tests.addTest(new Test("ct2lst test (3)",
    function() {
        return ct2lst(10.0, 0.0);
    }).setExpectedEquals(16.8895663097500801));

tests.addTest(new Test("ct2lst test (4)",
    function() {
        return ct2lst(45.0, 2412345.5);
    }).setExpectedEquals(1.9051420227624476));

tests.addTest(new Test("ct2lst test (5)",
    function() {
        return ct2lst(-45.0, 2412345.5);
    }).setExpectedEquals(19.9051420227624476));

tests.addTest(new Test("ct2lst test (6)",
    function() {
        return ct2lst(445.0, 2412345.7);
    }).setExpectedEquals(9.3849506585393101));




tests.addTest(new Test("premat test (1)",
    function() {
        return premat(2000.0, 2000.0, false);
    }).setExpectedEquals(math.matrix([[1.0,0.0,0.0],[0.0,1.0,0.0],[0.0,0.0,1.0]])));

tests.addTest(new Test("premat test (2)",
    function() {
        return premat(2000.0, 2000.0, true);
    }).setExpectedEquals(math.matrix([[1.0,0.0,0.0],[0.0,1.0,0.0],[0.0,0.0,1.0]])));

tests.addTest(new Test("premat test (3)",
    function() {
        return premat(1990.0, 2010.0, false);
    }).setExpectedEquals(math.transpose(math.matrix([[0.9999881106223780,0.0044723266234603,0.0019434269885729],
        [-0.0044723266237506,0.9999899990878337,-0.0000043456965697],
        [-0.0019434269879047, -0.0000043459953602, 0.9999981115345443]]))));

tests.addTest(new Test("premat test (4)",
    function() {
        return premat(1990.0, 2010.0, true);
    }).setExpectedEquals(math.transpose(math.matrix([[0.9999881164478237, 0.0044712259919042, 0.0019429619818773],
        [-0.0044712259921946, 0.9999900040096701, -0.0000043435874016],
        [-0.0019429619812091, -0.0000043438863308, 0.9999981124381536]]))));








module.exports = tests;