# Marz Redshifting Program


This project aims to take spectra from the AAOmega spectrograph and redshift them via an online application, for application in cosmology.

Instructions for use can be found in the application itself, which you can access at http://samreay.github.io/Marz.

# Local servers

A publicly available server is running via Github-pages at http://samreay.github.io/Marz. Local servers can be start by downloading this project, and (depending on your operating system) running `runServer.bat` or `runServer.sh`. Doing so requires an available Python installation on your path.

# Command Line Interface

Whilst the application was primarily designed around human interaction, it is possible to execute the matching algorithm via the command line. Doing so requires [io.js](https://iojs.org) to be installed.

1. Install [io.js](https://iojs.org)
2. Run `install.sh` found in the top level directory to install `npm` dependencies

After doing this, you can analyse a FITS file by running `autoMarz.sh <FITSFilePath>`, which will direct output to `stdout`. Command line parameters, including how to save to file, are detailed upon running `autoMarz.sh` without parameters.

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
