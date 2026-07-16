"use strict";

var crypto = require("crypto");

function normalizeAccount(value) {
    return String(value || "").trim().toLowerCase();
}

function validateAccount(value) {
    return /^[a-z0-9._-]{3,30}$/.test(normalizeAccount(value));
}

function validateRole(value) {
    return value === "admin" || value === "staff";
}

function validatePassword(value) {
    return typeof value === "string" && value.length >= 6 && value.length <= 72;
}

function accountToEmail(account, domain) {
    return normalizeAccount(account) + "@" + (domain || "staff.monsterticket.app");
}

function accountKey(account) {
    return crypto.createHash("sha256").update(normalizeAccount(account), "utf8").digest("hex");
}

module.exports = {
    normalizeAccount: normalizeAccount,
    validateAccount: validateAccount,
    validateRole: validateRole,
    validatePassword: validatePassword,
    accountToEmail: accountToEmail,
    accountKey: accountKey
};
