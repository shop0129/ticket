"use strict";

var admin = require("firebase-admin");
var validators = require("../lib/validators");

var account = validators.normalizeAccount(process.argv[2] || "manager");
var password = String(process.argv[3] || "");
var name = String(process.argv[4] || "店長").trim();
var root = process.env.MONSTER_FIREBASE_ROOT || "monsterTicket/v1";
var domain = process.env.MONSTER_STAFF_EMAIL_DOMAIN || "staff.monsterticket.app";
var databaseURL = process.env.FIREBASE_DATABASE_URL || "https://monsterticket-default-rtdb.asia-southeast1.firebasedatabase.app";

if (!validators.validateAccount(account) || !validators.validatePassword(password) || !name) {
    console.error("使用方式：npm run bootstrap-manager -- manager 至少6碼密碼 店長姓名");
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: databaseURL
});

async function run() {
    var email = validators.accountToEmail(account, domain);
    var user;
    try {
        user = await admin.auth().getUserByEmail(email);
        user = await admin.auth().updateUser(user.uid, {
            password: password,
            displayName: name,
            disabled: false,
            emailVerified: true
        });
    } catch (error) {
        if (error.code !== "auth/user-not-found") {
            throw error;
        }
        user = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: name,
            disabled: false,
            emailVerified: true
        });
    }

    await admin.auth().setCustomUserClaims(user.uid, { role: "admin", staff: true });
    var now = Date.now();
    var updates = {};
    updates[root + "/staffUsers/" + user.uid] = {
        uid: user.uid,
        id: user.uid,
        account: account,
        email: email,
        name: name,
        role: "admin",
        enabled: true,
        createdAt: now,
        updatedAt: now,
        bootstrap: true
    };
    updates[root + "/staffAccountIndex/" + validators.accountKey(account)] = {
        uid: user.uid,
        account: account
    };
    await admin.database().ref().update(updates);
    console.log("Bootstrap manager ready:", account, user.uid);
}

run().then(function () {
    process.exit(0);
}).catch(function (error) {
    console.error(error);
    process.exit(1);
});
