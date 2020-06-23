const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
//https://c2fo.io/fast-csv/docs/introduction/getting-started/
const path = require('path');
const csv = require('fast-csv');
const config = require('./config');

// If modifying these scopes, delete token.json.
//const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';


const SPREADSHEET_ID = config.spreadsheetId
const COVID_19_DATA_PATH = config.covid19DataPath

const CONFIRMED_CSV=`${COVID_19_DATA_PATH}/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv`
console.log(`CONFIRMED_CSV=[${CONFIRMED_CSV}]`)
console.log(path.resolve(__dirname, CONFIRMED_CSV))
const DEATHS_CSV=`${COVID_19_DATA_PATH}/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv`

const CONFIRMED_SHEET_NAME = 'confirmed_global'
const DEATHS_SHEET_NAME = 'deaths_global'

const START_DATE = '2020-01-22'
const WORLD = 'World'
const COUNTRIES = [
    'Brazil',
    'China',
    'Germany',
    'India',
    'Iran',
    'Italy',
    'Russia',
    'Spain',
    'Sweden',
    'US',
    'United Kingdom',
    WORLD,
]


// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    //authorize(JSON.parse(content), listPercentPopulation);
    //authorize(JSON.parse(content), addSheet);
    //authorize(JSON.parse(content), setCountries);
    authorize(JSON.parse(content), setDateRanges);

    authorize(JSON.parse(content), loadConfirmedGlobalSheet);
    authorize(JSON.parse(content), loadDeathsGlobalSheet);

    //this is not used now.  replaced by 'loadConfirmedGlobalLookup( loadConfirmedGlobal )' below
    //authorize(JSON.parse(content), calculateDailyStatsByCountry);
});

loadConfirmedGlobalLookup( loadConfirmedGlobal )


function debug(message) {
    //console.log(message)
}


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
 * Prints the percent population sheet
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listPercentPopulation(auth) {
    const range = 'percent population!A2:E'
    
    const sheets = google.sheets({version: 'v4', auth});
    sheets.spreadsheets.values.get({
	spreadsheetId: SPREADSHEET_ID,
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
    debug(`sheetExists: spreadsheetId=[${spreadsheetId}] sheetName=[${sheetName}]`)

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
	//TODO: work out how to use forEach instead of loop
	//response.sheets.forEach(element => console.log(element.properties.title))
	for (i=0 ; i<response.sheets.length ; i++) {
	    if (sheetName == response.sheets[i].properties.title) {
		found = true
	    }
	}
    } catch (err) {
	console.error(err);
    }
    
    debug(`sheetExists: found=[${found}]`)
    return found;
}


/**
 * Create a sheet tab if it does not exist.
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 * @param {string} sheet name to create.
 */
async function createSheet(auth, spreadsheetId, sheetName) {
    debug(`createSheet: spreadsheetId=[${spreadsheetId}] sheetName=[${sheetName}]`)

    const sheets = google.sheets({version: 'v4', auth});

    //return if sheet already exists
    if (await sheetExists(auth, spreadsheetId, sheetName)) {
	return debug('createSheet: sheet already exists');
    }
    debug('createSheet: sheet does not exists. creating...');
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
    debug(requests);
    // Add additional requests (operations) ...
    const batchUpdateRequest = {requests};

    //https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
    sheets.spreadsheets.batchUpdate({
	spreadsheetId: spreadsheetId,
	resource: batchUpdateRequest,
    }, (err, res) => {
	if (err) return console.log('createSheet: The API returned an error: ' + err);
	debug(res);
    });
    return debug('createSheet: sheet created');
}

/**
 * Adds a sheet to a spreadsheet
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function addSheet(auth) {
    const sheetName = 'test sheet'

    createSheet(auth, SPREADSHEET_ID, sheetName)
}

function pushConfirmedGlobalToSheet(auth, spreadsheetId, sheetName, data) {
    debug(`pushConfirmedGlobalToSheet: data.length=[${data.length}]`);
    for (i=0; i < data.length; i++) {
	debug(`pushConfirmedGlobalToSheet: i=[${i}] row=[${data[i]}]`)
    }
    const range = `${sheetName}!A1`
    const request = {
	spreadsheetId: spreadsheetId,
	"range": range,
	valueInputOption: 'USER_ENTERED',
	resource: {
	    "range": range,
	    "majorDimension": "ROWS",
	    "values": data
	},
	auth: auth,
    }

    const sheets = google.sheets({version: 'v4', auth});
    try {
	const response = sheets.spreadsheets.values.update(request).data;
	debug(JSON.stringify(response, null, 2));
    } catch (err) {
	console.error(err);
    }
}

var countryConfirmed;
function addCountryDateConfirmed(country, date, count) {
    if (!countryConfirmed) {
	countryConfirmed = new Map()
    }
    var countryDates = countryConfirmed.get(country)
    if (!countryDates) {
	countryDates = new Map()
	countryConfirmed.set(country, countryDates)
    }
    count = parseInt(count)
    countryDateCount=countryDates.get(date)
    if (countryDateCount) {
	countryDateCount = parseInt(countryDateCount) + count
    } else {
	countryDateCount = count
    }
    countryDates.set(date, countryDateCount)
    //debug(`addCountryDateConfirmed country=[${country}] date=[${date}] count=[${countryConfirmed.get(country).get(date)}]`)
}

function getCountryDateConfirmed(country, date) {
    debug(`getCountryDateConfirmed: country=[${country}], date=[${date}]`)
    result = countryConfirmed.get(country).get(date)
    debug(`getCountryDateConfirmed: country=[${country}], date=[${date}] result=[${result}]`)
    return result
}

function testLoadConfirmedGlobal() {
    console.log('loadConfirmedGlobal')
    addCountryDateConfirmed('USA', '1/1/2020', 5)
    addCountryDateConfirmed('USA', '1/1/2020', 2)
    addCountryDateConfirmed('USA', '1/2/2020', 2)
    addCountryDateConfirmed('USA', '1/2/2020', 3)

    console.log( 'USA 1/1/2020', getCountryDateConfirmed('USA', '1/1/2020'))
    console.log( 'USA 1/2/2020', getCountryDateConfirmed('USA', '1/2/2020'))
}

function loadCountryConfirmed(row) {
    //debug('loadCountryConfirmed', row)

    var country = row['Country/Region']
    today = new Date()

    const minDateString = `${START_DATE} 12:00:00 AM`
    const minDate = new Date(minDateString)
    var date = new Date()
    date.setDate(today.getDate())

    while (date >= minDate) {
	var dateString=getLookupDateString(date)
	var count=row[dateString]
	addCountryDateConfirmed(country, dateString, count)
	addCountryDateConfirmed(WORLD, dateString, count)
	date.setDate(date.getDate() - 1)
    }
}

async function loadConfirmedGlobalLookup( callback ) {
    await fs.createReadStream(path.resolve(__dirname, CONFIRMED_CSV))
	.pipe(csv.parse({ headers: true }))
	.on('error', error => console.error(error))
	.on('data', row => loadCountryConfirmed(row))
	.on('end', rowCount => {
	    debug(`Parsed ${rowCount} rows`)
	    //debug( '1 ====== countryConfirmed', countryConfirmed)
	    //debug( '2 ====== United Kingdom 4/27/20', getCountryDateConfirmed('United Kingdom', '4/27/20'))
	    //debug( '3 ====== US 4/27/20', getCountryDateConfirmed('US', '4/27/20'))
	    //debug( `3 ====== ${new Date()}`)
	    callback()
	})

    // TODO: this does not work.  executes before call above completes.
    // throws error because getCountryDateConfirmed is not safe before
    // initalizing with first call to addCountryDateConfirmed.
    //debug( '3 ====== US 4/27/20', getCountryDateConfirmed('US', '4/27/20'))
}

async function loadConfirmedGlobal() {
    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
	if (err) return console.log('Error loading client secret file:', err);
	// Authorize a client with credentials, then call the Google Sheets API.
	authorize(JSON.parse(content), calculateDailyStatsByCountry);
    });

    //const result = loadConfirmedGlobalLookup()
}

async function loadConfirmedGlobalSheet(auth) {
    //this await does not seem to block the next calls so the google sheets api call fails the first time.
    await createSheet(auth, SPREADSHEET_ID, CONFIRMED_SHEET_NAME)
    debug(`CONFIRMED_CSV=[${CONFIRMED_CSV}]`)
    var data = [];
    fs.createReadStream(path.resolve(__dirname, CONFIRMED_CSV))
	.pipe(csv.parse({ headers: false }))
	.on('error', error => console.error(error))
	.on('data', row => {
	    data.push(row)
	    debug(row)
	    debug(`data.length=[${data.length}]`)
	})
	.on('end', rowCount => {
	    debug(`Parsed ${rowCount} rows`)
	    pushConfirmedGlobalToSheet(auth, SPREADSHEET_ID, CONFIRMED_SHEET_NAME, data)
	})
}

function pushDeathsGlobalToSheet(auth, spreadsheetId, sheetName, data) {
    debug(`pushDeathsGlobalToSheet: data.length=[${data.length}]`);
    for (i=0; i < data.length; i++) {
	debug(`pushDeathsGlobalToSheet: i=[${i}] row=[${data[i]}]`)
    }
    const range = `${sheetName}!A1`
    const request = {
	spreadsheetId: spreadsheetId,
	"range": range,
	valueInputOption: 'USER_ENTERED',
	resource: {
	    "range": range,
	    "majorDimension": "ROWS",
	    "values": data
	},
	auth: auth,
    }

    const sheets = google.sheets({version: 'v4', auth});
    try {
	const response = sheets.spreadsheets.values.update(request).data;
	debug(JSON.stringify(response, null, 2));
    } catch (err) {
	console.error(err);
    }
}

async function loadDeathsGlobalSheet(auth) {
    await createSheet(auth, SPREADSHEET_ID, DEATHS_SHEET_NAME)
    debug(`DEATHS_CSV=[${DEATHS_CSV}]`)
    var data = [];
    fs.createReadStream(path.resolve(__dirname, DEATHS_CSV))
	.pipe(csv.parse({ headers: false }))
	.on('error', error => console.error(error))
	.on('data', row => {
	    data.push(row)
	    debug(row)
	    debug(`data.length=[${data.length}]`)
	})
	.on('end', rowCount => {
	    debug(`Parsed ${rowCount} rows`)
	    pushDeathsGlobalToSheet(auth, SPREADSHEET_ID, DEATHS_SHEET_NAME, data)
	})
}

/**
 * Adds a sheet to a spreadsheet
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function setCountries(auth) {
    const sheetName = 'test sheet'

    await createSheet(auth, SPREADSHEET_ID, sheetName)

    const range = `${sheetName}!A1`

    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values#ValueRange

    const request = {
	// The ID of the spreadsheet to update.
	spreadsheetId: SPREADSHEET_ID,
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
	debug(JSON.stringify(response, null, 2));
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
    const sheetName = 'date_range_lookup_2'

    createSheet(auth, SPREADSHEET_ID, sheetName)
    
    const range = `${sheetName}!A1`

    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values#ValueRange

    const deathTab = DEATHS_SHEET_NAME
    const confirmedTab = CONFIRMED_SHEET_NAME
    const days = 200
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
	spreadsheetId: SPREADSHEET_ID,
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
	debug(JSON.stringify(response, null, 2));
    } catch (err) {
	console.error(err);
    }
}

function getLookupDateString(date) {
    return (date.getUTCMonth()+1) + '/' + date.getUTCDate() + '/' + (date.getUTCFullYear()).toString().substring(2,4) 
}

function findDoubledDate( country, maxDate, minDate ) {
    debug(`findDoubledDate: country=[${country}], maxDate=[${maxDate}], minDate=[${minDate}]`)
    
    const maxCount = getCountryDateConfirmed(country, getLookupDateString(maxDate))
    var lastDateString = 0;

    var date = new Date(maxDate)
    var dateString
    while (date >= minDate) {
	date.setDate(date.getDate() - 1)
	var dateString = getLookupDateString(date)
	var count = getCountryDateConfirmed(country, dateString)
	if (count !=0 && (maxCount / count) > 2) {
	    break
	}
	lastDateString = dateString
    }
    return lastDateString
}


/**
 * Create sheet to cacluate the daily stats by country
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 *
 * TODO: calculate doubling date and rate.  Need to load infection data and sum by date/country and implement doubling date search.
 * TODO: research setting number format
 * https://developers.google.com/sheets/api/samples/formatting#set_a_custom_datetime_or_decimal_format_for_a_range
 */
async function calculateDailyStatsByCountry(auth) {

    const sheetName = 'daily_stats_by_country'

    await createSheet(auth, SPREADSHEET_ID, sheetName)

    const values = []
    const header = [
	'date',
	'contry',
        'lookupkey',
	'total infections',
	'total deaths',
	'US event',
	'population',
	'% population infected',
	'% infected die',
	'% population die',
	'doubling date',
	'doubled value',
	'check',
	'days',
	'daily infected increase',
	'daily death increase'
    ]
    values.push(header)

    const startDateString=`${START_DATE} 12:00:00 AM`
    startDate = new Date(startDateString)
    var date = new Date(startDateString)

    maxDate = new Date()
    //the data is typically one day behind today.  Could add a
    //function to find the exact max date, but this will do for now.
    maxDate.setDate(maxDate.getDate() - 1)
    debug('calculateDailyStatsByCountry: startDate', startDate);
    debug('calculateDailyStatsByCountry: date', date);
    debug('calculateDailyStatsByCountry: maxDate', maxDate);
    var rowNum = 1;
    while (date <= maxDate) {
	dateString=(date.getUTCMonth()+1) + '-' + date.getUTCDate() + '-' + date.getUTCFullYear() 
	COUNTRIES.forEach(function (country){
	    rowNum++


	    var confirmed = `=sumif(confirmed_global!$B:$B,B${rowNum},indirect(vlookup(A${rowNum},date_range_2,3,false)))`
	    var deaths = `=sumif(deaths_global!$B:$B,B${rowNum},indirect(vlookup(A${rowNum},date_range_2,2,false)))`
	    var usEvent = ''
	    if (country == 'US') {
		usEvent = `=vlookup(E${rowNum}, events, 2, true)`
	    } else if (country == WORLD) {
		confirmed = `=sum(indirect(vlookup(A${rowNum},date_range_2,3,false)))`
		deaths = `=sum(indirect(vlookup(A${rowNum},date_range_2,2,false)))`
	    }
	    
	    var row = [
		dateString,
		country,
		`=A${rowNum}&B${rowNum}`,
		confirmed,
		deaths,
		usEvent,
		`=VLOOKUP(B${rowNum},population_2020,2,false)`,
		`=D${rowNum}/G${rowNum}`,
		`=E${rowNum}/D${rowNum}`,
		`=E${rowNum}/G${rowNum}`,
		findDoubledDate(country, date, startDate),
		`=vlookup(K${rowNum}&B${rowNum},C:E,2,false)`,
		`=round(D${rowNum}/L${rowNum},3)`,
		`=A${rowNum}-K${rowNum}`
	    ]
	    values.push(row)
	});
	debug('calculateDailyStatsByCountry: date', date);
        date.setDate(date.getDate() + 1)
    }

    const range = `${sheetName}!A1`
    const request = {
	spreadsheetId: SPREADSHEET_ID,
	"range": range,
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
	debug(JSON.stringify(response, null, 2));
    } catch (err) {
	console.error(err);
    }
}
