/**
 * Created by nick on 14/05/18.
 */
var Q = require('q');
var model = require('./db/model');
var utils = require('./utils');

//text messages
var DEFAULT_TXT = ['מה?', 'לא יודע איך לענות!', 'אולי דריה תוכל לעזור?'];
var ADMIN_DEFAULT_TXT = 'תשאלי את ניק!';
var WELCOME_TXT = 'היי ' + '%FIRST_NAME%' + '!\n' + 'ברוכה הבאה לקבוצת רישום לשיעורים של Affect';

var MAIN_MENU_TXT = 'תפריט ראשי';
var WAITING_FOR_YOUR_CHOOSE_TXT = 'ממתין לבחירתך..';
var CHOOSE_DAY_TXT = 'תבחרי יום רצוי להרשמה';
var CHOOSE_LESSON_TXT = 'תבחרי שיעור רצוי להרשמה';

var SUCCESS_SUB_TXT = 'הרישום עבר בהצלחה!';

//button labels
var MY_SUB_LABEL = 'השיעורים שאני רשומה';
var SUB_LABEL = 'הרשמה לשיעור';
var SUB_LIST_LABEL = 'רשימת הרשומות';
var ADMIN_CREATE_USER_LABEL = 'צור לקוחה חדש';
var ADMIN_SUB_USER_LABEL = 'לרשום לקוחה';
var ADMIN_SUB_LIST_LABEL = 'רשימת הרשומות';

var MAIN_LABEL = 'תפריט ראשי';

var qKeys = {};
var Q_SUB_0 = {key: 'sub::0', label: 'ראשון'};
var Q_SUB_1 = {key: 'sub::1', label: 'שני'};
var Q_SUB_2 = {key: 'sub::2', label: 'שלישי'};
var Q_SUB_3 = {key: 'sub::3', label: 'רביעי'};
var Q_SUB_4 = {key: 'sub::4', label: 'חמישי'};
var Q_SUB_5 = {key: 'sub::5', label: 'שישי'};
qKeys[Q_SUB_0.key] = qSub0;
var Q_SUB_0_1 = {key: 'sub::0::1', label: 'עיצוב וחיטוב 19:00'};
var Q_SUB_0_2 = {key: 'sub::0::2', label: 'HIIT 20:00'};
var Q_SUB_0_3 = {key: 'sub::0::3', label: 'פילאטיס 21:00'};
qKeys[Q_SUB_0_1.key] = qSub01;

var messages = {
    '/start': msgStart
};
messages[MY_SUB_LABEL] = mySub;
messages[SUB_LABEL] = sub;
messages[SUB_LIST_LABEL] = subList;
messages[ADMIN_CREATE_USER_LABEL] = adminCreateUser;
messages[ADMIN_SUB_USER_LABEL] = adminSubUser;
messages[ADMIN_SUB_LIST_LABEL] = adminSubList;
messages[MAIN_LABEL] = mainMenu;

//keyboards
var MAIN_KEYBOARD = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{
                text: MY_SUB_LABEL
            }], [{
                text: SUB_LABEL
            }], [{
                text: SUB_LIST_LABEL
            }]
        ]
    })
};
var ADMIN_MAIN_KEYBOARD = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{
                text: ADMIN_CREATE_USER_LABEL
            }], [{
                text: ADMIN_SUB_USER_LABEL
            }], [{
                text: ADMIN_SUB_LIST_LABEL
            }]
        ]
    })
};
var SUB_KEYBOARD = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{
                text: MY_SUB_LABEL
            }], [{
                text: SUB_LIST_LABEL
            }], [{
                text: MAIN_LABEL
            }]
        ]
    })
};
var SUB_INLINE_KEYBOARD = {
    reply_markup: JSON.stringify({
        inline_keyboard: [[
            {
                text: Q_SUB_5.label,
                callback_data: Q_SUB_5.key
            },
            {
                text: Q_SUB_4.label,
                callback_data: Q_SUB_4.key
            },
            {
                text: Q_SUB_3.label,
                callback_data: Q_SUB_3.key
            },
            {
                text: Q_SUB_2.label,
                callback_data: Q_SUB_2.key
            },
            {
                text: Q_SUB_1.label,
                callback_data: Q_SUB_1.key
            },
            {
                text: Q_SUB_0.label,
                callback_data: Q_SUB_0.key
            }
        ]]
    })
};
var SUB_LESSON_INLINE_KEYBOARD = {
    reply_markup: JSON.stringify({
        inline_keyboard: [
            [{
                text: Q_SUB_0_1.label,
                callback_data: Q_SUB_0_1.key
            }],
            [{
                text: Q_SUB_0_2.label,
                callback_data: Q_SUB_0_2.key
            }],
            [{
                text: Q_SUB_0_3.label,
                callback_data: Q_SUB_0_3.key
            }]
        ]
    })
};

// Public //----------------------------------------------------------------------------------------------------------//
module.exports = {
    init: init,
    query: query,
    isAutoMessage: isAutoMessage,
    message: message,
    defaultTxt: defaultTxt,
    defaultKeyboard: defaultKeyboard
};

function init() {
    var d = Q.defer();
    model.init().then(()=> {
        d.resolve(true);
    }).catch((reason)=> {
        d.reject(reason);
    });
    return d.promise;
}

function query(key, msg) {
    var d = Q.defer();
    if (qKeys.hasOwnProperty(key)) {
        qKeys[key](msg).then((result)=> {
            d.resolve(result);
        }).catch(d.reject);
    } else {
        d.reject(new Error('unknown query key:' + key));
    }
    return d.promise;
}

function isAutoMessage(txt) {
    return messages.hasOwnProperty(txt);
}

function message(txt, msg) {
    return messages[txt](msg);
}

function defaultTxt(msg) {
    return model.isAdmin(msg.from.id) ? ADMIN_DEFAULT_TXT : DEFAULT_TXT[Math.floor(Math.random() * Math.floor(DEFAULT_TXT.length))];
}

function defaultKeyboard(msg) {
    return model.isAdmin(msg.from.id) ? ADMIN_MAIN_KEYBOARD : MAIN_KEYBOARD;
}
//----------------------------------------------------------------------------------------------------------// Public //

// Message //---------------------------------------------------------------------------------------------------------//
function msgStart(msg) {
    var d = Q.defer();
    model.addUser({
        chatId: msg.from.id,
        firstName: msg.from.first_name,
        lastName: msg.from.last_name
    });
    var user = model.getUser(msg.from.id);
    var txt = utils.replaceAll(WELCOME_TXT, '%FIRST_NAME%', user.firstName);
    d.resolve({
        txt: txt,
        keyboard: defaultKeyboard(msg)
    });
    return d.promise;
}

function mySub(msg) {
    var d = Q.defer();
    d.resolve({
        txt: msg.text,
        keyboard: defaultKeyboard(msg)
    });
    return d.promise;
}

function sub() {
    var d = Q.defer();
    d.resolve({
        txt: CHOOSE_DAY_TXT,
        keyboard: SUB_KEYBOARD,
        inline_txt: WAITING_FOR_YOUR_CHOOSE_TXT,
        inline_keyboard: SUB_INLINE_KEYBOARD
    });
    return d.promise;
}

function subList(msg) {
    var d = Q.defer();
    d.resolve({
        txt: msg.text,
        keyboard: defaultKeyboard(msg)
    });
    return d.promise;
}

function adminCreateUser(msg) {
    var d = Q.defer();
    d.resolve({
        txt: msg.text,
        keyboard: defaultKeyboard(msg)
    });
    return d.promise;
}

function adminSubUser(msg) {
    var d = Q.defer();
    d.resolve({
        txt: msg.text,
        keyboard: defaultKeyboard(msg)
    });
    return d.promise;
}

function adminSubList(msg) {
    var d = Q.defer();
    d.resolve({
        txt: msg.text,
        keyboard: defaultKeyboard(msg)
    });
    return d.promise;
}

function mainMenu() {
    var d = Q.defer();
    d.resolve({
        txt: MAIN_MENU_TXT,
        keyboard: MAIN_KEYBOARD
    });
    return d.promise;
}
//---------------------------------------------------------------------------------------------------------// Message //

// Query //-----------------------------------------------------------------------------------------------------------//
function qSub0(key, msg) {
    var d = Q.defer();
    d.resolve({
        txt: CHOOSE_LESSON_TXT,
        keyboard: SUB_KEYBOARD,
        inline_txt: WAITING_FOR_YOUR_CHOOSE_TXT,
        inline_keyboard: SUB_LESSON_INLINE_KEYBOARD
    });
    return d.promise;
}
function qSub01(key, msg) {
    var d = Q.defer();
    d.resolve({
        txt: SUCCESS_SUB_TXT,
        keyboard: MAIN_KEYBOARD
    });
    return d.promise;
}
//-----------------------------------------------------------------------------------------------------------// Query //