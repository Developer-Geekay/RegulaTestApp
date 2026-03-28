# Regula Plugin Revamp — Implementation Plan

## Goal

Revamp the Cordova plugin (`RegulaForensicsPlugin.java`) and the test-app frontend (`index.html` / `index.js`) to:

1. Move license loading to the **frontend** — user picks a `.license` file; its base64 is passed to the plugin at init time.
2. All features (Liveness, Detection, Capture, Match) work through the initialized `FaceSDK.Instance()`.
3. Face Match image slots are clickable — user picks from **Camera / Gallery / File** using native Cordova capabilities (no Regula face-capture for this flow).
4. Both images are sent as **base64** to the plugin for comparison.

---

## Step Order

| Step | Feature         | Status  |
|------|-----------------|---------|
| 1    | Initialize      | 🔲 TODO |
| 2    | Face Liveness   | 🔲 TODO |
| 3    | Face Detection  | 🔲 TODO |
| 4    | Face Capture    | 🔲 TODO |
| 5    | Face Match      | 🔲 TODO |

---

## Step 1 — Initialize

### Java (`RegulaForensicsPlugin.java`)

- Action: `initializeFaceSDK`
- Input: `args[0]` = base64-encoded license string (or `null` for basic/online mode)
- Logic:
  - If `licenseBase64` is non-null → decode bytes → `InitializationConfiguration.Builder(bytes).build()` → `FaceSDK.Instance().initialize(context, config, completion)`
  - If `null` → `FaceSDK.Instance().initialize(context, completion)`
- Success response: `{ "success": true, "message": "SDK initialized (Offline|Online)" }`
- Error response: `callbackContext.error(exceptionMessage)`

```java
byte[] license = Base64.decode(licenseBase64, Base64.DEFAULT);
InitializationConfiguration config = new InitializationConfiguration.Builder(license).build();
FaceSDK.Instance().initialize(context, config, (status, e) -> {
    if (status) callbackContext.success("SDK initialized.");
    else callbackContext.error(e != null ? e.getMessage() : "Init failed");
});
```

### Frontend (`index.html` / `index.js`)

- Add `<input type="file" accept=".license" id="licenseFile">` near the Init button
- On Init button click:
  - If a file is selected: use `FileReader.readAsArrayBuffer()` → convert to base64 → pass to plugin
  - If no file selected: pass `null` (online/basic mode)
- Show status in header badge

---

## Step 2 — Face Liveness

### Java

- Action: `startLiveness`
- Uses: `LivenessConfiguration.Builder().build()` (per official docs)
- Runs on UI thread via `cordova.getActivity().runOnUiThread(...)`
- Returns: `{ liveness (0|1), image (base64 PNG), error? }`

```java
LivenessConfiguration configuration = new LivenessConfiguration.Builder().build();
FaceSDK.Instance().startLiveness(activity, configuration, livenessResponse -> {
    // livenessResponse.getLiveness() → LivenessStatus (PASSED | ...)
    // livenessResponse.getBitmap()   → face image
    // livenessResponse.getException() → LivenessErrorException
});
```

### Frontend

- Liveness button → calls `startLiveness`
- Result image shown in **Slot 1** (`#first-image`)
- `#liveness-status` updated with Passed / Unknown

---

## Step 3 — Face Detection

### Java

- Action: `detectFace`
- **Mapped to the same `startLiveness` SDK call** (no distinct Android mobile detection API)
- Returns same shape as liveness: `{ liveness, image, error? }`

### Frontend

- Separate "Detect" button in UI
- Result image shown in **Slot 1** or **Slot 2** depending on which is empty

---

## Step 4 — Face Capture (Cordova-native, no Regula library)

### Java

- Action: `startFaceCapture`
- Uses Regula's `FaceSDK.Instance().presentFaceCaptureActivity(...)` launched with `FaceCaptureConfiguration.Builder()`
- Returns: `{ image (base64 PNG), error? }`

### Frontend — Image Picker for Match Slots

> ⚠️ For the Face Match slots specifically, **do NOT use the Regula face-capture library**.
> Instead use **Cordova's built-in** `navigator.camera` (if cordova-plugin-camera is present) or a plain HTML `<input type="file" accept="image/*" capture>` to pick / capture the image.

- Clicking either portrait slot (`#first-image` / `#second-image`) shows a bottom-sheet with:
  - 📷 **Camera** → `<input type="file" accept="image/*" capture="environment">` or `navigator.camera.getPicture`
  - 🖼️ **Gallery** → `<input type="file" accept="image/*">` (no capture attribute)
  - 📁 **File** → `<input type="file" accept="image/*,application/octet-stream">`
- Selected image is read as base64 via `FileReader`
- Stored in `slotData[1]` / `slotData[2]` = `{ base64, imageType: 1 }`

---

## Step 5 — Face Match

### Java

- Action: `matchFaces`
- Input: `args[0]` = JSON array `[{ base64, imageType }, { base64, imageType }]`
- Decodes each base64 string → `Bitmap` → `MatchFacesImage(bitmap, ImageType)`
- Calls `FaceSDK.Instance().matchFaces(context, request, response -> { ... })`
- Uses `MatchFacesSimilarityThresholdSplit(results, 0.75)` to classify result
- Returns: `{ similarity (double 0–1), matched (bool), error? }`

```java
List<MatchFacesImage> images = Arrays.asList(
    new MatchFacesImage(bitmap1, ImageType.IMAGE_TYPE_PRINTED),
    new MatchFacesImage(bitmap2, ImageType.IMAGE_TYPE_PRINTED)
);
MatchFacesRequest request = new MatchFacesRequest(images);
FaceSDK.Instance().matchFaces(context, request, response -> {
    MatchFacesSimilarityThresholdSplit split =
        new MatchFacesSimilarityThresholdSplit(response.getResults(), 0.75d);
    double similarity = split.getMatchedFaces().isEmpty()
        ? split.getUnmatchedFaces().get(0).getSimilarity()
        : split.getMatchedFaces().get(0).getSimilarity();
    // return { similarity, matched: !split.getMatchedFaces().isEmpty() }
});
```

### Frontend

- "Match Faces" button enabled only when both slots have images
- Reads `slotData[1].base64` and `slotData[2].base64`
- Sends `[{ base64, imageType: 1 }, { base64, imageType: 1 }]` to plugin
- Shows similarity in `#similarity-status` with colour coding

---

## Files Affected

| File | Changes |
|------|---------|
| `cordova-plugin-regula/src/android/RegulaForensicsPlugin.java` | Steps 1–5 Java implementation |
| `RegulaTestApp/www/index.html` | License picker, slot click handlers, action sheet |
| `RegulaTestApp/www/js/index.js` | All JS bridge logic |
| `RegulaTestApp/www/css/index.css` | Action sheet / bottom-sheet styling |

---

## Notes

- `ImageType` enum: old SDK uses `PRINTED` / `LIVE`; new SDK uses `IMAGE_TYPE_PRINTED` / `IMAGE_TYPE_LIVE`. The plugin will try new names and compile-fail clearly if wrong.
- `capturedBitmaps` HashMap is **removed** — match now uses base64 from JS directly.
- `clearCapturedImages` action is **removed**.
- `deinitializeFaceSDK` is kept as-is.
