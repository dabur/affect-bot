var TAG = 'bot';
var tel = require('./handler/telegram');
var model = require('./db/model');

tel.onText(/\/start/, function (msg, match) {
    if (!msg.from.is_bot) {
        model.user.add({
            chatId: msg.from.id,
            username: msg.from.username,
            firstName: msg.from.first_name,
            lastName: msg.from.last_name,
            languageCode: msg.from.language_code
        });
        var user = model.user.get(msg.from.id);
        tel.sendMessage(user.chatId, 'Hello ' + user.firstName + ', welcome to Affect!');
    }
});

tel.onText(/price/, function (msg, match) {
    console.log('msg:', msg, 'match:', match);//debug
    tel.sendMessage(msg.from.id, '270 in month for annual subscribe');
});

function run() {
    var M_TAG = '.run';
    model.init().then(function () {
        console.log(TAG + M_TAG, 'success');
    }).catch(function (reason) {
        console.error(TAG + M_TAG, reason);
    });
}

module.exports.run = run;