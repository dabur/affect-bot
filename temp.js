//spreadsheet
var sheet = require('./app/handler/spreadsheet');
var SPREADSHEET_ID = '1AkIWJNEmkUO8J90CJJys0iYKZr17JoknDI4GpJoVCdY';//presence
sheet.init();

sheet.init().then(function () {
    console.log('spreadsheet init succeed');
    run();
}).catch(function (reason) {
    console.error(reason)
});

function run() {
    //init from spreadsheet offline state
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: '20171228!A2:B',
    }).then(function (results) {
        for (var i = 0; i < results.length; i++) {
            console.log(results[i]);
        }
    }).catch(function (reason) {
        console.error(reason)
    });
}