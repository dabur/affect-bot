/**
 * Created by nick on 14/05/18.
 */
var TAG = 'app.action';
var Q = require('q');
var moment = require('moment');
var model = require('./db/model');
var utils = require('./utils');

//text messages
var DEFAULT_TXT = ['מה?', 'לא יודע איך לענות!', 'אולי דריה תוכל לעזור?'];
var ADMIN_DEFAULT_TXT = 'תשאלי את ניק!';
var WELCOME_TXT = 'הי ' + '%FIRST_NAME%' + '!\n' + 'ברוכה הבאה לקבוצת רישום לשיעורים של Affect';
var SUB_TXT = 'תבחרי יום רצוי להרשמה';
var QUERY_SUB_TXT = 'תבחרי שיעור רצוי להרשמה';
var SUCCESS_SUB_TXT = 'הרישום עבר בהצלחה!';
var SUCCESS_UNSUB_TXT = 'הרישום הוסר בהצלחה!';
var SUB_LIST_TXT = 'לרשימה המלאה של הרשומות, לחצי על השיעור';
var MYSUB_TXT = 'רשימת השיעורים להם את רשומה';
var FAIL_SUB_TXT = 'הפעולה נכשלה. הסיבה:';
var YOU_R_NOT_SUB_YET_TXT = 'אינך רשומה עדיין';
var TO_UNSUB_PRESS_TXT = '(להסרה:לחצי על השיעור)';
var NO_SUB_YET_TXT = 'עדיין אין רשומות';
var FULL_SUB_LIST_TXT = 'רשימה מלאה של הרשומות ליום ';
var NO_LESSONS_THIS_WEEK_TXT = 'אין שיעורים השבוע';
var NO_LESSONS_TODAY_TXT = 'אין שיעורים היום';
var TEMPLATE_USER_CREATION_TXT = 'תכתבי חדש:שם פרטי רווח שם משפחה \n דוגמה: "חדש:דריה וסיוקוב"';
var USER_CREATION_SUCCESS_TXT = 'לקוח נוצר בהצלחה';
var USER_CREATION_FAIL_TXT = 'יצירת לקוח נכשלה';
var ADMIN_CREATE_FIRST_USER_TXT = 'קודם תייצרי לקוחה';
var ADMIN_SHOOSE_USER_TXT = 'תבחרי לקוחה לרישום';

//button labels
var MY_SUB_LABEL = 'השיעורים שאני רשומה';
var SUB_LABEL = 'הרשמה לשיעור';
var SUB_LIST_LABEL = 'רשימת הרשומות';
var ADMIN_CREATE_USER_LABEL = 'צור לקוחה חדשה';
var ADMIN_SUB_USER_LABEL = 'לרשום לקוחה לשיעור';

var SUB_FAIL_CODE = {
    500: {txt: 'שגיאת מערכת'},
    400: {txt: 'לקוח לא קיים במערכת'},
    401: {txt: 'שיעור לא קיים במערכת'},
    300: {txt: 'לא ניתן להירשם ליותר משלוש שיעורים בשבוע'},
    301: {txt: 'השיעור מלאה'},
    302: {txt: 'הסרת רשום מותרת עד שעה לפני תחילת השיעור'},
    303: {txt: 'לא ניתן להירשם לשיעור שהתחיל או עבר'}
};

var DAY_LABEL = {
    0: 'ראשון',
    1: 'שני',
    2: 'שלישי',
    3: 'רביעי',
    4: 'חמישי',
    5: 'שישי',
    6: 'שבת'
};

var qKeys = {};
var messages = {
    '/start': msgStart
};
messages[MY_SUB_LABEL] = mySub;
messages[SUB_LIST_LABEL] = subList;

//admin
var ADMIN_QUERY_KEY = 'admin::';
qKeys[ADMIN_QUERY_KEY] = {key: ADMIN_QUERY_KEY, fun: queryFunction};
messages[ADMIN_CREATE_USER_LABEL] = adminCreateUser;
messages[ADMIN_SUB_USER_LABEL] = adminSubUser;

//static keyboards
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
                text: SUB_LIST_LABEL
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
    return model.init().then(()=> {
        return initQuery();
    });
}

function query(key, msg) {
    var d = Q.defer();
    if (qKeys.hasOwnProperty(key)) {
        qKeys[key].fun(key, msg).then((result)=> {
            d.resolve(result);
        }).catch(d.reject);
    } else {
        if (model.isAdmin(msg.from.id) && key.startsWith(ADMIN_QUERY_KEY)) {
            qKeys[ADMIN_QUERY_KEY].fun(key, msg).then((result)=> {
                d.resolve(result);
            }).catch(d.reject);
        } else {
            d.reject(new Error('unknown query key:' + key));
        }
    }
    return d.promise;
}

function isAutoMessage(txt) {
    if (txt.startsWith('חדש:')) {
        return true;
    }
    return messages.hasOwnProperty(txt);
}

function message(txt, msg) {
    if (txt.startsWith('חדש:')) {
        return messages[ADMIN_CREATE_USER_LABEL](msg);
    }
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
    var lessons = model.getLessonsByChatId(msg.from.id);
    var keyboard = [];
    var txt = MYSUB_TXT;
    for (var i = 0; i < lessons.length; i++) {
        var lesson = lessons[i];
        var unsubLessonKey = 'unsub::' + lesson.day + '::' + lesson.id;
        if (qKeys[unsubLessonKey]) {
            keyboard.push([{
                text: qKeys[unsubLessonKey].label,
                callback_data: qKeys[unsubLessonKey].key
            }]);
        }
    }
    if (keyboard.length > 0) {
        txt += '\n' + TO_UNSUB_PRESS_TXT;
    } else {
        txt += '\n' + YOU_R_NOT_SUB_YET_TXT;
    }
    var inlineKeyboard = {
        reply_markup: JSON.stringify({
            inline_keyboard: keyboard
        })
    };
    d.resolve({
        inline_txt: txt,
        inline_keyboard: inlineKeyboard
    });
    return d.promise;
}

function sub(msg) {
    var d = Q.defer();
    var keyboard = [];
    var lessons = model.getLessons();
    var days = getRelevantDays(lessons);
    for (var i = 0; i < days.length; i++) {
        var day = days[i];
        keyboard.unshift({
            text: DAY_LABEL[day],
            callback_data: 'sub::' + day
        });
    }
    var txt = SUB_TXT;
    if (keyboard.length < 1) {
        txt = NO_LESSONS_THIS_WEEK_TXT;
    }
    var inlineKeyboard = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                keyboard
            ]
        })
    };
    d.resolve({
        inline_txt: txt,
        inline_keyboard: inlineKeyboard
    });
    return d.promise;
}

function subList(msg) {
    var d = Q.defer();
    var lessons = model.getSubLessons();
    var keyboard = [];
    var txt = SUB_LIST_TXT;
    var relevantLessons = getRelevantLessons(lessons);
    for (var i = 0; i < relevantLessons.length; i++) {
        var lesson = relevantLessons[i];
        if (lesson.count > 0) {
            var key = 'fullsublist::' + lesson.day + '::' + lesson.id;
            var minute = lesson.minute;
            if (minute == '0') {
                minute = '00';
            }
            var label = DAY_LABEL[lesson.day] + ': ' + lesson.label + ' ' + lesson.hour + ':' + minute;
            if (qKeys[key]) {
                keyboard.push([{
                    text: label + ' רשומות:' + lesson.count,
                    callback_data: qKeys[key].key
                }]);
            }
        }
    }
    if (keyboard.length < 1) {
        txt = NO_SUB_YET_TXT;
    }
    var inlineKeyboard = {
        reply_markup: JSON.stringify({
            inline_keyboard: keyboard
        })
    };
    d.resolve({
        inline_txt: txt,
        inline_keyboard: inlineKeyboard
    });
    return d.promise;
}

function adminCreateUser(msg) {
    var M_TAG = '.adminCreateUser';
    var d = Q.defer();
    if (!model.isAdmin(msg.from.id)) {
        d.resolve({
            txt: defaultTxt(msg)
        });
    } else {
        if (!msg.text.startsWith('חדש:')) {
            d.resolve({
                txt: TEMPLATE_USER_CREATION_TXT
            });
        } else {
            try {
                var name = msg.text.split(':')[1].split(' ');
                var fName = name[0];
                var lName = name[1];
                if (!fName || !lName) {
                    d.resolve({
                        txt: USER_CREATION_FAIL_TXT + '\n' + TEMPLATE_USER_CREATION_TXT
                    });
                } else {
                    model.addUser({
                        chatId: "manual_" + utils.uuid(),
                        firstName: fName,
                        lastName: lName
                    }).then(function () {
                        d.resolve({
                            txt: USER_CREATION_SUCCESS_TXT + ' ( ' + fName + ' ' + lName + ' )'
                        });
                    }).catch(function (reason) {
                        console.error(TAG + M_TAG, 'msg.text:', msg.text, 'reason:', reason);
                        d.resolve({
                            txt: defaultTxt(msg)
                        });
                    });
                }
            } catch (err) {
                d.resolve({
                    txt: USER_CREATION_FAIL_TXT + '\n' + TEMPLATE_USER_CREATION_TXT
                });
            }
        }
    }
    return d.promise;
}

function adminSubUser(msg) {
    var d = Q.defer();
    if (!model.isAdmin(msg.from.id)) {
        d.resolve({
            txt: defaultTxt(msg)
        });
    } else {
        var keyboard = [];
        var users = model.getManualUsers();
        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            var key = 'admin::sub::' + user.chatId;
            var label = user.firstName + ' ' + user.lastName;
            keyboard.push([{
                text: label,
                callback_data: key
            }]);
        }
        var txt = ADMIN_SHOOSE_USER_TXT;
        if (keyboard.length < 1) {
            txt = ADMIN_CREATE_FIRST_USER_TXT;
        }
        var inlineKeyboard = {
            reply_markup: JSON.stringify({
                inline_keyboard: keyboard
            })
        };
        d.resolve({
            inline_txt: txt,
            inline_keyboard: inlineKeyboard
        });
    }
    return d.promise;
}
//---------------------------------------------------------------------------------------------------------// Message //

// Query //-----------------------------------------------------------------------------------------------------------//
function initQuery() {
    var d = Q.defer();
    var lessons = model.getLessons();
    for (var i = 0; i < lessons.length; i++) {
        var lesson = lessons[i];
        var dayKey = 'sub::' + lesson.day;
        if (!qKeys[dayKey]) {
            qKeys[dayKey] = {
                key: dayKey,
                label: DAY_LABEL[lesson.day],
                fun: queryFunction
            };
        }
        var subLessonKey = 'sub::' + lesson.day + '::' + lesson.id;
        var minute = lesson.minute;
        if (minute == '0') {
            minute = '00';
        }
        var lessonLabel = lesson.label + ' ' + lesson.hour + ':' + minute;
        qKeys[subLessonKey] = {
            key: subLessonKey,
            label: DAY_LABEL[lessonLabel],
            fun: queryFunction
        };
        var unsubLessonKey = 'unsub::' + lesson.day + '::' + lesson.id;
        qKeys[unsubLessonKey] = {
            key: unsubLessonKey,
            label: DAY_LABEL[lesson.day] + ': ' + lessonLabel,
            fun: queryFunction
        };
        var fullsublistKey = 'fullsublist::' + lesson.day + '::' + lesson.id;
        qKeys[fullsublistKey] = {
            key: fullsublistKey,
            fun: queryFunction
        };
    }
    messages[SUB_LABEL] = sub;
    d.resolve(true);
    return d.promise;
}

function queryFunction(key, msg) {
    var d = Q.defer();
    var subKeys = key.split('::');
    var action = subKeys[0];
    if (action == 'admin') {
        if (subKeys.length == 3) {
            queryAdminSub(msg, subKeys, d);
        } else if (subKeys.length == 4) {
            queryAdminSubLesson(msg, subKeys, d);
        } else {
            d.resolve({
                txt: defaultTxt(msg)
            });
        }
    } else if (action == 'sub') {
        if (subKeys.length == 2) {
            querySub(msg, subKeys, d);
        } else if (subKeys.length == 3) {
            querySubLesson(msg, subKeys, d);
        } else {
            d.resolve({
                txt: defaultTxt(msg)
            });
        }
    } else if (action == 'unsub') {
        if (subKeys.length == 3) {
            queryUnsubLesson(msg, subKeys, d);
        } else {
            d.resolve({
                txt: defaultTxt(msg)
            });
        }
    } else if (action == 'fullsublist') {
        if (subKeys.length == 3) {
            queryFullSubLList(msg, subKeys, d);
        } else {
            d.resolve({
                txt: defaultTxt(msg)
            });
        }
    } else {
        d.resolve({
            txt: defaultTxt(msg)
        });
    }
    return d.promise;
}

function querySub(msg, subKeys, d) {
    var keyboard = [];
    var day = subKeys[1];
    var lessons = model.getLessonsByDay(day);
    var relevantLessons = getRelevantLessons(lessons);
    for (var i = 0; i < relevantLessons.length; i++) {
        var lesson = relevantLessons[i];
        var subLessonKey = 'sub::' + lesson.day + '::' + lesson.id;
        var minute = lesson.minute;
        if (minute == '0') {
            minute = '00';
        }
        var lessonLabel = lesson.label + ' ' + lesson.hour + ':' + minute;
        keyboard.push([{
            text: lessonLabel,
            callback_data: subLessonKey
        }]);
    }
    var txt = QUERY_SUB_TXT;
    if (keyboard.length < 1) {
        txt = NO_LESSONS_TODAY_TXT;
    }
    var inlineKeyboard = {
        reply_markup: JSON.stringify({
            inline_keyboard: keyboard
        })
    };
    d.resolve({
        inline_txt: txt,
        inline_keyboard: inlineKeyboard
    });
}

function queryAdminSub(msg, subKeys, d) {
    var keyboard = [];
    var chatId = subKeys[2];
    var lessons = model.getLessonsByDay(new Date().getDay());
    var relevantLessons = getRelevantLessons(lessons);
    for (var i = 0; i < relevantLessons.length; i++) {
        var lesson = relevantLessons[i];
        var subLessonKey = 'admin::sub::' + chatId + '::' + lesson.id;
        var minute = lesson.minute;
        if (minute == '0') {
            minute = '00';
        }
        var lessonLabel = lesson.label + ' ' + lesson.hour + ':' + minute;
        keyboard.push([{
            text: lessonLabel,
            callback_data: subLessonKey
        }]);
    }
    var txt = QUERY_SUB_TXT;
    if (keyboard.length < 1) {
        txt = NO_LESSONS_TODAY_TXT;
    }
    var inlineKeyboard = {
        reply_markup: JSON.stringify({
            inline_keyboard: keyboard
        })
    };
    d.resolve({
        inline_txt: txt,
        inline_keyboard: inlineKeyboard
    });
}

function queryAdminSubLesson(msg, subKeys, d) {
    var M_TAG = '.queryAdminSubLesson';
    var chatId = subKeys[2];
    var lessonId = subKeys[3];
    model.subUser(chatId, lessonId).then(()=> {
        d.resolve({
            txt: SUCCESS_SUB_TXT
        });
    }).catch((reason)=> {
        var txt = FAIL_SUB_TXT;
        if (reason.code && SUB_FAIL_CODE[reason.code]) {
            txt += SUB_FAIL_CODE[reason.code].txt;
        } else {
            console.error(TAG + M_TAG, 'reason:', reason);
            txt += SUB_FAIL_CODE[500].txt;
        }
        d.resolve({
            txt: txt
        });
    });
}

function querySubLesson(msg, subKeys, d) {
    var M_TAG = '.querySubLesson';
    var lessonId = subKeys[2];
    model.subUser(msg.from.id, lessonId).then(()=> {
        d.resolve({
            txt: SUCCESS_SUB_TXT
        });
    }).catch((reason)=> {
        var txt = FAIL_SUB_TXT;
        if (reason.code && SUB_FAIL_CODE[reason.code]) {
            txt += SUB_FAIL_CODE[reason.code].txt;
        } else {
            console.error(TAG + M_TAG, 'reason:', reason);
            txt += SUB_FAIL_CODE[500].txt;
        }
        d.resolve({
            txt: txt
        });
    });
}

function queryUnsubLesson(msg, subKeys, d) {
    var M_TAG = '.queryUnsubLesson';
    var subLessonId = subKeys[2];
    model.unsubUser(msg.from.id, subLessonId).then(()=> {
        d.resolve({
            txt: SUCCESS_UNSUB_TXT
        });
    }).catch((reason)=> {
        var txt = FAIL_SUB_TXT;
        if (reason.code && SUB_FAIL_CODE[reason.code]) {
            txt += SUB_FAIL_CODE[reason.code].txt;
        } else {
            console.error(TAG + M_TAG, 'reason:', reason);
            txt += SUB_FAIL_CODE[500].txt;
        }
        d.resolve({
            txt: txt
        });
    });
}

function queryFullSubLList(msg, subKeys, d) {
    var lessonId = subKeys[2];
    var lesson = model.getLesson(lessonId);
    if (!lesson) {
        d.resolve({
            txt: FAIL_SUB_TXT + SUB_FAIL_CODE[401].txt
        });
    } else {
        var users = model.getSubUsersByLessonId(lessonId);
        var minute = lesson.minute;
        if (minute == '0') {
            minute = '00';
        }
        var label = DAY_LABEL[lesson.day] + ': ' + lesson.label + ' ' + lesson.hour + ':' + minute;
        var txt = FULL_SUB_LIST_TXT + label + '\n';
        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            txt += user.firstName + ' ' + user.lastName + '\n';
        }
        d.resolve({
            txt: txt
        });
    }
}

function getRelevantDays(lessons) {
    var date = new Date();
    var day = date.getDay();
    var days = {obj: {}, arr: []};
    for (var i = 0; i < lessons.length; i++) {
        var lesson = lessons[i];
        if (!days.obj[lesson.day]) {
            if (lesson.day > day) {
                days.obj[lesson.day] = true;
                days.arr.push(lesson.day);
            } else if (lesson.day == day) {
                var lessonDate = new Date();
                lessonDate.setHours(lesson.hour, lesson.minute);
                if (lessonDate > date) {
                    days.obj[lesson.day] = true;
                    days.arr.push(lesson.day);
                }
            }
        }
    }
    return days.arr;
}

function getRelevantLessons(lessons) {
    var date = new Date();
    var day = date.getDay();
    return lessons.filter(function (lesson) {
        if (lesson.day > day) {
            return true;
        } else if (lesson.day == day) {
            var lessonDate = new Date();
            lessonDate.setHours(lesson.hour, lesson.minute);
            if (lessonDate > date) {
                return true;
            }
        }
        return false;
    });
}
//-----------------------------------------------------------------------------------------------------------// Query //