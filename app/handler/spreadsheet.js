var singleton = function singleton() {
    var TAG = 'handler.spreadsheet';
    var config = require('config');
    var Q = require('q');
    var fs = require('fs');
    var readline = require('readline');
    var google = require('googleapis');
    var googleAuth = require('google-auth-library');

    // If modifying these scopes, delete your previously saved credentials
    // at .credentials/sheets.googleapis.com-nodejs-affect-bot.json
    var SCOPES = [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
    ];
    var TOKEN_DIR = __dirname + '/../../.credentials/';
    var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-affect-bot.json';
    var auth;

    this.init = init;
    this.update = update;
    this.get = get;
    this.append = append;
    this.create = create;
    this.batchUpdate = batchUpdate;

    function init() {
        var d = Q.defer();
        // Load client secrets from a local file.
        fs.readFile(__dirname + '/../../.credentials/client_secret.json', function processClientSecrets(err, content) {
            if (err) {
                d.reject(err);
            } else {
                // Authorize a client with the loaded credentials, then call the
                // Google Sheets API.
                authorize(JSON.parse(content), function (oauth2Client) {
                    auth = oauth2Client;
                    d.resolve(true);
                });
            }
        });
        return d.promise;
    }

    /**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     *
     * @param {Object} credentials The authorization client credentials.
     * @param {function} callback The callback to call with the authorized client.
     */
    function authorize(credentials, callback) {
        var clientSecret = credentials.installed.client_secret;
        var clientId = credentials.installed.client_id;
        var redirectUrl = credentials.installed.redirect_uris[0];
        var auth = new googleAuth();
        var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, function (err, token) {
            if (err) {
                getNewToken(oauth2Client, callback);
            } else {
                oauth2Client.credentials = JSON.parse(token);
                callback(oauth2Client);
            }
        });
    }

    /**
     * Get and store new token after prompting for user authorization, and then
     * execute the given callback with the authorized OAuth2 client.
     *
     * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
     * @param {getEventsCallback} callback The callback to call with the authorized
     *     client.
     */
    function getNewToken(oauth2Client, callback) {
        var authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES
        });
        console.log('Authorize this app by visiting this url: ', authUrl);
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Enter the code from that page here: ', function (code) {
            rl.close();
            oauth2Client.getToken(code, function (err, token) {
                if (err) {
                    console.log('Error while trying to retrieve access token', err);
                    return;
                }
                oauth2Client.credentials = token;
                storeToken(token);
                callback(oauth2Client);
            });
        });
    }

    /**
     * Store token to disk be used in later program executions.
     *
     * @param {Object} token The token to store to disk.
     */
    function storeToken(token) {
        try {
            fs.mkdirSync(TOKEN_DIR);
        } catch (err) {
            if (err.code != 'EEXIST') {
                throw err;
            }
        }
        fs.writeFile(TOKEN_PATH, JSON.stringify(token));
        console.log('Token stored to ' + TOKEN_PATH);
    }

    function get(request) {
        var d = Q.defer();
        var sheets = google.sheets('v4');
        request.auth = auth;
        sheets.spreadsheets.values.get(request, function (err, response) {
            if (err) {
                d.reject(err);
            } else {
                var rows = response.values;
                d.resolve(rows);
            }
        });
        return d.promise;
    }

    function update(request) {
        var d = Q.defer();
        var sheets = google.sheets('v4');
        request.auth = auth;
        sheets.spreadsheets.values.update(request, function (err, response) {
            if (err) {
                d.reject(err);
            } else {
                d.resolve(response);
            }
        });
        return d.promise;
    }

    function create(request) {
        var d = Q.defer();
        var sheets = google.sheets('v4');
        request.auth = auth;
        sheets.spreadsheets.create(request, function (err, response) {
            if (err) {
                d.reject(err);
            } else {
                d.resolve(response);
            }
        });
        return d.promise;
    }

    function append(request) {
        var d = Q.defer();
        var sheets = google.sheets('v4');
        request.auth = auth;
        sheets.spreadsheets.values.append(request, function (err, response) {
            if (err) {
                d.reject(err);
            } else {
                d.resolve(response);
            }
        });
        return d.promise;
    }

    function batchUpdate(request) {
        var d = Q.defer();
        var sheets = google.sheets('v4');
        request.auth = auth;
        sheets.spreadsheets.batchUpdate(request, function (err, response) {
            if (err) {
                d.reject(err);
            } else {
                d.resolve(response);
            }
        });
        return d.promise;
    }

    if (singleton.caller != singleton.getInstance) {
        console.error(TAG, 'This object cannot be instantiated');
        throw new Error('This object cannot be instantiated')
    }
};

singleton.instance = null;

singleton.getInstance = function () {
    if (this.instance === null) {
        this.instance = new singleton()
    }
    return this.instance
};

module.exports = singleton.getInstance();