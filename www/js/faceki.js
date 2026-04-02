// FaceKi Configuration (Replace with actual values)
const FACEKI_CLIENT_ID = "8wnoSZUomrD2FYpgymGwMr70Z";
const FACEKI_CLIENT_SECRET = "AvgCjK1C58eT45DECde3nDLGJUNKSR3GvZhn371dm38o6r7L2bZtALm8RV5AJPck";
const FACEKI_WORKFLOW_ID = "7ba33de6-5df6-4414-a89d-96e4479ce93a";
const APPLICATION_ID = "RC1020222222";

let accessToken = null;
// The UUID/link-ID returned in data.data from the link-generation API.
// This is what the SDK expects — NOT the full URL from data.url.
let verificationLinkId = null;

function logResult(msg, type) {
    console.log('[FaceKi]', msg);
    var resDiv = document.getElementById('results');
    if (!resDiv) return;
    var text = (typeof msg === 'object') ? JSON.stringify(msg, null, 2) : String(msg);
    var line = document.createElement('div');
    line.className = 'log-line' + (type ? ' ' + type : '');
    line.textContent = '> ' + text;
    resDiv.insertBefore(line, resDiv.firstChild);
}

function showKycResult(statusText, cardClass, dataObj) {
    var card  = document.getElementById('kyc-result-card');
    var title = document.getElementById('kyc-result-title');
    var data  = document.getElementById('kyc-result-data');
    if (!card) return;

    card.className  = 'kyc-result-card visible ' + cardClass;
    title.textContent = statusText;

    if (dataObj) {
        data.textContent = JSON.stringify(dataObj, null, 2);
        data.className = 'kyc-result-data visible';
    } else {
        data.textContent = '';
        data.className = 'kyc-result-data';
    }
}

document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    document.getElementById('get-token').addEventListener('click', getToken);
    document.getElementById('get-link').addEventListener('click', getLink);
    document.getElementById('start-verify').addEventListener('click', startVerify);
}

async function getToken() {
    logResult('Getting token...', 'info');
    try {
        const response = await fetch('https://sdk.faceki.com/auth/api/generate-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: FACEKI_CLIENT_ID,
                clientSecret: FACEKI_CLIENT_SECRET
            })
        });

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        const data = await response.json();
        accessToken = data.data.access_token;
        logResult('Token obtained.', 'success');
    } catch (error) {
        logResult('Error getting token: ' + error.message, 'error');
    }
}

async function getLink() {
    if (!accessToken) {
        logResult('No access token. Get token first.', 'error');
        return;
    }

    logResult('Getting verification link...', 'info');
    try {
        const response = await fetch('https://sdk.faceki.com/kycverify/api/kycverify/kyc-verify-link', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                expiryTime: 1,
                applicationId: APPLICATION_ID,
                redirect_url: "https://muat.riyadcapital.com/RCOnline/Login",
                workflowId: FACEKI_WORKFLOW_ID
            })
        });

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        const data = await response.json();
        logResult('Link response: ' + JSON.stringify(data), 'success');

        // data.data is the link ID (UUID) the SDK expects.
        // data.url is the full browser URL — we do NOT pass that to the SDK.
        verificationLinkId = data.data;

        // Populate the input field so the user can see and optionally override it.
        var input = document.getElementById('verification-link');
        if (input) input.value = verificationLinkId || '';

        logResult('Link ID ready: ' + verificationLinkId, 'success');
    } catch (error) {
        logResult('Error getting link: ' + error.message, 'error');
    }
}

function startVerify() {
    // Prefer whatever is in the input field (allows manual override),
    // fall back to the link fetched via getLink().
    var inputVal = (document.getElementById('verification-link').value || '').trim();
    var linkId = inputVal || verificationLinkId;

    if (!linkId) {
        logResult('No verification link. Click "Get Link" or enter a link ID.', 'error');
        return;
    }

    logResult('Starting KYC verification...', 'info');

    FaceKiPlugin.startKycVerification(
        linkId,        // UUID from data.data (or full URL — plugin extracts UUID automatically)
        APPLICATION_ID, // recordIdentifier — your internal session/application identifier
        function (response) {
            // VerificationResult.ResultOk — user completed the KYC flow
            logResult('KYC completed — status: ' + response.status, 'success');
            if (response.data) {
                logResult(JSON.stringify(response.data, null, 2), 'success');
            }
            showKycResult('Verification Completed', 'ok', response.data || null);
        },
        function (error) {
            // VerificationResult.ResultCanceled — user pressed back
            // or a plain string message on SDK/network error
            if (error && typeof error === 'object' && error.status) {
                logResult('KYC ' + error.status, 'error');
                if (error.data) {
                    logResult(JSON.stringify(error.data, null, 2), 'error');
                }
                showKycResult('Verification Cancelled', 'cancelled', error.data || null);
            } else {
                logResult('KYC error: ' + String(error), 'error');
                showKycResult('SDK Error', 'sdk-error', null);
            }
        }
    );
}
