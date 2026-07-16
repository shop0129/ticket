// =========================================
// 小怪獸售票機 V7.3 Phase 3E - Part 2
// 員工管理後台（Android WebView 61 / ES5 相容）
// =========================================
(function () {
    "use strict";

    var editingEmployeeId = null;

    function roleApiReady() {
        return !!(window.MonsterRole && MonsterRole.getEmployees && MonsterRole.saveEmployees);
    }

    function isAdmin() {
        return roleApiReady() && MonsterRole.isAdmin();
    }

    function requireAdmin() {
        if (!isAdmin()) {
            alert("❌ 此功能僅限店長使用");
            if (window.showPage) {
                showPage("adminHomePage");
            }
            return false;
        }
        return true;
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

    function makeId() {
        return "staff_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function formatDate(value) {
        var date;
        if (!value) {
            return "尚未登入";
        }
        date = new Date(value);
        if (isNaN(date.getTime())) {
            return "尚未登入";
        }
        return date.getFullYear() + "/" +
            ("0" + (date.getMonth() + 1)).slice(-2) + "/" +
            ("0" + date.getDate()).slice(-2) + " " +
            ("0" + date.getHours()).slice(-2) + ":" +
            ("0" + date.getMinutes()).slice(-2);
    }

    function setMessage(text, type) {
        var box = document.getElementById("employeeManagerMessage");
        if (!box) {
            return;
        }
        box.className = "employee-manager-message " + (type || "");
        box.textContent = text || "";
    }

    function getEmployee(id) {
        var list = MonsterRole.getEmployees();
        var i;
        for (i = 0; i < list.length; i += 1) {
            if (list[i].id === id) {
                return list[i];
            }
        }
        return null;
    }

    function accountExists(account, exceptId) {
        var normalized = normalizeAccount(account);
        var list = MonsterRole.getEmployees();
        var i;
        for (i = 0; i < list.length; i += 1) {
            if (list[i].id !== exceptId && normalizeAccount(list[i].account) === normalized) {
                return true;
            }
        }
        return false;
    }

    function enabledAdminCount(list) {
        var count = 0;
        var i;
        for (i = 0; i < list.length; i += 1) {
            if (list[i].role === "admin" && list[i].enabled !== false) {
                count += 1;
            }
        }
        return count;
    }

    function renderEmployeeManager() {
        var listBox = document.getElementById("employeeManagerList");
        var list;
        var current;
        var html = "";
        var i;
        var employee;
        var roleText;
        var statusText;
        var selfMark;
        if (!listBox || !roleApiReady()) {
            return;
        }
        if (!isAdmin()) {
            listBox.innerHTML = '<div class="employee-empty">此功能僅限店長使用。</div>';
            return;
        }
        list = MonsterRole.getEmployees();
        current = MonsterRole.getCurrentUser();
        list.sort(function (a, b) {
            if (a.role !== b.role) {
                return a.role === "admin" ? -1 : 1;
            }
            return String(a.name || "").localeCompare(String(b.name || ""));
        });
        if (!list.length) {
            listBox.innerHTML = '<div class="employee-empty">尚未建立員工帳號。</div>';
            return;
        }
        for (i = 0; i < list.length; i += 1) {
            employee = list[i];
            roleText = employee.role === "admin" ? "店長" : "員工";
            statusText = employee.enabled === false ? "已停用" : "啟用中";
            selfMark = current && current.id === employee.id ? '<span class="employee-self-tag">目前登入</span>' : "";
            html += '<div class="employee-card ' + (employee.enabled === false ? 'is-disabled' : '') + '">' +
                '<div class="employee-card-main">' +
                    '<div class="employee-avatar">' + (employee.role === "admin" ? "👑" : "👤") + '</div>' +
                    '<div class="employee-info">' +
                        '<div class="employee-name">' + escapeHtml(employee.name) + selfMark + '</div>' +
                        '<div class="employee-account">帳號：' + escapeHtml(employee.account) + '</div>' +
                        '<div class="employee-meta">' +
                            '<span class="employee-role role-' + escapeHtml(employee.role) + '">' + roleText + '</span>' +
                            '<span class="employee-status ' + (employee.enabled === false ? 'status-off' : 'status-on') + '">' + statusText + '</span>' +
                        '</div>' +
                        '<div class="employee-last-login">最後登入：' + escapeHtml(formatDate(employee.lastLogin)) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="employee-actions">' +
                    '<button onclick="openEmployeeEditor(\'' + escapeHtml(employee.id) + '\')">✏️ 修改</button>' +
                    '<button onclick="openEmployeePasswordEditor(\'' + escapeHtml(employee.id) + '\')">🔑 改密碼</button>' +
                    '<button class="employee-toggle-btn" onclick="toggleEmployeeEnabled(\'' + escapeHtml(employee.id) + '\')">' + (employee.enabled === false ? '✅ 啟用' : '⛔ 停用') + '</button>' +
                    '<button class="employee-delete-btn" onclick="deleteEmployeeAccount(\'' + escapeHtml(employee.id) + '\')">🗑️ 刪除</button>' +
                '</div>' +
            '</div>';
        }
        listBox.innerHTML = html;
    }

    function editorHtml(employee, passwordOnly) {
        var isEdit = !!employee;
        var role = employee ? employee.role : "staff";
        if (passwordOnly) {
            return '<div class="employee-editor-card">' +
                '<div class="employee-editor-title">🔑 修改「' + escapeHtml(employee.name) + '」密碼</div>' +
                '<div class="employee-form-grid one-column">' +
                    '<label>新密碼<input id="employeeEditPassword" type="password" autocomplete="new-password" placeholder="至少 4 碼"></label>' +
                    '<label>再次輸入<input id="employeeEditPasswordConfirm" type="password" autocomplete="new-password" placeholder="再次輸入新密碼"></label>' +
                '</div>' +
                '<div class="employee-editor-actions"><button class="save" onclick="saveEmployeePassword()">儲存新密碼</button><button onclick="closeEmployeeEditor()">取消</button></div>' +
            '</div>';
        }
        return '<div class="employee-editor-card">' +
            '<div class="employee-editor-title">' + (isEdit ? '✏️ 修改員工' : '➕ 新增員工') + '</div>' +
            '<div class="employee-form-grid">' +
                '<label>姓名<input id="employeeEditName" type="text" maxlength="30" value="' + escapeHtml(employee ? employee.name : "") + '" placeholder="例如：王小明"></label>' +
                '<label>登入帳號<input id="employeeEditAccount" type="text" maxlength="30" autocomplete="off" value="' + escapeHtml(employee ? employee.account : "") + '" placeholder="英文字母或數字"></label>' +
                '<label>角色<select id="employeeEditRole"><option value="staff"' + (role === "staff" ? ' selected' : '') + '>員工</option><option value="admin"' + (role === "admin" ? ' selected' : '') + '>店長</option></select></label>' +
                '<label>狀態<select id="employeeEditEnabled"><option value="true"' + (!employee || employee.enabled !== false ? ' selected' : '') + '>啟用</option><option value="false"' + (employee && employee.enabled === false ? ' selected' : '') + '>停用</option></select></label>' +
                (!isEdit ? '<label class="full-row">初始密碼<input id="employeeEditPassword" type="password" autocomplete="new-password" placeholder="至少 4 碼"></label>' : '') +
            '</div>' +
            '<div id="employeeAccountCheck" class="employee-account-check"></div>' +
            '<div class="employee-editor-actions"><button class="save" onclick="saveEmployeeEditor()">儲存</button><button onclick="closeEmployeeEditor()">取消</button></div>' +
        '</div>';
    }

    window.openEmployeeManager = function () {
        if (!requireAdmin()) {
            return;
        }
        closeEmployeeEditor();
        renderEmployeeManager();
        showPage("employeeManagerPage");
    };

    window.openEmployeeEditor = function (id) {
        var panel;
        var employee = null;
        if (!requireAdmin()) {
            return;
        }
        if (id) {
            employee = getEmployee(id);
            if (!employee) {
                alert("❌ 找不到此員工帳號");
                return;
            }
        }
        editingEmployeeId = id || null;
        panel = document.getElementById("employeeEditorPanel");
        panel.innerHTML = editorHtml(employee, false);
        panel.style.display = "block";
        setMessage("", "");
        setTimeout(function () {
            var input = document.getElementById("employeeEditName");
            var accountInput = document.getElementById("employeeEditAccount");
            if (input) { input.focus(); }
            if (accountInput) {
                accountInput.oninput = function () {
                    var result = document.getElementById("employeeAccountCheck");
                    var account = normalizeAccount(accountInput.value);
                    if (!account) {
                        result.textContent = "";
                    } else if (accountExists(account, editingEmployeeId)) {
                        result.className = "employee-account-check invalid";
                        result.textContent = "❌ 帳號已存在";
                    } else {
                        result.className = "employee-account-check valid";
                        result.textContent = "✅ 帳號可使用";
                    }
                };
            }
        }, 0);
    };

    window.openEmployeePasswordEditor = function (id) {
        var panel;
        var employee;
        if (!requireAdmin()) {
            return;
        }
        employee = getEmployee(id);
        if (!employee) {
            alert("❌ 找不到此員工帳號");
            return;
        }
        editingEmployeeId = id;
        panel = document.getElementById("employeeEditorPanel");
        panel.innerHTML = editorHtml(employee, true);
        panel.style.display = "block";
        setMessage("", "");
        setTimeout(function () {
            var input = document.getElementById("employeeEditPassword");
            if (input) { input.focus(); }
        }, 0);
    };

    window.closeEmployeeEditor = function () {
        var panel = document.getElementById("employeeEditorPanel");
        editingEmployeeId = null;
        if (panel) {
            panel.innerHTML = "";
            panel.style.display = "none";
        }
    };

    window.saveEmployeeEditor = function () {
        var list;
        var current;
        var employee;
        var name;
        var account;
        var role;
        var enabled;
        var passwordInput;
        var password;
        var i;
        if (!requireAdmin()) {
            return;
        }
        name = document.getElementById("employeeEditName").value.replace(/^\s+|\s+$/g, "");
        account = normalizeAccount(document.getElementById("employeeEditAccount").value);
        role = document.getElementById("employeeEditRole").value;
        enabled = document.getElementById("employeeEditEnabled").value === "true";
        passwordInput = document.getElementById("employeeEditPassword");
        password = passwordInput ? passwordInput.value : "";
        if (!name || !account) {
            alert("❌ 姓名與登入帳號不可空白");
            return;
        }
        if (!/^[a-z0-9._-]{3,30}$/.test(account)) {
            alert("❌ 帳號請使用 3～30 碼英文字母、數字、點、底線或減號");
            return;
        }
        if (accountExists(account, editingEmployeeId)) {
            alert("❌ 此登入帳號已存在");
            return;
        }
        if (!editingEmployeeId && password.length < 4) {
            alert("❌ 初始密碼至少需要 4 碼");
            return;
        }
        list = MonsterRole.getEmployees();
        current = MonsterRole.getCurrentUser();
        if (editingEmployeeId) {
            employee = null;
            for (i = 0; i < list.length; i += 1) {
                if (list[i].id === editingEmployeeId) {
                    employee = list[i];
                    break;
                }
            }
            if (!employee) {
                alert("❌ 找不到此員工帳號");
                return;
            }
            if (current && current.id === employee.id && (!enabled || role !== "admin")) {
                alert("❌ 目前登入的店長不能停用自己或把自己改成員工");
                return;
            }
            if (employee.role === "admin" && employee.enabled !== false && (role !== "admin" || !enabled) && enabledAdminCount(list) <= 1) {
                alert("❌ 系統至少必須保留一位啟用中的店長");
                return;
            }
            employee.name = name;
            employee.account = account;
            employee.role = role;
            employee.enabled = enabled;
            employee.updatedAt = nowIso();
        } else {
            list.push({
                id: makeId(),
                name: name,
                account: account,
                password: password,
                role: role,
                enabled: enabled,
                createdAt: nowIso(),
                updatedAt: nowIso(),
                lastLogin: null
            });
        }
        MonsterRole.saveEmployees(list);
        closeEmployeeEditor();
        renderEmployeeManager();
        setMessage(editingEmployeeId ? "員工資料已更新" : "員工帳號已新增", "success");
    };

    window.saveEmployeePassword = function () {
        var password;
        var confirmPassword;
        var list;
        var i;
        var saved = false;
        if (!requireAdmin()) {
            return;
        }
        password = document.getElementById("employeeEditPassword").value;
        confirmPassword = document.getElementById("employeeEditPasswordConfirm").value;
        if (password.length < 4) {
            alert("❌ 新密碼至少需要 4 碼");
            return;
        }
        if (password !== confirmPassword) {
            alert("❌ 兩次輸入的密碼不一致");
            return;
        }
        list = MonsterRole.getEmployees();
        for (i = 0; i < list.length; i += 1) {
            if (list[i].id === editingEmployeeId) {
                list[i].password = password;
                list[i].updatedAt = nowIso();
                saved = true;
                break;
            }
        }
        if (!saved) {
            alert("❌ 找不到此員工帳號");
            return;
        }
        MonsterRole.saveEmployees(list);
        closeEmployeeEditor();
        renderEmployeeManager();
        setMessage("密碼已修改", "success");
    };

    window.toggleEmployeeEnabled = function (id) {
        var list;
        var current;
        var employee = null;
        var i;
        if (!requireAdmin()) {
            return;
        }
        list = MonsterRole.getEmployees();
        current = MonsterRole.getCurrentUser();
        for (i = 0; i < list.length; i += 1) {
            if (list[i].id === id) {
                employee = list[i];
                break;
            }
        }
        if (!employee) { return; }
        if (current && current.id === employee.id) {
            alert("❌ 不能停用目前登入中的帳號");
            return;
        }
        if (employee.role === "admin" && employee.enabled !== false && enabledAdminCount(list) <= 1) {
            alert("❌ 系統至少必須保留一位啟用中的店長");
            return;
        }
        employee.enabled = employee.enabled === false;
        employee.updatedAt = nowIso();
        MonsterRole.saveEmployees(list);
        renderEmployeeManager();
        setMessage(employee.enabled ? "帳號已啟用" : "帳號已停用", "success");
    };

    window.deleteEmployeeAccount = function (id) {
        var list;
        var current;
        var employee;
        var i;
        var next = [];
        if (!requireAdmin()) {
            return;
        }
        list = MonsterRole.getEmployees();
        current = MonsterRole.getCurrentUser();
        employee = getEmployee(id);
        if (!employee) { return; }
        if (current && current.id === id) {
            alert("❌ 不能刪除目前登入中的帳號");
            return;
        }
        if (employee.role === "admin" && employee.enabled !== false && enabledAdminCount(list) <= 1) {
            alert("❌ 系統至少必須保留一位啟用中的店長");
            return;
        }
        if (!confirm("確定要刪除員工「" + employee.name + "」嗎？\n刪除後無法復原。")) {
            return;
        }
        for (i = 0; i < list.length; i += 1) {
            if (list[i].id !== id) {
                next.push(list[i]);
            }
        }
        MonsterRole.saveEmployees(next);
        closeEmployeeEditor();
        renderEmployeeManager();
        setMessage("員工帳號已刪除", "success");
    };

    document.addEventListener("DOMContentLoaded", function () {
        renderEmployeeManager();
    });
}());
