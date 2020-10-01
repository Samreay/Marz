/**
 * This file is the controller in the Model-View-Controller framework.
 * It acts as the interface between the UI and the angular services.
 * Any time you click on something, press a keyboard shortcut, or make the UI change, this is the place to look.
 */

angular.module('controllersZ', ['ui.router', 'ui.bootstrap', 'servicesZ'])
    .controller('NavbarController', ['$scope', '$state', 'personalService', 'global', 'dialogs', function($scope, $state, personalService, global, dialogs) {
        $scope.marzVersion = globalConfig.marzVersion;
        $scope.states = [
            {name: 'overview', icon: "th"},
            {name: 'detailed', icon: "signal"},
            {name: 'templates', icon: "tasks"},
            {name: 'settings', icon: "cog"},
            {name: 'usage', icon: "question-sign"}
        ];
        $scope.isActive = function(state) {
            return $state.current.name == state;
        };
        $scope.personal = global.personal;
        $scope.quality = global.ui.quality;
        $scope.changeInitials = function() {
            $scope.initials = personalService.updateInitials();
        };
        $scope.showAttribution = function() {
            dialogs.create('templates/partials/bibtex.html', null, {}, {}, {});
        }
    }])
    .controller('MainController', ['$scope', 'spectraService', 'global', '$state', '$timeout', 'spectraLineService', 'browserService', '$rootScope', 'processorService', '$location',
        function($scope, spectraService, global, $state, $timeout, spectraLineService, browserService, $rootScope, processorService, $location) {
        //$scope.data = global.data;
        $scope.makeSmall = function() {
            return global.ui.sidebarSmall && $scope.isDetailedView();
        };
        $scope.shouldDisplayWelcome = function() {
            return global.data.fitsFileName == null;
        };

        // Parse URL params
        var search = $location.search();
        var default_smooth = search["smooth"];
        if (typeof default_smooth === 'undefined') default_smooth = "3";
        global.ui.detailed.smooth = default_smooth;

        window.onbeforeunload = function(){
            return 'Please confirm you wish to exit.';
        };
        var called = false;
        var callback = function() {
            try {
                window.onModulesLoaded();
            } catch(err) {

            }
        };
        $rootScope.$on('$includeContentLoaded', function() {
            if (!called) {
                called = true;
                setTimeout(callback, 500);
            }
        });

        $scope.getQOPLabel = function(qop) {
            var string = "label label-";
            if (qop == null) {
                return string + "default";
            }
            if (qop >= 6) {
                return string + "primary";
            } else if (qop >= 4) {
                return string + "success";
            } else if (qop >= 3) {
                return string + "info";
            } else if (qop >= 2) {
                return string + "warning";
            } else if (qop >= 1) {
                return string + "danger";
            } else {
                return string + "default";
            }
        };
        $scope.isDetailedView = function() {
            return $state.current.name == 'detailed';
        };
        $scope.isWaitingDrop = function() {
            return !spectraService.hasSpectra();
        };
        $scope.isActive = function(spectra) {
            if (spectra.id != null) {
                return global.ui.active == spectra;
            } else {
                return global.ui.active == spectra.id;
            }
        };
        $scope.isSupportedBrowser = function() {
            return browserService.isSupported();
        };
        $scope.getActive = function() {
            if (global.ui.active == null) return null;
            return global.ui.active;
        };
        $scope.setActive = function(spectra, addToHistory) {
            spectraService.setActive(spectra, addToHistory);
        };
        $scope.setPreviousSpectra = function() {
            if (global.data.history.length > 1) {
                $scope.setActive(global.data.history[global.data.history.length - 2], false);
            } else {
                $scope.setActive(spectraService.getPreviousSpectra($scope.getActive()));
            }
        };
        $scope.setNextSpectra = function() {
            spectraService.setNextSpectra();
        };
        $scope.hasActive = function() {
            return $scope.getActive() != null;
        };
        $scope.goToDetailed = function() {
            $state.go('detailed');
        };
        $scope.toggleRaw = function() {
            global.ui.dataSelection.raw = !global.ui.dataSelection.raw;
            global.ui.dataSelection.processed = !global.ui.dataSelection.raw
        };
        $scope.toggleProcessed = function() {
            global.ui.dataSelection.processed = !global.ui.dataSelection.processed;
            global.ui.dataSelection.raw = !global.ui.dataSelection.processed
        };
        $scope.toggleMatched = function() {
            global.ui.dataSelection.matched = !global.ui.dataSelection.matched;
        };
        $scope.toggleSky = function() {
            global.ui.dataSelection.sky = !global.ui.dataSelection.sky;
        };
        $scope.saveManual = function(qop) {
            if ($scope.hasActive()) {
                spectraService.setManualResults(global.ui.active, global.ui.detailed.templateId, global.ui.detailed.redshift, qop);
                $scope.setNextSpectra();
            }
        };
        $scope.keybinds = [
            {key: 'shift+?', label: '?', description: 'Go to the Usage tab', fn: function() {
                $state.go('usage');
            }},
            {key: 'n', label: 'n', description: 'Selects the next spectra', fn: _.throttle(function() {
                $scope.$apply(function() {$scope.setNextSpectra();});
            }, 300, { 'trailing': false})},
            {key: 'b', label: 'b', description: 'Selects the previous spectra', fn: _.throttle(function() {
                $scope.$apply(function() {$scope.setPreviousSpectra();});
            }, 300, { 'trailing': false})},
            {key: 't', label: 't', description: 'Toggle whether templates are displayed', fn: _.throttle(function() {
                $scope.$apply(function() {global.ui.dataSelection.matched = !global.ui.dataSelection.matched;});
            }, 300, { 'trailing': false})},
            {key: ['1', 'num1'], label: '1', controller: "detailed", description: '[Detailed screen] Save with manual QOP of 1', fn: _.throttle(function($scope) {
                $timeout(function() { $scope.saveManual(1); });
            }, 400, { 'trailing': false})},
            {key: ['2', 'num2'], label: '2', controller: "detailed", description: '[Detailed screen] Save with manual QOP of 2', fn: _.throttle(function($scope) {
                $timeout(function() { $scope.saveManual(2); });
            }, 400, { 'trailing': false})},
            {key: ['3', 'num3'], label: '3', controller: "detailed", description: '[Detailed screen] Save with manual QOP of 3', fn: _.throttle(function($scope) {
                $timeout(function() { $scope.saveManual(3); });
            }, 400, { 'trailing': false})},
            {key: ['4', 'num4'], label: '4', controller: "detailed", description: '[Detailed screen] Save with manual QOP of 4', fn: _.throttle(function($scope) {
                $timeout(function() {$scope.saveManual(4);});
            }, 400, { 'trailing': false})},
            {key: ['6', 'num6'], label: '6', controller: "detailed", description: '[Detailed screen] Save with manual QOP of 6', fn: _.throttle(function($scope) {
                $timeout(function() {$scope.saveManual(6);});
            }, 400, { 'trailing': false})},
            {key: ['0', 'num0'], label: '0', controller: "detailed", description: '[Detailed screen] Remove QOP result (set QOP to 0)', fn: _.throttle(function($scope) {
                $timeout(function() { $scope.saveManual(0); });
            }, 400, { 'trailing': false})},
            {key: 'z', label: 'z', controller: "detailed", description: '[Detailed screen] Focus on redshift input', fn: function($scope, e) {
                $scope.setFocusToRedshift();
                e.preventDefault();
            }},
            {key: 'm', label: 'm', controller: "detailed", description: '[Detailed screen] Set view to manually found redshift', fn: function($scope) {
                $timeout(function() { $scope.resetToManual(); });
            }},
            {key: 'shift+r', label: 'shift+r', controller: "detailed", description: '[Detailed screen] Set view to automatically found redshift', fn: function($scope) {
                $timeout(function() { $scope.resetToAutomatic(); });
            }},
            {key: 'o', label: 'o', controller: "detailed", description: '[Detailed screen] Show the next automatic redshift result', fn: _.throttle(function($scope) {
                $timeout(function() { $scope.nextMatchedDetails()});
            }, 200, { 'trailing': false})},
            {key: 'i', label: 'i', controller: "detailed", description: '[Detailed screen] Show the previous automatic redshift result', fn: _.throttle(function($scope) {
                $timeout(function() { $scope.prevMatchedDetails()});
            }, 200, { 'trailing': false})},
            {key: 'u', label: 'u', controller: "detailed", description: '[Detailed screen] Fit the result within a localised window', fn: function($scope) {
                $timeout(function() { $scope.fit()});
            }},
            {key: 's', label: 's', controller: "detailed", description: '[Detailed screen] Increase smoothing level', fn: _.throttle(function($scope) {
                $timeout(function() { $scope.incrementSmooth(); });
            }, 200, { 'trailing': false})},
            {key: 'd', label: 'd', controller: "detailed", description: '[Detailed screen] Decrease smoothing level', fn: _.throttle(function($scope) {
                $timeout(function() { $scope.decrementSmooth(); });
            }, 200, { 'trailing': false})},
            {key: 'r', label: 'r', controller: "detailed", description: '[Detailed screen] Reset graph zoom to extents', fn: function($scope) {
                $timeout(function() {
                    global.ui.detailed.lockedBounds = false;
                    global.ui.detailed.lockedBoundsCounter++;
                });
            }},
            {key: 'l', label: 'l', controller: "detailed", description: '[Detailed screen] Toggles spectral lines', fn: function($scope) {
                $scope.$apply(function() {$scope.toggleSpectralLines();});
            }},
            {key: 'left', label: 'left', controller: "detailed", description: '[Detailed screen] Decrements redshift by 0.0001', fn: function($scope) {
                $scope.$apply(function() {
                    var z = parseFloat(global.ui.detailed.redshift);
                    if (z > global.ui.detailed.bounds.redshiftMin) {
                      global.ui.detailed.redshift = (z - 0.0001).toFixed(5);
                    }
                });
            }},
            {key: 'right', label: 'right', controller: "detailed", description: '[Detailed screen] Increments redshift by 0.001', fn: function($scope) {
                $scope.$apply(function() {
                    var z = parseFloat(global.ui.detailed.redshift);
                    if (z < global.ui.detailed.bounds.redshiftMax) {
                        global.ui.detailed.redshift = (z + 0.0001).toFixed(5);
                    }
                });
            }},
            {key: 'down', label: 'down', controller: "detailed", description: '[Detailed screen] Selects the next template', fn: function($scope) {
                $scope.$apply(function() {
                    if(document.activeElement != $('#templateInput')[0]) {
                        $scope.nextTemplate();
                    }
                });
            }},
            {key: 'up', label: 'up', controller: "detailed", description: '[Detailed screen] Selects the previous template', fn: function($scope) {
                $scope.$apply(function() {
                    if(document.activeElement != $('#templateInput')[0]) {
                        $scope.previousTemplate();
                    }
                });
            }},
            {key: '.', label: '.', controller: "detailed", description: '[Detailed screen] Cycles spectral lines forward', fn: function($scope) {
                $timeout(function() { $scope.nextSpectralLine(); });
            }},
            {key: 'comma', label: 'comma', controller: "detailed", description: '[Detailed screen] Cycles spectral lines back', fn: function($scope) {
                $timeout(function() { $scope.previousSpectralLine(); });
            }},
            {key: 'enter', label: 'enter', controller: "detailed", description: '[Detailed screen] Accepts the suggested automatic QOP at the stated redshift', fn: _.throttle(function($scope) {
                $scope.$apply(function() {$scope.acceptAutoQOP();});
            }, 200, { 'trailing': false})},
            {key: 'q', label: 'q', controller: "detailed", description: "[Detailed screen] Cycles which merge result to show", fn: _.throttle(function($scope) {
                $timeout(function() { $scope.toggleMerged(); });
            }, 200, { 'trailing': false})}
        ];
        _.forEach(spectraLineService.getAll(), function(line) {
            var elem = {
                key: line.shortcut,
                label: line.shortcut,
                controller: "detailed",
                description: '[Detailed screen] Sets the current focus to ' + line.label,
                fn: function($scope) {
                    $timeout(function() { $scope.clickSpectralLine(line.id); });
                }
            };
            $scope.keybinds.push(elem);
        });

        $scope.addClickHandler = function(key, fn, scope) {
            keyboardJS.on(key, function(e) {
                if (!$("input").is(':focus')) {
                    fn(scope, e);
                }
            });
        };

        for (var i = 0; i < $scope.keybinds.length; i++) {
            if ($scope.keybinds[i].controller == null) {
                $scope.addClickHandler($scope.keybinds[i].key, $scope.keybinds[i].fn, $scope);
            }
        }
    }])
    .controller('OverviewController', ['$scope', 'spectraService', 'fitsFile', 'global', '$timeout', 'templatesService', '$state', 'drawingService', function($scope, spectraService, fitsFile, global, $timeout, templatesService, $state, drawingService) {
        $scope.ui = global.ui;
        $scope.data = global.data;
        $scope.graphDisplaying = function() {
            return $state.current.name == 'overview' && $scope.ui.graphicalLayout;
        };
        $scope.isLoading = function() {
            return fitsFile.isLoading();
        };
        $scope.getName = function(spectra) {
            if (spectra.getFinalTemplateID()) {
                return templatesService.getNameForTemplate(spectra.getFinalTemplateID());
            } else {
                return "";
            }
        };

        // For the table section
        $scope.sortOrder = true;
        $scope.sortField = 'id';
        $scope.setSort = function(sort) {
            $scope.sortField = sort;
            $scope.sortOrder = !$scope.sortOrder;
        };
        $scope.isSortBy = function(sort) {
            return $scope.sortField == sort;
        };
        $scope.getImage = function(i) {
            return i.getImage(drawingService);
        };
        $scope.sortOverview = function(spectra) {
            var result = null;
            var nullRes = ('' + spectra.id).pad(5);
            if ($scope.sortField == 'type') {
                result = spectra.type;
            } else if ($scope.sortField == 'finalTemplateID') {
                result = spectra.getFinalTemplateID();
                if (result == null) {
                    if ($scope.sortOrder) {
                        result = "999";
                    } else {
                        result = "000"
                    }
                }
                result = result.pad(3);
            } else if ($scope.sortField == 'finalTemplateName') {
                if (spectra.getFinalTemplateID()) {
                    result = templatesService.getNameForTemplate(spectra.getFinalTemplateID())
                } else {
                    if ($scope.sortOrder) {
                        result = "zzz";
                    } else {
                        result = "000"
                    }
                }
            } else if ($scope.sortField == 'finalZ') {
                result = spectra.getFinalRedshift();
                if (result != null) {
                    result = result.toFixed(5).pad(6);
                } else {
                    if ($scope.sortOrder) {
                        result = "zzzzz";
                    } else {
                        result = "-----"
                    }
                }
                result = result.pad(10);
            } else if ($scope.sortField == 'qop') {
                result = spectra.qop;
                if (spectra.getFinalRedshift() == null) {
                    if ($scope.sortOrder) {
                        result = "z";
                    } else {
                        result = "-"
                    }
                }
            }
            return result + nullRes;
        };
        $scope.$watchCollection('[ui.active, ui.graphicalLayout]', function() {
            $timeout(function() {
                if ($scope.ui.graphicalLayout) {
                    $(".overview-item.activeSelect").scrollintoview();
                } else {
                    $(".overviewTable .activeSelect").scrollintoview();
                }
            });
        });
    }])
    .controller('DetailedController', ['$scope', 'spectraService', 'global', 'templatesService', 'spectraLineService', 'processorService', '$timeout', 'localStorageService', function($scope, spectraService, global, templatesService, spectraLineService, processorService, $timeout, localStorageService) {
        $scope.settings = global.ui.detailed;
        $scope.ui = global.ui;
        $scope.bounds = global.ui.detailed.bounds;
        $scope.waitingOnFit = false;
        $scope.fitZ = null;
        $scope.fitTID = null;
        $scope.lineSelected = null;
        $scope.isBig = function() {
            var height = angular.element("#bigtest").height();
            return height > 500;
        };
        $scope.acceptAutoQOP = function() {
            if ($scope.getActive() && $scope.getMatches() != null && $scope.getMatches().length > 0) {
                $scope.selectMatch($scope.getActive().getMatches()[0]);
                $scope.saveManual($scope.getActive().autoQOP);
            }
        };
        $scope.displayAuto = function() {
            var s = $scope.getActive();
            return s && s.autoQOP && s.qop == 0 && s.getMatches().length > 0;
        };
        $scope.getAutoQOPText = function() {
            var s = $scope.getActive();
            if (s && s.autoQOP && s.getMatches().length > 0) {
                return s.autoQOP + " at " + s.getMatches()[0].z
            }
        };
        $scope.getQOPText = function() {
            var s = $scope.getActive();
            if (s && s.qop != null && s.getFinalRedshift()) {
                return s.qop + " at " + s.getFinalRedshift();
            } else {
                return "";
            }
        };
        $scope.updateSpectraComment = function() {
            if ($scope.getActive()) {
                $scope.getActive().setComment($scope.spectraComment);
                if (spectraService.getSaveAutomatically()) {
                    localStorageService.saveSpectra($scope.getActive());
                }
            }
        };
        $scope.changedRedshift = function() {
            if (isNaN($scope.settings.redshift)) {
                $scope.settings.redshift = $scope.settings.oldRedshift;
            } else {
                $scope.settings.oldRedshift = $scope.settings.redshift;
                $scope.currentlyMatching();
            }
        };
        $scope.$watch('ui.active.fft', function(newV) {
            if (newV != null && $scope.waitingOnFit) {
                $scope.doFit();
            }
        });
        $scope.fit = function() {
            $scope.fitTID = $scope.ui.detailed.templateId;
            $scope.fitZ = $scope.ui.detailed.redshift;
            $scope.waitingOnFit = true;
            if ($scope.ui.active != null) {
                if ($scope.ui.active.processedIntensity == null) {
                    $scope.reanalyseSpectra(true);
                    return;
                }
            }
            var tid = $scope.ui.detailed.templateId;
            if (tid == null || tid === "0" || $scope.ui.active == null) {
                $scope.waitingOnFit = false;
            } else {
                $scope.doFit();
            }
        };
        $scope.doFit = function() {
            var s = $scope.ui.active;
            if ($scope.fitTID == '0') {
                $scope.fitTID = $scope.ui.detailed.templateId;
            }
            if ($scope.fitTID != '0') {
                var template = templatesService.getFFTReadyTemplate($scope.fitTID);
                var fft = null;
                if (templatesService.isQuasar($scope.fitTID)) {
                    fft = getQuasarFFT(s.processedLambda, s.processedIntensity.slice(), s.processedVariance.slice());
                } else {
                    fft = getStandardFFT(s.processedLambda, s.processedIntensity.slice(), s.processedVariance.slice());
                }

                var results = matchTemplate([template], fft);
                var currentZ = parseFloat($scope.fitZ);
                var helio = 0;
                var cmb = 0;
                if ($scope.ui.active != null && $scope.ui.active.helio != null) {
                    helio = $scope.ui.active.helio;
                    cmb = $scope.ui.active.cmb;
                }
                var bestZ = getFit(template, results.xcor, currentZ, helio, cmb);
                $scope.ui.detailed.redshift = bestZ.toFixed(5);
            }
            $scope.waitingOnFit = false;
        };
        $scope.bold = ['O2', 'Hb', 'Ha'];
        $scope.isBold = function(line) {
            return $scope.bold.indexOf(line.id) != -1;
        };
        $scope.$watch('ui.active.getHash()', function() {
            if ($scope.getActive()) {
                $scope.currentlyMatching();
            }
        });
        $scope.debounce = null;
        $scope.$watch('ui.active.id', function(newV) {
            if (newV == null) return;
            $scope.spectraComment = $scope.getActive().getComment();
            if (!$scope.ui.active.isMatching && ($scope.ui.active.isMatched == false || $scope.ui.active.templateResults == null)) {
                $scope.debounce = $scope.ui.active;
                $timeout(function() {
                    if ($scope.debounce == $scope.ui.active) {
                        $scope.debounce = null;
                        $scope.reanalyseSpectra(false)
                    }
                }, 1000);
            }
        });
        $scope.getTemplatesList = function() {
            var data = [{id: '0', name: "Select a template"}];
            var t = templatesService.getTemplates();
            for (var i = 0; i < t.length; i++) {
                data.push({id: t[i].id, name: t[i].name});
            }
            return data;
        };
        $scope.toggleTemplateHasContinuum = function() {
            $scope.settings.continuum = !$scope.settings.continuum;
        };
        $scope.getContinuumText = function() {
            if ($scope.settings.continuum) {
                return "Continuum";
            } else {
                return "No continuum";
            }
        };
        $scope.hasMatchingDetails = function() {
            var spectra = $scope.getActive();
            if (spectra != null) {
                return spectra.getNumBestResults() > 1;
            }
            return false;
        };

        $scope.reanalyseSpectra = function(start) {
            if ($scope.hasActive()) {
                processorService.addToPriorityQueue($scope.getActive(), start);
            }
        };
        $scope.getRanges = function() {
            return $scope.settings.ranges;
        };
        $scope.showTopResults = function() {
            return $scope.hasActive() && $scope.getActive().hasMatches()
        };
        $scope.getMatches = function() {
            return $scope.getActive().getMatches($scope.bounds.maxMatches);
        };
        $scope.getMerges = function() {
            if ($scope.getActive() == null) {
                return null;
            }
            return $scope.getActive().getMerges();
        };
        $scope.$watch('settings.redshift', function() {
            $scope.currentlyMatching();
            $scope.currentlyMerging();
        });
        $scope.currentlyMerging = function() {
            if ($scope.getActive() && $scope.getActive().getMerges().length > 0) {
                var merges = $scope.getActive().getMerges();
                for (var i = 0; i < merges.length; i++) {
                    var z = merges[i].z;
                    if (z == $scope.settings.redshift) {
                        $scope.settings.mergeIndex = i;
                        return;
                    }
                }
            }
            $scope.settings.mergeIndex = -1;
        };
        $scope.currentlyMatching = function() {
            var matched = false;
            if ($scope.getActive() && $scope.getActive().getMatches()) {
                var matches = $scope.getActive().getMatches($scope.bounds.maxMatches);
                for (var i = 0; i < matches.length; i++) {
                    if ($scope.settings.redshift == matches[i].z && $scope.settings.templateId == matches[i].templateId) {
                        $scope.settings.matchedIndex = i;
                        matched = true;
                        matches[i].index = i;
                        if (i < matches.length - 1) {
                            matches[i].next = matches[i + 1];
                        } else {
                            matches[i].next = matches[0];
                        }
                        if (i > 0) {
                            matches[i].prev = matches[i - 1];
                        } else {
                            matches[i].prev = matches[matches.length - 1];
                        }
                        return matches[i];
                    }
                }
            }
            if (!matched) {
                $scope.settings.matchedIndex = null;
            }
            return null;
        };
        $scope.isCurrentlyMatching = function() {
            return $scope.currentlyMatching() != null;
        };
        $scope.getMatchedTemplateName = function() {
            var match = $scope.currentlyMatching();
            if (match != null) {
                return templatesService.getNameForTemplate(match.templateId);
            }
            return "";
        };
        $scope.nextMatchedDetails = function() {
            var match = $scope.currentlyMatching();
            if (match == null) {
                $scope.selectMatch($scope.getMatches()[0]);
            } else {
                if (match == match.next) {
                        $scope.reanalyseSpectra(true)
                    } else {
                    $scope.selectMatch(match.next);
                }
            }
            $scope.currentlyMatching();
            $scope.$apply();
        };
        $scope.prevMatchedDetails = function() {
            var match = $scope.currentlyMatching();
            if (match == null) {
                $scope.selectMatch($scope.getMatches()[0]);
            } else {
                if (match == match.prev) {
                    $scope.reanalyseSpectra(true)
                } else {
                    $scope.selectMatch(match.prev);
                }
            }
            $scope.currentlyMatching();
            $scope.$apply();
        };
        $scope.selectMatch = function(match) {
            $scope.settings.redshift = match.z;
            $scope.settings.templateId = match.templateId;
        };
        $scope.selectMerge = function(i) {
            var merge = $scope.getActive().getMerges()[i];
            $scope.settings.mergeIndex = i;
            $scope.settings.redshift = merge.z;
            $scope.settings.templateId = merge.tid;
        };
        $scope.toggleMerged = function() {
            $scope.selectMerge(1 - $scope.settings.mergeIndex);
        };
        $scope.getMatchedTemplateRedshift = function() {
            var match = $scope.currentlyMatching();
            if (match != null) {
                return match.z.toFixed(5);
            }
            return "";
        };
        $scope.resetToAutomatic = function() {
            var spectra = global.ui.active;
            if (spectra != null) {
                var best = spectra.getBestAutomaticResult();
                if (best != null) {
                    global.ui.detailed.templateId = "" + best.templateId;
                    global.ui.detailed.redshift = best.z;
                }
            }
        };
        $scope.resetToManual = function() {
            var spectra = global.ui.active;
            if (spectra != null) {
                var best = spectra.getManual();
                if (best != null) {
                    global.ui.detailed.templateId = "" + best.templateId;
                    global.ui.detailed.redshift = best.z;
                }
            }
        };
        $scope.isWaitingForSpectralLine = function() {
            return $scope.settings.waitingForSpectra;
        };
        $scope.nextSpectralLine = function() {
            var next = spectraLineService.getNext($scope.lineSelected);
            if (next != null) {
                $scope.clickSpectralLine(next);
            } else {
                var lines = spectraLineService.getAll();
                if (lines.length > 0) {
                    $scope.clickSpectralLine(lines[0].id);
                }
            }
        };
        $scope.previousSpectralLine = function() {
            var prev = spectraLineService.getPrevious($scope.lineSelected);
            if (prev != null) {
                $scope.clickSpectralLine(prev);
            } else {
                var lines = spectraLineService.getAll();
                if (lines.length > 0) {
                    $scope.clickSpectralLine(lines[0].id);
                }
            }
        };
        $scope.clickSpectralLine = function(id) {
            if ($scope.settings.spectraFocus != null) {
                $scope.settings.spectralLines = true;
                $scope.lineSelected = id;
                var currentWavelength = spectraLineService.getFromID(id).wavelength;
                var desiredWavelength = $scope.settings.spectraFocus;
                var z = desiredWavelength/currentWavelength - 1;
                $scope.settings.redshift = z.toFixed(5);
                $scope.settings.oldRedshift = $scope.settings.redshift;
            }
        };
        $scope.getSpectralLines = function() {
            return spectraLineService.getAll();
        };
        $scope.toggleSpectralLines = function() {
            $scope.settings.spectralLines = !$scope.settings.spectralLines;
        };
        $scope.getSpectralLinePhrase = function() {
            if ($scope.settings.spectralLines) {
                return "Hide";
            } else {
                return "Show";
            }
        };
        $scope.setFocusToRedshift = function() {
            $('#redshiftInput').focus().select();
        };
        $scope.incrementSmooth = function() {
            var smooth = parseInt($scope.settings.smooth);
            if (smooth < $scope.bounds.maxSmooth) {
                $scope.settings.smooth = "" + (smooth + 1);
            }
        };
        $scope.decrementSmooth = function() {
            var smooth = parseInt($scope.settings.smooth);
            if (smooth > 0) {
                $scope.settings.smooth = "" + (smooth - 1);
            }
        };
        $scope.nextTemplate = function() {
            var t = $scope.settings.templateId;
            var ts = templatesService.getTemplates();
            var tt = templatesService.getTemplateFromId(t);
            var i = ts.indexOf(tt);
            if (i < ts.length) {
                $scope.settings.templateId = "" + ts[i+1].id;
            }
        };
        $scope.previousTemplate = function() {
            var t = $scope.settings.templateId;
            var ts = templatesService.getTemplates();
            var tt = templatesService.getTemplateFromId(t);
            var i = ts.indexOf(tt);
            if (i > 0) {
                $scope.settings.templateId = "" + ts[i-1].id;
            }
        };
        for (var i = 0; i < $scope.keybinds.length; i++) {
            if ($scope.keybinds[i].controller == "detailed") {
                $scope.addClickHandler($scope.keybinds[i].key, $scope.keybinds[i].fn, $scope);
            }
        }

    }])
    .controller('TemplatesController', ['$scope', 'templatesService', function($scope, templatesService) {
        $scope.templates = templatesService.getOriginalTemplates();
        $scope.activate = function() {
            templatesService.updateActiveTemplates();
        }
    }])
    .controller('SettingsController', ['$scope', 'processorService', 'spectraService', 'localStorageService', 'resultsGeneratorService', 'global', 'dialogs',
        function($scope, processorService, spectraService, localStorageService, resultsGeneratorService, global, dialogs) {

        $scope.getValues = function() {
            $scope.downloadAutomatically = spectraService.getDownloadAutomatically();
            $scope.numberOfCores = processorService.getNumberProcessors();
            $scope.saveAutomatically = spectraService.getSaveAutomatically();
            $scope.assignAutoQOPs  = spectraService.getAssignAutoQOPs();
            $scope.processTogether  = processorService.getProcessTogether();
            $scope.numberAutomatic = resultsGeneratorService.getNumAutomatic();
        };
        $scope.getValues();
        $scope.updateAssignAutoQOPs = function() {
            spectraService.setAssignAutoQOPs($scope.assignAutoQOPs);

        };
        $scope.updateDownloadAutomatically = function() {
            spectraService.setDownloadAutomatically($scope.downloadAutomatically);
        };
        $scope.updateSaveAutomatically = function() {
            spectraService.setSaveAutomatically($scope.saveAutomatically);
        };
        $scope.updateNumAutomatic = function() {
            resultsGeneratorService.setNumAutomatic($scope.numberAutomatic);
        };
        $scope.updateNumberProcessors = function() {
            if (isInt($scope.numberOfCores)) {
                processorService.setNumberProcessors($scope.numberOfCores);
            }
        };
        $scope.updateProcessTogether = function() {
            processorService.setProcessTogether($scope.processTogether)
        };
        $scope.resetToDefaults = function() {
            spectraService.setDownloadAutomaticallyDefault();
            spectraService.setSaveAutomaticallyDefault();
            processorService.setDefaultNumberOfCores();
            spectraService.setDefaultAssignAutoQOPs();
            processorService.setDefaultProcessTogether();
            $scope.getValues();
        };

        $scope.clearCurrentFile = function() {
            dialogs.confirm('Confirm Decision', 'Do you want to delete all local results for the currently loaded FITs file?')
                .result.then(function() { localStorageService.clearFile()});
        };
        $scope.clearAll = function() {
            dialogs.confirm('Confirm Decision', 'Do you want to delete all local results?')
                .result.then(function() { localStorageService.clearAll()});
        };
        $scope.fileLoaded = function() {
            return global.data.fitsFileName != null;
        }
    }])
    .controller('UsageController', ['$scope', function($scope) {

    }])
    .controller('FooterController', ['$scope', 'spectraService', 'processorService', 'resultsGeneratorService',
        function($scope, spectraService, processorService, resultsGeneratorService) {

        $scope.isProcessing = function() {
            return spectraService.isProcessing();
        };
        $scope.getNumberProcessed = function() {
            return spectraService.getNumberProcessed();
        };
        $scope.getNumberTotal = function() {
            return spectraService.getNumberTotal();
        };
        $scope.getNumberMatched = function() {
            return spectraService.getNumberMatched();
        };
        $scope.togglePause = function() {
            processorService.togglePause();
        };
        $scope.downloadResults = function() {
            resultsGeneratorService.downloadResults();
        };
        $scope.displayPause = function() {
            return spectraService.isProcessing() || spectraService.isMatching();
        };
        $scope.getPausedText = function() {
            if (processorService.isPaused()) {
                return "Resume";
            } else {
                return "Pause";
            }
        };
        $scope.getText = function() {
            if (spectraService.isProcessing()) {
                return "Processing spectra:   " + spectraService.getNumberProcessed() +
                    "/" + spectraService.getNumberTotal();
            } else if (spectraService.isMatching()) {
                return "Matching spectra:   " + spectraService.getNumberMatched() +
                    "/" + spectraService.getNumberTotal();
            } else {
                return "Finished all spectra";
            }
        };
        $scope.getProgressBarValue = function() {
            if (spectraService.isProcessing()) {
                return 1000*spectraService.getNumberProcessed()/$scope.getProgressBarMax();
            } else {
                return 1000*spectraService.getNumberMatched()/$scope.getProgressBarMax();
            }
        };
        $scope.getProgressBarMax = function() {
            return spectraService.getNumberTotal();
        };
        $scope.getProgressBarType = function() {
            if (spectraService.isFinishedMatching()) {
                return "info";
            } else if (spectraService.isProcessing()) {
                return "success";
            } else {
                return "danger";
            }
        };
    }])
    .filter('overviewFilter', ['global', function(global) {
        return function(inputs) {
            if (inputs.length == 0) return inputs;
            var f = global.filters;
            var q = parseInt(f.qopFilter);
            var r = f.redshiftFilter.split(':');
            return _.filter(inputs, function(spectra) {
                if (f.typeFilter !== '*' && spectra.type !== f.typeFilter) return false;
                if (f.templateFilter !== '*' && spectra.getFinalTemplateID() !== f.templateFilter) return false;
                if (f.redshiftFilter !== '*' && (spectra.getFinalRedshift() == null || !(spectra.getFinalRedshift() >= parseFloat(r[0]) && spectra.getFinalRedshift() <= parseFloat(r[1])))) return false;
                if (f.qopFilter !== '*' && spectra.qop !== q) return false;
                return true;
            })
        }
    }])
    .controller('SidebarController', ['$scope', 'spectraService', 'fitsFile', '$state', 'global', 'resultsLoaderService', '$timeout', 'templatesService', '$window', 'mergeService',
        function($scope, spectraService, fitsFile, $state, global, resultsLoaderService, $timeout, templatesService, $window, mergeService) {
        $scope.ui = global.ui;
        $scope.data = global.data;
        $scope.filters = global.filters;

        $scope.qops = [
            {value: '*', label: "Any QOP"},
            {value: 4, label: "QOP 4"},
            {value: 3, label: "QOP 3"},
            {value: 2, label: "QOP 2"},
            {value: 1, label: "QOP 1"},
            {value: 6, label: "QOP 6"},
            {value: 0, label: "QOP 0"}
        ];
        $scope.temps = [{value: '*', label: "Any template"}];
        angular.forEach(templatesService.getTemplates(), function(template) {
            $scope.temps.push({value: template.id, label: template.name});
        });
        $scope.types = [{value: '*', label: "Any type"}];
        $scope.$watch('data.types.length', function() {
            angular.forEach(global.data.types, function(type) {
                $scope.types.push({value: type, label: type});
            });
        });
        $scope.selectMergeDefault = function() {
            mergeService.updateMergeDefaults();
        };
        $scope.getButtonLabel = function(qop) {
            var labels = {4: ['Great (4)', '4'], 3: ['Good (3)', '3'], 2: ['Possible (2)', '2'], 1: ['Unknown (1)', '1'], 6: ['It\'s a star! (6)', '6'], 0: ['Unassigned (0)', '0']};
            return labels[qop][$scope.ui.sidebarSmall ? 1 : 0]
        };
        $scope.getContractButtonLabel = function() {
            return $scope.ui.sidebarSmall ? ">>" : "Contract sidebar";
        };
        $scope.toggleSmall = function() {
            $scope.ui.sidebarSmall = !$scope.ui.sidebarSmall;
        };
        $scope.redshifts = [
            {value: '*', label: 'All redshifts'},
            {value: '-0.002:0.005', label: 'Stellar redshifts [-0.002:0.1]'},
            {value: '0.005:0.3', label: 'Close galaxy redshifts [0:0.3]'},
            {value: '0.3:1.5', label: 'Distant galaxy redshifts [0.3:1.5]'},
            {value: '0.005:1.5', label: 'All galaxy redshifts [0:1.5]'},
            {value: '1:9', label: 'Distant redshifts [1:9]'}
        ];
        $scope.resetFilters = function() {
            _.forOwn(global.filters, function(obj) {
                global.filters[obj] = '*';
            })
        };
        $scope.numDrag = 0;
        $scope.addFiles = function(files) {
            if (files.length == 3) {
                var numRes = 0;
                var res = [];
                var numFits = 0;
                var fits = null;
                for (var i = 0; i < files.length; i++) {
                    var f = files[i];
                    if (f.name.endsWith('.mz')) {
                        numRes++;
                        res.push(f);
                    } else if (f.name.endsWith('.fits')) {
                        numFits++;
                        fits = f;
                    }
                }
                if (numRes == 2 && numFits == 1) {
                    mergeService.loadMerge(fits, res);
                    return;
                }
            }
            $scope.ui.merge = false;

            for (var i = 0; i < files.length; i++) {
                if (!files[i].name.endsWith('fits') && !files[i].name.endsWith('fit')) {
                    resultsLoaderService.loadResults(files[i]);
                }
            }
            var first = true;
            for (var i = 0; i < files.length; i++) {
                if (files[i].name.endsWith('fits') || files[i].name.endsWith('fit')) {
                    $scope.numDrag++;
                    if (first) {
                        first = false;
                        $scope.data.fits.length = 0;
                    }
                    $scope.data.fits.push(files[i]);
                }
            }
        };
        $scope.$watchCollection('[numDrag, data.fits.length]', function() {
            if ($scope.data.fits.length > 0) {
                fitsFile.loadInFitsFile($scope.data.fits[0]).then(function() { console.log('Fits file loaded')});
            }
        });

        $scope.showSave = function() {
            return $state.current.name == 'detailed';
        };
        $scope.showDataSelectors = function() {
            return ($state.current.name == 'overview' && $scope.ui.graphicalLayout) ||  ($state.current.name == 'detailed')
        };
        $scope.getTitle = function() {
            return fitsFile.getFilename();
        };
        $scope.showSky = function() {
            return $state.current.name == 'detailed';
        };
        $scope.showTabular = function() {
          return $state.current.name == 'overview';
        };
        $scope.listStyle = function() {
            return {height: $scope.getListHeight()};
        };
        $scope.getListHeight = function() {
            var sub = $scope.ui.merge ? 45 : 35;
            return ($("#sidebar").height() - $("#sidebar-wrapper").height() - sub);
        };
        $scope.windowResized = function(element) {
            element.height($scope.getListHeight());
        };
        $scope.getAnalysedText = function(spectra) {
            if (spectra.hasRedshift()) {
                return "z = " + spectra.getFinalRedshift().toFixed(5);
            } else {
                return "Not analysed";
            }
        };
        $scope.getDropText = function() {
            if (resultsLoaderService.hasAnyResults()) {
                if (resultsLoaderService.sameVersion()) {
                    return "Have loaded results. Drop in FITs file."
                } else {
                    return "Warning. Results version does not match current Marz version. Results hidden."
                }
            } else {
                return "Drop a FITs file or a results file. Or drop a results file and THEN a FITs file."
            }
        };
        $scope.toggledRaw = function() {
            global.ui.dataSelection.raw = !global.ui.dataSelection.raw;
        };
        $scope.toggledProcessed = function() {
            global.ui.dataSelection.processed = !global.ui.dataSelection.processed;
        };
        $scope.toggleMatched = function() {
            global.ui.dataSelection.matched = !global.ui.dataSelection.matched;
        };
        $scope.toggleSky = function() {
            global.ui.dataSelection.sky = !global.ui.dataSelection.sky;
        };
        $scope.$watch('ui.active', function() {
            $timeout(function() {
                $("#sidebar-list .activeSelect").scrollintoview();
            });
        });
    }]);
