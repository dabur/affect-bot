//spreadsheet
var config = require('config');
var sheet = require('./app/handler/spreadsheet');
var SPREADSHEET_ID = config.spreadsheets.presence;//presence
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
        console.log(results);
    }).catch(function (reason) {
        if (reason.code && reason.code == 400) {
            //create one
            // var resource = {values: []};
            // var arr = ['chatId', 'approve'];
            // resource.values.push(arr);
            var resource = {};
            resource.requests = [
                {
                    addSheet: {
                        properties: {
                            title: '20171228',
                            gridProperties: {
                                rowCount: 100,
                                columnCount: 10
                            }
                        }
                    }
                }
            ];
            sheet.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: resource
            }).then(function (results) {
                console.log(JSON.stringify(results));
                // for (var i = 0; i < results.length; i++) {
                //     console.log(results[i]);
                // }
            }).catch(function (reason) {
                console.error(reason);
            });
            //
        } else {
            console.error(reason);
        }
    });
}