const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1goCr4CLzNtVaHr9Z2w4YDfT5-oG3AUjgtLG3KJvyCYc';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const HEADERS = [
  '時間戳', '訂單編號', '姓名', '手機', 'Email',
  '票種', '數量', '金額', '付款狀態', '備註',
];

let _sheetsClient = null;
let _sheetName = null;

async function getAuth() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  }
  const keyFile = path.resolve(
    process.env.GOOGLE_CREDENTIALS_FILE || 'credentials.json'
  );
  return new google.auth.GoogleAuth({ keyFile, scopes: SCOPES });
}

async function getSheetsClient() {
  if (_sheetsClient) return _sheetsClient;
  const auth = await getAuth();
  _sheetsClient = google.sheets({ version: 'v4', auth });
  return _sheetsClient;
}

async function getFirstSheetName() {
  if (_sheetName) return _sheetName;
  const client = await getSheetsClient();
  const meta = await client.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  _sheetName = meta.data.sheets[0].properties.title;
  return _sheetName;
}

async function getTitle() {
  const client = await getSheetsClient();
  const meta = await client.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  return meta.data.properties.title;
}

async function ensureHeaders() {
  const client = await getSheetsClient();
  const sheet = await getFirstSheetName();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A1:J1`,
  });
  const firstRow = (res.data.values || [[]])[0] || [];
  if (firstRow.length === 0 || firstRow[0] !== '時間戳') {
    await client.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheet}!A1:J1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }
}

async function getSoldCount() {
  const client = await getSheetsClient();
  const sheet = await getFirstSheetName();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!G2:G`,
  });
  const rows = res.data.values || [];
  return rows.reduce((sum, row) => sum + (parseInt(row[0], 10) || 0), 0);
}

async function appendOrder(order) {
  await ensureHeaders();
  const client = await getSheetsClient();
  const sheet = await getFirstSheetName();
  const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  await client.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A:J`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        timestamp,
        order.orderId,
        order.name,
        order.phone,
        order.email,
        order.ticketType,
        order.quantity,
        order.amount,
        '待確認',
        order.notes,
      ]],
    },
  });
}

module.exports = { getTitle, getSoldCount, appendOrder };
