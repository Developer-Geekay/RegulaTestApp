/* ============================================================
   Regula Face SDK — Test App  (index.js)

   Step 1  : Initialize   — license file picked on frontend, base64 sent to plugin
   Step 2  : Liveness     — Regula liveness check
   Step 3  : Detect Face  — mapped to startLiveness on Android
   Step 4  : Face Capture — Regula camera activity
   Step 5  : Face Match   — two images picked via Cordova/HTML file inputs, base64 to plugin
   ============================================================ */

document.addEventListener('deviceready', onDeviceReady, false);

/* ---- Global state ---------------------------------------- */

// Slot data: { base64: string (no data-URI prefix), imageType: number }
var slotData = { 1: null, 2: null };

// Which slot is the action sheet targeting
var activeSlot = 1;

/* ---- Plugin resolver ------------------------------------- */

function getPlugin() {
    return window.RegulaFace
        || (window.cordova && window.cordova.plugins && window.cordova.plugins.RegulaFace)
        || (typeof RegulaFace !== 'undefined' ? RegulaFace : null);
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
    // 1 = Passed, 0 = Unknown/Failed
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
    var imgId  = slotNum === 1 ? 'first-image'       : 'second-image';
    var phId   = slotNum === 1 ? 'placeholder-first' : 'placeholder-second';

    var img = document.getElementById(imgId);
    var ph  = document.getElementById(phId);

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
    [1, 2].forEach(function(n) {
        var imgId = n === 1 ? 'first-image'       : 'second-image';
        var phId  = n === 1 ? 'placeholder-first' : 'placeholder-second';
        var img = document.getElementById(imgId);
        var ph  = document.getElementById(phId);
        if (img) { img.src = ''; img.style.display = 'none'; }
        if (ph)  { ph.style.display = ''; }
        slotData[n] = null;
    });
    updateMatchButton();
}

/* ---- Action sheet ---------------------------------------- */

function openActionSheet(slotNum) {
    activeSlot = slotNum;
    var overlay = document.getElementById('action-sheet-overlay');
    var sheet   = document.getElementById('action-sheet');
    if (overlay) overlay.style.display = 'flex';
    if (sheet)   sheet.classList.add('visible');
}

function closeActionSheet() {
    var overlay = document.getElementById('action-sheet-overlay');
    var sheet   = document.getElementById('action-sheet');
    if (overlay) overlay.style.display = 'none';
    if (sheet)   sheet.classList.remove('visible');
}

/* ---- Read image file → base64 (strips data-URI prefix) ---- */

function readFileAsBase64(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var dataUrl = e.target.result;                // "data:image/jpeg;base64,AAAA..."
        var comma   = dataUrl.indexOf(',');
        var b64     = comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl;
        callback(b64);
    };
    reader.onerror = function() {
        logResult('FileReader error reading image', 'error');
    };
    reader.readAsDataURL(file);
}

/* ---- License file → base64 ------------------------------- */

function readLicenseAsBase64(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
        // ArrayBuffer → base64
        var bytes  = new Uint8Array(e.target.result);
        var binary = '';
        for (var i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        callback(btoa(binary));
    };
    reader.onerror = function() {
        logResult('FileReader error reading license', 'error');
    };
    reader.readAsArrayBuffer(file);
}

/* ===========================================================
   Device Ready — wire up all listeners
   =========================================================== */

function onDeviceReady() {
    console.log('Cordova ready — ' + cordova.platformId + ' v' + cordova.version);
    setStatus('Device Ready', 'ready');
    logResult('Device ready. Platform: ' + cordova.platformId, 'info');

    /* ---- License file label update ----------------------- */
    var licenseInput = document.getElementById('licenseFile');
    if (licenseInput) {
        licenseInput.addEventListener('change', function() {
            var label = document.getElementById('licenseLabel');
            if (label && this.files.length) {
                label.textContent = this.files[0].name;
            }
        });
    }

    /* ---- STEP 1 : Initialize ----------------------------- */
    document.getElementById('btnInit').addEventListener('click', function() {
        var p = getPlugin();
        if (!p) { logResult('Plugin not found', 'error'); return; }

        var licenseFile = licenseInput && licenseInput.files.length ? licenseInput.files[0] : null;

        function doInit(licenseB64) {
            setStatus('Initializing…');
            logResult('Initializing SDK' + (licenseB64 ? ' (offline license)' : ' (online/basic)') + '…', 'info');

            p.initializeFaceSDK(licenseB64, function(res) {
                setStatus('SDK Ready', 'ready');
                var msg = (typeof res === 'object') ? (res.message || 'Initialized') : String(res);
                logResult('Init success: ' + msg, 'success');
            }, function(err) {
                setStatus('Init Failed', 'error');
                logResult('Init error: ' + err, 'error');
            });
        }

        if (licenseFile) {
            readLicenseAsBase64(licenseFile, doInit);
        } else {
            doInit(null);  // online/basic mode
        }
    });

    /* ---- STEP 2 : Liveness ------------------------------- */
    document.getElementById('start-liveness').addEventListener('click', function() {
        var p = getPlugin();
        if (!p) { logResult('Plugin not found', 'error'); return; }

        setStatus('Liveness running…');
        logResult('Starting Liveness…', 'info');

        p.startLiveness(function(res) {
            if (res.error) {
                setStatus('Liveness Error', 'error');
                logResult('Liveness error: ' + res.error, 'error');
                return;
            }
            setStatus('Liveness done', 'ready');
            setLiveness(res.liveness);
            logResult('Liveness: ' + (res.liveness === 1 ? 'Passed' : 'Unknown'), res.liveness === 1 ? 'success' : 'error');

            if (res.image) {
                setSlotImage(1, res.image, 2);  // imageType 2 = LIVE
            }
        }, function(err) {
            setStatus('Liveness Error', 'error');
            logResult('Liveness API error: ' + err, 'error');
        });
    });

    /* ---- STEP 3 : Detect Face (alias of liveness) -------- */
    document.getElementById('detect-face').addEventListener('click', function() {
        var p = getPlugin();
        if (!p) { logResult('Plugin not found', 'error'); return; }

        setStatus('Detecting…');
        logResult('Starting Face Detection…', 'info');

        p.detectFace(function(res) {
            if (res.error) {
                setStatus('Detect Error', 'error');
                logResult('Detect error: ' + res.error, 'error');
                return;
            }
            setStatus('Detection done', 'ready');
            setLiveness(res.liveness);
            logResult('Face Detected — Liveness: ' + (res.liveness === 1 ? 'Passed' : 'Unknown'), 'success');

            if (res.image) {
                // Put in slot 1 if empty, else slot 2
                var slot = slotData[1] ? 2 : 1;
                setSlotImage(slot, res.image, 2);
            }
        }, function(err) {
            setStatus('Detect Error', 'error');
            logResult('Detect API error: ' + err, 'error');
        });
    });

    /* ---- STEP 4 : Face Capture (Regula camera) ----------- */
    document.getElementById('face-capture').addEventListener('click', function() {
        var p = getPlugin();
        if (!p) { logResult('Plugin not found', 'error'); return; }

        setStatus('Capturing…');
        logResult('Starting Face Capture…', 'info');

        p.startFaceCapture(function(res) {
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
            } else {
                setStatus('No image', 'error');
                logResult('Capture returned no image.', 'error');
            }
        }, function(err) {
            setStatus('Capture Error', 'error');
            logResult('Capture API error: ' + err, 'error');
        });
    });

    /* ---- STEP 5 : Slot taps → action sheet --------------- */

    // Slot 1
    document.getElementById('slot-first').addEventListener('click', function() {
        openActionSheet(1);
    });
    // Slot 2
    document.getElementById('slot-second').addEventListener('click', function() {
        openActionSheet(2);
    });

    // Overlay backdrop closes sheet
    document.getElementById('action-sheet-overlay').addEventListener('click', function(e) {
        if (e.target === this) closeActionSheet();
    });

    // Cancel
    document.getElementById('as-cancel').addEventListener('click', closeActionSheet);

    // --- Camera ---
    document.getElementById('as-camera').addEventListener('click', function() {
        closeActionSheet();
        document.getElementById('imgPickCamera').click();
    });

    // --- Gallery ---
    document.getElementById('as-gallery').addEventListener('click', function() {
        closeActionSheet();
        document.getElementById('imgPickGallery').click();
    });

    // --- File ---
    document.getElementById('as-file').addEventListener('click', function() {
        closeActionSheet();
        document.getElementById('imgPickFile').click();
    });

    // Wire hidden inputs — all three read the selected file the same way
    ['imgPickCamera', 'imgPickGallery', 'imgPickFile'].forEach(function(inputId) {
        document.getElementById(inputId).addEventListener('change', function() {
            if (!this.files || !this.files.length) return;
            var file = this.files[0];
            var slot = activeSlot;
            readFileAsBase64(file, function(b64) {
                setSlotImage(slot, b64, 1);  // imageType 1 = PRINTED (external file)
                logResult('Image loaded from ' + inputId.replace('imgPick', '') + ' → slot ' + slot, 'info');
            });
            // Reset so same file can be selected again
            this.value = '';
        });
    });

    /* ---- STEP 5 : Match Faces ---------------------------- */
    document.getElementById('match-faces').addEventListener('click', function() {
        var p = getPlugin();
        if (!p) { logResult('Plugin not found', 'error'); return; }

        if (!slotData[1] || !slotData[2]) {
            logResult('Need images in both slots before matching.', 'error');
            return;
        }

        setStatus('Matching…');
        logResult('Matching faces…', 'info');

        var images = [
            { base64: slotData[1].base64, imageType: slotData[1].imageType },
            { base64: slotData[2].base64, imageType: slotData[2].imageType }
        ];

        p.matchFaces(images, function(res) {
            if (res.error) {
                setStatus('Match Error', 'error');
                logResult('Match error: ' + res.error, 'error');
                return;
            }
            setStatus('Match done', 'ready');
            setSimilarity(res.similarity);
            var pct = res.similarity !== null ? (res.similarity * 100).toFixed(1) + '%' : 'null';
            var matched = res.matched ? 'MATCHED ✓' : 'NOT matched ✗';
            logResult('Similarity: ' + pct + ' — ' + matched, res.matched ? 'success' : 'error');
        }, function(err) {
            setStatus('Match Error', 'error');
            logResult('Match API error: ' + err, 'error');
        });
    });

    /* ---- Clear ------------------------------------------- */
    document.getElementById('clear-results').addEventListener('click', function() {
        clearSlots();
        setSimilarity(null);
        setLiveness(null);
        setStatus('Device Ready', 'ready');
        var resDiv = document.getElementById('results');
        if (resDiv) resDiv.innerHTML = '';
        logResult('Cleared.', 'info');
    });

    /* ---- Deinitialize ------------------------------------ */
    document.getElementById('btnDeinit').addEventListener('click', function() {
        var p = getPlugin();
        if (!p) { logResult('Plugin not found', 'error'); return; }

        setStatus('Deinitializing…');
        logResult('Deinitializing SDK…', 'info');
        clearSlots();
        setSimilarity(null);
        setLiveness(null);

        p.deinitializeFaceSDK(function(res) {
            setStatus('SDK Stopped');
            logResult('Deinit: ' + res, 'success');
        }, function(err) {
            setStatus('Deinit Error', 'error');
            logResult('Deinit error: ' + err, 'error');
        });
    });

    updateMatchButton();
}
