var TAG = 'bot';
var Q = require('q');
var tel = require('./handler/telegram');
var model = require('./db/model');
var CRON_JOB_MESSAGE = true;
var admins = {
    249023760: {
        chatId: 249023760
    }
};
var ADMIN_OPTIONS = '/next - next lessons subscribers\n' + '/status - all day subscribers\n';

tel.onCallbackQuery(function (msg) {
    var M_TAG = '.onCallbackQuery';
    queryReaction(msg).then(function () {
        return tel.answerCallbackQuery(msg.id);
    }).catch(function (reason) {
        console.error(TAG + M_TAG, reason);
        tel.answerCallbackQuery(msg.id);
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
        var adminOptions = '';
        if (isAdmin(msg.from.id)) {
            adminOptions = ADMIN_OPTIONS;
        }
        tel.sendMessage(msg.from.id,
            (!user.firstName ? '' : 'Hi ' + user.firstName + '! ') +
            'Welcome Affect group!\n' +
            'I am Bot a robot that tries help Dasha to give you quality service and I will try help you with any questions that you have.\n' +
            'I not that smart as a human, but there are some options that you can press and I will answer you!\n' +
            '/help - all options\n' +
            '/website - our web site\n' +
            '/phone - our phone number\n' +
            '/price - our prices\n' + adminOptions +
            '/today - today lessons\n' +
            '/sub - check today subscription\n' +
            'type or press one of those options!'
        );
    }
});

tel.onText(/\/help/, function (msg) {
    var adminOptions = '';
    if (isAdmin(msg.from.id)) {
        adminOptions = ADMIN_OPTIONS;
    }
    tel.sendMessage(msg.from.id,
        '/help - all options\n' +
        '/website - our web site\n' +
        '/phone - our phone number\n' +
        '/price - our prices\n' + adminOptions +
        '/today - today lessons\n' +
        '/sub - check today subscription\n'
    );
});

tel.onText(/\/website/, function (msg) {
    tel.sendMessage(msg.from.id, 'Link: https://www.affect.co.il');
});

tel.onText(/\/phone/, function (msg) {
    tel.sendMessage(msg.from.id, 'Dasha: +972542211546');
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
    var nowDay = nowDate.getDay();
    var sch = model.schedule.getAll();
    if (sch.hasOwnProperty(nowDay)) {
        var nowHour = nowDate.getHours();
        for (var hour in sch[nowDay]) {
            if (sch[nowDay].hasOwnProperty(hour)) {
                if (sch[nowDay][hour] && nowHour < hour) {
                    if (keyboard[keyboard.length - 1].length > 1) {
                        keyboard.push([]);
                    }
                    keyboard[keyboard.length - 1].push(
                        {
                            text: hour > 12 ? hour % 12 + 'pm.' : hour + 'am.',
                            callback_data: 'ans::' + hour + '::yes'
                        }
                    );
                }
            }
        }
    }
    var options = {
        reply_markup: JSON.stringify({
            inline_keyboard: keyboard
        })
    };
    tel.sendMessage(msg.from.id, 'To subscribe the lesson, just press on an hour!', options);
});

tel.onText(/\/next/, function (msg) {
    if (isAdmin(msg.from.id)) {
        tel.sendMessage(msg.from.id, model.presence.getNext());
    }
});

tel.onText(/\/status/, function (msg) {
    if (isAdmin(msg.from.id)) {
        var result = model.presence.getStatus();
        tel.sendMessage(msg.from.id, result.msg, result.options);
    }
});

tel.onText(/\/sub/, function (msg) {
    var result = model.presence.getStatus(msg.from.id);
    tel.sendMessage(msg.from.id, result.msg, result.options);
});

function queryReaction(msg) {
    if (!msg.data) {
        return rejectedPromise('no data');
    }
    if (!msg.data.startsWith('ans::')) {
        return rejectedPromise('unknown query prefix');
    }
    var nowDay = new Date().getDay();
    var sch = model.schedule.getAll();
    if (msg.data.endsWith('::yes')) {
        var yesData = msg.data.split('::');
        if (yesData.length != 3) {
            return rejectedPromise('unknown query format');
        }
        var yesHour = yesData[1];
        if (yesHour == "0") {
            yesHour = 0;
        } else {
            yesHour = Number(yesHour);
        }
        if (!sch[nowDay][yesHour]) {
            return tel.sendMessage(msg.from.id, 'No lesson today at ' + (yesHour > 12 ? yesHour % 12 + 'pm.' : yesHour + 'am.'));
        }
        return model.presence.add(msg.from.id, yesHour).then(function () {
            var options = {
                reply_markup: JSON.stringify({
                    inline_keyboard: [[
                        {
                            text: 'Unsubscribe',
                            callback_data: 'ans::' + yesHour + '::no'
                        }
                    ]]
                })
            };
            return tel.sendMessage(msg.from.id, 'You subscribed on lesson at ' + (yesHour > 12 ? yesHour % 12 + 'pm.' : yesHour + 'am.') + '\nTo unsubscribe from any lesson press:', options);
        });
    }
    if (msg.data.endsWith('::no')) {
        var noData = msg.data.split('::');
        if (noData.length != 3) {
            return rejectedPromise('unknown query format');
        }
        var noHour = noData[1];
        if (noHour == "0") {
            noHour = 0;
        } else {
            noHour = Number(noHour);
        }
        if (!sch[nowDay][noHour]) {
            return rejectedPromise('no lesson on requested hour');
        }
        return model.presence.remove(msg.from.id, noHour).then(function () {
            return tel.sendMessage(msg.from.id, 'You unsubscribed from the lesson and will be missed.');
        });
    }
    return rejectedPromise('unknown query');
}

function rejectedPromise(reason) {
    var d = Q.defer();
    d.reject(reason);
    return d.promise;
}

function sendSubscriptionSurvey() {
    var nowDate = new Date();
    var nowHour = nowDate.getHours();
    var nowDay = new Date().getDay();
    var sch = model.schedule.getAll();
    if (sch[nowDay][nowHour + 1]) {
        sendHoueSubscriptionSurvey(nowHour + 1);
    }
}

function sendHoueSubscriptionSurvey(hour) {
    var keyboard = [[
        {
            text: 'Yes',
            callback_data: 'ans::' + hour + '::yes'
        },
        {
            text: 'No',
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
        if (!model.presence.isSubscribed(user.chatId)) {
            tel.sendMessage(user.chatId, 'Want to subscribe lesson at ' + hour > 12 ? hour % 12 + 'pm.' : hour + 'am.?', options);
        }
    }
}

function isAdmin(chatId) {
    return !!admins[chatId];
}

function timer(iT) {
    if (iT) {
        clearTimeout(iT);
    }
    var nowDate = new Date();
    var roundDate = new Date();
    roundDate.setMinutes(1, 0, 0);
    roundDate.setHours(roundDate.getHours() + 1);
    var surveyTime = roundDate - nowDate;
    iT = setTimeout(function () {
        if (CRON_JOB_MESSAGE) {
            sendSubscriptionSurvey();
            timer(iT);
        }
    }, surveyTime);
}

function run() {
    var M_TAG = '.run';
    console.info('NODE_ENV:', process.env.NODE_ENV, 'NTBA_FIX_319:', process.env.NTBA_FIX_319);
    model.init().then(function () {
        console.info('Affect telegram bot started!');
        timer();
    }).catch(function (reason) {
        console.error(TAG + M_TAG, reason);
    });
}

module.exports.run = run;