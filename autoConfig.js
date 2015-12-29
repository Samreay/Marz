var defaults = {};

/** Marz output configuration */
defaults.debug = false;               // Whether to print debug output

defaults.outFile = "";              // The output filename. A "" value means use the original filename, such that abc.fits -> abc.mz
defaults.dir = "";                  // Output directory. A "" value means output in the same directory as the fits file. Path is relative to input path
// NOTE: If neither outFile nor dir is supplied, Marz only outputs to the console (so you can redirect output)
// WARNING: Giving Marz a directory as path input and specifying a specific outFile name will not end well for you


/** Matching formatting and algorithm control */
defaults.numAutomatic = 3;            // How many automatic matches to return
defaults.disabledTemplates = [];      // List of template IDs to disable in matching, eg to disable only quasars set to [12]
defaults.numCPUs = 0;              // A 0 value defaults to using all but one logical CPUs on the host machine


/** Properties that should not be changed. Modify at your own risk. */
defaults.assignAutoQOPs = true;       // Whether or not assign autoQops
defaults.processTogether = true;      // To process and match together. Should be enable for automatic matching


/** Make available to node */
module.exports = defaults;