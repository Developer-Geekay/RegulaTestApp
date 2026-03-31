/* ============================================================
   Regula Face & Document Reader SDK — Test App (index.js)
   ============================================================ */

document.addEventListener('deviceready', onDeviceReady, false);

/* ---- Global state ---------------------------------------- */
var slotData = { 1: null, 2: null };
var activeSlot = 1;

var isFaceSDKInitialized = false;
var isDocReaderInitialized = false;

/* ---- Plugin resolver ------------------------------------- */
function getPlugin() {
    return window.Regula
        || (window.cordova && window.cordova.plugins && window.cordova.plugins.Regula)
        || (typeof Regula !== 'undefined' ? Regula : null);
}

/* ---- UI helpers ------------------------------------------ */
function setStatus(text, type) {
    var badge = document.getElementById('status-badge');
    var label = document.getElementById('status-text');
    if (label) label.textContent = text;
    if (badge) badge.className = 'status-badge' + (type ? ' ' + type : '');
}

function setSimilarity(value) {
    var el = document.getElementById('similarity-status');
    if (!el) return;
    if (value === null || value === undefined) {
        el.textContent = '—'; el.className = 'stat-value'; return;
    }
    var pct = (value * 100).toFixed(1) + '%';
    el.textContent = pct;
    el.className = 'stat-value ' + (value >= 0.75 ? 'good' : value >= 0.5 ? 'warn' : 'bad');
}

function setLiveness(value) {
    var el = document.getElementById('liveness-status');
    if (!el) return;
    if (value === null || value === undefined) {
        el.textContent = '—'; el.className = 'stat-value'; return;
    }
    var label = value === 1 ? 'Passed' : 'Unknown';
    el.textContent = label;
    el.className = 'stat-value ' + (value === 1 ? 'good' : 'bad');
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
    var reader = new FileReader();
    reader.onloadend = function () {
        var result = reader.result;
        if (!result) {
            logResult('License file could not be read (empty result)', 'error');
            return;
        }
        const base64Data = result.split(',')[1];
        callback(base64Data);
    };
    reader.onerror = function () { logResult('FileReader error reading license file', 'error'); };
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

    var licenseInput = document.getElementById('licenseFile');
    if (licenseInput) {
        licenseInput.addEventListener('change', function () {
            var label = document.getElementById('licenseLabel');
            if (label && this.files.length) label.textContent = this.files[0].name;
        });
    }

    /* =======================================================
       SECTION A: FACE SDK
       ======================================================= */

    /* ---- Initialize Face --------------------------------- */
    if (document.getElementById('btnInit')) {
        document.getElementById('btnInit').addEventListener('click', function () {
            var licenseFile = licenseInput && licenseInput.files.length ? licenseInput.files[0] : null;

            function doInitFace(licenseB64) {
                setStatus('Initializing Face SDK…');
                p.Face.initializeFaceSDK(licenseB64, function (res) {
                    isFaceSDKInitialized = true;
                    if (document.getElementById('face-capture')) document.getElementById('face-capture').disabled = false;
                    setStatus('Face SDK Ready', 'ready');
                    logResult('Face Init success: ' + (res.message || res), 'success');
                }, function (err) {
                    isFaceSDKInitialized = false;
                    setStatus('Face Init Failed', 'error');
                    logResult('Face Init error: ' + err, 'error');
                });
            }

            if (licenseFile) { readLicenseAsBase64(licenseFile, doInitFace); }
            else { doInitFace(null); }
        });
    }

    /* ---- Liveness ---------------------------------------- */
    if (document.getElementById('start-liveness')) {
        document.getElementById('start-liveness').addEventListener('click', function () {
            setStatus('Liveness running…');
            p.Face.startLiveness(function (res) {
                if (res.error) {
                    setStatus('Liveness Error', 'error');
                    logResult('Liveness error: ' + res.error, 'error');
                    return;
                }
                setStatus('Liveness done', 'ready');
                setLiveness(res.liveness);
                logResult('Liveness: ' + (res.liveness === 1 ? 'Passed' : 'Unknown'), 'success');

                if (res.image) setSlotImage(1, res.image, 2); // 2 = LIVE
            }, function (err) {
                setStatus('Liveness API Error', 'error');
                logResult('Liveness API error: ' + err, 'error');
            });
        });
    }

    /* ---- Face Capture ------------------------------------ */
    if (document.getElementById('face-capture')) {
        document.getElementById('face-capture').addEventListener('click', function () {
            setStatus('Capturing…');
            p.Face.startFaceCapture(function (res) {
                if (res.error) {
                    setStatus('Capture Error', 'error');
                    logResult('Capture error: ' + res.error, 'error');
                    return;
                }
                if (res.image) {
                    setStatus('Capture done', 'ready');
                    var slot = slotData[1] ? 2 : 1;
                    setSlotImage(slot, res.image, res.imageType || 1);
                    logResult('Face captured → slot ' + slot, 'success');
                }
            }, function (err) {
                setStatus('Capture API Error', 'error');
                logResult('Capture API error: ' + err, 'error');
            });
        });
    }

    /* ---- Match Faces ------------------------------------- */
    if (document.getElementById('match-faces')) {
        document.getElementById('match-faces').addEventListener('click', function () {
            if (!slotData[1] || !slotData[2]) {
                logResult('Need images in both slots before matching.', 'error');
                return;
            }
            setStatus('Matching…');
            var images = [
                { base64: slotData[1].base64, imageType: slotData[1].imageType },
                { base64: slotData[2].base64, imageType: slotData[2].imageType }
            ];

            p.Face.matchFaces(images, function (res) {
                if (res.error) {
                    setStatus('Match Error', 'error');
                    logResult('Match error: ' + res.error, 'error');
                    return;
                }
                setStatus('Match done', 'ready');
                setSimilarity(res.similarity);
                logResult('Similarity: ' + (res.similarity * 100).toFixed(1) + '%', 'success');
            }, function (err) {
                setStatus('Match Error', 'error');
                logResult('Match API error: ' + err, 'error');
            });
        });
    }

    /* =======================================================
       SECTION B: DOCUMENT READER SDK
       ======================================================= */

    /* ---- Initialize Document Reader ---------------------- */
    if (document.getElementById('init-reader')) {
        document.getElementById('init-reader').addEventListener('click', function () {
            var licenseFile = licenseInput && licenseInput.files.length ? licenseInput.files[0] : null;

            function doInitReader(licenseB64) {
                setStatus('Init DocReader…');
                // Maps to: p.DocumentReader.initializeReader(config, success, error)
                var config = { license: licenseB64, licenseUpdateTimeout: 2.0 };

                p.DocumentReader.initializeReader(config, function (res) {
                    isDocReaderInitialized = true;
                    setStatus('DocReader Ready', 'ready');
                    logResult('Document Reader Initialized', 'success');
                }, function (err) {
                    isDocReaderInitialized = false;
                    setStatus('DocReader Init Failed', 'error');
                    logResult('DocReader Init error: ' + err, 'error');
                });
            }

            if (licenseFile) readLicenseAsBase64(licenseFile, doInitReader);
            else doInitReader(null);
        });
    }

    /* ---- Start Document Scanner -------------------------- */
    if (document.getElementById('start-scanner')) {
        document.getElementById('start-scanner').addEventListener('click', function () {
            setStatus('Scanning…');
            // Maps to: p.DocumentReader.startScanner(config, success, error)
            var config = { scenario: "Mrz" };

            p.DocumentReader.startScanner(config, function (res) {
                setStatus('Scan done', 'ready');
                logResult('Scan result: ' + JSON.stringify(res), 'success');
            }, function (err) {
                setStatus('Scan Error', 'error');
                logResult('Scan error: ' + err, 'error');
            });
        });
    }

    /* ---- Deinitialize All -------------------------------- */
    if (document.getElementById('btnDeinit')) {
        document.getElementById('btnDeinit').addEventListener('click', function () {
            setStatus('Deinitializing…');
            clearSlots();

            if (isFaceSDKInitialized) {
                p.Face.deinitializeFaceSDK(
                    function () { logResult('Face SDK Deinitialized', 'success'); },
                    function (e) { logResult('Face Deinit error: ' + e, 'error'); }
                );
            }
            if (isDocReaderInitialized) {
                p.DocumentReader.deinitializeReader(
                    function () { logResult('DocReader Deinitialized', 'success'); },
                    function (e) { logResult('DocReader Deinit error: ' + e, 'error'); }
                );
            }
            setStatus('SDKs Stopped');
        });
    }

    /* ---- UI Bindings (Action Sheet & Slots) -------------- */
    if (document.getElementById('slot-first')) document.getElementById('slot-first').addEventListener('click', function () { openActionSheet(1); });
    if (document.getElementById('slot-second')) document.getElementById('slot-second').addEventListener('click', function () { openActionSheet(2); });
    if (document.getElementById('action-sheet-overlay')) {
        document.getElementById('action-sheet-overlay').addEventListener('click', function (e) { if (e.target === this) closeActionSheet(); });
    }
    if (document.getElementById('as-cancel')) document.getElementById('as-cancel').addEventListener('click', closeActionSheet);
    if (document.getElementById('as-camera')) document.getElementById('as-camera').addEventListener('click', function () { closeActionSheet(); document.getElementById('imgPickCamera').click(); });
    if (document.getElementById('as-gallery')) document.getElementById('as-gallery').addEventListener('click', function () { closeActionSheet(); document.getElementById('imgPickGallery').click(); });
    if (document.getElementById('as-file')) document.getElementById('as-file').addEventListener('click', function () { closeActionSheet(); document.getElementById('imgPickFile').click(); });

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

    if (document.getElementById('clear-results')) {
        document.getElementById('clear-results').addEventListener('click', function () {
            clearSlots();
            setSimilarity(null);
            setLiveness(null);
            setStatus('Device Ready', 'ready');
            var resDiv = document.getElementById('results');
            if (resDiv) resDiv.innerHTML = '';
        });
    }

    updateMatchButton();
}