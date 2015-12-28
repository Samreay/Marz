var node = false;
var module = {};
var require = function(name) {return function() {}};

function isInt(n) {
    return parseInt(n) === n
}
function isIntString(n) {
    return !isNaN(parseInt(n))
}
function isFloatString(n) {
    return !isNaN(parseFloat(n))
}


function distance(x1, y1, x2, y2) {
    return Math.pow((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2), 0.5);
}



function getCookie(property) {
    var name = property + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name) == 0) {
            return JSON.parse(c.substring(name.length, c.length));
        }
    }
    return null;
}

function saveCookie(property, value, exdays) {
    if (exdays == null) {
        exdays = 1000;
    }
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires=" + d.toGMTString();
    document.cookie = property + "=" + JSON.stringify(value) + "; " + expires;
}