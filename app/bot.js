var TAG = 'bot';
var Q = require('q');
var tel = require('./handler/telegram');
var model = require('./db/model');
var CRON_JOB_MESSAGE = true;
var STARTLESSON_HOUR = [16, 10, 18, 19, 20];
var SENT_LESSON_HOUR = {16: false, 10: false, 18: false, 19: false, 20: false};

tel.onCallbackQuery(function (msg) {
    queryReaction(msg).then(function () {
        return tel.answerCallbackQuery(msg.id);
    }).catch(function (reason) {
        console.error(TAG, reason);
    });
});

tel.onText(/\/start/, function (msg) {
    if (!msg.from.is_bot) {
        model.user.add({
            chatId: msg.from.id,
            username: msg.from.username,
            firstName: msg.from.first_name,
            lastName: msg.from.last_name,
            languageCode: msg.from.language_code
        });
        var user = model.user.get(msg.from.id);
        tel.sendMessage(msg.from.id,
            (!user.firstName ? '' : 'Hi ' + user.firstName + '! ') +
            'Welcome Affect group!\n' +
            'My name is Botty, ' +
            'I am robot that tries help Dasha to give you quality service and I will try help you with any questions that you have.\n' +
            'I not that smart as a human, but there are some options that you can press and I will answer you!\n\n' +
            '/help - all options\n\n' +
            '/website - our web site\n\n' +
            '/phone - our phone number\n\n' +
            '/price - our prices\n\n' +
            '/today - today lessons\n\n' +
            'type or press one of those options!');
    }
});

tel.onText(/\/help/, function (msg) {
    tel.sendMessage(msg.from.id, '/help - all options\n\n' +
        '/website - our web site\n\n' +
        '/phone - our phone number\n\n' +
        '/price - our prices\n\n' +
        '/today - today lessons\n\n');
});

tel.onText(/\/website/, function (msg) {
    tel.sendMessage(msg.from.id, 'Link: https://www.affect.co.il');
});

tel.onText(/\/phone/, function (msg) {
    tel.sendMessage(msg.from.id, 'Daria: +972542211546');
});

tel.onText(/\/price/, function (msg) {
    tel.sendMessage(msg.from.id, 'Subscriptions (price per month):\n' +
        ' Yearly - 270 NIS\n' +
        ' Half a year - 285 NIS\n' +
        ' Three months - 320 NIS\n' +
        ' Month - 350 NIS\n' +
        ' \n' +
        'Private training (price per lesson)\n' +
        ' For a couple - 300 NIS\n' +
        ' Personal - 200 NIS');
});

tel.onText(/\/today/, function (msg) {
    var keyboard = [[]];
    var nowDate = new Date();
    var nowHour = nowDate.getHours();
    for (var i = 0; i < STARTLESSON_HOUR.length; i++) {
        var hour = STARTLESSON_HOUR[i];
        if (nowHour < hour) {
            if (keyboard[keyboard.length - 1].length > 1) {
                keyboard.push([]);
            }
            keyboard[keyboard.length - 1].push(
                {
                    text: hour + ':00',
                    callback_data: 'ans::' + hour + '::yes'
                }
            );
        }
    }
    var options = {
        reply_markup: JSON.stringify({
            inline_keyboard: keyboard
        })
    };
    tel.sendMessage(msg.from.id, 'To subscribe the lesson, just press on hour!', options);
});

function queryReaction(msg) {
    switch (msg.data) {
        case 'ans::' + STARTLESSON_HOUR[0] + '::yes':
            return tel.sendMessage(msg.from.id, 'Good choice!\nIf any changes please notify Dasha or press No button');
        case 'ans::' + STARTLESSON_HOUR[0] + '::no':
            return tel.sendMessage(msg.from.id, 'You will be missed :(');
        case 'ans::' + STARTLESSON_HOUR[1] + '::yes':
            return tel.sendMessage(msg.from.id, 'Good choice!\nIf any changes please notify Dasha or press No button');
        case 'ans::' + STARTLESSON_HOUR[1] + '::no':
            return tel.sendMessage(msg.from.id, 'You will be missed :(');
        case 'ans::' + STARTLESSON_HOUR[2] + '::yes':
            return tel.sendMessage(msg.from.id, 'Good choice!\nIf any changes please notify Dasha or press No button');
        case 'ans::' + STARTLESSON_HOUR[2] + '::no':
            return tel.sendMessage(msg.from.id, 'You will be missed :(');
        case 'ans::' + STARTLESSON_HOUR[3] + '::yes':
            return tel.sendMessage(msg.from.id, 'Good choice!\nIf any changes please notify Dasha or press No button');
        case 'ans::' + STARTLESSON_HOUR[3] + '::no':
            return tel.sendMessage(msg.from.id, 'You will be missed :(');
        case 'ans::' + STARTLESSON_HOUR[4] + '::yes':
            return tel.sendMessage(msg.from.id, 'Good choice!\nIf any changes please notify Dasha or press No button');
        case 'ans::' + STARTLESSON_HOUR[4] + '::no':
            return tel.sendMessage(msg.from.id, 'You will be missed :(');
    }
    return rejectedPromise('unknown ans');
}

function rejectedPromise(reason) {
    var d = Q.defer();
    d.reject(reason);
    return d.promise;
}

function sendSubscriptionSurvey() {
    var nowDate = new Date();
    var nowHour = nowDate.getHours();
    for (var i = 0; i < STARTLESSON_HOUR.length; i++) {
        var h = STARTLESSON_HOUR[i];
        if (!SENT_LESSON_HOUR[h] && nowHour == h - 1) {
            sendHoueSubscriptionSurvey(h);
            SENT_LESSON_HOUR[h] = true;
        }
        if (nowHour > h && SENT_LESSON_HOUR[h]) {
            SENT_LESSON_HOUR[h] = false;
        }
    }
}

function sendHoueSubscriptionSurvey(hour) {
    var keyboard = [[
        {
            text: 'Yes :)',
            callback_data: 'ans::' + hour + '::yes'
        },
        {
            text: 'No :(',
            callback_data: 'ans::' + hour + '::no'
        }
    ]];
    var options = {
        reply_markup: JSON.stringify({
            inline_keyboard: keyboard
        })
    };
    var users = model.user.getAll();
    for (var i = 0; i < users.length; i++) {
        var user = users[i];
        tel.sendMessage(user.chatId, 'Are you coming today at ' + hour + ':00?', options);
    }
}

function run() {
    var M_TAG = '.run';
    model.init().then(function () {
        setInterval(function () {
            if (CRON_JOB_MESSAGE) {
                sendSubscriptionSurvey();
            }
        }, 1000);
    }).catch(function (reason) {
        console.error(TAG + M_TAG, reason);
    });
}

module.exports.run = run;