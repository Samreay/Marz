# Marz Redshifting Program


This project aims to take spectra from the AAOmega spectrograph and redshift them via an online application, for application in cosmology. It has since been generalised to take spectra from any spectrograph, given it follows a well defined input format.

Instructions for use can be found in the application itself, which you can access at http://samreay.github.io/Marz.

***** 


# Local servers

A publicly available server is running via Github-pages at http://samreay.github.io/Marz. Local servers can be start by downloading this project, and (depending on your operating system) running `runServer.bat` or `runServer.sh`. Doing so requires an available Python installation on your path.

# Command Line Interface

Whilst the application was primarily designed around human interaction, it is possible to execute the matching algorithm via the command line. Doing so requires [io.js](https://iojs.org) or [node.js](https://nodejs.org) to be installed.

1. Install [node.js](https://nodejs.org).
2. Run `install.sh` found in the top level directory to install `npm` dependencies (which simply runs `npm install`)

After doing this, you can analyse a FITS file by running `./marz.sh <FITSFilePath>`, which will direct output to `stdout`. Command line parameters, including how to save to file, are detailed upon running `marz.sh` without parameters, or by consulting `autoConfig.js`. Marz can be run on multiple files at once, by specifying more than one file in the command line. If a folder is specified, Marz will run on all `*.fits` files in that folder.


***** 

# Updates


## 1.2.1
* Keybinding methods updated
* Updates to input loading

## 1.2.0
* Input RA and DEC in FITs files assumed to be in radians, not degrees.

## 1.1.5
* Allowing no FIBER extension

## 1.1.4
* Modifying CSS to minimal-font browsers

## 1.1.3
* Adding in node dependency `progress`, and reformatting the console output.
* Base framework for eigenspectra added. 
* Updating variance plotting and culling.
* Fixing bug in template shortcuts.

## 1.1.2
* Updating extension names and column names for DESI (again).
* Making code more memory efficient.

## 1.1.1
* Searching for new extension names for DESI.

## 1.1.0
* Rewrite of the command line functionality to allow better usability
* Significant performance optimisations
* Timing module for node.js to assist in optimisations
* Test module in node.js added
* Normalisation of cross correlation peaks modified
* Heliocentric and CMB corrections implemented
* Reduced memory usage on client
* Adding merging capabilities
* Sorting job process order for less down time when resuming a file

## 1.0.6
* Making displayed template more accurate

## 1.0.5
* Improving LocalStorage detection for Safari's private browsing mode.
* Removing extraneous console logging.
* Increasing robustness of spectra serialisation for spectra that may be lacking RA, DEC, MAG or TYPE details.

## 1.0.4
* Marz now correctly ignored Parked fibres.
* Catering for boundary failure for fitting a floating point index.

## 1.0.3
* Refactoring variance plotting height into global config.
* Clipping variance plot at 3 sigma to make display more useful.

## 1.0.2
* Refactoring command line execution to use external config file.
* Adding ability to output more than one automatic match in file output file.
    * Command ine defaults to 3
    * Web interface defaults to 1
    
## 1.0.1
* Complete rewrite of command line usage.
    * Removing command line dependence on jsdom and file-api.
    * Refactored skeleton into JS classes, not angular services. Services wrap and extend class functionality.
    
## 1.0.0
* Initial implementation of versioning system. See 41cb819.


***** 


# Licensing

(Modified MIT)

Copyright (c) 2015 Samuel Hinton

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish and/or distribute the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
