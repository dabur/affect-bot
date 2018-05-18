var singleton = function singleton() {
    var TAG = 'db.model';
    var Q = require('q');
    var config = require('config');
    var admins = {};
    for (var a = 0; a < config.admins.length; a++) {
        admins[config.admins[a]] = {chatId: config.admins[a]};
    }
    var sheet = require('../handler/spreadsheet');
    var users = require('./users');
    var lessons = require('./lessons');
    var presence = require('./presence');
    var today;
    var todayLessons;
    var nextDayLessons;

    var USER_SUB_QUOTA_PER_WEEK = 3;

    // Public //------------------------------------------------------------------------------------------------------//
    this.init = init;
    this.isAdmin = isAdmin;
    this.addUser = addUser;
    this.getUser = getUser;
    this.getLesson = getLesson;
    this.subUser = subUser;
    this.unsubUser = unsubUser;
    this.getLessons = getLessons;
    this.getLessonsByDay = getLessonsByDay;
    this.getLessonsByChatId = getLessonsByChatId;
    this.getSubLessons = getSubLessons;
    this.getSubUsersByLessonId = getSubUsersByLessonId;
    this.getManualUsers = getManualUsers;

    function init() {
        return sheet.init().then(function () {
            return users.init().then(function () {
                return lessons.init().then(function () {
                    return presence.init(users, lessons);
                });
            });
        });
    }

    function isAdmin(chatId) {
        return !!admins[chatId];
    }

    function addUser(obj) {
        return users.add(obj);
    }

    function getUser(id) {
        return users.get(id);
    }

    function getLesson(id) {
        return lessons.getById(id);
    }

    function subUser(chatId, lessonId) {
        var d = Q.defer();
        var user = users.get(chatId);
        if (!user) {
            d.reject({code: 400});
        } else {
            var lesson = lessons.getById(lessonId);
            if (!lesson) {
                d.reject({code: 401});
            } else {
                if (getLessonsByChatId(user.chatId).length >= USER_SUB_QUOTA_PER_WEEK) {
                    d.reject({code: 300});
                } else {
                    if (!isSubOpen(lesson)) {
                        d.reject({code: 303});
                    } else {
                        if (isFull(lesson)) {
                            d.reject({code: 301});
                        } else {
                            presence.add(chatId, lessonId, true).then(function () {
                                d.resolve(true);
                            }).catch(function () {
                                d.reject({code: 500});
                            });
                        }
                    }
                }
            }
        }
        return d.promise;
    }

    function unsubUser(chatId, lessonId) {
        var d = Q.defer();
        var user = users.get(chatId);
        if (!user) {
            d.reject({code: 400});
        } else {
            var lesson = lessons.getById(lessonId);
            if (!lesson) {
                d.reject({code: 401});
            } else {
                if (!isUnsubOpen(lesson)) {
                    d.reject({code: 302});
                } else {
                    presence.remove(user.chatId, lesson.id, true).then(function () {
                        d.resolve(true);
                    }).catch(function () {
                        d.reject({code: 500});
                    });
                }
            }
        }
        return d.promise;
    }

    function getLessons() {
        return lessons.getAll();
    }

    function getLessonsByChatId(chatId) {
        var userPresence = presence.getByChatId(chatId);
        var ans = [];
        if (userPresence) {
            for (var i = 0; i < userPresence.arr.length; i++) {
                var lessonId = userPresence.arr[i].lessonId;
                ans.push(lessons.getById(lessonId));
            }
        }
        return ans;
    }

    function getSubLessons() {
        var subLessons = presence.getAll();
        var ans = [];
        for (var lessonId in subLessons) {
            if (subLessons.hasOwnProperty(lessonId)) {
                var lesson = lessons.getById(lessonId);
                lesson.count = subLessons[lessonId].arr.length;
                ans.push(lesson);
            }
        }
        return ans;
    }

    function getSubUsersByLessonId(lessonId) {
        var byLessonId = presence.getByLessonId(lessonId);
        var ans = [];
        if (byLessonId) {
            for (var i = 0; i < byLessonId.arr.length; i++) {
                ans.push(users.get(byLessonId.arr[i].chatId));
            }
        }
        return ans;
    }

    function getLessonsByDay(day) {
        return lessons.getByDay(day);
    }

    function isSubOpen(lesson) {
        var date = new Date();
        var day = date.getDay();
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
    }

    function isUnsubOpen(lesson) {
        var date = new Date();
        var day = date.getDay();
        if (lesson.day > day) {
            return true;
        } else if (lesson.day == day) {
            var lessonDate = new Date();
            lessonDate.setHours(parseInt(lesson.hour) - 1, lesson.minute);
            if (lessonDate > date) {
                return true;
            }
        }
        return false;
    }

    function isFull(lesson) {
        var byLessonId = presence.getByLessonId(lesson.id);
        if (!byLessonId) {
            return false;
        }
        return !(byLessonId.arr.length < lesson.capacity);
    }

    function getManualUsers() {
        return users.getAll().filter((user)=> {
            return user.chatId.startsWith('manual_');
        });
    }

    //------------------------------------------------------------------------------------------------------// Public //

    this.reload = reload;
    this.getAllUsers = getAllUsers;
    this.getTodayClosestLessons = getTodayClosestLessons;
    this.unsubscribeUserFromToday = unsubscribeUserFromToday;
    this.getSubscribeLessonsForToday = getSubscribeLessonsForToday;
    this.getSubscribersForToday = getSubscribersForToday;
    this.getNextDayClosestLessons = getNextDayClosestLessons;
    this.subscribeUserForNextDay = subscribeUserForNextDay;
    this.unsubscribeUserFromNextDay = unsubscribeUserFromNextDay;
    this.getSubscribeLessonsForNextDay = getSubscribeLessonsForNextDay;
    this.getSubscribersForNextDay = getSubscribersForNextDay;
    this.getUserSubscription = getUserSubscription;
    this.isSubscribedUserForToday = isSubscribedUserForToday;
    this.isTodayLessonFull = isTodayLessonFull;

    function getAllUsers() {
        return users.getAll();
    }

    function subscribeUserForNextDay(msgId, label, h, m) {
        var M_TAG = '.subscribeUserForNextDay';
        var d = Q.defer();
        var lessons = schedule.getScheduler();
        var day = new Date().getDay();
        day++;
        day %= 7;
        if (!lessons[day]) {
            d.reject({msg: 'שיעור מבוקש למחר לא קיים במערכת'});
        } else {
            var dayLessons = lessons[day];
            if (!dayLessons[h]) {
                d.reject({msg: 'שיעור מבוקש למחר לא קיים במערכת'});
            } else {
                var hourLessons = dayLessons[h];
                if (!hourLessons[m]) {
                    d.reject({msg: 'שיעור מבוקש למחר לא קיים במערכת'});
                } else {
                    var lesson = hourLessons[m];
                    if (label != lesson.label) {
                        d.reject({msg: 'שיעור מבוקש למחר לא קיים במערכת'});
                    } else {
                        var user = users.get(msgId);
                        var subscribedLesson = presence.getSubscribedUserForNextDay(user);
                        if (subscribedLesson) {
                            presence.unsubscribeUserForNextDay(user, subscribedLesson).then(function () {
                                return presence.subscribeUserForNextDay(user, lesson)
                            }).then(function () {
                                d.resolve('ההרשמה עברה בהצלחה!');
                            }).catch(function (err) {
                                console.error(TAG + M_TAG, err);
                                presence.subscribeUserForNextDay(user, subscribedLesson).then(function () {
                                    if (err && err.text) {
                                        d.reject({text: err.text});
                                    } else {
                                        d.reject({text: 'בעיית רישום'});
                                    }
                                }).catch(function (reason) {
                                    console.error(TAG + M_TAG, 'reason:', reason);
                                    if (err && err.text) {
                                        d.reject({text: err.text});
                                    } else {
                                        d.reject({text: 'בעיית רישום'});
                                    }
                                });
                            });
                        } else {
                            presence.subscribeUserForNextDay(user, lesson).then(function () {
                                d.resolve('ההרשמה עברה בהצלחה!');
                            }).catch(function (err) {
                                if (err && err.text) {
                                    d.reject({text: err.text});
                                } else {
                                    console.error(TAG + M_TAG, err);
                                    d.reject({text: 'בעיית רישום'});
                                }
                            });
                        }
                    }
                }
            }
        }
        return d.promise;
    }

    function getTodayClosestLessons() {
        syncLessons();
        var lessons = [];
        pushTodayClosestLessons(lessons, todayLessons);
        lessons.sort(function (a, b) {
            return a.startTime - b.startTime;
        });
        return lessons;
    }

    function getNextDayClosestLessons() {
        syncLessons();
        var lessons = [];
        pushNextDatClosestLessons(lessons, nextDayLessons);
        lessons.sort(function (a, b) {
            return a.startTime - b.startTime;
        });
        return lessons;
    }

    function pushTodayClosestLessons(result, lessons) {
        var nowDate = new Date();
        for (var h in lessons) {
            if (lessons.hasOwnProperty(h)) {
                var hourLessons = lessons[h];
                for (var m in hourLessons) {
                    if (hourLessons.hasOwnProperty(m)) {
                        var minuteLessons = hourLessons[m];
                        var lesson = JSON.parse(JSON.stringify(minuteLessons));
                        var tLessonStartDate = new Date(nowDate.getTime());
                        tLessonStartDate.setHours(parseInt(lesson.hour), parseInt(lesson.minute), 0, 0);
                        if (nowDate.getTime() < (tLessonStartDate.getTime() + (lesson.duration * 60000))) {
                            lesson.startTime = tLessonStartDate.getTime();
                            result.push(lesson);
                        }
                    }
                }
            }
        }
    }

    function pushNextDatClosestLessons(result, lessons) {
        var nowDate = new Date();
        for (var h in lessons) {
            if (lessons.hasOwnProperty(h)) {
                var hourLessons = lessons[h];
                for (var m in hourLessons) {
                    if (hourLessons.hasOwnProperty(m)) {
                        var lesson = JSON.parse(JSON.stringify(hourLessons[m]));
                        var tLessonStartDate = new Date(nowDate.getTime());
                        tLessonStartDate.setHours(parseInt(lesson.hour), parseInt(lesson.minute), 0, 0);
                        tLessonStartDate.setDate(tLessonStartDate.getDate() + 1);
                        lesson.startTime = tLessonStartDate.getTime();
                        result.push(lesson);
                    }
                }
            }
        }
    }

    function syncLessons() {
        var currentDay = new Date().getDay();
        if (currentDay != today) {
            var lessons = schedule.getScheduler();
            todayLessons = lessons[currentDay];
            nextDayLessons = lessons[(currentDay + 1) % 7];
            today = currentDay;
        }
    }

    function isSubscribedUserForToday(user) {
        return !!presence.getSubscribedUserForToday(user);
    }

    function getUserSubscription(msgId) {
        var subscription = [];
        var user = users.get(msgId);
        if (user) {
            var todaySubscriptionLesson = presence.getSubscribedUserForToday(user);
            if (todaySubscriptionLesson) {
                todaySubscriptionLesson = JSON.parse(JSON.stringify(todaySubscriptionLesson));
                todaySubscriptionLesson.isToday = true;
                subscription.push(todaySubscriptionLesson);
            }
            var nextDaySubscriptionLesson = presence.getSubscribedUserForNextDay(user);
            if (nextDaySubscriptionLesson) {
                nextDaySubscriptionLesson = JSON.parse(JSON.stringify(nextDaySubscriptionLesson));
                nextDaySubscriptionLesson.isToday = false;
                subscription.push(nextDaySubscriptionLesson);
            }
        }
        return subscription;
    }

    function unsubscribeUserFromToday(msgId) {
        var M_TAG = '.unsubscribeUserFromToday';
        var d = Q.defer();
        var nowDate = new Date();
        var user = users.get(msgId);
        var subscribedLesson = presence.getSubscribedUserForToday(user);
        if (subscribedLesson) {
            var subscribedDate = new Date(nowDate.getTime());
            subscribedDate.setHours(parseInt(subscribedLesson.hour), parseInt(subscribedLesson.minute), 0, 0);
            if (nowDate.getTime() < (subscribedDate.getTime() + (subscribedLesson.duration * 60000))) {
                presence.unsubscribeUserForToday(user, subscribedLesson).then(function () {
                    d.resolve('הסרה עברה בהצלחה!');
                }).catch(function (err) {
                    console.error(TAG + M_TAG, err);
                    d.reject({text: 'בעיית הסרת רישום'});
                });
            } else {
                d.reject({text: 'הסרה נכשלה כי לא ניתן להסיר רישום משיעור שכבר עבר'});
            }
        } else {
            d.reject({text: 'הסרה נכשלה כי עוד לא נרשמת לשיעור'});
        }
        return d.promise;
    }

    function unsubscribeUserFromNextDay(msgId) {
        var M_TAG = '.unsubscribeUserFromNextDay';
        var d = Q.defer();
        var user = users.get(msgId);
        var subscribedLesson = presence.getSubscribedUserForNextDay(user);
        if (subscribedLesson) {
            presence.unsubscribeUserForNextDay(user, subscribedLesson).then(function () {
                d.resolve('הסרה עברה בהצלחה!');
            }).catch(function (err) {
                console.error(TAG + M_TAG, err);
                d.reject({text: 'בעיית הסרת רישום'});
            });
        } else {
            d.reject({text: 'הסרה נכשלה כי עוד לא נרשמת לשיעור'});
        }
        return d.promise;
    }

    function getSubscribeLessonsForToday() {
        var subscribeLessons = presence.getSubscribeLessonsForToday();
        var lessons = schedule.getLessons();
        var ans = [];
        for (var i = 0; i < subscribeLessons.length; i++) {
            var subscribeLesson = subscribeLessons[i];
            var lesson = lessons[subscribeLesson.id];
            if (lesson) {
                ans.push({
                    label: lesson.label,
                    hour: lesson.hour,
                    minute: lesson.minute,
                    count: subscribeLesson.count
                });
            }
        }
        return ans;
    }

    function getSubscribeLessonsForNextDay() {
        var subscribeLessons = presence.getSubscribeLessonsForNextDay();
        var lessons = schedule.getLessons();
        var ans = [];
        for (var i = 0; i < subscribeLessons.length; i++) {
            var subscribeLesson = subscribeLessons[i];
            var lesson = lessons[subscribeLesson.id];
            if (lesson) {
                ans.push({
                    label: lesson.label,
                    hour: lesson.hour,
                    minute: lesson.minute,
                    count: subscribeLesson.count
                });
            }
        }
        return ans;
    }

    function getSubscribersForToday(label, h, m) {
        var d = Q.defer();
        var lessons = schedule.getScheduler();
        var day = new Date().getDay();
        if (!lessons[day]) {
            d.reject({msg: 'שיעור מבוקש להיום לא קיים במערכת'});
        } else {
            var dayLessons = lessons[day];
            if (!dayLessons[h]) {
                d.reject({msg: 'שיעור מבוקש להיום לא קיים במערכת'});
            } else {
                var hourLessons = dayLessons[h];
                if (!hourLessons[m]) {
                    d.reject({msg: 'שיעור מבוקש להיום לא קיים במערכת'});
                } else {
                    var lesson = hourLessons[m];
                    if (label != lesson.label) {
                        d.reject({msg: 'שיעור מבוקש להיום לא קיים במערכת'});
                    } else {
                        presence.getSubscribersForToday(lesson).then(function (subscribers) {
                            d.resolve(subscribers);
                        }).catch(function (err) {
                            d.reject(err);
                        });
                    }
                }
            }
        }
        return d.promise;
    }

    function getSubscribersForNextDay(label, h, m) {
        var d = Q.defer();
        var lessons = schedule.getScheduler();
        var day = new Date().getDay();
        day++;
        day %= 7;
        if (!lessons[day]) {
            d.reject({msg: 'שיעור מבוקש למחר לא קיים במערכת'});
        } else {
            var dayLessons = lessons[day];
            if (!dayLessons[h]) {
                d.reject({msg: 'שיעור מבוקש למחר לא קיים במערכת'});
            } else {
                var hourLessons = dayLessons[h];
                if (!hourLessons[m]) {
                    d.reject({msg: 'שיעור מבוקש למחר לא קיים במערכת'});
                } else {
                    var lesson = hourLessons[m];
                    if (label != lesson.label) {
                        d.reject({msg: 'שיעור מבוקש למחר לא קיים במערכת'});
                    } else {
                        presence.getSubscribersForNextDay(lesson).then(function (subscribers) {
                            d.resolve(subscribers);
                        }).catch(function (err) {
                            d.reject(err);
                        });
                    }
                }
            }
        }
        return d.promise;
    }

    function isTodayLessonFull(lesson) {
        return presence.isTodayLessonFull(lesson);
    }

    function reload() {
        return schedule.reload().then(function () {
            syncLessons();
            return presence.reload(users, schedule.getLessons());
        });
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