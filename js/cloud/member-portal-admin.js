// 小怪獸售票機 V7.8.3.3 FIX27｜會員生日登入啟用與查詢頁 QR
(function () {
    "use strict";

    var REGION = "asia-east1";
    var functionsInstance = null;

    function byId(id) { return document.getElementById(id); }

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
            '<p class="member-portal-admin-help">客人掃描後，以手機號碼＋出生年月日登入。</p>' +
            '<div class="member-portal-url">' + url.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") + '</div>';
        try {
            var qr = qrcode(0, "M");
            qr.addData(url);
            qr.make();
            byId("memberPortalQrBox").innerHTML = qr.createSvgTag(6, 4);
        } catch (error) {
            byId("memberPortalQrBox").textContent = "QR Code 產生失敗，請直接使用下方網址";
        }
    }

    function callSetBirthday(member) {
        var service = getFunctions();
        if (!service) return Promise.reject({ message: "Firebase Functions 尚未載入" });
        return service.httpsCallable("setMemberPortalBirthday")({
            actorName: actorName(),
            birthday: member.birthday,
            memberId: member.id,
            phone: member.phone
        });
    }

    function syncBirthdayCredential(member, options) {
        options = options || {};
        if (!member || !member.id) return Promise.reject(new Error("找不到會員"));
        if (!member.birthday) return Promise.reject(new Error("請先填寫會員生日"));
        if (window.MonsterMemberCloud && MonsterMemberCloud.forceSync) MonsterMemberCloud.forceSync();
        return new Promise(function (resolve) { setTimeout(resolve, Number(options.delay || 950)); })
            .then(function () { return callSetBirthday(member); })
            .catch(function (error) {
                var reason = error && error.details && error.details.reason;
                if (reason === "MEMBER_NOT_FOUND" && !options.retried) {
                    options.retried = true;
                    return new Promise(function (resolve) { setTimeout(resolve, 1800); })
                        .then(function () { return callSetBirthday(member); });
                }
                throw error;
            })
            .then(function (result) {
                if (!options.silent) alert("✅ 已啟用生日登入\n客人可用手機號碼＋出生年月日查詢");
                return result;
            })
            .catch(function (error) {
                if (!options.silent) {
                    var reason = error && error.details && error.details.reason;
                    var text = reason === "KIOSK_NOT_AUTHORIZED"
                        ? "請在已啟用 LINE Pay 的點餐機操作"
                        : (error.message || "啟用失敗，請確認網路後重試");
                    alert("❌ " + text);
                }
                throw error;
            });
    }

    function enableMemberBirthdayLogin(memberId) {
        var member = memberById(memberId);
        if (!member) { alert("❌ 找不到會員資料"); return; }
        if (!member.birthday) { alert("請先編輯會員並填寫出生年月日"); return; }
        if (!confirm("確定使用「" + member.name + "」的出生年月日啟用／重設會員查詢？")) return;
        syncBirthdayCredential(member, { silent: false }).catch(function () {});
    }

    function phoneDigits(value) {
        return String(value || "").replace(/\D/g, "");
    }

    function decorateMemberCards() {
        var cards = document.querySelectorAll("#memberManagerList .member-card");
        var i;
        for (i = 0; i < cards.length; i += 1) {
            if (cards[i].querySelector(".member-birthday-login-btn")) continue;
            var phoneBox = cards[i].querySelector(".member-card-phone");
            var actions = cards[i].querySelector(".member-card-actions");
            var phone = phoneDigits(phoneBox && phoneBox.textContent);
            var member = Array.isArray(window.memberData) ? window.memberData.find(function (item) {
                return item && phoneDigits(item.phone) === phone;
            }) : null;
            if (!actions || !member) continue;
            var button = document.createElement("button");
            button.type = "button";
            button.className = "member-birthday-login-btn";
            button.textContent = member.birthday ? "🔐 啟用／重設生日登入" : "⚠️ 先補生日才能查詢";
            button.disabled = !member.birthday;
            button.setAttribute("data-member-id", member.id);
            button.addEventListener("click", (function (memberId) {
                return function () { enableMemberBirthdayLogin(memberId); };
            }(member.id)));
            actions.appendChild(button);
        }
    }

    function enhanceMemberEditor() {
        var birthday = byId("memberEditBirthday");
        if (!birthday) return;
        birthday.required = true;
        var field = birthday.parentNode;
        var label = field && field.querySelector("label");
        if (label) label.textContent = "生日（會員手機查詢用） *";
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
        enableMemberBirthdayLogin: enableMemberBirthdayLogin,
        showQr: showQr,
        syncBirthdayCredential: syncBirthdayCredential,
        url: portalUrl
    };
    window.enableMemberBirthdayLogin = enableMemberBirthdayLogin;
    window.showMemberPortalQr = showQr;
}());
