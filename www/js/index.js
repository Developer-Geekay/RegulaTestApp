/* ============================================================
   Regula SDKs — Test App (index.js)
   Refactored for 3-page functionality: Face, Document, Combined
   ============================================================ */

document.addEventListener('deviceready', onDeviceReady, false);

/* ---- Global state ---------------------------------------- */
var slotData = { 1: null, 2: null };
var activeSlot = 1;

var isFaceSDKInitialized = false;
var isDocReaderInitialized = false;

/* ---- Plugin resolver ------------------------------------- */
function getPlugin() {
    return window.RegulaPlugin
        || (window.cordova && window.cordova.plugins && window.cordova.plugins.RegulaPlugin)
        || (typeof RegulaPlugin !== 'undefined' ? RegulaPlugin : null);
}

/* ---- UI helpers ------------------------------------------ */
function setStatus(text, type) {
    var badge = document.getElementById('status-badge');
    var label = document.getElementById('status-text');
    if (label) label.textContent = text;
    if (badge) badge.className = 'status-badge' + (type ? ' ' + type : '');
}

function setFaceSimilarity(value) {
    _renderStat('similarity-status', value, true);
}

function setFaceLiveness(value) {
    _renderStat('liveness-status', value, false);
}

function setCombinedSimilarity(value) {
    _renderStat('combined-similarity', value, true);
}

function setCombinedLiveness(value) {
    _renderStat('combined-liveness', value, false);
}

function _renderStat(elementId, value, isPercentage) {
    var el = document.getElementById(elementId);
    if (!el) return;
    if (value === null || value === undefined) {
        el.textContent = '—'; el.className = 'stat-value'; return;
    }

    if (isPercentage) {
        var pct = (value * 100).toFixed(1) + '%';
        el.textContent = pct;
        el.className = 'stat-value ' + (value >= 0.75 ? 'good' : value >= 0.5 ? 'warn' : 'bad');
    } else {
        var label = value === 1 ? 'Passed' : 'Unknown/Failed';
        el.textContent = label;
        el.className = 'stat-value ' + (value === 1 ? 'good' : 'bad');
    }
}

function logResult(msg, type) {
    console.log('[RegulaApp]', msg);
    var resDiv = document.getElementById('results');
    if (!resDiv) return;
    var text = (typeof msg === 'object') ? JSON.stringify(msg, null, 2) : String(msg);
    var line = document.createElement('div');
    line.className = 'log-line' + (type ? ' ' + type : '');
    line.textContent = '> ' + text;
    resDiv.insertBefore(line, resDiv.firstChild);
}

function updateMatchButton() {
    var btn = document.getElementById('match-faces');
    if (btn) btn.disabled = !(slotData[1] && slotData[2]);
}

/* ---- Image slot helpers ---------------------------------- */
function setSlotImage(slotNum, base64WithoutPrefix, imageType) {
    var imgId = slotNum === 1 ? 'first-image' : 'second-image';
    var phId = slotNum === 1 ? 'placeholder-first' : 'placeholder-second';
    var img = document.getElementById(imgId);
    var ph = document.getElementById(phId);

    if (img) {
        img.src = 'data:image/png;base64,' + base64WithoutPrefix;
        img.style.display = 'block';
    }
    if (ph) ph.style.display = 'none';

    slotData[slotNum] = { base64: base64WithoutPrefix, imageType: imageType || 1 };
    logResult('Image set in slot ' + slotNum, 'info');
    updateMatchButton();
}

function clearSlots() {
    [1, 2].forEach(function (n) {
        var imgId = n === 1 ? 'first-image' : 'second-image';
        var phId = n === 1 ? 'placeholder-first' : 'placeholder-second';
        var img = document.getElementById(imgId);
        var ph = document.getElementById(phId);
        if (img) { img.src = ''; img.style.display = 'none'; }
        if (ph) { ph.style.display = ''; }
        slotData[n] = null;
    });
    updateMatchButton();
}

function renderCombinedImages(docBase64, liveBase64) {
    var imgDoc = document.getElementById('combined-doc-image');
    var phDoc = document.getElementById('placeholder-combined-doc');
    var imgLive = document.getElementById('combined-live-image');
    var phLive = document.getElementById('placeholder-combined-live');

    if (docBase64 && imgDoc) {
        imgDoc.src = 'data:image/png;base64,' + docBase64;
        imgDoc.style.display = 'block';
        if (phDoc) phDoc.style.display = 'none';
    }

    if (liveBase64 && imgLive) {
        imgLive.src = 'data:image/png;base64,' + liveBase64;
        imgLive.style.display = 'block';
        if (phLive) phLive.style.display = 'none';
    }

    document.getElementById('combined-results-view').style.display = 'block';
}

/* ---- Action sheet ---------------------------------------- */
function openActionSheet(slotNum) {
    activeSlot = slotNum;
    var overlay = document.getElementById('action-sheet-overlay');
    var sheet = document.getElementById('action-sheet');
    if (overlay) overlay.style.display = 'flex';
    if (sheet) sheet.classList.add('visible');
}

function closeActionSheet() {
    var overlay = document.getElementById('action-sheet-overlay');
    var sheet = document.getElementById('action-sheet');
    if (overlay) overlay.style.display = 'none';
    if (sheet) sheet.classList.remove('visible');
}

/* ---- File Readers ---------------------------------------- */
function readFileAsBase64(file, callback) {
    var reader = new FileReader();
    reader.onload = function (e) {
        var dataUrl = e.target.result;
        var comma = dataUrl.indexOf(',');
        var b64 = comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl;
        callback(b64);
    };
    reader.onerror = function () { logResult('FileReader error reading image', 'error'); };
    reader.readAsDataURL(file);
}

function readLicenseAsBase64(file, callback) {
    if (!file) return callback(null);
    var reader = new FileReader();
    reader.onloadend = function () {
        var result = reader.result;
        if (!result) {
            logResult('License file could not be read', 'error');
            return callback(null);
        }
        var base64Data = result.split(',')[1];
        callback(base64Data);
    };
    reader.onerror = function () { logResult('FileReader error reading license', 'error'); };
    reader.readAsDataURL(file);
}

/* ===========================================================
   Device Ready — wire up all listeners
   =========================================================== */
function onDeviceReady() {
    console.log('Cordova ready — ' + cordova.platformId + ' v' + cordova.version);
    setStatus('Device Ready', 'ready');
    logResult('Device ready. Platform: ' + cordova.platformId, 'info');

    var p = getPlugin();
    if (!p) {
        logResult('Plugin not found. Ensure Regula plugin is installed.', 'error');
        return;
    }

    setupTabs();
    setupFilePickers();
    setupActionSheet();

    /* =======================================================
       PAGE 1: FACE SDK BINDINGS
       ======================================================= */
    var btnInitFace = document.getElementById('btnInitFace');
    if (btnInitFace) {
        btnInitFace.addEventListener('click', function () {
            var input = document.getElementById('licenseFileFace');
            readLicenseAsBase64(input.files[0], function (b64) {
                initFaceSDK(p, b64);
            });
        });
    }

    document.getElementById('start-liveness').addEventListener('click', function () {
        if (!isFaceSDKInitialized) return logResult('Face SDK not initialized', 'error');
        setStatus('Liveness running…');
        p.Face.startLiveness(function (res) {
            if (res.error) {
                setStatus('Liveness Error', 'error');
                return logResult('Liveness error: ' + res.error, 'error');
            }
            setStatus('Liveness done', 'ready');
            setFaceLiveness(res.liveness);
            logResult('Liveness: ' + (res.liveness === 1 ? 'Passed' : 'Unknown'), 'success');
            if (res.image) setSlotImage(1, res.image, 2); // 2 = LIVE
        }, function (err) {
            setStatus('Liveness API Error', 'error');
            logResult('Liveness API error: ' + err, 'error');
        });
    });

    document.getElementById('match-faces').addEventListener('click', function () {
        if (!slotData[1] || !slotData[2]) return logResult('Need images in both slots.', 'error');
        setStatus('Matching…');
        var images = [
            { base64: slotData[1].base64, imageType: slotData[1].imageType },
            { base64: slotData[2].base64, imageType: slotData[2].imageType }
        ];

        p.Face.matchFaces(images, function (res) {
            if (res.error) {
                setStatus('Match Error', 'error');
                return logResult('Match error: ' + res.error, 'error');
            }
            setStatus('Match done', 'ready');
            setFaceSimilarity(res.similarity);
            logResult('Similarity: ' + (res.similarity * 100).toFixed(1) + '%', 'success');
        }, function (err) {
            setStatus('Match Error', 'error');
            logResult('Match API error: ' + err, 'error');
        });
    });

    document.getElementById('clear-results').addEventListener('click', function () {
        clearSlots();
        setFaceSimilarity(null);
        setFaceLiveness(null);
        document.getElementById('combined-results-view').style.display = 'none';
        var resDiv = document.getElementById('results');
        if (resDiv) resDiv.innerHTML = '';
        setStatus('Cleared', 'ready');
    });

    /* =======================================================
       PAGE 2: DOCUMENT SDK BINDINGS
       ======================================================= */
    var btnInitDoc = document.getElementById('btn-init-doc');
    if (btnInitDoc) {
        btnInitDoc.addEventListener('click', function () {
            var input = document.getElementById('licenseFileDoc');
            readLicenseAsBase64(input.files[0], function (b64) {
                initDocumentSDK(p, b64);
            });
        });
    }

    document.getElementById('btn-scenarios').addEventListener('click', function () {
        p.DocumentReader.getAvailableScenarios(function (scenarios) {
            logResult("Available Scenarios: " + JSON.stringify(scenarios), "success");
        }, function (error) { logResult("Scenarios Error: " + error, "error"); });
    });

    document.getElementById('btn-prepare-db').addEventListener('click', function () {
        logResult("Preparing Database ('Full'). Please wait...", "info");
        p.DocumentReader.prepareDatabase("Full", function (msg) {
            logResult(msg, "success");
        }, function (error) { logResult("DB Prepare Error: " + error, "error"); });
    });

    document.getElementById('btn-scan').addEventListener('click', function () {
        logResult("Starting Camera Scanner...", "info");
        p.DocumentReader.startScanner({ scenario: "FullProcess" }, function (result) {
            var results = new DocumentReaderResults(result);
            logResult("Document Recognized: " + (results.getDocumentName() || 'Unknown'), "success");
        }, function (error) { logResult("Scanner Error/Cancelled: " + error, "error"); });
    });


    /* =======================================================
       PAGE 3: COMBINED FLOW BINDINGS
       ======================================================= */
    var btnInitBoth = document.getElementById('btnInitBoth');
    if (btnInitBoth) {
        btnInitBoth.addEventListener('click', function () {
            var input = document.getElementById('licenseFileCombined');
            readLicenseAsBase64(input.files[0], function (b64) {
                // Initialize Both Sequentially
                initFaceSDK(p, b64, function () {
                    initDocumentSDK(p, b64, function () {
                        document.getElementById('btn-capture-verify').disabled = false;
                        logResult("Combined Flow Ready. Both SDKs Initialized.", "success");
                    });
                });
            });
        });
    }

    document.getElementById('btn-capture-verify').addEventListener('click', function () {
        if (!isFaceSDKInitialized || !isDocReaderInitialized) {
            return logResult('Please initialize both SDKs first.', 'error');
        }

        logResult('Combined Flow: 1. Starting Document Scanner...', 'info');
        setStatus('Scanning Document...');

        // 1. Capture Document
        p.DocumentReader.startScanner({ scenario: "FullProcess" }, function (docResultStr) {
            setStatus('Parsing Doc Result...');
            console.log(docResultStr)
            var docResults = new DocumentReaderResults(docResultStr);
            console.log(docResults)
            var docName = docResults.getDocumentName() || "Unknown Document";
            var portraitBase64 = docResults.getPortrait();

            logResult("Document scanned: " + docName, "success");

            if (!portraitBase64) {
                logResult("Warning: No portrait found on the scanned document.", "warn");
            }

            // 2. Face Liveness
            logResult('Combined Flow: 2. Starting Face Liveness...', 'info');
            setStatus('Liveness Check...');

            p.Face.startLiveness(function (livenessRes) {
                if (livenessRes.error) {
                    setStatus('Liveness Canceled/Error', 'error');
                    return logResult('Liveness Error: ' + livenessRes.error, 'error');
                }

                var liveBase64 = livenessRes.image;
                logResult('Liveness Status: ' + (livenessRes.liveness === 1 ? 'Passed' : 'Failed'), 'success');

                // 3. Match Faces
                if (portraitBase64 && liveBase64) {
                    logResult('Combined Flow: 3. Matching Document Portrait with Live Face...', 'info');
                    setStatus('Matching Faces...');

                    var images = [
                        { base64: portraitBase64, imageType: 1 }, // 1 = Printed
                        { base64: liveBase64, imageType: 2 }      // 2 = Live
                    ];

                    p.Face.matchFaces(images, function (matchRes) {
                        setStatus('Combined Flow Complete', 'ready');
                        showCombinedUI(docResults, livenessRes, matchRes);
                    }, function (matchErr) {
                        logResult('Match API Error: ' + matchErr, 'error');
                        showCombinedUI(docResults, livenessRes, null);
                    });
                } else {
                    setStatus('Flow Complete (No Match)', 'ready');
                    showCombinedUI(docResults, livenessRes, null);
                }

            }, function (liveErr) {
                setStatus('Liveness API Error', 'error');
                logResult('Liveness API Error: ' + liveErr, 'error');
            });

        }, function (scanErr) {
            setStatus('Scanner Canceled/Error', 'error');
            logResult('Scanner Error: ' + scanErr, 'error');
        });
    });


    /* =======================================================
       GLOBAL SDK DE-INIT
       ======================================================= */
    document.getElementById('btnDeinitAll').addEventListener('click', function () {
        setStatus('Deinitializing…');
        clearSlots();

        if (isFaceSDKInitialized) {
            p.Face.deinitializeFaceSDK(
                function () {
                    isFaceSDKInitialized = false;
                    logResult('Face SDK Deinitialized', 'success');
                },
                function (e) { logResult('Face Deinit error: ' + e, 'error'); }
            );
        }
        if (isDocReaderInitialized) {
            p.DocumentReader.deinitializeReader(
                function () {
                    isDocReaderInitialized = false;
                    logResult('DocReader Deinitialized', 'success');
                    // Disable Doc buttons
                    document.getElementById('btn-scenarios').disabled = true;
                    document.getElementById('btn-prepare-db').disabled = true;
                    document.getElementById('btn-scan').disabled = true;
                    document.getElementById('btn-capture-verify').disabled = true;
                },
                function (e) { logResult('DocReader Deinit error: ' + e, 'error'); }
            );
        }
        setStatus('SDKs Stopped', 'ready');
    });

    /* =======================================================
       HELPER FUNCTIONS
       ======================================================= */

    function setupTabs() {
        var tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                // Remove active from all
                tabs.forEach(function (t) { t.classList.remove('active'); });
                document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });

                // Set active to clicked
                this.classList.add('active');
                var target = this.getAttribute('data-target');
                document.getElementById(target).classList.add('active');
            });
        });
    }

    function setupFilePickers() {
        // Label updaters
        ['licenseFileFace', 'licenseFileDoc', 'licenseFileCombined'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', function () {
                    var label = document.getElementById(id.replace('File', 'Label'));
                    if (label && this.files.length) label.textContent = this.files[0].name;
                });
            }
        });

        // Image pickers
        ['imgPickCamera', 'imgPickGallery', 'imgPickFile'].forEach(function (inputId) {
            var el = document.getElementById(inputId);
            if (el) {
                el.addEventListener('change', function () {
                    if (!this.files || !this.files.length) return;
                    var file = this.files[0];
                    var slot = activeSlot;
                    readFileAsBase64(file, function (b64) {
                        setSlotImage(slot, b64, 1); // 1 = PRINTED
                    });
                    this.value = ''; // reset
                });
            }
        });
    }

    function setupActionSheet() {
        var s1 = document.getElementById('slot-first');
        var s2 = document.getElementById('slot-second');
        if (s1) s1.addEventListener('click', function () { openActionSheet(1); });
        if (s2) s2.addEventListener('click', function () { openActionSheet(2); });

        document.getElementById('action-sheet-overlay').addEventListener('click', function (e) { if (e.target === this) closeActionSheet(); });
        document.getElementById('as-cancel').addEventListener('click', closeActionSheet);
        document.getElementById('as-camera').addEventListener('click', function () { closeActionSheet(); document.getElementById('imgPickCamera').click(); });
        document.getElementById('as-gallery').addEventListener('click', function () { closeActionSheet(); document.getElementById('imgPickGallery').click(); });
        document.getElementById('as-file').addEventListener('click', function () { closeActionSheet(); document.getElementById('imgPickFile').click(); });
    }

    function initFaceSDK(plugin, licenseB64, onSuccessCallback) {
        if (isFaceSDKInitialized) {
            if (onSuccessCallback) onSuccessCallback();
            return;
        }
        setStatus('Initializing Face SDK…');
        plugin.Face.initializeFaceSDK(licenseB64, function (res) {
            isFaceSDKInitialized = true;
            if (document.getElementById('face-capture')) document.getElementById('face-capture').disabled = false;
            setStatus('Face SDK Ready', 'ready');
            logResult('Face Init success: ' + (res.message || res), 'success');
            if (onSuccessCallback) onSuccessCallback();
        }, function (err) {
            setStatus('Face Init Failed', 'error');
            logResult('Face Init error: ' + err, 'error');
        });
    }

    function initDocumentSDK(plugin, licenseB64, onSuccessCallback) {
        if (isDocReaderInitialized) {
            if (onSuccessCallback) onSuccessCallback();
            return;
        }
        setStatus('Initializing Document Reader…');
        var config = { license: licenseB64, licenseUpdateTimeout: 2.0 };
        plugin.DocumentReader.initializeReader(config, function (message) {
            isDocReaderInitialized = true;
            document.getElementById('btn-scenarios').disabled = false;
            document.getElementById('btn-prepare-db').disabled = false;
            document.getElementById('btn-scan').disabled = false;
            setStatus('Doc SDK Ready', 'ready');
            logResult("Doc Init Success: " + message, "success");
            if (onSuccessCallback) onSuccessCallback();
        }, function (error) {
            setStatus('Doc Init Failed', 'error');
            logResult("Doc Init Error: " + error, "error");
        });
    }

    // Process and display combined results
    function showCombinedUI(docResults, livenessRes, matchRes) {
        console.log(docResults)
        var portraitBase64 = docResults.getPortrait();
        var liveBase64 = livenessRes.image;

        renderCombinedImages(portraitBase64, liveBase64);

        if (matchRes && !matchRes.error) {
            setCombinedSimilarity(matchRes.similarity);
            logResult('Combined Similarity: ' + (matchRes.similarity * 100).toFixed(1) + '%', 'success');
        } else {
            setCombinedSimilarity(null);
        }

        setCombinedLiveness(livenessRes.liveness);

        // Gather textual Doc Info
        var docName = docResults.getDocumentName() || "Unknown Document";
        var docNum = docResults.getTextFieldValueByType(2) || "—"; // FT_DOCUMENT_NUMBER
        var surname = docResults.getTextFieldValueByType(0) || "—"; // FT_SURNAME
        var givenNames = docResults.getTextFieldValueByType(1) || "—"; // FT_GIVEN_NAMES

        var textHtml = `
            <strong>Type:</strong> ${docName}<br/>
            <strong>Doc Number:</strong> ${docNum}<br/>
            <strong>Name:</strong> ${givenNames} ${surname}
        `;
        document.getElementById('combined-doc-text').innerHTML = textHtml;
    }
}