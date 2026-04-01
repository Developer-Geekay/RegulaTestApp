var exec = require('cordova/exec');

var SERVICE_NAME = 'DocumentReaderPlugin';

// =============================================================================
// Enums — mirrors Regula SDK constants for use in JS
// =============================================================================

var Enum = {
    // eVisualFieldType — common text field identifiers
    eVisualFieldType: {
        FT_SURNAME: 0,
        FT_GIVEN_NAMES: 1,
        FT_DOCUMENT_NUMBER: 2,
        FT_NATIONALITY: 3,
        FT_DATE_OF_BIRTH: 4,
        FT_SEX: 5,
        FT_DATE_OF_EXPIRY: 6,
        FT_ISSUING_STATE: 7,
        FT_ADDRESS: 8,
        FT_PERSONAL_NUMBER: 9,
        FT_SURNAME_AND_GIVEN_NAMES: 10,
        FT_DOCUMENT_CLASS_CODE: 11,
        FT_ISSUING_STATE_CODE: 12,
        FT_PLACE_OF_BIRTH: 13,
        FT_MRZ_STRINGS: 14,
        FT_MRZ_TYPE: 15,
        FT_OPTIONAL_DATA: 16,
        FT_DOCUMENT_CLASS_NAME: 17,
        FT_ISSUING_STATE_NAME: 18,
        FT_PLACE_OF_ISSUE: 19,
        FT_DOCUMENT_NUMBER_CHECKSUM: 20,
        FT_DATE_OF_BIRTH_CHECKSUM: 21,
        FT_DATE_OF_EXPIRY_CHECKSUM: 22,
        FT_PERSONAL_NUMBER_CHECKSUM: 23,
        FT_FINAL_CHECKSUM: 24,
        FT_PASSPORT_DUPE_OF_LINE_REF13: 25,
        FT_PASSPORT_DUPE_OF_LINE_REF14: 26,
        FT_PASSPORT_DUPE_OF_LINE_REF15: 27,
        FT_SURNAME_INITIAL: 28,
        FT_AGE: 185,
        FT_PORTRAIT: 200,
        FT_FINGERPRINT: 201,
        FT_DL_CLASS: 173
    },

    // eGraphicFieldType — image field identifiers
    eGraphicFieldType: {
        GF_PORTRAIT: 201,
        GF_FINGERPRINT: 202,
        GF_EYE: 203,
        GF_SIGNATURE: 204,
        GF_BAR_CODE: 205,
        GF_PROOF_OF_CITIZENSHIP: 206,
        GF_DOCUMENT_IMAGE: 207,
        GF_COLOR_DYNAMIC: 209,
        GF_GHOST_PORTRAIT: 210,
        GF_STAMP: 211,
        GF_PORTRAIT_OF_CHILD: 212,
        GF_OTHER: 250,
        GF_FINGER_LEFT_THUMB: 300,
        GF_FINGER_LEFT_INDEX: 301,
        GF_FINGER_LEFT_MIDDLE: 302,
        GF_FINGER_LEFT_RING: 303,
        GF_FINGER_LEFT_LITTLE: 304,
        GF_FINGER_RIGHT_THUMB: 305,
        GF_FINGER_RIGHT_INDEX: 306,
        GF_FINGER_RIGHT_MIDDLE: 307,
        GF_FINGER_RIGHT_RING: 308,
        GF_FINGER_RIGHT_LITTLE: 309
    },

    // eRPRM_ResultType — data source zones
    eRPRM_ResultType: {
        RPRM_RESULT_TYPE_EMPTY: 0,
        RPRM_RESULT_TYPE_RAW_IMAGE: 1,
        RPRM_RESULT_TYPE_FILE_IMAGE: 2,
        RPRM_RESULT_TYPE_MRZ_OCR_EXTENDED: 3,
        RPRM_RESULT_TYPE_BARCODES: 5,
        RPRM_RESULT_TYPE_GRAPHICS: 6,
        RPRM_RESULT_TYPE_MRZ_TEST_QUALITY: 7,
        RPRM_RESULT_TYPE_DOCUMENT_TYPES_CANDIDATES: 8,
        RPRM_RESULT_TYPE_CHOSEN_DOCUMENT_TYPE_CANDIDATE: 9,
        RPRM_RESULT_TYPE_DOCUMENTS_INFO_LIST: 10,
        RPRM_RESULT_TYPE_OCR_LEXICAL_ANALYZE: 15,
        RPRM_RESULT_TYPE_RAW_UNCROPPED_IMAGE: 16,
        RPRM_RESULT_TYPE_VISUAL_OCR_EXTENDED: 17,
        RPRM_RESULT_TYPE_BAR_CODES_TEXT_DATA: 18,
        RPRM_RESULT_TYPE_BAR_CODES_IMAGE_DATA: 19,
        RPRM_RESULT_TYPE_AUTHENTICITY: 20,
        RPRM_RESULT_TYPE_RFID_RAW_DATA: 101,
        RPRM_RESULT_TYPE_RFID_TEXT_DATA: 102,
        RPRM_RESULT_TYPE_RFID_IMAGE_DATA: 103
    },

    // eRPRM_Lights — lighting schemes
    eRPRM_Lights: {
        RPRM_LIGHT_OFF: 0,
        RPRM_LIGHT_WHITE_FULL: 6,
        RPRM_LIGHT_IR: 16,
        RPRM_LIGHT_UV: 128
    },

    // eCheckResult — verification outcomes
    eCheckResult: {
        CH_CHECK_ERROR: 0,
        CH_CHECK_OK: 1,
        CH_CHECK_WAS_NOT_DONE: 2
    },

    // LCID — common language-culture identifiers
    LCID: {
        LATIN: 0,
        AFRIKAANS: 1078,
        ALBANIAN: 1052,
        ARABIC_ALGERIA: 5121,
        ARABIC_EGYPT: 3073,
        CHINESE_SIMPLIFIED: 2052,
        CHINESE_TRADITIONAL: 1028,
        ENGLISH: 1033,
        FRENCH: 1036,
        GERMAN: 1031,
        HINDI: 1081,
        INDONESIAN: 1057,
        ITALIAN: 1040,
        JAPANESE: 1041,
        KOREAN: 1042,
        MALAY: 1086,
        PORTUGUESE: 2070,
        RUSSIAN: 1049,
        SPANISH: 1034,
        THAI: 1054,
        TURKISH: 1055,
        VIETNAMESE: 1066
    },

    // Scenario identifiers
    ScenarioIdentifier: {
        SCENARIO_MRZ: 'Mrz',
        SCENARIO_BARCODE: 'Barcode',
        SCENARIO_LOCATE: 'Locate',
        SCENARIO_OCR: 'Ocr',
        SCENARIO_DOCTYPE: 'DocType',
        SCENARIO_MRZ_OR_BARCODE: 'MrzOrBarcode',
        SCENARIO_MRZ_OR_LOCATE: 'MrzOrLocate',
        SCENARIO_MRZ_AND_LOCATE: 'MrzAndLocate',
        SCENARIO_BARCODE_AND_LOCATE: 'BarcodeAndLocate',
        SCENARIO_FULL_PROCESS: 'FullProcess',
        SCENARIO_FULL_AUTH: 'FullAuth',
        SCENARIO_CAPTURE: 'Capture'
    },

    // DocReaderAction — processing action states
    DocReaderAction: {
        COMPLETE: 1,
        PROCESS: 0,
        CANCEL: 2,
        ERROR: 3,
        NOTIFICATION: 5,
        MORE_PAGES_AVAILABLE: 8,
        TIMEOUT: 130
    }
};

function DocumentReaderResults(json) {
    if (typeof json === 'string') {
        json = JSON.parse(json);
    }
    this._raw = json || {};

    // Metadata
    this.chipPage = json.chipPage;
    this.morePagesAvailable = json.morePagesAvailable;
    this.elapsedTime = json.elapsedTime;
    this.elapsedTimeRFID = json.elapsedTimeRFID;
    this.processingFinishedStatus = json.processingFinishedStatus;

    // Result groups
    this.documentType = json.documentType || [];
    this.textResult = json.textResult || {};
    this.graphicResult = json.graphicResult || {};
    this.barcodeResult = json.barcodeResult || {};
    this.imageQuality = json.imageQuality || {};
    this.authenticityResult = json.authenticityResult || {};
    this.status = json.status || {};
    this.position = json.position || {};
    this.rfidSessionData = json.rfidSessionData || {};
}

/**
 * Get a text field value by type, with optional source and LCID filters.
 *
 * @param {number} fieldType    - eVisualFieldType constant
 * @param {number} [lcid]       - LCID constant (optional)
 * @param {number} [sourceType] - eRPRM_ResultType constant (optional)
 * @param {boolean} [original]  - return originalValue if true (optional)
 * @returns {string|null}
 */
DocumentReaderResults.prototype.getTextFieldValueByType = function (fieldType, lcid, sourceType, original) {
    if (!this.textResult || !this.textResult.fields) return null;

    for (var i = 0; i < this.textResult.fields.length; i++) {
        var field = this.textResult.fields[i];
        if (field.fieldType !== fieldType) continue;
        if (lcid !== undefined && field.lcid !== lcid) continue;

        // If sourceType is specified, look through values array
        if (sourceType !== undefined && field.values) {
            for (var j = 0; j < field.values.length; j++) {
                var val = field.values[j];
                if (val.sourceType === sourceType) {
                    return original ? (val.originalValue || val.value) : val.value;
                }
            }
            return null;
        }

        return field.value || null;
    }
    return null;
};

/**
 * Get a text field object by type and optional LCID.
 *
 * @param {number} fieldType - eVisualFieldType constant
 * @param {number} [lcid]    - LCID constant (optional)
 * @returns {object|null}
 */
DocumentReaderResults.prototype.getTextFieldByType = function (fieldType, lcid) {
    if (!this.textResult || !this.textResult.fields) return null;

    for (var i = 0; i < this.textResult.fields.length; i++) {
        var field = this.textResult.fields[i];
        if (field.fieldType !== fieldType) continue;
        if (lcid !== undefined && field.lcid !== lcid) continue;
        return field;
    }
    return null;
};

/**
 * Get all text fields as a flat key-value map { fieldName: value }.
 *
 * @returns {object}
 */
DocumentReaderResults.prototype.getTextFieldsMap = function () {
    var map = {};
    if (!this.textResult || !this.textResult.fields) return map;

    for (var i = 0; i < this.textResult.fields.length; i++) {
        var field = this.textResult.fields[i];
        map[field.fieldName] = field.value;
    }
    return map;
};

/**
 * Get a graphic field's base64 image by type, with optional filters.
 *
 * @param {number} fieldType    - eGraphicFieldType constant
 * @param {number} [sourceType] - eRPRM_ResultType constant (optional)
 * @param {number} [pageIndex]  - page index (optional, default 0)
 * @param {number} [lightType]  - eRPRM_Lights constant (optional)
 * @returns {string|null}       - base64 encoded PNG image
 */
DocumentReaderResults.prototype.getGraphicFieldImageByType = function (fieldType, sourceType, pageIndex, lightType) {
    if (!this.graphicResult || !this.graphicResult.fields) return null;

    for (var i = 0; i < this.graphicResult.fields.length; i++) {
        var field = this.graphicResult.fields[i];
        if (field.fieldType !== fieldType) continue;
        if (sourceType !== undefined && field.sourceType !== sourceType) continue;
        if (pageIndex !== undefined && field.pageIndex !== pageIndex) continue;
        if (lightType !== undefined && field.light !== lightType) continue;
        return field.imageBase64 || null;
    }
    return null;
};

/**
 * Get a graphic field object by type, with optional filters.
 *
 * @param {number} fieldType    - eGraphicFieldType constant
 * @param {number} [sourceType] - eRPRM_ResultType constant (optional)
 * @param {number} [pageIndex]  - page index (optional)
 * @param {number} [lightType]  - eRPRM_Lights constant (optional)
 * @returns {object|null}
 */
DocumentReaderResults.prototype.getGraphicFieldByType = function (fieldType, sourceType, pageIndex, lightType) {
    if (!this.graphicResult || !this.graphicResult.fields) return null;

    for (var i = 0; i < this.graphicResult.fields.length; i++) {
        var field = this.graphicResult.fields[i];
        if (field.fieldType !== fieldType) continue;
        if (sourceType !== undefined && field.sourceType !== sourceType) continue;
        if (pageIndex !== undefined && field.pageIndex !== pageIndex) continue;
        if (lightType !== undefined && field.light !== lightType) continue;
        return field;
    }
    return null;
};

/**
 * Get the overall verification status.
 *
 * @returns {number} eCheckResult value
 */
DocumentReaderResults.prototype.getOverallStatus = function () {
    return this.status.overallStatus;
};

/**
 * Get document type name (first recognized document).
 *
 * @returns {string|null}
 */
DocumentReaderResults.prototype.getDocumentName = function () {
    if (this.documentType && this.documentType.length > 0) {
        return this.documentType[0].name || null;
    }
    return null;
};

/**
 * Get the portrait (face) image as base64.
 *
 * @returns {string|null}
 */
DocumentReaderResults.prototype.getPortrait = function () {
    return this.getGraphicFieldImageByType(Enum.eGraphicFieldType.GF_PORTRAIT);
};

/**
 * Get the full document image as base64.
 *
 * @returns {string|null}
 */
DocumentReaderResults.prototype.getDocumentImage = function () {
    return this.getGraphicFieldImageByType(Enum.eGraphicFieldType.GF_DOCUMENT_IMAGE);
};

/**
 * Get the signature image as base64.
 *
 * @returns {string|null}
 */
DocumentReaderResults.prototype.getSignatureImage = function () {
    return this.getGraphicFieldImageByType(Enum.eGraphicFieldType.GF_SIGNATURE);
};

/**
 * Returns the raw JSON object.
 *
 * @returns {object}
 */
DocumentReaderResults.prototype.toJSON = function () {
    return this._raw;
};

