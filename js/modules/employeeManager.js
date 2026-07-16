// =========================================
// 小怪獸售票機 V7.3 Phase 3E - Part 4
// Firebase／裝置相容員工管理後台
// =========================================
(function () {
    "use strict";

    var editingEmployeeId = null;
    var employees = [];
    var busy = false;

    function isAdmin() {
        return !!(window.MonsterRole && MonsterRole.isAdmin && MonsterRole.isAdmin());
    }

    function requireAdmin() {
        if (window.MonsterPermission && !MonsterPermission.requirePermission("employee.manage", "❌ 此功能僅限店長使用")) {
            return false;
        }
        return isAdmin();
    }

    function cloudMode() {
        return !!(window.MonsterFirebaseEmployees && MonsterFirebaseEmployees.available());
    }

    function escapeHtml(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalizeAccount(value) {
        return String(value || "").replace(/^\s+|\s+$/g, "").toLowerCase();
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function makeId() {
        return "staff_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
    }

    function formatDate(value) {
        if (!value) {
            return "尚未登入";
        }
        var date = new Date(typeof value === "number" ? value : value);
        if (isNaN(date.getTime())) {
            return "尚未登入";
        }
        return date.toLocaleString("zh-TW");
    }

    function setMessage(text, type) {
        var box = document.getElementById("employeeManagerMessage");
        if (!box) {
            return;
        }
        box.className = "employee-manager-message " + (type || "");
        box.textContent = text || "";
    }

    function setBusy(value) {
        busy = value === true;
        var page = document.getElementById("employeeManagerPage");
        if (page) {
            page.classList.toggle("is-busy", busy);
        }
    }

    function getEmployee(id) {
        var i;
        for (i = 0; i < employees.length; i += 1) {
            if ((employees[i].id || employees[i].uid) === id) {
                return employees[i];
            }
        }
        return null;
    }

    function accountExists(account, exceptId) {
        var normalized = normalizeAccount(account);
        return employees.some(function (row) {
            return (row.id || row.uid) !== exceptId && normalizeAccount(row.account) === normalized;
        });
    }

    function enabledAdminCount(list) {
        return list.filter(function (row) {
            return row.role === "admin" && row.enabled !== false;
        }).length;
    }

    function currentUser() {
        return window.MonsterRole ? MonsterRole.getCurrentUser() : null;
    }

    function renderMode() {
        var info = document.querySelector(".employee-toolbar-info");
        var migrateButton = document.getElementById("employeeMigrateButton");
        if (info) {
            info.textContent = cloudMode()
                ? "☁️ Firebase 跨裝置帳號｜只有店長可以管理"
                : "📱 裝置相容模式｜完成 Firebase 初始店長後即可遷移";
        }
        if (migrateButton) {
            migrateButton.style.display = cloudMode() && localStorage.getItem("monsterEmployeesV73") ? "" : "none";
        }
    }

    function renderEmployeeManager() {
        var listBox = document.getElementById("employeeManagerList");
        var current = currentUser();
        var html = "";
        var i;
        if (!listBox) {
            return;
        }
        renderMode();
        if (!employees.length) {
            listBox.innerHTML = '<div class="employee-empty">尚未建立員工帳號。</div>';
            return;
        }
        employees.sort(function (a, b) {
            if (a.role !== b.role) {
                return a.role === "admin" ? -1 : 1;
            }
            return String(a.name || "").localeCompare(String(b.name || ""));
        });
        for (i = 0; i < employees.length; i += 1) {
            var employee = employees[i];
            var id = employee.id || employee.uid;
            var selfMark = current && (current.id === id || current.uid === id)
                ? '<span class="employee-self-tag">目前登入</span>' : "";
            html += '<div class="employee-card ' + (employee.enabled === false ? 'is-disabled' : '') + '">' +
                '<div class="employee-card-main"><div class="employee-avatar">' + (employee.role === "admin" ? "👑" : "👤") + '</div>' +
                '<div class="employee-info"><div class="employee-name">' + escapeHtml(employee.name) + selfMark + '</div>' +
                '<div class="employee-account">帳號：' + escapeHtml(employee.account) + '</div>' +
                '<div class="employee-meta"><span class="employee-role role-' + escapeHtml(employee.role) + '">' + (employee.role === "admin" ? "店長" : "員工") + '</span>' +
                '<span class="employee-status ' + (employee.enabled === false ? 'status-off' : 'status-on') + '">' + (employee.enabled === false ? "已停用" : "啟用中") + '</span>' +
                '<span class="employee-provider">' + (cloudMode() ? "Firebase" : "裝置") + '</span></div>' +
                '<div class="employee-last-login">最後登入：' + escapeHtml(formatDate(employee.lastLogin)) + '</div></div></div>' +
                '<div class="employee-actions">' +
                '<button onclick="openEmployeeEditor(\'' + escapeHtml(id) + '\')">✏️ 修改</button>' +
                '<button onclick="openEmployeePasswordEditor(\'' + escapeHtml(id) + '\')">🔑 改密碼</button>' +
                '<button class="employee-toggle-btn" onclick="toggleEmployeeEnabled(\'' + escapeHtml(id) + '\')">' + (employee.enabled === false ? "✅ 啟用" : "⛔ 停用") + '</button>' +
                '<button class="employee-delete-btn" onclick="deleteEmployeeAccount(\'' + escapeHtml(id) + '\')">🗑️ 刪除</button>' +
                '</div></div>';
        }
        listBox.innerHTML = html;
    }

    function loadEmployees() {
        setBusy(true);
        setMessage("正在載入員工帳號…", "");
        var request = cloudMode()
            ? MonsterFirebaseEmployees.list()
            : Promise.resolve(MonsterRole.getEmployees());
        return request.then(function (list) {
            employees = list || [];
            renderEmployeeManager();
            setMessage(cloudMode() ? "已載入 Firebase 員工帳號" : "目前使用裝置相容帳號", "success");
        }).catch(function (error) {
            setMessage("❌ " + (error.message || "員工帳號載入失敗"), "error");
        }).then(function () {
            setBusy(false);
        });
    }

    function editorHtml(employee, passwordOnly) {
        var isEdit = !!employee;
        var role = employee ? employee.role : "staff";
        if (passwordOnly) {
            return '<div class="employee-editor-card"><div class="employee-editor-title">🔑 修改「' + escapeHtml(employee.name) + '」密碼</div>' +
                '<div class="employee-form-grid one-column"><label>新密碼<input id="employeeEditPassword" type="password" autocomplete="new-password" placeholder="Firebase 至少 6 碼"></label>' +
                '<label>再次輸入<input id="employeeEditPasswordConfirm" type="password" autocomplete="new-password" placeholder="再次輸入新密碼"></label></div>' +
                '<div class="employee-editor-actions"><button class="save" onclick="saveEmployeePassword()">儲存新密碼</button><button onclick="closeEmployeeEditor()">取消</button></div></div>';
        }
        return '<div class="employee-editor-card"><div class="employee-editor-title">' + (isEdit ? "✏️ 修改員工" : "➕ 新增員工") + '</div>' +
            '<div class="employee-form-grid"><label>姓名<input id="employeeEditName" type="text" maxlength="30" value="' + escapeHtml(employee ? employee.name : "") + '" placeholder="例如：王小明"></label>' +
            '<label>登入帳號<input id="employeeEditAccount" type="text" maxlength="30" autocomplete="off" value="' + escapeHtml(employee ? employee.account : "") + '" placeholder="英文字母或數字"></label>' +
            '<label>角色<select id="employeeEditRole"><option value="staff"' + (role === "staff" ? " selected" : "") + '>員工</option><option value="admin"' + (role === "admin" ? " selected" : "") + '>店長</option></select></label>' +
            '<label>狀態<select id="employeeEditEnabled"><option value="true"' + (!employee || employee.enabled !== false ? " selected" : "") + '>啟用</option><option value="false"' + (employee && employee.enabled === false ? " selected" : "") + '>停用</option></select></label>' +
            (!isEdit ? '<label class="full-row">初始密碼<input id="employeeEditPassword" type="password" autocomplete="new-password" placeholder="Firebase 至少 6 碼"></label>' : "") +
            '</div><div id="employeeAccountCheck" class="employee-account-check"></div>' +
            '<div class="employee-editor-actions"><button class="save" onclick="saveEmployeeEditor()">儲存</button><button onclick="closeEmployeeEditor()">取消</button></div></div>';
    }

    window.openEmployeeManager = function () {
        if (!requireAdmin()) {
            return;
        }
        window.closeEmployeeEditor();
        showPage("employeeManagerPage");
        loadEmployees();
    };

    window.openEmployeeEditor = function (id) {
        if (!requireAdmin() || busy) {
            return;
        }
        var employee = id ? getEmployee(id) : null;
        if (id && !employee) {
            alert("❌ 找不到此員工帳號");
            return;
        }
        editingEmployeeId = id || null;
        var panel = document.getElementById("employeeEditorPanel");
        panel.innerHTML = editorHtml(employee, false);
        panel.style.display = "block";
        setMessage("", "");
        var accountInput = document.getElementById("employeeEditAccount");
        accountInput.oninput = function () {
            var result = document.getElementById("employeeAccountCheck");
            var account = normalizeAccount(accountInput.value);
            result.className = "employee-account-check " + (account && accountExists(account, editingEmployeeId) ? "invalid" : "valid");
            result.textContent = !account ? "" : (accountExists(account, editingEmployeeId) ? "❌ 帳號已存在" : "✅ 帳號可使用");
        };
        document.getElementById("employeeEditName").focus();
    };

    window.openEmployeePasswordEditor = function (id) {
        if (!requireAdmin() || busy) {
            return;
        }
        var employee = getEmployee(id);
        if (!employee) {
            alert("❌ 找不到此員工帳號");
            return;
        }
        editingEmployeeId = id;
        var panel = document.getElementById("employeeEditorPanel");
        panel.innerHTML = editorHtml(employee, true);
        panel.style.display = "block";
        document.getElementById("employeeEditPassword").focus();
    };

    window.closeEmployeeEditor = function () {
        editingEmployeeId = null;
        var panel = document.getElementById("employeeEditorPanel");
        if (panel) {
            panel.innerHTML = "";
            panel.style.display = "none";
        }
    };

    function saveLocalEmployee(data) {
        var list = MonsterRole.getEmployees();
        var current = currentUser();
        var employee = editingEmployeeId ? getEmployee(editingEmployeeId) : null;
        if (employee) {
            if (current && current.id === employee.id && (data.role !== "admin" || !data.enabled)) {
                throw new Error("目前登入的店長不能停用自己或把自己改成員工");
            }
            if (employee.role === "admin" && employee.enabled !== false && (data.role !== "admin" || !data.enabled) && enabledAdminCount(list) <= 1) {
                throw new Error("系統至少必須保留一位啟用中的店長");
            }
            Object.keys(data).forEach(function (key) { employee[key] = data[key]; });
            employee.updatedAt = nowIso();
        } else {
            data.id = makeId();
            data.createdAt = nowIso();
            data.updatedAt = data.createdAt;
            data.lastLogin = null;
            list.push(data);
        }
        MonsterRole.saveEmployees(list);
    }

    window.saveEmployeeEditor = function () {
        if (!requireAdmin() || busy) {
            return;
        }
        var data = {
            uid: editingEmployeeId || "",
            name: document.getElementById("employeeEditName").value.replace(/^\s+|\s+$/g, ""),
            account: normalizeAccount(document.getElementById("employeeEditAccount").value),
            role: document.getElementById("employeeEditRole").value,
            enabled: document.getElementById("employeeEditEnabled").value === "true"
        };
        var passwordInput = document.getElementById("employeeEditPassword");
        if (passwordInput) {
            data.password = passwordInput.value;
        }
        if (!data.name || !/^[a-z0-9._-]{3,30}$/.test(data.account)) {
            alert("❌ 請輸入姓名與正確帳號");
            return;
        }
        if (accountExists(data.account, editingEmployeeId)) {
            alert("❌ 此登入帳號已存在");
            return;
        }
        if (!editingEmployeeId && data.password.length < (cloudMode() ? 6 : 4)) {
            alert(cloudMode() ? "❌ Firebase 密碼至少需要 6 碼" : "❌ 初始密碼至少需要 4 碼");
            return;
        }

        var wasEditing = !!editingEmployeeId;
        setBusy(true);
        var request;
        if (cloudMode()) {
            request = wasEditing ? MonsterFirebaseEmployees.update(data) : MonsterFirebaseEmployees.create(data);
        } else {
            request = Promise.resolve().then(function () { saveLocalEmployee(data); });
        }
        request.then(function () {
            window.closeEmployeeEditor();
            setMessage(wasEditing ? "員工資料已更新" : "員工帳號已新增", "success");
            return loadEmployees();
        }).catch(function (error) {
            setMessage("❌ " + (error.message || "員工資料儲存失敗"), "error");
            setBusy(false);
        });
    };

    window.saveEmployeePassword = function () {
        var password = document.getElementById("employeeEditPassword").value;
        var confirmPassword = document.getElementById("employeeEditPasswordConfirm").value;
        if (password.length < (cloudMode() ? 6 : 4)) {
            alert(cloudMode() ? "❌ Firebase 密碼至少需要 6 碼" : "❌ 新密碼至少需要 4 碼");
            return;
        }
        if (password !== confirmPassword) {
            alert("❌ 兩次輸入的密碼不一致");
            return;
        }
        setBusy(true);
        var request;
        if (cloudMode()) {
            request = MonsterFirebaseEmployees.resetPassword(editingEmployeeId, password);
        } else {
            request = Promise.resolve().then(function () {
                var list = MonsterRole.getEmployees();
                var row = list.find(function (item) { return item.id === editingEmployeeId; });
                if (!row) { throw new Error("找不到員工帳號"); }
                row.password = password;
                row.updatedAt = nowIso();
                MonsterRole.saveEmployees(list);
            });
        }
        request.then(function () {
            window.closeEmployeeEditor();
            setMessage("密碼已修改", "success");
            return loadEmployees();
        }).catch(function (error) {
            setMessage("❌ " + (error.message || "密碼修改失敗"), "error");
            setBusy(false);
        });
    };

    window.toggleEmployeeEnabled = function (id) {
        var employee = getEmployee(id);
        if (!employee || busy) { return; }
        var enabled = employee.enabled === false;
        var current = currentUser();
        if (current && (current.id === id || current.uid === id)) {
            alert("❌ 不能停用目前登入中的帳號");
            return;
        }
        setBusy(true);
        var request = cloudMode()
            ? MonsterFirebaseEmployees.setEnabled(id, enabled)
            : Promise.resolve().then(function () {
                var list = MonsterRole.getEmployees();
                var row = list.find(function (item) { return item.id === id; });
                if (!row) { throw new Error("找不到員工帳號"); }
                if (row.role === "admin" && row.enabled !== false && enabledAdminCount(list) <= 1) {
                    throw new Error("系統至少必須保留一位啟用中的店長");
                }
                row.enabled = enabled;
                MonsterRole.saveEmployees(list);
            });
        request.then(loadEmployees).catch(function (error) {
            setMessage("❌ " + (error.message || "帳號狀態更新失敗"), "error");
            setBusy(false);
        });
    };

    window.deleteEmployeeAccount = function (id) {
        var employee = getEmployee(id);
        var current = currentUser();
        if (!employee || busy) { return; }
        if (current && (current.id === id || current.uid === id)) {
            alert("❌ 不能刪除目前登入中的帳號");
            return;
        }
        if (!confirm("確定要刪除員工「" + employee.name + "」嗎？\n刪除後無法復原。")) {
            return;
        }
        setBusy(true);
        var request = cloudMode()
            ? MonsterFirebaseEmployees.remove(id)
            : Promise.resolve().then(function () {
                var list = MonsterRole.getEmployees();
                if (employee.role === "admin" && employee.enabled !== false && enabledAdminCount(list) <= 1) {
                    throw new Error("系統至少必須保留一位啟用中的店長");
                }
                MonsterRole.saveEmployees(list.filter(function (item) { return item.id !== id; }));
            });
        request.then(function () {
            window.closeEmployeeEditor();
            return loadEmployees();
        }).catch(function (error) {
            setMessage("❌ " + (error.message || "員工帳號刪除失敗"), "error");
            setBusy(false);
        });
    };

    window.migrateLegacyEmployeesToFirebase = function () {
        if (!cloudMode() || busy) {
            alert("請先用 Firebase 店長帳號登入");
            return;
        }
        var legacy = MonsterRole.getEmployees();
        var shortPassword = legacy.some(function (row) { return String(row.password || "").length < 6; });
        var temporaryPassword = "";
        if (shortPassword) {
            temporaryPassword = prompt("舊版密碼不足 Firebase 規定的 6 碼。\n請設定這些帳號的統一臨時密碼（至少 6 碼）：") || "";
            if (temporaryPassword.length < 6) {
                alert("已取消遷移；臨時密碼至少需要 6 碼");
                return;
            }
        }
        var payload = legacy.map(function (row) {
            return {
                account: row.account,
                name: row.name,
                role: row.role,
                enabled: row.enabled !== false,
                password: String(row.password || "").length >= 6 ? row.password : temporaryPassword
            };
        });
        if (!confirm("即將把 " + payload.length + " 個裝置帳號遷移到 Firebase。\n已存在的帳號會自動略過，確定繼續？")) {
            return;
        }
        setBusy(true);
        MonsterFirebaseEmployees.migrate(payload).then(function (data) {
            var results = data && data.results ? data.results : [];
            var created = results.filter(function (row) { return row.status === "created"; }).length;
            var skipped = results.filter(function (row) { return row.status === "skipped"; }).length;
            var failed = results.filter(function (row) { return row.status === "failed"; }).length;
            localStorage.setItem("monsterFirebaseMigrationComplete", "1");
            setMessage("遷移完成：新增 " + created + "、略過 " + skipped + "、失敗 " + failed, failed ? "error" : "success");
            return loadEmployees();
        }).catch(function (error) {
            setMessage("❌ " + (error.message || "帳號遷移失敗"), "error");
            setBusy(false);
        });
    };

    document.addEventListener("DOMContentLoaded", renderMode);
}());
