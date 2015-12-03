var defaults = {};

/** Properties I don't expect to be changed */
defaults.assignAutoQOPs = true;       // Whether or not assign autoQops
defaults.processTogether = true;      // To process and match together. Should be enable for automatic matching


/** Properties I expect to be changed */
defaults.numAutomatic = 3;            // How many automatic matches to return
defaults.tenabled = [];               // List of template IDs to disable in matching, eg to disable only quasars set to ['12']





/** Make available to node or iojs */
module.exports = defaults;