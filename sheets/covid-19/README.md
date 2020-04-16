1. install nodejs
https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
setup nvm
https://github.com/nvm-sh/nvm

2. Install the client library
https://developers.google.com/sheets/api/quickstart/nodejs#step_2_install_the_client_library


3. Run
npm install googleapis@39 --save
node .

Refs:

Authorize Requests
https://developers.google.com/sheets/api/guides/authorizing

================================================================================

API Refs

https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
const sheets = google.sheets({version: 'v4', auth});
sheets.spreadsheets.batchUpdate({

https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
sheets.spreadsheets.values.update(request)


Import CVS to google sheet
A Cloud Function to automate Google Spreadsheet CSV import
https://medium.com/google-cloud/a-cloud-function-to-automate-google-spreadsheet-csv-import-d2ffb8fbe9b4
