// Google Apps Script Web App — receives a payment receipt upload from the
// KALA membership form, saves the file to Drive, and logs a row in the
// bound Google Sheet. Deployed separately from the main app; the resulting
// Web App URL is set as APPS_SCRIPT_URL in server/.env (and on Vercel).
//
// Setup:
// 1. Create a new Google Sheet (e.g. "KALA Payment Receipts").
// 2. Extensions -> Apps Script. Delete the placeholder code and paste this file's contents.
// 3. Create (or reuse) a Google Drive folder for receipts, copy its ID from
//    the folder's URL, and paste it into DRIVE_FOLDER_ID below.
// 4. Deploy -> New deployment -> Type: "Web app".
//      Execute as: Me
//      Who has access: Anyone
// 5. Copy the resulting Web App URL and send it back — that's the only
//    piece needed to wire this up server-side.

const DRIVE_FOLDER_ID = "PASTE_YOUR_DRIVE_FOLDER_ID_HERE";
const SHEET_NAME = "Payments";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const bytes = Utilities.base64Decode(body.fileBase64);
    const blob = Utilities.newBlob(bytes, body.mimeType, body.fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Submitted", "Name", "Email", "Mobile", "Membership type", "Certificate ref", "Receipt link"]);
    }
    sheet.appendRow([
      new Date(),
      body.name || "",
      body.email || "",
      body.mobile || "",
      body.membershipType || "",
      body.certificateRef || "",
      file.getUrl(),
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, url: file.getUrl() })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
