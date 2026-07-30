// V7.8.3.3 FIX24 | complete fallback catalog is ready synchronously
// Preserved FIX17 behavior: custom ticket images are preloaded before replacing
// the fallback images. FIX24 never lets image warming route the page.
// =========================================
// 小怪獸售票機 V6.3.1
// 動態票券目錄
// =========================================
var ticketCatalogRenderToken = 0;
var ticketCatalogReady = true;
var ticketCatalogReadyPromise = Promise.resolve(true);
var ticketCatalogWarmPromise = Promise.resolve(true);
var TICKET_IMAGE_FALLBACK = "images/ticket-bg.webp";
var TICKET_IMAGE_WAIT_MS = 8000;

var ticketCategoryMap = {
    general: "ticketGeneralGrid",
    special: "ticketSpecialGrid",
    other: "ticketOtherGrid"
};

function isTicketVisibleByBusinessMode(id, ticket) {
    if (!ticket || ticket.enable === false) {
        return false;
    }
    var activeMode = (window.MonsterBusinessMode && MonsterBusinessMode.getCurrentMode)
        ? MonsterBusinessMode.getCurrentMode()
        : ((window.businessMode && businessMode.mode) || "weekday");

    // 新版票券可直接指定可販售模式；未設定則沿用舊票券相容規則。
    if (Array.isArray(ticket.allowedBusinessModes) && ticket.allowedBusinessModes.length) {
        return ticket.allowedBusinessModes.indexOf(activeMode) >= 0;
    }
    if (activeMode === "closed") {
        // 公休時只保留非入場商品，例如代幣、襪子、行動電源。
        return ticket.canEnter === false ||
            ticket.admissionEnabled === false ||
            ticket.timeMode === "none";
    }
    switch (activeMode) {
        case "weekday":
            return id !== "summer";
        case "holiday":
            return id !== "early" && id !== "summer";
        case "summer":
            return id !== "early";
        default:
            return true;
    }
}

function createTicketCard(id, ticket, status, readyImageSrc) {
    var imageSrc = readyImageSrc || resolveTicketImageSrc(ticket.image);
    status = status || { available: true, display: "normal", label: "可購買" };
    var cls = status.available ? "" : " ticket-sale-disabled ticket-sale-" + status.display;
    var badge = status.available
        ? ""
        : '<div class="ticket-sale-status">' + status.label + "</div>";
    if (
        status.available &&
        status.rule &&
        status.rule.showCountdown &&
        status.remainingMinutes !== null
    ) {
        badge += '<div class="ticket-sale-countdown">剩餘 ' +
            MonsterSaleRule.formatCountdown(status.remainingMinutes) +
            "</div>";
    }
    if (
        status.available &&
        status.remaining !== null &&
        status.remaining !== undefined
    ) {
        badge += '<div class="ticket-sale-limit">今日剩 ' +
            status.remaining +
            " 張</div>";
    }
    return "\n\n<div class=\"ticket-item" + cls +
        "\" data-ticket-id=\"" + id +
        "\" data-sale-available=\"" + (status.available ? "1" : "0") +
        "\" data-sale-message=\"" +
        String(status.label || "").replace(/\"/g, "&quot;") +
        "\">\n<img src=\"" + imageSrc +
        "\" class=\"ticket-btn\" data-id=\"" + id +
        "\" alt=\"" + (ticket.title || "票券") +
        "\" decoding=\"sync\">\n<div class=\"ticket-price\" id=\"price-" +
        id + "\">NT$" + Number(ticket.price || 0) +
        "</div>" + badge + "\n</div>\n";
}

function preloadTicketImage(src) {
    return new Promise(function (resolve) {
        var image = new Image();
        var finished = false;
        var timer = setTimeout(function () {
            if (finished) return;
            finished = true;
            image.onload = null;
            image.onerror = null;
            resolve({ src: src, ready: false });
        }, TICKET_IMAGE_WAIT_MS);

        function finish(ready) {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            image.onload = null;
            image.onerror = null;
            resolve({ src: src, ready: ready });
        }

        image.onload = function () { finish(true); };
        image.onerror = function () { finish(false); };
        image.src = src;
        if (image.complete && Number(image.naturalWidth || 0) > 0) {
            finish(true);
        }
    });
}

function collectVisibleTicketEntries() {
    var entries = [];
    var orderedTicketIds = (typeof getSortedTicketIds === "function")
        ? getSortedTicketIds()
        : Object.keys(ticketData || {}).sort(function (a, b) {
            return Number(ticketData[a].sortOrder || 0) -
                Number(ticketData[b].sortOrder || 0);
        });
    orderedTicketIds.forEach(function (id) {
        var ticket = ticketData[id];
        var saleStatus;
        var category;
        if (!isTicketVisibleByBusinessMode(id, ticket)) return;
        saleStatus = window.MonsterSaleRule
            ? MonsterSaleRule.evaluate(id, ticket)
            : { available: true, display: "normal", label: "可購買" };
        if (!saleStatus.available && saleStatus.display === "hidden") return;
        category = ticket.category || "other";
        entries.push({
            id: id,
            ticket: ticket,
            status: saleStatus,
            containerId: ticketCategoryMap[category] || ticketCategoryMap.other,
            imageSrc: resolveTicketImageSrc(ticket.image)
        });
    });
    return entries;
}

function commitTicketCatalog(entries, readyImages) {
    var htmlByContainer = {};
    Object.keys(ticketCategoryMap).forEach(function (category) {
        htmlByContainer[ticketCategoryMap[category]] = "";
    });
    entries.forEach(function (entry) {
        var imageSrc = readyImages[entry.imageSrc]
            ? entry.imageSrc
            : TICKET_IMAGE_FALLBACK;
        htmlByContainer[entry.containerId] += createTicketCard(
            entry.id,
            entry.ticket,
            entry.status,
            imageSrc
        );
    });
    Object.keys(htmlByContainer).forEach(function (containerId) {
        var container = document.getElementById(containerId);
        if (container) container.innerHTML = htmlByContainer[containerId];
    });
    updateEmptyTicketCategories();
}

function renderTicketCatalog() {
    var renderToken = ++ticketCatalogRenderToken;
    var entries = collectVisibleTicketEntries();
    var uniqueSources = {};
    var sources;
    // Commit every card with a local fallback immediately. The ticket page is
    // now complete and responsive even if Firebase or a custom PNG is slow.
    commitTicketCatalog(entries, {});
    ticketCatalogReady = true;
    ticketCatalogReadyPromise = Promise.resolve(true);
    if (typeof CustomEvent === "function") {
        document.dispatchEvent(new CustomEvent("monster:ticket-catalog-ready"));
    }
    entries.forEach(function (entry) {
        uniqueSources[entry.imageSrc] = true;
    });
    uniqueSources[TICKET_IMAGE_FALLBACK] = true;
    sources = Object.keys(uniqueSources);
    ticketCatalogWarmPromise = Promise.all(
        sources.map(preloadTicketImage)
    ).then(function (results) {
        var readyImages = {};
        if (renderToken !== ticketCatalogRenderToken) return false;
        results.forEach(function (result) {
            readyImages[result.src] = !!result.ready;
        });
        commitTicketCatalog(entries, readyImages);
        if (typeof CustomEvent === "function") {
            document.dispatchEvent(new CustomEvent("monster:ticket-images-ready"));
        }
        return true;
    }).catch(function () {
        // The synchronously committed fallback catalog remains usable.
        return false;
    });
    return ticketCatalogWarmPromise;
}

function whenTicketCatalogReady() {
    return ticketCatalogReadyPromise;
}

function updateEmptyTicketCategories() {
    document
        .querySelectorAll(".ticket-category-section")
        .forEach(function (section) {
        var grid = section.querySelector(".ticket-grid");
        section.style.display =
            grid && grid.children.length > 0
                ? ""
                : "none";
    });
}

window.MonsterTicketCatalog = {
    version: "fix24",
    render: renderTicketCatalog,
    whenReady: whenTicketCatalogReady,
    whenImagesReady: function () { return ticketCatalogWarmPromise; },
    isReady: function () { return ticketCatalogReady; }
};
