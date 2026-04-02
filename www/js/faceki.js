// FaceKi Configuration (Replace with actual values)
const FACEKI_CLIENT_ID = "8wnoSZUomrD2FYpgymGwMr70Z";
const FACEKI_CLIENT_SECRET = "AvgCjK1C58eT45DECde3nDLGJUNKSR3GvZhn371dm38o6r7L2bZtALm8RV5AJPck";
const FACEKI_WORKFLOW_ID = "7ba33de6-5df6-4414-a89d-96e4479ce93a";

let accessToken = null;
let verificationLink = null;
let dataId = null;

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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clientId: FACEKI_CLIENT_ID,
                clientSecret: FACEKI_CLIENT_SECRET
            })
        });

        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }

        const data = await response.json();
        accessToken = data.data.access_token;
        logResult('Data: ' + JSON.stringify(data), 'success');
    } catch (error) {
        logResult('Error getting token: ' + error.message, 'error');
    }
}

async function getLink() {
    if (!accessToken) {
        logResult('No access token. Please get token first.', 'error');
        return;
    }

    logResult('Getting link...', 'info');
    try {
        const response = await fetch('https://sdk.faceki.com/kycverify/api/kycverify/kyc-verify-link', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                expiryTime: 1,
                applicationId: "RC1020222222",
                redirect_url: "https://muat.riyadcapital.com/RCOnline/Login",
                workflowId: FACEKI_WORKFLOW_ID
            })
        });

        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }

        const data = await response.json();
        logResult('Data: ' + JSON.stringify(data), 'success'); // Assumed from spec
        verificationLink = data.url;
        dataId = data.data;
    } catch (error) {
        logResult('Error getting link: ' + error.message, 'error');
    }
}

function startVerify() {
    logResult('Starting verify...', 'info');
    // For now, this still uses the plugin or redirect if provided in the link.
    // If the user wants a full implementation, further details would be needed.
    FaceKiPlugin.startKycVerification(
        verificationLink,
        dataId,
        function (response) {
            console.log("KYC Success:", response.status);
        },
        function (error) {
            console.error("KYC Error:", error.status);
        }
    );
    logResult('Verify action triggered.', 'success');
}