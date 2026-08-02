// 小怪獸放電所 V7.8.3.3 FIX27｜會員手機＋生日自助查詢
(function () {
    "use strict";

    var REGION = "asia-east1";
    var loginBox = document.getElementById("memberPortalLogin");
    var dashboard = document.getElementById("memberPortalDashboard");
    var form = document.getElementById("memberPortalForm");
    var submit = document.getElementById("memberPortalSubmit");
    var message = document.getElementById("memberPortalMessage");
    var callable = null;

    function esc(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function money(value) {
        return Number(value || 0).toLocaleString("zh-TW");
    }

    function each(selector, callback) {
        var list = document.querySelectorAll(selector);
        var i;
        for (i = 0; i < list.length; i += 1) callback(list[i], i);
    }

    function setMessage(text, type) {
        message.className = "portal-message " + (type || "");
        message.textContent = text || "";
    }

    function initialize() {
        if (!window.firebase || !window.MONSTER_FIREBASE_CONFIG) {
            setMessage("查詢服務載入失敗，請稍後重試", "error");
            return false;
        }
        try {
            if (!firebase.apps.length) firebase.initializeApp(window.MONSTER_FIREBASE_CONFIG);
            callable = firebase.app().functions(REGION).httpsCallable("memberPortalLogin");
            return true;
        } catch (error) {
            setMessage("查詢服務目前無法連線，請稍後重試", "error");
            return false;
        }
    }

    function itemText(items) {
        if (!Array.isArray(items) || !items.length) return "票券";
        return items.map(function (item) {
            return esc(item.title || "票券") + " × " + Number(item.quantity || 1);
        }).join("<br>");
    }

    function renderOrders(orders) {
        var box = document.getElementById("memberPortalOrders");
        if (!Array.isArray(orders) || !orders.length) {
            box.innerHTML = '<div class="portal-empty">目前沒有消費紀錄</div>';
            return;
        }
        box.innerHTML = orders.map(function (order) {
            var cancelled = order.status === "cancel";
            return '<article class="portal-order ' + (cancelled ? "cancelled" : "") + '">' +
                '<div class="portal-order-head"><div><strong>' + esc(order.date || "") + " " + esc(order.time || "") +
                '</strong><div class="portal-order-meta">' + esc(order.orderNo || "") + '</div></div><span>' +
                esc(cancelled ? "已作廢" : (order.payment || "")) + '</span></div>' +
                '<div class="portal-order-items">' + itemText(order.items) + '</div>' +
                '<div class="portal-order-total"><span>' +
                (Number(order.usedPoints || 0) ? ("使用 " + Number(order.usedPoints) + " 點") : "本次消費") +
                '</span><b>NT$' + money(order.paidAmount) + '</b></div></article>';
        }).join("");
    }

    function renderLedger(targetId, rows, emptyText) {
        var box = document.getElementById(targetId);
        if (!Array.isArray(rows) || !rows.length) {
            box.innerHTML = '<div class="portal-empty">' + esc(emptyText) + '</div>';
            return;
        }
        box.innerHTML = rows.map(function (row) {
            var amount = Number(row.amount || 0);
            return '<article class="portal-ledger-row"><div class="portal-ledger-main"><strong>' +
                esc(row.reason || "點數調整") + '</strong><span>' + esc(row.date || "") +
                (row.orderNo ? ("・" + esc(row.orderNo)) : "") + '</span></div><div class="portal-ledger-amount ' +
                (amount >= 0 ? "plus" : "minus") + '">' + (amount >= 0 ? "+" : "") + amount +
                '<small>餘額 ' + Number(row.balance || 0) + '</small></div></article>';
        }).join("");
    }

    function renderDashboard(payload) {
        var member = payload.member || {};
        document.getElementById("memberPortalName").textContent = member.name || "會員";
        document.getElementById("memberPortalMeta").textContent =
            (member.memberNo || "") + "｜" + (member.phone || "") + "｜" + (member.level || "一般會員");
        document.getElementById("memberPortalSummary").innerHTML =
            '<div class="portal-summary-card points"><span>消費點數</span><strong>' + Number(member.points || 0) + ' 點</strong></div>' +
            '<div class="portal-summary-card toys"><span>玩具點數</span><strong>' + Number(member.toyPoints || 0) + ' 點</strong></div>' +
            '<div class="portal-summary-card"><span>累積消費</span><strong>NT$' + money(member.totalSpend) + '</strong></div>';
        renderOrders(payload.orders || []);
        renderLedger("memberPortalPoints", member.pointHistory || [], "目前沒有消費點數紀錄");
        renderLedger("memberPortalToys", member.toyPointHistory || [], "目前沒有玩具點數紀錄");
        document.getElementById("memberPortalRetrieved").textContent =
            "查詢時間：" + new Date(Number(payload.retrievedAt || Date.now())).toLocaleString("zh-TW");
        loginBox.hidden = true;
        dashboard.hidden = false;
        window.scrollTo(0, 0);
    }

    function errorMessage(error) {
        var reason = error && error.details && error.details.reason;
        if (reason === "ACCOUNT_TEMPORARILY_LOCKED" || reason === "TOO_MANY_ATTEMPTS") {
            return error.message || "嘗試次數過多，請稍後再試";
        }
        if (reason === "MEMBER_BIRTHDAY_INVALID" || reason === "BIRTHDAY_CREDENTIAL_STALE") {
            return error.message || "請洽工作人員確認生日資料";
        }
        if (reason === "INVALID_MEMBER_LOGIN") {
            return "手機號碼或出生年月日不正確，或尚未啟用查詢";
        }
        return "目前無法查詢，請確認資料或稍後再試";
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        var phone = document.getElementById("memberPortalPhone").value;
        var birthday = document.getElementById("memberPortalBirthday").value;
        if (!phone.trim() || !birthday) {
            setMessage("請輸入手機號碼與出生年月日", "error");
            return;
        }
        if (!callable && !initialize()) return;
        submit.disabled = true;
        setMessage("正在安全查詢會員資料…", "loading");
        callable({ phone: phone, birthday: birthday }).then(function (result) {
            setMessage("", "");
            renderDashboard(result.data || {});
        }).catch(function (error) {
            setMessage(errorMessage(error), "error");
        }).then(function () {
            submit.disabled = false;
        });
    });

    document.getElementById("memberPortalLogout").addEventListener("click", function () {
        dashboard.hidden = true;
        loginBox.hidden = false;
        form.reset();
        setMessage("", "");
        window.scrollTo(0, 0);
    });

    each("[data-portal-tab]", function (button) {
        button.addEventListener("click", function () {
            var tab = button.getAttribute("data-portal-tab");
            each("[data-portal-tab]", function (item) {
                item.classList.toggle("active", item === button);
            });
            each(".portal-panel", function (panel) {
                panel.classList.remove("active");
            });
            document.getElementById(
                tab === "points" ? "memberPortalPoints" : (tab === "toys" ? "memberPortalToys" : "memberPortalOrders")
            ).classList.add("active");
        });
    });

    initialize();
}());
