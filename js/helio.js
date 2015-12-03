/**
 * Computes the heliocentric velocity (km/s) correction for a given time and location.
 *
 * A translation of AutoZ code, originally written written by S. Burles & D. Schlegel
 *
 * @param ra - right ascension (degrees)
 * @param dec - declination (degrees)
 * @param epoch - epoch of observation of RA, DEC; defaults to 2000.
 * @param jd - decimal julian data.
 * @param longitude - longitude of observatory [default to AAT: 149.0661]
 * @param latitude - latitude of observatory [default to AAT: -31.27704]
 * @param altitude - altitude of observatory (m) [default to AAT: 1164]
 */
function getHeliocentricVelocityCorrection(ra, dec, jd, longitude, latitude, altitude, epoch) {
    epoch = defaultFor(epoch, 2000);
    longitude = defaultFor(longitude, 149.0661);
    latitude = defaultFor(latitude, -31.27704);
    altitude = defaultFor(altitude, 1164);

    // Compute baryocentric velocity
    var vBarycentric = getBarycentricCorrection(jd, epoch, ra, dec);

    // Compute rotational velocity of observer on the Earth
    var DRADEG = 180.0 / Math.PI;
    var latrad = latitude / DRADEG;
    // Reduction of geodetic latitude to geocentric latitude (radians).
    // DLAT is in arcseconds.

    var dlat = -(11.0 * 60.0 + 32.743) * math.sin(2.0 * latrad) + 1.1633 * math.sin(4.0 * latrad) -0.0026 * math.sin(6.0 * latrad);
    latrad  = latrad + (dlat / 3600.0) / DRADEG;

    // R is the radius vector from the Earth's center to the observer (meters).
    // VC is the corresponding circular velocity
    // (meters/sidereal day converted to km / sec).
    // (sidereal day = 23.934469591229 hours (1986))

    var r = 6378160.0 * (0.998327073 + 0.001676438 * math.cos(2.0 * latrad)
        - 0.00000351 * math.cos(4.0 * latrad) + 0.000000008 * math.cos(6.0 * latrad)) + altitude;
    var vc = 2.0 * Math.PI * (r / 1000.0)  / (23.934469591229 * 3600.0);

    // Compute the hour angle, HA, in degrees
    var LST = ct2lst(longitude, jd);
    LST = 15. * LST; // convert from hours to degrees
    var HA = LST - ra;

    // Project the velocity onto the line of sight to the star.
    var vrotate = vc * math.cos(latrad) * math.cos(dec/DRADEG) * math.sin(HA/DRADEG);



    var vTotal = vrotate + vBarycentric;
    //console.log("RA: " + ra + " DEC:" + dec + " HELIO: " + vTotal);
    return vTotal;
}

/**
 * Javascript translation and simplification of the IDL function CT2LST
 * found in the Autoz code base.
 *
 * Purpose: To convert from Local Civil Time to Local Mean Sidereal Time.
 *
 * @param longitude -longitude of observatory (degrees)
 * @param jd - decimal julian date
 */
function ct2lst(longitude, jd) {
    var c = [280.46061837, 360.985647366290, 0.0003879330, 38710000.0];
    var jd2000 = 2451545.0;
    var t0 = jd - jd2000;
    var t = t0 / 36525;

    // Compute GST in seconds.
    var theta = c[0] + (c[1] * t0) + t * t * (c[2] - t / c[3] );

    // Compute LST in hours.
    var lst = (( theta + longitude) / 15.0 + 24) % 24;

    return lst;

}
/**
 * Javascript translation of the baryvel.pro IDL code from
 * the Autoz code (http://www.astro.ljmu.ac.uk/~ikb/research/autoz_code/)
 *
 *
 * @param dje - decimal Julian ephemeris date
 * @param deq - epoch of mean equinox
 * @param ra - right ascension of target (degrees)
 * @param dec - declination of target (degrees)
 */
function getBarycentricCorrection(dje, deq, ra, dec) {

    // Define constants
    var dc2pi = 2*Math.PI;
    var cc2pi = 2*Math.PI;
    var dc1 = 1.0;
    var dcto = 2415020.0;
    var dcjul = 36525.0; //days in Julian year
    var dcbes = 0.313;
    var dctrop = 365.24219572;  //days in tropical year (...572 insig)
    var dc1900 = 1900.0;
    var AU = 1.4959787e8;

    // Constants dcfel(i,k) of fast changing elements.
    var dcfel = math.matrix([[1.7400353e00, 6.2565836e00, 4.7199666e00, 1.9636505e-1, 4.1547339e00, 4.6524223e00, 4.2620486e00, 1.4740694e00],
        [6.2833195099091e02, 6.2830194572674e02, 8.3997091449254e03, 8.4334662911720e03, 5.2993466764997e01, 2.1354275911213e01, 7.5025342197656e00, 3.8377331909193],
        [ 5.2796e-6, -2.6180e-6, -1.9780e-5, -5.6044e-5,  5.8845e-6,  5.6797e-6,  5.5317e-6,  5.6093e-6]]);

    // constants dceps and ccsel(i,k) of slowly changing elements.
    var dceps = math.matrix([4.093198e-1, -2.271110e-4, -2.860401e-8]);
    var ccsel = math.matrix([[1.675104E-2, 2.220221E-1, 1.589963E00, 2.994089E00, 8.155457E-1, 1.735614E00, 1.968564E00, 1.282417E00, 2.280820E00, 4.833473E-2, 5.589232E-2, 4.634443E-2, 8.997041E-3, 2.284178E-2, 4.350267E-2, 1.348204E-2, 3.106570E-2],
                             [-4.179579E-5,  2.809917E-2,  3.418075E-2,  2.590824E-2,  2.486352E-2,  1.763719E-2,  1.524020E-2,  8.703393E-3,  1.918010E-2,  1.641773E-4, -3.455092E-4, -2.658234E-5,  6.329728E-6, -9.941590E-5, -6.839749E-5,  1.091504E-5, -1.665665E-4],
                             [-1.260516E-7,  1.852532E-5,  1.430200E-5,  4.155840E-6,  6.836840E-6,  6.370440E-6, -2.517152E-6,  2.289292E-5,  4.484520E-6, -4.654200E-7, -7.388560E-7,  7.757000E-8, -1.939256E-9,  6.787400E-8, -2.714956E-7,  6.903760E-7, -1.590188E-7]]);

    // Constants of the arguments of the short-period perturbations.
    var dcargs = math.matrix([[5.0974222e0, 3.9584962e0, 1.6338070e0, 2.5487111e0, 4.9255514e0, 1.3363463e0, 1.6072053e0, 1.3629480e0, 5.5657014e0, 5.0708205e0, 3.9318944e0, 4.8989497e0, 1.3097446e0, 3.5147141e0, 3.5413158e0],
    [-7.8604195454652e2, -5.7533848094674e2, -1.1506769618935e3, -3.9302097727326e2, -5.8849265665348e2, -5.5076098609303e2, -5.2237501616674e2, -1.1790629318198e3, -1.0977134971135e3, -1.5774000881978e2,  5.2963464780000e1,  3.9809289073258e1,  7.7540959633708e1,  7.9618578146517e1, -5.4868336758022e2]]);

    // Amplitudes ccamps(n,k) of the short-period perturbations.
    var ccamps = math.matrix([[-2.279594E-5, -3.494537E-5,  6.593466E-7,  1.140767E-5,  9.516893E-6,  7.310990E-6, -2.603449E-6, -3.228859E-6,  3.442177E-7,  8.702406E-6, -1.488378E-6, -8.043059E-6,  3.699128E-6,  2.550120E-6, -6.351059E-7],
    [ 1.407414E-5,  2.860401E-7,  1.322572E-5, -2.049792E-5, -2.748894E-6, -1.924710E-6,  7.359472E-6,  1.308997E-7,  2.671323E-6, -8.421214E-6, -1.251789E-5, -2.991300E-6, -3.316126E-6, -1.241123E-6,  2.341650E-6],
    [ 8.273188E-6, 1.289448E-7, 9.258695E-6, -4.747930E-6, -1.319381E-6, -8.772849E-7, 3.168357E-6, 1.013137E-7, 1.832858E-6, -1.372341E-6, 5.226868E-7, 1.473654E-7, 2.901257E-7, 9.901116E-8, 1.061492E-6],
    [ 1.340565E-5,  1.627237E-5, -4.674248E-7, -2.638763E-6, -4.549908E-6, -3.334143E-6,  1.119056E-6,  2.403899E-6, -2.394688E-7, -1.455234E-6, -2.049301E-7, -3.154542E-7,  3.407826E-7,  2.210482E-7,  2.878231E-7],
    [-2.490817E-7, -1.823138E-7, -3.646275E-7, -1.245408E-7, -1.864821E-7, -1.745256E-7, -1.655307E-7, -3.736225E-7, -3.478444E-7, -4.998479E-8,  0.E0,  0.E0,  0.E0,  0.E0,  0.E0]]);

    // Constants csec3 and ccsec(n,k) of the secular perturbations in longitude
    var ccsec3 = -7.757020E-8;
    var ccsec = math.matrix([[1.289600E-6, 3.102810E-5, 9.124190E-6, 9.793240E-7],
    [5.550147E-1, 4.035027E00, 9.990265E-1, 5.508259E00],
    [2.076942E00, 3.525565E-1, 2.622706E00, 1.559103E01]]);

    // Sidereal rates.
    var dcsld = 1.990987e-7; // sidereal rate in longitude
    var ccsgd = 1.990969e-7; // sidereal rate in mean anomaly


    // Constants used in the calculation of the lunar contribution.
    var cckm = 3.122140E-5;
    var ccmld = 2.661699E-6;
    var ccfdi = 2.399485E-7;


    // Constants dcargm(i,k) of the arguments of the perturbations of the motion
    // of the moon.
    var dcargm = math.matrix([[5.1679830e0, 5.4913150e0, 5.9598530e0],
        [  8.3286911095275e3, -7.2140632838100e3,  1.5542754389685e4]]);

    // Amplitudes ccampm(n,k) of the perturbations of the moon.
    var ccampm =  math.matrix([[ 1.097594E-1, -2.223581E-2,  1.148966E-2],
    [ 2.896773E-7,  5.083103E-8,  5.658888E-8],
    [ 5.450474E-2,  1.002548E-2,  8.249439E-3],
    [ 1.438491E-7,  -2.291823E-8,   4.063015E-8]]);

    // ccpamv(k)=a*m*dl,dt (planets), dc1mme=1-mass(earth+moon)
    var ccpamv = math.matrix([8.326827E-11, 1.843484E-11, 1.988712E-12, 1.881276E-12]);
    var dc1mme = 0.99999696;

    //Time arguments.
    var dt = (dje - dcto) / dcjul;
    var tvec = math.matrix([1.0, dt, dt*dt]);

    var temp = math.mod(math.multiply(tvec, dcfel), dc2pi);
    var dml = temp.get([0]);
    var forbel = temp.subset(math.index(math.range(1,8)));
    var g = forbel.get([0]);

    var deps = math.mod(math.sum(math.dotMultiply(tvec,dceps)), dc2pi);
    var sorbel = math.mod(math.multiply(tvec, ccsel), dc2pi);
    var e = sorbel.get([0]);


    // Secular perturbations in longitude.
    var sn = math.sin(math.mod(math.multiply(tvec.subset(math.index([0,1])), math.subset(ccsec, math.index([1,2], [0,1,2,3]))), cc2pi));


    // Periodic perturbations of the emb (earth-moon barycenter).
    var ccsecsbusec = math.transpose(math.subset(ccsec, math.index(0,[0,1,2,3]))).resize([4])
    var pertl = math.sum(math.dotMultiply(ccsecsbusec, sn)) + dt*ccsec3*sn.get([2]);
    var pertld = 0.0;
    var pertr = 0.0;
    var pertrd = 0.0;
    for (var k = 0; k <= 14; k++) {
        var a = math.mod((dcargs.get([0,k])+dt*dcargs.get([1,k])), dc2pi);
        var cosa = math.cos(a);
        var sina = math.sin(a);
        pertl = pertl + ccamps.get([0,k])*cosa + ccamps.get([1,k])*sina;
        pertr = pertr + ccamps.get([2,k])*cosa + ccamps.get([3,k])*sina;
        if (k < 11) {
            pertld = pertld + (ccamps.get([1, k]) * cosa - ccamps.get([0, k]) * sina) * ccamps.get([4, k]);
            pertrd = pertrd + (ccamps.get([3, k]) * cosa - ccamps.get([2, k]) * sina) * ccamps.get([4, k]);
        }
    }

    // Elliptic part of the motion of the emb.
    var phi = (e*e/4.0)*(((8.0/e)-e)*math.sin(g) +5*math.sin(2*g) +(13/3.0)*e*math.sin(3*g));
    var f = g + phi;
    var sinf = math.sin(f);
    var cosf = math.cos(f);
    var dpsi = (dc1 - e*e) / (dc1 + e*cosf);
    var phid = 2*e*ccsgd*((1 + 1.5*e*e)*cosf + e*(1.25 - 0.5*sinf*sinf));
    var psid = ccsgd*e*sinf / math.sqrt(dc1 - e*e);

    // Perturbed heliocentric motion of the emb.
    var d1pdro = dc1+pertr;
    var drd = d1pdro * (psid + dpsi*pertrd);
    var drld = d1pdro*dpsi * (dcsld+phid+pertld);
    var dtl = math.mod((dml + phi + pertl), dc2pi);
    //console.log("dtl: " + dtl);
    var dsinls = math.sin(dtl);
    var dcosls = math.cos(dtl);
    var dxhd = drd*dcosls - drld*dsinls;
    var dyhd = drd*dsinls + drld*dcosls;
    //console.log(dxhd + "   " + dyhd);
    //console.log(drd + " __ " + drld);



    // Influence of eccentricity, evection and variation on the geocentric
    // motion of the moon.
    pertl = 0.0;
    pertld = 0.0;
    var pertp = 0.0;
    var pertpd = 0.0;
    for (var k = 0; k <= 2; k++) {
        a = math.mod((dcargm.get([0, k]) + dt * dcargm.get([1, k])), dc2pi);
        sina = math.sin(a);
        cosa = math.cos(a);
        pertl = pertl + ccampm.get([0, k]) * sina;
        pertld = pertld + ccampm.get([1, k]) * cosa;
        pertp = pertp + ccampm.get([2, k]) * cosa;
        pertpd = pertpd - ccampm.get([3, k]) * sina;
    }

    // Heliocentric motion of the earth.
    var tl = forbel.get([1]) + pertl;
    var sinlm = math.sin(tl);
    var coslm = math.cos(tl);
    var sigma = cckm / (1.0 + pertp);
    a = sigma*(ccmld + pertld);
    var b = sigma*pertpd;
    dxhd = dxhd + a*sinlm + b*coslm;
    dyhd = dyhd - a*coslm + b*sinlm;
    var dzhd= -sigma*ccfdi*math.cos(forbel.get([2]));
    // Barycentric motion of the earth.
    var dxbd = dxhd*dc1mme;
    var dybd = dyhd*dc1mme;
    var dzbd = dzhd*dc1mme;
    for (k = 0; k <= 3; k++) {
        var plon = forbel.get([k + 3]);
        var pomg = sorbel.get([k + 1]);
        var pecc = sorbel.get([k + 9]);
        tl = math.mod((plon + 2.0 * pecc * math.sin(plon - pomg)), cc2pi);
        dxbd = dxbd + ccpamv.get([k]) * (math.sin(tl) + pecc * math.sin(pomg));
        dybd = dybd - ccpamv.get([k]) * (math.cos(tl) + pecc * math.cos(pomg));
        dzbd = dzbd - ccpamv.get([k]) * sorbel.get([k + 13]) * math.cos(plon - sorbel.get([k + 5]));
    }

    // Transition to mean equator of date.
    var dcosep = math.cos(deps);
    var dsinep = math.sin(deps);
    var dyahd = dcosep*dyhd - dsinep*dzhd;
    var dzahd = dsinep*dyhd + dcosep*dzhd;
    var dyabd = dcosep*dybd - dsinep*dzbd;
    var dzabd = dsinep*dybd + dcosep*dzbd;

    /// Epoch of mean equinox (deq) of zero implies that we should use
    // Julian ephemeris date (dje) as epoch of mean equinox.
    var dvelh, dvelb;
    if (deq == 0) {
        dvelh = math.dotMultiply(AU, math.matrix([dxhd, dyahd, dzahd]));
        dvelb = math.dotMultiply(AU, math.matrix([dxbd, dyabd, dzabd]));
    } else {
        // General precession from epoch dje to deq.
        var deqdat = (dje-dcto-dcbes) / dctrop + dc1900;
        var prema = premat(deqdat,deq);
        dvelh = math.dotMultiply(AU, math.multiply(prema, math.matrix([dxhd, dyahd, dzahd])));
        dvelb = math.dotMultiply(AU, math.multiply(prema, math.matrix([dxbd, dyabd, dzabd])));

    }

    var DRADEG = 180.0 / Math.PI;
    var vbarycen = math.sum(math.dotMultiply(dvelb, math.matrix([math.cos(dec/DRADEG)*math.cos(ra/DRADEG), math.cos(dec/DRADEG)*math.sin(ra/DRADEG), math.sin(dec/DRADEG)])))

    return vbarycen;
}

/**
 * Javascript translation of the IDL premat function
 * found at http://idlastro.gsfc.nasa.gov/ftp/pro/astro/premat.pro
 *
 * @param equinox1
 * @param equinox2
 * @param fk4 - If this keyword is set, the FK4 (B1950.0) system precession
 ;               angles are used to compute the precession matrix.   The
 ;               default is to use FK5 (J2000.0) precession angles
 */
function premat(equinox1, equinox2, fk4) {
    fk4 = defaultFor(fk4, true);
    var deg_to_rad = Math.PI / 180.0;
    var sec_to_rad = deg_to_rad / 3600.0;

    var t = 0.001 * (equinox2 - equinox1);

    var st, a, b, c;
    if (!fk4) {
        st = 0.001 * (equinox1 - 2000.0);
        a = sec_to_rad * t * (23062.181 + st*(139.656 +0.0139*st) + t*(30.188 - 0.344*st+17.998*t));
        b = sec_to_rad * t * t * (79.280 + 0.410*st + 0.205*t) + a;
        c = sec_to_rad * t * (20043.109 - st*(85.33 + 0.217*st) + t*(-42.665 - 0.217*st -41.833*t));
    } else {
        st = 0.001 * (equinox1 - 1900.0);
        a = sec_to_rad * t * (23042.53 + st * (139.75 +0.06 * st) + t * (30.23 - 0.27 * st + 18.0 * t));
        b = sec_to_rad * t * t * (79.27 + 0.66 * st + 0.32 * t) + a;
        c = sec_to_rad * t * (20046.85 - st * (85.33 + 0.37 * st) + t * (-42.67 - 0.37 * st - 41.8 * t));
    }


    var sina = math.sin(a);
    var sinb = math.sin(b);
    var sinc = math.sin(c);
    var cosa = math.cos(a);
    var cosb = math.cos(b);
    var cosc = math.cos(c);

    var r = math.matrix(
        [[ cosa*cosb*cosc-sina*sinb, sina*cosb+cosa*sinb*cosc,  cosa*sinc],
        [-cosa*sinb-sina*cosb*cosc, cosa*cosb-sina*sinb*cosc, -sina*sinc],
        [-cosb*sinc, -sinb*sinc, cosc]]);

    return math.transpose(r);
}

/**
 * Adjusts (returns) a redshift with heliocentric velocity to include the heliocentric correction
 * @param z - uncorrected redshift
 * @param helio - km/s heliocentric velocity
 * @returns {number}
 */
function adjustRedshift(z, helio) {
    if (helio == null) {
        return z;
    }
    return (1 + z) * (1 + helio / (299792.458)) - 1;
}


/**
 * Call this function to perform a unit test on the helio functions
 */
function testAllHelio() {
    testHelio(20, 20, 2457356.5, 254.17958, 32.780361, 2788, 2000, -20.051029);
}
function testHelio(ra, dec, jd, long, lat, alt, epoch, expected) {
    var threshold = 1e-6;
    var output = getHeliocentricVelocityCorrection(ra, dec, jd, long, lat, alt, epoch);
    if (Math.abs(output - expected) > threshold) {
        throw "Error, expected " + JSON.stringify(expected) + " but got " + JSON.stringify(output) + " from running getHeliocentricVelocityCorrection(" + ra + ", " + dec + ", " + jd + ", " + long + ", " + lat + ", " + alt + ", " + epoch + ")";
    } else {
        console.info("Passed: Expected " + expected + ", got " + round(output,8) + " from running getHeliocentricVelocityCorrection(" + ra + ", " + dec + ", " + jd + ", " + long + ", " + lat + ", " + alt + ", " + epoch + ")");
    }
}