// 小怪獸售票機 V7.8.3.3 FIX27A｜會員 4 位密碼管理與查詢頁 QR
(function () {
    "use strict";

    var REGION = "asia-east1";
    var functionsInstance = null;

    function byId(id) { return document.getElementById(id); }

    function esc(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getFunctions() {
        if (functionsInstance) return functionsInstance;
        if (!window.firebase || !firebase.functions || !firebase.apps || !firebase.apps.length) return null;
        functionsInstance = firebase.app().functions(REGION);
        return functionsInstance;
    }

    function actorName() {
        if (window.MonsterAuth && MonsterAuth.getActor) return MonsterAuth.getActor("staff").name;
        return "工作人員";
    }

    function memberById(memberId) {
        if (!Array.isArray(window.memberData)) return null;
        return window.memberData.find(function (member) { return member && member.id === memberId; }) || null;
    }

    function phoneDigits(value) {
        var digits = String(value || "").replace(/\D/g, "");
        if (/^8869\d{8}$/.test(digits)) digits = "0" + digits.slice(3);
        return digits;
    }

    function initialPin(member) {
        return phoneDigits(member && member.phone).slice(-4);
    }

    function portalUrl() {
        var link = document.createElement("a");
        link.href = "member.html";
        return link.href;
    }

    function ensureOverlay() {
        var overlay = byId("memberPortalAdminOverlay");
        if (overlay) return overlay;
        overlay = document.createElement("div");
        overlay.id = "memberPortalAdminOverlay";
        overlay.className = "member-portal-admin-overlay";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.right = "0";
        overlay.style.bottom = "0";
        overlay.style.left = "0";
        overlay.style.zIndex = "100200";
        overlay.style.display = "none";
        overlay.innerHTML = '<div class="member-portal-admin-card">' +
            '<button id="memberPortalAdminClose" class="member-portal-admin-close" type="button">×</button>' +
            '<h2 id="memberPortalAdminTitle">會員查詢</h2>' +
            '<div id="memberPortalAdminBody"></div></div>';
        document.body.appendChild(overlay);
        byId("memberPortalAdminClose").addEventListener("click", closeOverlay);
        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) closeOverlay();
        });
        return overlay;
    }

    function closeOverlay() {
        var overlay = byId("memberPortalAdminOverlay");
        if (overlay) overlay.style.display = "none";
    }

    function showQr() {
        var overlay = ensureOverlay();
        var url = portalUrl();
        var body = byId("memberPortalAdminBody");
        byId("memberPortalAdminTitle").textContent = "客人會員查詢 QR Code";
        overlay.style.display = "flex";
        body.innerHTML = '<div id="memberPortalQrBox" class="member-portal-qr-box"></div>' +
            '<p class="member-portal-admin-help">客人掃描後，以手機號碼＋4 位密碼登入；初始密碼是手機末 4 碼。</p>' +
            '<div class="member-portal-url">' + esc(url) + '</div>';
        try {
            var qr = qrcode(0, "M");
            qr.addData(url);
            qr.make();
            byId("memberPortalQrBox").innerHTML = qr.createSvgTag(6, 4);
        } catch (error) {
            byId("memberPortalQrBox").textContent = "QR Code 產生失敗，請直接使用下方網址";
        }
    }

    function callSetPin(member, pin, ensureOnly) {
        var service = getFunctions();
        var payload;
        if (!service) return Promise.reject({ message: "Firebase Functions 尚未載入" });
        payload = {
            actorName: actorName(),
            ensureOnly: ensureOnly === true,
            memberId: member.id,
            phone: member.phone
        };
        if (pin !== undefined && pin !== null && pin !== "") payload.pin = pin;
        return service.httpsCallable("setMemberPortalPin")(payload);
    }

    function retryAfterSync(member, pin, ensureOnly, options) {
        if (window.MonsterMemberCloud && MonsterMemberCloud.forceSync) MonsterMemberCloud.forceSync();
        return new Promise(function (resolve) { setTimeout(resolve, Number(options.delay || 950)); })
            .then(function () { return callSetPin(member, pin, ensureOnly); })
            .catch(function (error) {
                var reason = error && error.details && error.details.reason;
                if (reason === "MEMBER_NOT_FOUND" && !options.retried) {
                    options.retried = true;
                    return new Promise(function (resolve) { setTimeout(resolve, 1800); })
                        .then(function () { return callSetPin(member, pin, ensureOnly); });
                }
                throw error;
            });
    }

    function friendlyError(error) {
        var reason = error && error.details && error.details.reason;
        if (reason === "KIOSK_NOT_AUTHORIZED") return "請在已啟用的點餐機操作";
        if (reason === "DUPLICATE_MEMBER_PHONE") return "此手機對應到多筆會員，請先整理重複會員";
        return error && error.message || "設定失敗，請確認網路後重試";
    }

    function syncDefaultCredential(member, options) {
        options = options || {};
        if (!member || !member.id) return Promise.reject(new Error("找不到會員"));
        if (phoneDigits(member.phone).length !== 10) return Promise.reject(new Error("會員手機格式不正確"));
        return retryAfterSync(member, null, true, options)
            .then(function (result) {
                if (!options.silent) alert("✅ 會員查詢已啟用\n初始密碼為手機末 4 碼");
                return result;
            })
            .catch(function (error) {
                if (!options.silent) alert("❌ " + friendlyError(error));
                throw error;
            });
    }

    function setMemberPin(member, pin) {
        return retryAfterSync(member, pin, false, { delay: 200 })
            .catch(function (error) {
                alert("❌ " + friendlyError(error));
                throw error;
            });
    }

    function setBusy(value) {
        var buttons = document.querySelectorAll("#memberPortalAdminBody button");
        var i;
        for (i = 0; i < buttons.length; i += 1) buttons[i].disabled = value;
    }

    function showPinSettings(memberId) {
        var member = memberById(memberId);
        var overlay;
        var body;
        var pin;
        if (!member) { alert("❌ 找不到會員資料"); return; }
        pin = initialPin(member);
        if (!/^\d{4}$/.test(pin)) { alert("❌ 會員手機號碼格式不正確"); return; }
        overlay = ensureOverlay();
        body = byId("memberPortalAdminBody");
        byId("memberPortalAdminTitle").textContent = "會員查詢密碼";
        overlay.style.display = "flex";
        body.innerHTML = '<div class="member-pin-admin-profile"><strong>' + esc(member.name || "會員") + '</strong>' +
            '<span>' + esc(member.phone || "") + '</span></div>' +
            '<div class="member-pin-default">初始密碼：手機末 4 碼 <b>' + esc(pin) + '</b></div>' +
            '<label class="member-pin-admin-label" for="memberPinAdminInput">替客人設定新的 4 位密碼</label>' +
            '<input id="memberPinAdminInput" class="member-pin-admin-input" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" placeholder="4 位數字">' +
            '<div id="memberPinAdminMessage" class="member-pin-admin-message"></div>' +
            '<div class="member-pin-admin-actions">' +
            '<button id="memberPinAdminSet" type="button">設定新密碼</button>' +
            '<button id="memberPinAdminReset" type="button">重設為手機末 4 碼</button></div>';

        byId("memberPinAdminSet").addEventListener("click", function () {
            var customPin = String(byId("memberPinAdminInput").value || "").trim();
            if (!/^\d{4}$/.test(customPin)) {
                byId("memberPinAdminMessage").textContent = "請輸入 4 位數字密碼";
                return;
            }
            setBusy(true);
            byId("memberPinAdminMessage").textContent = "正在設定…";
            setMemberPin(member, customPin).then(function () {
                alert("✅ 已替會員設定新的 4 位密碼");
                closeOverlay();
            }).then(function () { setBusy(false); }, function () { setBusy(false); });
        });
        byId("memberPinAdminReset").addEventListener("click", function () {
            if (!confirm("確定重設為手機末 4 碼「" + pin + "」？")) return;
            setBusy(true);
            byId("memberPinAdminMessage").textContent = "正在重設…";
            setMemberPin(member, null).then(function () {
                alert("✅ 已重設密碼\n初始密碼為手機末 4 碼 " + pin);
                closeOverlay();
            }).then(function () { setBusy(false); }, function () { setBusy(false); });
        });
    }

    function decorateMemberCards() {
        var cards = document.querySelectorAll("#memberManagerList .member-card");
        var i;
        for (i = 0; i < cards.length; i += 1) {
            if (cards[i].querySelector(".member-pin-login-btn")) continue;
            var phoneBox = cards[i].querySelector(".member-card-phone");
            var actions = cards[i].querySelector(".member-card-actions");
            var phone = phoneDigits(phoneBox && phoneBox.textContent);
            var member = Array.isArray(window.memberData) ? window.memberData.find(function (item) {
                return item && phoneDigits(item.phone) === phone;
            }) : null;
            if (!actions || !member) continue;
            var button = document.createElement("button");
            button.type = "button";
            button.className = "member-pin-login-btn";
            button.textContent = "🔐 查詢密碼設定／重設";
            button.setAttribute("data-member-id", member.id);
            button.addEventListener("click", (function (id) {
                return function () { showPinSettings(id); };
            }(member.id)));
            actions.appendChild(button);
        }
    }

    function enhanceMemberEditor() {
        var birthday = byId("memberEditBirthday");
        var field;
        var label;
        if (!birthday) return;
        birthday.required = false;
        field = birthday.parentNode;
        label = field && field.querySelector("label");
        if (label) label.textContent = "生日（選填）";
    }

    if (typeof window.renderMemberList === "function") {
        var originalRenderMemberList = window.renderMemberList;
        window.renderMemberList = function () {
            var result = originalRenderMemberList.apply(this, arguments);
            setTimeout(decorateMemberCards, 0);
            return result;
        };
    }
    if (typeof window.openMemberEditor === "function") {
        var originalOpenMemberEditor = window.openMemberEditor;
        window.openMemberEditor = function () {
            var result = originalOpenMemberEditor.apply(this, arguments);
            enhanceMemberEditor();
            return result;
        };
    }
    var searchInput = byId("memberSearchInput");
    if (searchInput) searchInput.addEventListener("input", function () { setTimeout(decorateMemberCards, 0); });
    setTimeout(decorateMemberCards, 0);

    window.MonsterMemberPortalAdmin = {
        close: closeOverlay,
        showPinSettings: showPinSettings,
        showQr: showQr,
        syncBirthdayCredential: syncDefaultCredential,
        syncDefaultCredential: syncDefaultCredential,
        url: portalUrl
    };
    window.showMemberPortalQr = showQr;
    window.showMemberPortalPinSettings = showPinSettings;
}());
