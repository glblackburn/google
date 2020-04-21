const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
//const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    //authorize(JSON.parse(content), listPercentPopulation);
    //authorize(JSON.parse(content), addSheet);
    authorize(JSON.parse(content), setCountries);
    //authorize(JSON.parse(content), setDateRanges);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
	client_id, client_secret, redirect_uris[0]);
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
	if (err) return getNewToken(oAuth2Client, callback);
	oAuth2Client.setCredentials(JSON.parse(token));
	callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
	access_type: 'offline',
	scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
	rl.close();
	oAuth2Client.getToken(code, (err, token) => {
	    if (err) return console.error('Error while trying to retrieve access token', err);
	    oAuth2Client.setCredentials(token);
	    // Store the token to disk for later program executions
	    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
		if (err) return console.error(err);
		console.log('Token stored to', TOKEN_PATH);
	    });
	    callback(oAuth2Client);
	});
    });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listMajors(auth) {
    const sheets = google.sheets({version: 'v4', auth});
    sheets.spreadsheets.values.get({
	spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
	range: 'Class Data!A2:E',
    }, (err, res) => {
	if (err) return console.log('The API returned an error: ' + err);
	const rows = res.data.values;
	if (rows.length) {
	    console.log('Name, Major:');
	    // Print columns A and E, which correspond to indices 0 and 4.
	    rows.map((row) => {
		console.log(`${row[0]}, ${row[4]}`);
	    });
	} else {
	    console.log('No data found.');
	}
    });
}

/**
 * Prints the percent population sheet
 * @see https://docs.google.com/spreadsheets/d/1kCfWxRrL3lm3CgVDS5wYZRad-8ogexNL5NZgpoR0IwY/edit#gid=997476041
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listPercentPopulation(auth) {
    const spreadsheetId = '1kCfWxRrL3lm3CgVDS5wYZRad-8ogexNL5NZgpoR0IwY'
    const range = 'percent population!A2:E'
    
    const sheets = google.sheets({version: 'v4', auth});
    sheets.spreadsheets.values.get({
	spreadsheetId: spreadsheetId,
	range: range,
    }, (err, res) => {
	if (err) return console.log('The API returned an error: ' + err);
	const rows = res.data.values;
	if (rows.length) {
	    console.log('date, country, infections, deaths');
	    // Print columns A and B, which correspond to indices 0 and 1.
	    rows.map((row) => {
		console.log(`${row[0]}, ${row[1]}, ${row[3]}, ${row[4]}`);
	    });
	} else {
	    console.log('No data found.');
	}
    });
}

async function sheetExists(auth, spreadsheetId, sheetName) {
    console.log(`sheetExists: spreadsheetId=[${spreadsheetId}] sheetName=[${sheetName}]`)

    const sheets = google.sheets({version: 'v4', auth});
    const request = {
	// The spreadsheet to request.
	spreadsheetId: spreadsheetId,
	ranges: [],
	includeGridData: false,
	auth: auth,
    };

    let found=false;
    try {
	const response = (await sheets.spreadsheets.get(request)).data;
	//console.log(response);
	//console.log('================================================================================');
	//console.log(JSON.stringify(response, null, 2));
	//console.log('================================================================================');
	//TODO: work out how to use forEach instead of loop
	response.sheets.forEach(element => console.log(element.properties.title))
	for (i=0 ; i<response.sheets.length ; i++) {
	    if (sheetName == response.sheets[i].properties.title) {
		found = true
	    }
	}
    } catch (err) {
	console.error(err);
    }
    
    console.log(`sheetExists: found=[${found}]`)
    return found;
}


/**
 * Create a sheet tab if it does not exist.
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 * @param {string} sheet name to create.
 */
async function createSheet(auth, spreadsheetId, sheetName) {
    console.log(`createSheet: spreadsheetId=[${spreadsheetId}] sheetName=[${sheetName}]`)

    const sheets = google.sheets({version: 'v4', auth});

    //return if sheet already exists
    if (await sheetExists(auth, spreadsheetId, sheetName)) {
	return console.log('createSheet: sheet already exists');
    }
    console.log('createSheet: sheet does not exists. creating...');
    //if the sheet does not exist add the sheet.
    let requests = [];
    // Change the spreadsheet's title.
    requests.push({
	"addSheet": {
	    "properties": {
		"title": sheetName,
		"gridProperties": {
		    "rowCount": 20,
		    "columnCount": 12
		},
		"tabColor": {
		    "red": 0.0,
		    "green": 1.0,
		    "blue": 0.0
		}
	    }
	}
    })
    console.log(requests);
    // Add additional requests (operations) ...
    const batchUpdateRequest = {requests};

    //https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
    sheets.spreadsheets.batchUpdate({
	spreadsheetId: spreadsheetId,
	resource: batchUpdateRequest,
    }, (err, res) => {
	if (err) return console.log('createSheet: The API returned an error: ' + err);
	console.log(res);
    });
    return console.log('createSheet: sheet created');
}

/**
 * Adds a sheet to a spreadsheet
 * @see https://docs.google.com/spreadsheets/d/1kCfWxRrL3lm3CgVDS5wYZRad-8ogexNL5NZgpoR0IwY/edit#gid=997476041
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function addSheet(auth) {
    const spreadsheetId = '1kCfWxRrL3lm3CgVDS5wYZRad-8ogexNL5NZgpoR0IwY'
    const sheetName = 'test sheet'

    createSheet(auth, spreadsheetId, sheetName)
}

/**
 * Adds a sheet to a spreadsheet
 * @see https://docs.google.com/spreadsheets/d/1kCfWxRrL3lm3CgVDS5wYZRad-8ogexNL5NZgpoR0IwY/edit#gid=997476041
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function setCountries(auth) {
    const spreadsheetId = '1kCfWxRrL3lm3CgVDS5wYZRad-8ogexNL5NZgpoR0IwY'
    const sheetName = 'test sheet'

    await createSheet(auth, spreadsheetId, sheetName)

    const range = `${sheetName}!A1`

    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values#ValueRange

    const request = {
	// The ID of the spreadsheet to update.
	spreadsheetId: spreadsheetId,
	// The A1 notation of the values to update.
	"range": range,
	// How the input data should be interpreted.
	valueInputOption: 'USER_ENTERED',
	resource: {
	    "range": range,
	    "majorDimension": "ROWS",
	    "values": [
		['China'],
		['India'],
		['Iran'],
		['Italy'],
		['Spain'],
		['US'],
		['Germany'],
		['World'],
	    ],
	},
	auth: auth,
    }

    const sheets = google.sheets({version: 'v4', auth});
    try {
	const response = (await sheets.spreadsheets.values.update(request)).data;
	//const response = sheets.spreadsheets.values.update(request).data;
	// TODO: Change code below to process the `response` object:
	console.log(JSON.stringify(response, null, 2));
    } catch (err) {
	console.error(err);
    }
}

// https://stackoverflow.com/questions/34813980/getting-an-array-of-column-names-at-sheetjs
function numToAlpha(num) {
    var alpha = '';
    for (; num >= 0; num = parseInt(num / 26, 10) - 1) {
	alpha = String.fromCharCode(num % 26 + 0x41) + alpha;
    }
    return alpha;
}

function alphaToNum(alpha) {
    var i = 0
    var num = 0
    var len = alpha.length
    for (; i < len; i++) {
	num = num * 26 + alpha.charCodeAt(i) - 0x40;
    }
    return num - 1;
}

/**
 * Create date range lookup for covid tabs
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function setDateRanges(auth) {
    const spreadsheetId = '1kCfWxRrL3lm3CgVDS5wYZRad-8ogexNL5NZgpoR0IwY'
    const sheetName = 'date_range_lookup_2'

    createSheet(auth, spreadsheetId, sheetName)
    
    const range = `${sheetName}!A1`

    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values#ValueRange

    const deathTab = 'time_series_covid19_deaths_global.csv'
    const confirmedTab = 'time_series_covid19_confirmed_global'
    const days = 90
    //const startDateString='2020-03-01 12:00:00 AM'
    //const startColumnNum = alphaToNum('AR')
    const startDateString='2020-01-22 12:00:00 AM'
    const startColumnNum = alphaToNum('E')

    const values = []
    for (i = 0; i < days; i++) {
        date = new Date(startDateString)
        date.setDate(date.getDate() + i)
	column=numToAlpha(startColumnNum + i)
        column=`!${column}:${column}`

	dateString=(date.getUTCMonth()+1) + '-' + date.getUTCDate() + '-' + date.getUTCFullYear() 
	values[i] = [i, column, date.toISOString(), dateString, deathTab + column, confirmedTab + column]
    }

    const request = {
	// The ID of the spreadsheet to update.
	spreadsheetId: spreadsheetId,
	// The A1 notation of the values to update.
	"range": range,
	// How the input data should be interpreted.
	valueInputOption: 'USER_ENTERED',
	resource: {
	    "range": range,
	    "majorDimension": "ROWS",
	    "values": values
	},
	auth: auth,
    }

    const sheets = google.sheets({version: 'v4', auth});
    try {
	//const response = (await sheets.spreadsheets.values.update(request)).data;
	const response = sheets.spreadsheets.values.update(request).data;
	console.log(JSON.stringify(response, null, 2));
    } catch (err) {
	console.error(err);
    }
}
