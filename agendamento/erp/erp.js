// ==========================================
// SEGMAX PROTEC - ERP 2.0
// AUTENTICACAO E NAVEGACAO
// ==========================================

"use strict";

(() => {

    const $ = (selector) =>
        document.querySelector(selector);

    const SUPABASE_URL =
        "https://zmmgvptazjjtcydltnvf.supabase.co";

    const SUPABASE_KEY =
        "sb_publishable_cGXbORnLTBKcDTAyX11Lcg_YtVaMWZ1";

    const TZ = "America/Sao_Paulo";

    const loginScreen = $("#loginScreen");
    const erpScreen = $("#erpScreen");
    const loginForm = $("#loginForm");
    const loginButton = $("#loginButton");
    const loginMessage = $("#loginMessage");

    let currentUser = null;
    let currentRole = null;
    let currentModule = "dashboard";
    let sessionVersion = 0;
    let busy = false;

    // ======================================
    // MENSAGENS
    // ======================================

    function message(element, text, type = "") {

        element.textContent = text;

        element.className = type
            ? `message-${type}`
            : "";

    }

    function notify(text, type = "") {

        message($("#globalMessage"), text, type);

    }

    // Impede envio tradicional do formulario.

    loginForm.addEventListener("submit", (event) => {

        event.preventDefault();

    });

    // ======================================
    // CONEXAO COM SUPABASE
    // ======================================

    if (!window.supabase) {

        message(
            loginMessage,
            "Nao foi possivel carregar o Supabase.",
            "error"
        );

        return;

    }

    const db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false,
                storageKey: "segmax-erp-auth"
            }
        }
    );

    // ======================================
    // FUNCOES AUXILIARES
    // ======================================

    function today() {

        const parts = new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: TZ,
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).formatToParts(new Date());

        const get = (type) =>
            parts.find(p => p.type === type).value;

        return `${get("year")}-${get("month")}-${get("day")}`;

    }

    function money(value) {

        if (value === null || value === undefined) {
            return "—";
        }

        const number = Number(value);

        if (!Number.isFinite(number)) {
            return "—";
        }

        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        ).format(number);

    }

    function formatDate(value) {

        if (!value) return "—";

        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {

            const [year, month, day] = value.split("-");

            return `${day}/${month}/${year}`;

        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return new Intl.DateTimeFormat(
            "pt-BR",
            { timeZone: TZ }
        ).format(date);

    }

    function escapeHTML(value) {

        return String(value ?? "").replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[char]
        );

    }

    // ======================================
    // CONTROLE DOS PERFIS
    // ======================================

    async function identifyRole() {

        const [admin, partner] = await Promise.all([

            db.rpc("is_admin"),

            db.rpc("is_active_partner")

        ]);

        if (admin.error || partner.error) {

            throw new Error(
                "Nao foi possivel verificar as permissoes."
            );

        }

        if (admin.data === true) {
            return "admin";
        }

        if (partner.data === true) {
            return "partner";
        }

        return null;

    }

    async function getUserName(user, role) {

        if (role === "admin") {
            return "Administracao";
        }

        const { data, error } = await db
            .from("technicians")
            .select("full_name")
            .eq("user_id", user.id)
            .eq("active", true)
            .maybeSingle();

        if (error || !data) {
            return "Socio";
        }

        return data.full_name;

    }

    function applyPermissions() {

        document
            .querySelectorAll(
                "#mainMenu [data-admin-only]"
            )
            .forEach(element => {

                element.hidden =
                    currentRole !== "admin";

            });

        document
            .querySelectorAll(
                ".module[data-admin-only]"
            )
            .forEach(element => {

                element.hidden = true;

            });

    }

    // ======================================
    // MENU RESPONSIVO
    // ======================================

    function closeMenu() {

        $("#sidebar").classList.remove("open");

        $("#menuToggle").setAttribute(
            "aria-expanded",
            "false"
        );

    }

    $("#menuToggle").addEventListener("click", () => {

        const open = $("#sidebar")
            .classList.toggle("open");

        $("#menuToggle").setAttribute(
            "aria-expanded",
            String(open)
        );

    });

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            closeMenu();
        }

    });

    document.addEventListener("click", event => {

        if (
            !$("#sidebar").contains(event.target) &&
            !$("#menuToggle").contains(event.target)
        ) {
            closeMenu();
        }

    });

    // ======================================
    // NAVEGACAO ENTRE MODULOS
    // ======================================

    const modules = new Map();

    function registerModule(name, loader) {

        if (typeof loader !== "function") {

            throw new Error(
                "Modulo invalido: " + name
            );

        }

        modules.set(name, loader);

    }

    async function openModule(name) {

        if (!currentUser || !currentRole) {
            return;
        }

        const button = Array.from(
            document.querySelectorAll(
                "#mainMenu [data-module]"
            )
        ).find(item => item.dataset.module === name);

        const section = document.getElementById(
            `module-${name}`
        );

        if (!button || !section) {
            return;
        }

        if (
            (
                button.hasAttribute("data-admin-only") ||
                section.hasAttribute("data-admin-only")
            ) &&
            currentRole !== "admin"
        ) {

            notify(
                "Acesso exclusivo da administracao.",
                "error"
            );

            return;

        }

        currentModule = name;

        document
            .querySelectorAll(".module")
            .forEach(item => {

                item.hidden = true;

            });

        document
            .querySelectorAll(".menu-item")
            .forEach(item => {

                item.classList.remove("active");

                item.removeAttribute("aria-current");

            });

        section.hidden = false;

        button.classList.add("active");

        button.setAttribute("aria-current", "page");

        $("#pageTitle").textContent =
            button.textContent.trim();

        notify("");

        closeMenu();

        const version = sessionVersion;

        try {

            const loader = modules.get(name);

            if (loader) {

                await loader();

            } else {

                notify(
                    "Este modulo ainda esta em desenvolvimento.",
                    "warning"
                );

            }

        } catch (error) {

            if (
                version === sessionVersion &&
                currentModule === name
            ) {

                notify(
                    "Nao foi possivel carregar este modulo.",
                    "error"
                );

            }

        }

    }

    document
        .querySelectorAll("#mainMenu [data-module]")
        .forEach(button => {

            button.addEventListener("click", () => {

                void openModule(
                    button.dataset.module
                );

            });

        });

    // ======================================
    // DASHBOARD INICIAL
    // ======================================

    function clearDashboard() {

        [
            "statAppointments",
            "statCustomers",
            "statServices",
            "statReceived",
            "statPending",
            "statBalance"
        ].forEach(id => {

            document.getElementById(id)
                .textContent = "—";

        });

        $("#dashboardAppointments")
            .replaceChildren();

    }

    registerModule("dashboard", async () => {

        clearDashboard();

        $("#dashboardAppointments").textContent =
            "Os indicadores serao integrados nas proximas etapas.";

    });

    // ======================================
    // EXIBIR LOGIN
    // ======================================

    function showLogin(text = "", type = "") {

        sessionVersion++;

        currentUser = null;
        currentRole = null;
        currentModule = "dashboard";

        erpScreen.hidden = true;
        loginScreen.hidden = false;

        $("#userName").textContent = "";
        $("#userRole").textContent = "";

        loginForm.reset();

        clearDashboard();

        document
            .querySelectorAll(".module > div[id]")
            .forEach(element => {

                element.replaceChildren();

            });

        applyPermissions();

        closeMenu();

        notify("");

        message(loginMessage, text, type);

        loginButton.disabled = busy;

    }

    // ======================================
    // EXIBIR SISTEMA
    // ======================================

    async function showERP(user) {

        const version = ++sessionVersion;

        const role = await identifyRole();

        if (version !== sessionVersion) {
            return;
        }

        if (!role) {

            throw new Error(
                "Usuario sem autorizacao para acessar o ERP."
            );

        }

        const name = await getUserName(user, role);

        if (version !== sessionVersion) {
            return;
        }

        currentUser = user;
        currentRole = role;

        $("#userName").textContent = name;

        $("#userRole").textContent =
            role === "admin"
                ? "Administrador"
                : "Socio autorizado";

        $("#currentDate").textContent =
            new Intl.DateTimeFormat(
                "pt-BR",
                {
                    dateStyle: "full",
                    timeZone: TZ
                }
            ).format(new Date());

        applyPermissions();

        $("#password").value = "";

        loginScreen.hidden = true;
        erpScreen.hidden = false;

        await openModule("dashboard");

    }

    // ======================================
    // LOGIN
    // ======================================

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            if (busy) return;

            busy = true;

            loginButton.disabled = true;

            loginButton.textContent =
                "Verificando acesso...";

            message(loginMessage, "");

            try {

                const email = $("#email").value.trim();

                const password = $("#password").value;

                const { data, error } =
                    await db.auth.signInWithPassword({
                        email,
                        password
                    });

                if (error || !data.user) {

                    throw new Error(
                        "E-mail ou senha invalidos."
                    );

                }

                await showERP(data.user);

            } catch (error) {

                try {

                    await db.auth.signOut({
                        scope: "local"
                    });

                } catch (_) {
                    // Mantem a interface bloqueada.
                }

                showLogin(
                    error.message ||
                    "Nao foi possivel entrar.",
                    "error"
                );

            } finally {

                busy = false;

                loginButton.disabled = false;

                loginButton.textContent =
                    "Entrar no sistema";

            }

        }
    );

    // ======================================
    // LOGOUT
    // ======================================

    $("#logoutButton").addEventListener(
        "click",
        async () => {

            if (busy) return;

            busy = true;

            showLogin("Encerrando sessao...");

            try {

                const { error } =
                    await db.auth.signOut({
                        scope: "local"
                    });

                if (error) throw error;

                showLogin(
                    "Sessao encerrada com sucesso.",
                    "success"
                );

            } catch (_) {

                showLogin(
                    "Falha ao encerrar a sessao. Tente novamente.",
                    "error"
                );

            } finally {

                busy = false;

                loginButton.disabled = false;

            }

        }
    );

    // ======================================
    // MONITORAMENTO DA SESSAO
    // ======================================

    db.auth.onAuthStateChange((event) => {

        if (event === "SIGNED_OUT") {

            showLogin("Sessao encerrada.");

        }

    });

    // ======================================
    // INTERFACE PARA OS OUTROS ARQUIVOS
    // ======================================

    window.SEGMAX = Object.freeze({

        db,

        registerModule,

        openModule,

        notify,

        today,

        money,

        formatDate,

        escapeHTML,

        getUser: () => currentUser,

        getRole: () => currentRole,

        isAdmin: () => currentRole === "admin",

        getSessionVersion: () => sessionVersion

    });

    // ======================================
    // INICIALIZACAO
    // ======================================

    async function initialize() {

        busy = true;

        showLogin("Verificando sessao...");

        try {

            const { data, error } =
                await db.auth.getSession();

            if (error) throw error;

            if (data.session) {

                const result = await db.auth.getUser();

                if (result.error || !result.data.user) {

                    throw new Error("Sessao invalida.");

                }

                await showERP(result.data.user);

            } else {

                showLogin("");

            }

        } catch (_) {

            try {

                await db.auth.signOut({
                    scope: "local"
                });

            } catch (_) {
                // Mantem a interface bloqueada.
            }

            showLogin(
                "Entre com suas credenciais autorizadas.",
                "warning"
            );

        } finally {

            busy = false;

            loginButton.disabled = false;

        }

    }

    window.addEventListener(
        "DOMContentLoaded",
        initialize,
        { once: true }
    );

})();
