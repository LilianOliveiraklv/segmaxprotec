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


// ==========================================
// SEGMAX PROTEC - ERP 2.0
// AGENDA INTEGRADA
// ==========================================

"use strict";

(() => {

    const ERP = window.SEGMAX;

    if (!ERP) return;

    const db = ERP.db;
    const esc = ERP.escapeHTML;

    const TZ = "America/Sao_Paulo";

    function localDate(value) {

        return new Intl.DateTimeFormat("en-CA", {

            timeZone: TZ,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"

        }).format(new Date(value));

    }

    function localTime(value) {

        return new Intl.DateTimeFormat("pt-BR", {

            timeZone: TZ,
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"

        }).format(new Date(value));

    }

    // ======================================
    // CARREGAR AGENDA
    // ======================================

    async function loadAgenda() {

        const version = ERP.getSessionVersion();

        if (!ERP.getUser()) return;

        const container = document.querySelector(
            "#agendaContent"
        );

        if (!container) return;

        const admin = ERP.isAdmin();

        container.innerHTML = `

            <div class="content-card">

                <h2>Agenda SEGMAX PROTEC</h2>

                <p class="muted">
                    Agenda compartilhada da equipe.
                </p>

                <div class="dashboard-grid">

                    <div class="stat-card">

                        <span>Solicitações pendentes</span>

                        <strong id="agendaPending">—</strong>

                    </div>

                    <div class="stat-card">

                        <span>Agendados para hoje</span>

                        <strong id="agendaToday">—</strong>

                    </div>

                    <div class="stat-card">

                        <span>Em andamento</span>

                        <strong id="agendaProgress">—</strong>

                    </div>

                </div>

                <div class="filters">

                    <div>

                        <label>Data</label>

                        <input
                            id="agendaDate"
                            type="date">

                    </div>

                    <div>

                        <label>Situação</label>

                        <select id="agendaStatus">

                            <option value="">
                                Todas
                            </option>

                            ${admin ? `

                                <option>
                                    Aguardando aprovação
                                </option>

                            ` : ""}

                            <option>Agendado</option>

                            <option>Em andamento</option>

                            <option>Concluído</option>

                            ${admin ? `

                                <option>Cancelado</option>

                                <option>Recusado</option>

                            ` : ""}

                        </select>

                    </div>

                    <div>

                        <label>Técnico responsável</label>

                        <select id="agendaTechnician">

                            <option value="">
                                Todos
                            </option>

                        </select>

                    </div>

                    <button
                        id="agendaSearch"
                        class="btn-primary">

                        Consultar agenda

                    </button>

                </div>

                <div class="actions">

                    <button
                        id="agendaAll"
                        class="btn-secondary">

                        Todos os dias

                    </button>

                    <button
                        id="agendaShowToday"
                        class="btn-secondary">

                        Hoje

                    </button>

                    ${admin ? `

                        <button
                            id="agendaShowPending"
                            class="btn-secondary">

                            Solicitações pendentes

                        </button>

                    ` : ""}

                </div>

                <div
                    id="agendaMessage"
                    role="status"
                    aria-live="polite">
                </div>

            </div>

            <div id="agendaList"></div>

            <div class="actions">

                <button
                    id="agendaPrevious"
                    class="btn-secondary"
                    disabled>

                    Anterior

                </button>

                <button
                    id="agendaNext"
                    class="btn-secondary"
                    disabled>

                    Próxima

                </button>

            </div>

        `;

        const $ = selector =>
            container.querySelector(selector);

        const anchor = $("#agendaList");

        const date = $("#agendaDate");

        const status = $("#agendaStatus");

        const technician = $("#agendaTechnician");

        let requestId = 0;

        let page = 0;

        const pageSize = 25;

        let busy = false;

        function validSession() {

            return (

                version === ERP.getSessionVersion() &&

                anchor.isConnected &&

                !!ERP.getUser()

            );

        }

        function message(text, type = "") {

            if (!validSession()) return;

            const element = $("#agendaMessage");

            element.textContent = text;

            element.className = type

                ? `message-${type}`

                : "";

        }

        // ==================================
        // CARREGAR TECNICOS
        // ==================================

        const result = await db

            .from("technicians")

            .select("user_id,full_name,active")

            .order("full_name");

        if (!validSession()) return;

        if (result.error) {

            message(
                "Não foi possível consultar os técnicos.",
                "error"
            );

            return;

        }

        const technicians = result.data || [];

        const names = new Map(

            technicians.map(item => [

                item.user_id,

                item.full_name

            ])

        );

        technicians.forEach(item => {

            technician.append(

                new Option(

                    item.full_name,

                    item.user_id

                )

            );

        });

        // ==================================
        // INDICADORES
        // ==================================

        async function loadIndicators() {

            const today = ERP.today();

            const start = new Date(
                today + "T00:00:00-03:00"
            );

            const end = new Date(
                start.getTime() + 86400000
            );

            const [pending, scheduled, progress] =

                await Promise.all([

                    admin

                        ? db.from("appointments")

                            .select("id", {
                                count: "exact",
                                head: true
                            })

                            .eq(
                                "status",
                                "Aguardando aprovação"
                            )

                        : Promise.resolve({
                            count: null
                        }),

                    db.from("appointments")

                        .select("id", {
                            count: "exact",
                            head: true
                        })

                        .eq("status", "Agendado")

                        .gte(
                            "starts_at",
                            start.toISOString()
                        )

                        .lt(
                            "starts_at",
                            end.toISOString()
                        ),

                    db.from("appointments")

                        .select("id", {
                            count: "exact",
                            head: true
                        })

                        .eq("status", "Em andamento")

                ]);

            if (!validSession()) return;

            $("#agendaPending").textContent =

                pending.count ?? "—";

            $("#agendaToday").textContent =

                scheduled.count ?? "—";

            $("#agendaProgress").textContent =

                progress.count ?? "—";

        }

        // ==================================
        // CONSULTAR AGENDAMENTOS
        // ==================================

        async function loadList() {

            if (!validSession() || busy) return;

            const request = ++requestId;

            anchor.textContent = "Carregando agenda...";

            $("#agendaPrevious").disabled = true;

            $("#agendaNext").disabled = true;

            let query = db

                .from("appointments")

                .select(

                    "id,client_name,phone,city," +

                    "service,notes,starts_at," +

                    "duration_minutes,status," +

                    "technician_id,customer_id",

                    { count: "exact" }

                )

                .order("starts_at")

                .order("id");

            if (date.value) {

                const start = new Date(

                    date.value + "T00:00:00-03:00"

                );

                const end = new Date(

                    start.getTime() + 86400000

                );

                query = query

                    .gte("starts_at", start.toISOString())

                    .lt("starts_at", end.toISOString());

            }

            if (status.value) {

                query = query.eq(

                    "status",

                    status.value

                );

            }

            if (technician.value) {

                query = query.eq(

                    "technician_id",

                    technician.value

                );

            }

            if (!admin) {

                query = query.in("status", [

                    "Agendado",

                    "Em andamento",

                    "Concluído"

                ]);

            }

            const { data, error, count } = await query

                .range(

                    page * pageSize,

                    (page + 1) * pageSize - 1

                );

            if (

                !validSession() ||

                request !== requestId

            ) return;

            anchor.replaceChildren();

            if (error) {

                message(
                    "Não foi possível consultar a agenda.",
                    "error"
                );

                return;

            }

            $("#agendaPrevious").disabled = page === 0;

            $("#agendaNext").disabled =

                (page + 1) * pageSize >= (count ?? 0);

            if (!data.length) {

                anchor.textContent =

                    "Nenhum agendamento encontrado.";

                return;

            }

            data.forEach(renderAppointment);

        }

        // ==================================
        // EXIBIR AGENDAMENTO
        // ==================================

        function renderAppointment(item) {

            const card = document.createElement("article");

            card.className = "content-card";

            card.innerHTML = `

                <h3>

                    ${esc(item.client_name)}

                </h3>

                <p>

                    <strong>Situação:</strong>

                    ${esc(item.status)}

                </p>

                <p>

                    <strong>Data e horário:</strong>

                    ${esc(ERP.formatDate(
                        localDate(item.starts_at)
                    ))}

                    às

                    ${esc(localTime(item.starts_at))}

                </p>

                <p>

                    <strong>Serviço:</strong>

                    ${esc(item.service)}

                </p>

                <p>

                    <strong>Telefone:</strong>

                    ${esc(item.phone || "—")}

                </p>

                <p>

                    <strong>Cidade:</strong>

                    ${esc(item.city || "—")}

                </p>

                <p>

                    <strong>Responsável:</strong>

                    ${esc(

                        names.get(item.technician_id)

                        || "Não definido"

                    )}

                </p>

                <p>

                    <strong>Duração:</strong>

                    ${esc(item.duration_minutes)}

                    minutos

                </p>

                <p>

                    <strong>Observações:</strong>

                    ${esc(item.notes || "—")}

                </p>

                <div class="actions"></div>

            `;

            anchor.append(card);

            if (!admin) return;

            const actions = card.querySelector(".actions");

            if (item.status === "Aguardando aprovação") {

                renderApproval(item, actions);

            } else {

                renderStatus(item, actions);

            }

        }

        // ==================================
        // EXECUTAR ALTERACOES
        // ==================================

        async function execute(operation, success) {

            if (

                busy ||

                !validSession() ||

                !ERP.isAdmin()

            ) return;

            busy = true;

            message("Processando...");

            try {

                const result = await operation();

                if (!validSession()) return;

                if (

                    result.error ||

                    !result.data ||

                    (

                        Array.isArray(result.data) &&

                        !result.data.length

                    )

                ) {

                    message(

                        "Operação não concluída. Confira a disponibilidade e as permissões.",

                        "error"

                    );

                    return;

                }

                message(success, "success");

            } catch (_) {

                message(

                    "Falha na conexão. Consulte novamente antes de repetir.",

                    "error"

                );

            } finally {

                busy = false;

                if (validSession()) {

                    await Promise.all([

                        loadList(),

                        loadIndicators()

                    ]);

                }

            }

        }

        // ==================================
        // APROVAR SOLICITACAO
        // ==================================

        function renderApproval(item, root) {

            const tech = document.createElement("select");

            tech.append(

                new Option("Selecione o técnico", "")

            );

            technicians

                .filter(t => t.active)

                .forEach(t => {

                    tech.append(

                        new Option(

                            t.full_name,

                            t.user_id

                        )

                    );

                });

            const day = document.createElement("input");

            day.type = "date";

            day.min = ERP.today();

            day.value = localDate(item.starts_at);

            const slot = document.createElement("select");

            const approve = document.createElement("button");

            approve.textContent = "Aprovar agendamento";

            approve.className = "btn-primary";

            approve.disabled = true;

            const refuse = document.createElement("button");

            refuse.textContent = "Recusar solicitação";

            refuse.className = "btn-secondary";

            const feedback = document.createElement("p");

            root.append(

                tech,

                day,

                slot,

                approve,

                refuse,

                feedback

            );

            let slotRequest = 0;

            function validate() {

                approve.disabled =

                    busy ||

                    !tech.value ||

                    !day.value ||

                    day.value < ERP.today() ||

                    !slot.value ||

                    slot.disabled;

            }

            async function refreshSlots() {

                const request = ++slotRequest;

                slot.disabled = true;

                slot.replaceChildren(

                    new Option("Carregando horários...", "")

                );

                validate();

                if (!day.value || day.value < ERP.today()) {

                    return;

                }

                const { data, error } = await db.rpc(

                    "available_slots",

                    {

                        p_date: day.value,

                        p_service: item.service

                    }

                );

                if (

                    !validSession() ||

                    !root.isConnected ||

                    request !== slotRequest

                ) return;

                slot.replaceChildren(

                    new Option("Selecione o horário", "")

                );

                if (error) {

                    feedback.textContent =

                        "Erro ao consultar horários.";

                    return;

                }

                (data || []).forEach(s => {

                    slot.append(

                        new Option(s.slot, s.slot)

                    );

                });

                const preferred = localTime(item.starts_at);

                if (

                    (data || []).some(

                        s => s.slot === preferred

                    )

                ) {

                    slot.value = preferred;

                }

                slot.disabled = !data?.length;

                feedback.textContent = data?.length

                    ? ""

                    : "Nenhum horário disponível.";

                validate();

            }

            tech.onchange = validate;

            slot.onchange = validate;

            day.onchange = refreshSlots;

            approve.onclick = async () => {

                if (approve.disabled || busy) return;

                if (!window.confirm(

                    "Confirma a aprovação deste agendamento?"

                )) return;

                await execute(

                    () => db.rpc(

                        "approve_appointment",

                        {

                            p_appointment_id: item.id,

                            p_technician_id: tech.value,

                            p_date: day.value,

                            p_slot: slot.value

                        }

                    ),

                    "Agendamento aprovado!"

                );

            };

            refuse.onclick = async () => {

                if (busy) return;

                if (!window.confirm(

                    "Deseja recusar esta solicitação?"

                )) return;

                await execute(

                    () => db

                        .from("appointments")

                        .update({ status: "Recusado" })

                        .eq("id", item.id)

                        .eq("status", "Aguardando aprovação")

                        .select("id"),

                    "Solicitação recusada."

                );

            };

            void refreshSlots();

        }

        // ==================================
        // ATUALIZAR STATUS
        // ==================================

        function renderStatus(item, root) {

            const transitions = {

                "Agendado": [

                    "Em andamento",

                    "Concluído",

                    "Cancelado"

                ],

                "Em andamento": [

                    "Concluído",

                    "Cancelado"

                ]

            };

            const allowed = transitions[item.status] || [];

            if (!allowed.length) return;

            const select = document.createElement("select");

            select.append(

                new Option(item.status, item.status)

            );

            allowed.forEach(value => {

                select.append(

                    new Option(value, value)

                );

            });

            const save = document.createElement("button");

            save.className = "btn-primary";

            save.textContent = "Atualizar situação";

            root.append(select, save);

            save.onclick = async () => {

                if (

                    busy ||

                    !allowed.includes(select.value)

                ) return;

                if (!window.confirm(

                    "Confirma a alteração da situação?"

                )) return;

                await execute(

                    () => db

                        .from("appointments")

                        .update({

                            status: select.value

                        })

                        .eq("id", item.id)

                        .eq("status", item.status)

                        .select("id"),

                    "Situação atualizada!"

                );

            };

        }

        // ==================================
        // FILTROS E PAGINACAO
        // ==================================

        function refresh() {

            if (busy) return;

            page = 0;

            message("");

            void loadList();

        }

        $("#agendaSearch").onclick = refresh;

        $("#agendaAll").onclick = () => {

            if (busy) return;

            date.value = "";

            status.value = "";

            technician.value = "";

            refresh();

        };

        $("#agendaShowToday").onclick = () => {

            if (busy) return;

            date.value = ERP.today();

            status.value = "";

            technician.value = "";

            refresh();

        };

        if (admin) {

            $("#agendaShowPending").onclick = () => {

                if (busy) return;

                date.value = "";

                status.value = "Aguardando aprovação";

                technician.value = "";

                refresh();

            };

        }

        $("#agendaPrevious").onclick = () => {

            if (busy) return;

            if (page > 0) page--;

            void loadList();

        };

        $("#agendaNext").onclick = () => {

            if (busy) return;

            page++;

            void loadList();

        };

        date.value = ERP.today();

        await Promise.all([

            loadList(),

            loadIndicators()

        ]);

    }

    // ======================================
    // REGISTRAR MODULO
    // ======================================

    ERP.registerModule(

        "agenda",

        loadAgenda

    );

})();
