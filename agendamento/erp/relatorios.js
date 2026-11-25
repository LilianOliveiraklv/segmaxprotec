// ==========================================
// SEGMAX PROTEC - ERP 2.0
// MODULO DE RELATORIOS - PARTE 1
// DESEMPENHO DOS SOCIOS
// ==========================================

"use strict";

(() => {

    const ERP = window.SEGMAX;

    if (!ERP) return;

    const db = ERP.db;
    const esc = ERP.escapeHTML;

    // ======================================
    // CARREGAR DESEMPENHO
    // ======================================

    async function loadDesempenho() {

        const version = ERP.getSessionVersion();

        if (!ERP.getUser()) return;

        const container = document.querySelector(
            "#desempenhoContent"
        );

        if (!container) return;

        container.innerHTML = `

            <div class="content-card">

                <h2>Desempenho dos sócios</h2>

                <p class="muted">
                    Acompanhe os resultados comerciais,
                    operacionais e financeiros da equipe.
                </p>

                <div class="filters">

                    <div>

                        <label for="performanceStart">
                            Data inicial
                        </label>

                        <input
                            id="performanceStart"
                            type="date"
                            required>

                    </div>

                    <div>

                        <label for="performanceEnd">
                            Data final
                        </label>

                        <input
                            id="performanceEnd"
                            type="date"
                            required>

                    </div>

                    <button
                        id="performanceSearch"
                        class="btn-primary">

                        Consultar desempenho

                    </button>

                </div>

                <div class="actions">

                    <button
                        data-period="today"
                        class="btn-secondary">

                        Hoje

                    </button>

                    <button
                        data-period="week"
                        class="btn-secondary">

                        Esta semana

                    </button>

                    <button
                        data-period="month"
                        class="btn-secondary">

                        Este mês

                    </button>

                    <button
                        data-period="year"
                        class="btn-secondary">

                        Este ano

                    </button>

                </div>

                <div
                    id="performanceMessage"
                    role="status"
                    aria-live="polite">
                </div>

            </div>

            <div id="performanceSummary"></div>

            <div id="performanceRanking"></div>

            <div id="performanceDetails"></div>

        `;

        const $ = selector =>
            container.querySelector(selector);

        const start = $("#performanceStart");
        const end = $("#performanceEnd");
        const searchButton = $("#performanceSearch");

        const anchor = $("#performanceSummary");

        let requestId = 0;

        function validSession() {

            return (

                version === ERP.getSessionVersion() &&

                anchor.isConnected

            );

        }

        function message(text, type = "") {

            if (!validSession()) return;

            const element = $("#performanceMessage");

            element.textContent = text;

            element.className = type

                ? `message-${type}`

                : "";

        }

        function number(value) {

            const result = Number(value);

            return Number.isFinite(result)

                ? result

                : 0;

        }

        function integer(value) {

            return number(value)

                .toLocaleString("pt-BR");

        }

        function money(value) {

            return ERP.money(number(value));

        }

        // ==================================
        // PERIODOS RAPIDOS
        // ==================================

        function setPeriod(period) {

            const today = ERP.today();

            const date = new Date(
                today + "T12:00:00Z"
            );

            end.value = today;

            if (period === "today") {

                start.value = today;

            } else if (period === "week") {

                const weekday = date.getUTCDay();

                const difference = (weekday + 6) % 7;

                date.setUTCDate(

                    date.getUTCDate() - difference

                );

                start.value = date

                    .toISOString()

                    .slice(0, 10);

            } else if (period === "year") {

                start.value =

                    today.slice(0, 4) + "-01-01";

            } else {

                start.value =

                    today.slice(0, 8) + "01";

            }

        }

        start.max = ERP.today();
        end.max = ERP.today();

        setPeriod("month");

        // ==================================
        // LIMPAR RESULTADOS
        // ==================================

        function clearResults() {

            anchor.replaceChildren();

            $("#performanceRanking")
                .replaceChildren();

            $("#performanceDetails")
                .replaceChildren();

        }

        // ==================================
        // CONSULTAR SUPABASE
        // ==================================

        async function loadPerformance() {

            if (!validSession()) return;

            const request = ++requestId;

            const startDate = start.value;

            const endDate = end.value;

            clearResults();

            if (

                !startDate ||

                !endDate ||

                startDate > endDate ||

                endDate > ERP.today()

            ) {

                message(

                    "Informe um período válido.",

                    "error"

                );

                searchButton.disabled = false;

                return;

            }

            searchButton.disabled = true;

            message("Consultando desempenho...");

            try {

                const { data, error } = await db.rpc(

                    "get_partner_performance",

                    {

                        p_start_date: startDate,

                        p_end_date: endDate

                    }

                );

                if (

                    !validSession() ||

                    request !== requestId

                ) return;

                if (error || !Array.isArray(data)) {

                    message(

                        "Não foi possível consultar o desempenho.",

                        "error"

                    );

                    return;

                }

                if (!data.length) {

                    message(

                        "Nenhum resultado encontrado.",

                        "warning"

                    );

                    return;

                }

                renderSummary(data);

                renderRanking(data);

                renderDetails(data);

                message(

                    "Período: " +

                    ERP.formatDate(startDate) +

                    " até " +

                    ERP.formatDate(endDate),

                    "success"

                );

            } catch (_) {

                if (

                    validSession() &&

                    request === requestId

                ) {

                    message(

                        "Falha na conexão.",

                        "error"

                    );

                }

            } finally {

                if (

                    validSession() &&

                    request === requestId

                ) {

                    searchButton.disabled = false;

                }

            }

        }

        // ==================================
        // INDICADORES GERAIS
        // ==================================

        function sum(data, field) {

            return data.reduce(

                (total, partner) =>

                    total + number(partner[field]),

                0

            );

        }

        function renderSummary(data) {

            const cards = [

                [

                    "Clientes captados",

                    integer(sum(
                        data,
                        "customers_captured"
                    ))

                ],

                [

                    "Serviços concluídos",

                    integer(sum(
                        data,
                        "services_completed"
                    ))

                ],

                [

                    "Vendas geradas",

                    money(sum(
                        data,
                        "sales_generated"
                    ))

                ],

                [

                    "Recebimentos líquidos",

                    money(sum(
                        data,
                        "payments_received"
                    ))

                ],

                [

                    "Materiais",

                    money(sum(
                        data,
                        "materials_cost"
                    ))

                ],

                [

                    "Despesas",

                    money(sum(
                        data,
                        "expenses"
                    ))

                ],

                [

                    "Saldo financeiro",

                    money(sum(
                        data,
                        "net_balance"
                    ))

                ]

            ];

            anchor.innerHTML = `

                <div class="content-card">

                    <h2>Resultado geral dos sócios</h2>

                    <div class="dashboard-grid">

                        ${cards.map(item => `

                            <div class="stat-card">

                                <span>
                                    ${esc(item[0])}
                                </span>

                                <strong>
                                    ${esc(item[1])}
                                </strong>

                            </div>

                        `).join("")}

                    </div>

                </div>

            `;

        }

        // ==================================
        // COMPARATIVO DE DESEMPENHO
        // ==================================

        function renderRanking(data) {

            const metrics = [

                {

                    title: "Captação de clientes",

                    field: "customers_captured",

                    financial: false

                },

                {

                    title: "Serviços concluídos",

                    field: "services_completed",

                    financial: false

                },

                {

                    title: "Vendas geradas",

                    field: "sales_generated",

                    financial: true

                },

                {

                    title: "Valor dos serviços executados",

                    field: "services_value",

                    financial: true

                }

            ];

            $("#performanceRanking").innerHTML = `

                <div class="content-card">

                    <h2>Comparativo entre sócios</h2>

                    ${metrics.map(metric => {

                        const sorted = [...data].sort(

                            (a, b) =>

                                number(b[metric.field]) -

                                number(a[metric.field])

                        );

                        const maximum = Math.max(

                            0,

                            ...sorted.map(partner =>

                                number(partner[metric.field])

                            )

                        );

                        return `

                            <div style="margin:24px 0">

                                <h3>
                                    ${esc(metric.title)}
                                </h3>

                                ${sorted.map(partner => {

                                    const value = number(

                                        partner[metric.field]

                                    );

                                    const percentage =

                                        maximum > 0

                                            ? Math.max(

                                                0,

                                                Math.min(

                                                    100,

                                                    value /

                                                    maximum *

                                                    100

                                                )

                                            )

                                            : 0;

                                    const color =

                                        partner.partner_name === "Breno"

                                            ? "#F7D007"

                                            : "#0F1720";

                                    return `

                                        <div style="margin:14px 0">

                                            <p>

                                                <strong>

                                                    ${esc(

                                                        partner.partner_name

                                                    )}

                                                </strong>

                                                —

                                                ${esc(

                                                    metric.financial

                                                        ? money(value)

                                                        : integer(value)

                                                )}

                                            </p>

                                            <div style="
                                                height:14px;
                                                background:#E5E7EB;
                                                border-radius:8px;
                                                overflow:hidden;
                                            ">

                                                <div style="
                                                    width:${percentage}%;
                                                    height:100%;
                                                    background:${color};
                                                "></div>

                                            </div>

                                        </div>

                                    `;

                                }).join("")}

                            </div>

                        `;

                    }).join("")}

                </div>

            `;

        }

        // ==================================
        // TABELA DETALHADA
        // ==================================

        function renderDetails(data) {

            $("#performanceDetails").innerHTML = `

                <div class="table-card">

                    <h2>Indicadores individuais</h2>

                    <div class="table-wrapper">

                        <table>

                            <thead>

                                <tr>

                                    <th>Indicador</th>

                                    ${data.map(partner => `

                                        <th>

                                            ${esc(

                                                partner.partner_name

                                            )}

                                        </th>

                                    `).join("")}

                                </tr>

                            </thead>

                            <tbody>

                                ${[

                                    [

                                        "Clientes captados",

                                        "customers_captured",

                                        false

                                    ],

                                    [

                                        "Serviços concluídos",

                                        "services_completed",

                                        false

                                    ],

                                    [

                                        "Vendas geradas",

                                        "sales_generated",

                                        true

                                    ],

                                    [

                                        "Serviços executados",

                                        "services_value",

                                        true

                                    ],

                                    [

                                        "Pagamentos registrados",

                                        "payments_registered",

                                        true

                                    ],

                                    [

                                        "Recebimentos líquidos",

                                        "payments_received",

                                        true

                                    ],

                                    [

                                        "Materiais",

                                        "materials_cost",

                                        true

                                    ],

                                    [

                                        "Despesas",

                                        "expenses",

                                        true

                                    ],

                                    [

                                        "Saldo individual",

                                        "net_balance",

                                        true

                                    ]

                                ].map(metric => `

                                    <tr>

                                        <td>

                                            ${esc(metric[0])}

                                        </td>

                                        ${data.map(partner => `

                                            <td>

                                                ${esc(

                                                    metric[2]

                                                        ? money(

                                                            partner[metric[1]]

                                                        )

                                                        : integer(

                                                            partner[metric[1]]

                                                        )

                                                )}

                                            </td>

                                        `).join("")}

                                    </tr>

                                `).join("")}

                            </tbody>

                        </table>

                    </div>

                    <p class="muted">

                        Os indicadores são calculados pelo
                        Supabase e disponibilizados
                        somente para consulta.

                    </p>

                </div>

            `;

        }

        // ==================================
        // EVENTOS
        // ==================================

        searchButton.addEventListener(

            "click",

            loadPerformance

        );

        container.querySelectorAll(

            "[data-period]"

        ).forEach(button => {

            button.addEventListener(

                "click",

                () => {

                    setPeriod(button.dataset.period);

                    void loadPerformance();

                }

            );

        });

        [start, end].forEach(input => {

            input.addEventListener("change", () => {

                requestId++;

                clearResults();

                searchButton.disabled = false;

                message(

                    "Clique em Consultar desempenho."

                );

            });

        });

        await loadPerformance();

    }

    // ======================================
    // REGISTRAR MODULO
    // ======================================

    ERP.registerModule(

        "desempenho",

        loadDesempenho

    );

})();



// ==========================================
// SEGMAX PROTEC - ERP 2.0
// MODULO DE RELATORIOS - PARTE 2
// RELATORIOS ADMINISTRATIVOS E EXPORTACAO
// ==========================================

"use strict";

(() => {

    const ERP = window.SEGMAX;

    if (!ERP) return;

    const db = ERP.db;
    const esc = ERP.escapeHTML;

    async function loadRelatorios() {

        const version = ERP.getSessionVersion();

        const container = document.querySelector(
            "#relatoriosContent"
        );

        if (!container) return;

        if (!ERP.getUser() || !ERP.isAdmin()) {

            container.textContent =
                "Acesso não autorizado.";

            return;

        }

        container.textContent = "Carregando filtros...";

        const [technicians, customers] =
            await Promise.all([

                db.from("technicians")
                    .select("user_id,full_name")
                    .order("full_name"),

                db.from("customers")
                    .select("id,full_name,phone")
                    .order("full_name")
                    .limit(100)

            ]);

        if (
            version !== ERP.getSessionVersion() ||
            !ERP.isAdmin()
        ) return;

        if (technicians.error || customers.error) {

            container.textContent =
                "Não foi possível carregar os filtros.";

            return;

        }

        // ==================================
        // INTERFACE ADMINISTRATIVA
        // ==================================

        container.innerHTML = `

            <div class="content-card">

                <h2>Relatórios administrativos</h2>

                <p class="muted">
                    Área exclusiva da administração.
                </p>

                <div class="filters">

                    <div>
                        <label>Data inicial *</label>
                        <input
                            id="reportStart"
                            type="date"
                            required>
                    </div>

                    <div>
                        <label>Data final *</label>
                        <input
                            id="reportEnd"
                            type="date"
                            required>
                    </div>

                    <div>
                        <label>Técnico executor</label>

                        <select id="reportTechnician">
                            <option value="">
                                Todos
                            </option>
                        </select>
                    </div>

                    <div>
                        <label>Buscar cliente</label>

                        <input
                            id="reportCustomerSearch"
                            placeholder="Nome do cliente">

                        <button
                            id="reportFindCustomer"
                            class="btn-secondary">

                            Buscar

                        </button>
                    </div>

                    <div>
                        <label>Cliente</label>

                        <select id="reportCustomer">
                            <option value="">
                                Todos
                            </option>
                        </select>
                    </div>

                    <div>
                        <label>Tipo de serviço</label>

                        <input
                            id="reportService"
                            placeholder="Nome exato do serviço">
                    </div>

                    <div>
                        <label>Situação do pagamento</label>

                        <input
                            id="reportStatus"
                            placeholder="Situação exata">
                    </div>

                </div>

                <div class="actions">

                    <button
                        id="generateReport"
                        class="btn-primary">

                        Gerar relatório

                    </button>

                    <button
                        id="exportReport"
                        class="btn-success"
                        disabled>

                        Exportar CSV

                    </button>

                    <button
                        id="printReport"
                        class="btn-secondary"
                        disabled>

                        Imprimir / PDF

                    </button>

                </div>

                <div
                    id="reportMessage"
                    role="status"
                    aria-live="polite">
                </div>

            </div>

            <div id="reportSummary"></div>

            <div id="reportResults"></div>

        `;

        const $ = selector =>
            container.querySelector(selector);

        const anchor = $("#reportResults");

        const generate = $("#generateReport");
        const exportButton = $("#exportReport");
        const printButton = $("#printReport");

        let records = [];
        let reportPeriod = null;
        let requestId = 0;
        let customerRequest = 0;

        function authorized() {

            return (

                version === ERP.getSessionVersion() &&

                ERP.isAdmin() &&

                !!ERP.getUser() &&

                anchor.isConnected

            );

        }

        function message(text, type = "") {

            if (!authorized()) return;

            const element = $("#reportMessage");

            element.textContent = text;

            element.className = type
                ? `message-${type}`
                : "";

        }

        function number(value) {

            const result = Number(value);

            return Number.isFinite(result)
                ? result
                : 0;

        }

        function money(value) {

            return ERP.money(number(value));

        }

        // ==================================
        // PREENCHER FILTROS
        // ==================================

        technicians.data.forEach(technician => {

            $("#reportTechnician").append(

                new Option(
                    technician.full_name,
                    technician.user_id
                )

            );

        });

        function populateCustomers(items) {

            const select = $("#reportCustomer");

            select.replaceChildren(
                new Option("Todos", "")
            );

            items.forEach(customer => {

                select.append(

                    new Option(

                        customer.full_name +
                        " | " +
                        (customer.phone || ""),

                        customer.id

                    )

                );

            });

        }

        populateCustomers(customers.data);

        $("#reportStart").value =
            ERP.today().slice(0, 8) + "01";

        $("#reportEnd").value = ERP.today();

        $("#reportStart").max = ERP.today();
        $("#reportEnd").max = ERP.today();

        // ==================================
        // LIMPAR RELATORIO
        // ==================================

        function invalidateReport() {

            requestId++;

            records = [];
            reportPeriod = null;

            $("#reportSummary").replaceChildren();
            anchor.replaceChildren();

            exportButton.disabled = true;
            printButton.disabled = true;
            generate.disabled = false;

        }

        // ==================================
        // BUSCAR CLIENTES
        // ==================================

        $("#reportFindCustomer").addEventListener(
            "click",
            async () => {

                if (!authorized()) return;

                const request = ++customerRequest;

                invalidateReport();

                const search = $("#reportCustomerSearch")
                    .value.trim()
                    .replace(/[%_\\]/g, "");

                let query = db
                    .from("customers")
                    .select("id,full_name,phone")
                    .order("full_name")
                    .limit(100);

                if (search) {

                    query = query.ilike(
                        "full_name",
                        `%${search}%`
                    );

                }

                const { data, error } = await query;

                if (
                    !authorized() ||
                    request !== customerRequest
                ) return;

                if (error) {

                    message(
                        "Não foi possível buscar clientes.",
                        "error"
                    );

                    return;

                }

                invalidateReport();
                populateCustomers(data);

                message(

                    `${data.length} cliente(s) encontrado(s). ` +

                    "Selecione o cliente desejado."

                );

            }
        );

        // ==================================
        // GERAR RELATORIO
        // ==================================

        async function loadReport() {

            if (!authorized()) return;

            invalidateReport();

            const request = requestId;

            const start = $("#reportStart").value;
            const end = $("#reportEnd").value;

            if (
                !start ||
                !end ||
                start > end ||
                end > ERP.today()
            ) {

                message(
                    "Informe um período válido.",
                    "error"
                );

                return;

            }

            generate.disabled = true;

            message("Gerando relatório...");

            try {

                const { data, error } = await db.rpc(

                    "get_admin_report",

                    {

                        p_start_date: start,

                        p_end_date: end,

                        p_technician_id:
                            $("#reportTechnician").value
                            || null,

                        p_customer_id:
                            $("#reportCustomer").value
                            || null,

                        p_service_type:
                            $("#reportService").value.trim()
                            || null,

                        p_payment_status:
                            $("#reportStatus").value.trim()
                            || null

                    }

                );

                if (
                    !authorized() ||
                    request !== requestId
                ) return;

                if (error || !Array.isArray(data)) {

                    message(
                        "Não foi possível gerar o relatório.",
                        "error"
                    );

                    return;

                }

                records = data;

                reportPeriod = {
                    start,
                    end
                };

                renderSummary();
                renderTable();

                exportButton.disabled = !records.length;
                printButton.disabled = !records.length;

                message(

                    `${records.length} serviço(s) encontrado(s).`,

                    "success"

                );

            } catch (_) {

                if (
                    authorized() &&
                    request === requestId
                ) {

                    message(
                        "Falha na conexão.",
                        "error"
                    );

                }

            } finally {

                if (
                    authorized() &&
                    request === requestId
                ) {

                    generate.disabled = false;

                }

            }

        }

        // ==================================
        // RESUMO FINANCEIRO
        // ==================================

        function sum(field) {

            return records.reduce(

                (total, record) =>

                    total + number(record[field]),

                0

            );

        }

        function renderSummary() {

            const cards = [

                [
                    "Ordens de serviço",
                    records.length
                ],

                [
                    "Valor contratado",
                    money(sum("total_amount"))
                ],

                [
                    "Descontos concedidos",
                    money(sum("discount"))
                ],

                [
                    "Valor final",
                    money(sum("final_amount"))
                ],

                [
                    "Pagamentos registrados",
                    money(sum("total_paid"))
                ],

                [
                    "Saldo a receber",
                    money(sum("balance_due"))
                ],

                [
                    "Custo de materiais",
                    money(sum("material_cost"))
                ]

            ];

            $("#reportSummary").innerHTML = `

                <div class="content-card">

                    <h2>Resumo do relatório</h2>

                    <div class="dashboard-grid">

                        ${cards.map(card => `

                            <div class="stat-card">

                                <span>
                                    ${esc(card[0])}
                                </span>

                                <strong>
                                    ${esc(card[1])}
                                </strong>

                            </div>

                        `).join("")}

                    </div>

                </div>

            `;

        }

        // ==================================
        // TABELA DE SERVICOS
        // ==================================

        function renderTable() {

            if (!records.length) {

                anchor.textContent =
                    "Nenhum serviço encontrado.";

                return;

            }

            anchor.innerHTML = `

                <div class="table-card">

                    <h2>Serviços detalhados</h2>

                    <div class="table-wrapper">

                        <table>

                            <thead>

                                <tr>

                                    <th>Data</th>
                                    <th>Cliente</th>
                                    <th>Captador</th>
                                    <th>Executor</th>
                                    <th>Serviço</th>
                                    <th>Valor final</th>
                                    <th>Pago</th>
                                    <th>Saldo</th>
                                    <th>Previsão</th>
                                    <th>Situação</th>

                                </tr>

                            </thead>

                            <tbody>

                                ${records.map(record => `

                                    <tr>

                                        <td>
                                            ${esc(ERP.formatDate(
                                                record.service_date
                                            ))}
                                        </td>

                                        <td>

                                            <strong>
                                                ${esc(record.customer_name)}
                                            </strong>

                                            <p>
                                                ${esc(record.phone || "")}
                                            </p>

                                        </td>

                                        <td>
                                            ${esc(record.captured_by || "—")}
                                        </td>

                                        <td>
                                            ${esc(record.executed_by || "—")}
                                        </td>

                                        <td>
                                            ${esc(record.service_type)}
                                        </td>

                                        <td>
                                            ${esc(money(record.final_amount))}
                                        </td>

                                        <td>
                                            ${esc(money(record.total_paid))}
                                        </td>

                                        <td>
                                            ${esc(money(record.balance_due))}
                                        </td>

                                        <td>
                                            ${esc(ERP.formatDate(
                                                record.next_payment_date
                                            ))}
                                        </td>

                                        <td>
                                            ${esc(record.payment_status)}
                                        </td>

                                    </tr>

                                `).join("")}

                            </tbody>

                        </table>

                    </div>

                </div>

            `;

        }

        // ==================================
        // PROTEGER EXPORTACAO
        // ==================================

        async function verifyExportPermission() {

            if (!authorized()) return false;

            const { data, error } = await db.rpc(
                "is_admin"
            );

            return (

                authorized() &&

                !error &&

                data === true

            );

        }

        // ==================================
        // FORMATAR CSV COM SEGURANCA
        // ==================================

        function csvCell(value) {

            let text = String(value ?? "");

            // Impede que textos sejam interpretados
            // como formulas de planilha.

            if (

                typeof value === "string" &&

                /^[\s\u0000-\u001f]*[=+\-@]/.test(text)

            ) {

                text = "'" + text;

            }

            return '"' +

                text.replace(/"/g, '""') +

                '"';

        }

        function csvMoney(value) {

            return number(value)
                .toFixed(2)
                .replace(".", ",");

        }

        // ==================================
        // EXPORTAR CSV
        // ==================================

        exportButton.addEventListener(
            "click",
            async () => {

                if (!records.length || !reportPeriod) return;

                const request = requestId;

                try {

                    if (!await verifyExportPermission()) {

                        message(
                            "Exportação não autorizada.",
                            "error"
                        );

                        return;

                    }

                    if (request !== requestId) return;

                    const headers = [

                        "Data",
                        "Cliente",
                        "Telefone",
                        "Cidade",
                        "Bairro",
                        "Endereço",
                        "Captador",
                        "Executor",
                        "Serviço",
                        "Descrição",
                        "Valor contratado",
                        "Desconto",
                        "Valor final",
                        "Pago",
                        "Saldo",
                        "Próximo pagamento",
                        "Situação",
                        "Custo de materiais",
                        "Histórico de pagamentos"

                    ];

                    const rows = records.map(record => [

                        record.service_date,
                        record.customer_name,
                        record.phone,
                        record.city,
                        record.neighborhood,
                        record.address,
                        record.captured_by,
                        record.executed_by,
                        record.service_type,
                        record.description,
                        csvMoney(record.total_amount),
                        csvMoney(record.discount),
                        csvMoney(record.final_amount),
                        csvMoney(record.total_paid),
                        csvMoney(record.balance_due),
                        record.next_payment_date,
                        record.payment_status,
                        csvMoney(record.material_cost),
                        JSON.stringify(record.payments || [])

                    ]);

                    const csv = "\uFEFF" +

                        [headers, ...rows]

                            .map(row =>

                                row.map(csvCell).join(";")

                            )

                            .join("\r\n");

                    const blob = new Blob(

                        [csv],

                        {
                            type: "text/csv;charset=utf-8;"
                        }

                    );

                    const url = URL.createObjectURL(blob);

                    const link = document.createElement("a");

                    link.href = url;

                    link.download =

                        `SEGMAX_Relatorio_${reportPeriod.start}` +

                        `_a_${reportPeriod.end}.csv`;

                    document.body.append(link);

                    link.click();

                    link.remove();

                    setTimeout(
                        () => URL.revokeObjectURL(url),
                        1000
                    );

                    message(
                        "Arquivo CSV gerado.",
                        "success"
                    );

                } catch (_) {

                    message(
                        "Não foi possível exportar.",
                        "error"
                    );

                }

            }
        );

        // ==================================
        // IMPRIMIR OU SALVAR PDF
        // ==================================

        printButton.addEventListener(
            "click",
            async () => {

                if (!records.length || !reportPeriod) return;

                const request = requestId;

                try {

                    if (!await verifyExportPermission()) {

                        message(
                            "Impressão não autorizada.",
                            "error"
                        );

                        return;

                    }

                    if (request !== requestId) return;

                    const printWindow = window.open(
                        "",
                        "_blank"
                    );

                    if (!printWindow) {

                        message(
                            "Permita a abertura de pop-ups.",
                            "warning"
                        );

                        return;

                    }

                    printWindow.opener = null;

                    printWindow.document.write(`

                        <!DOCTYPE html>

                        <html lang="pt-BR">

                        <head>

                            <meta charset="UTF-8">

                            <title>
                                SEGMAX PROTEC - Relatório
                            </title>

                            <style>

                                @page {
                                    size: A4 landscape;
                                    margin: 12mm;
                                }

                                body {
                                    font-family: Arial, sans-serif;
                                    color: #111827;
                                    font-size: 11px;
                                }

                                header {
                                    border-bottom: 4px solid #F7D007;
                                    padding-bottom: 12px;
                                    margin-bottom: 20px;
                                }

                                h1 {
                                    font-size: 23px;
                                }

                                table {
                                    width: 100%;
                                    border-collapse: collapse;
                                }

                                th, td {
                                    border: 1px solid #CCC;
                                    padding: 7px;
                                    text-align: left;
                                    overflow-wrap: anywhere;
                                }

                                th {
                                    background: #F7D007;
                                }

                                tr {
                                    break-inside: avoid;
                                }

                                thead {
                                    display: table-header-group;
                                }

                                footer {
                                    margin-top: 20px;
                                    font-size: 10px;
                                }

                            </style>

                        </head>

                        <body>

                            <header>

                                <h1>SEGMAX PROTEC</h1>

                                <h2>Relatório administrativo</h2>

                                <p>

                                    Período:

                                    ${esc(ERP.formatDate(
                                        reportPeriod.start
                                    ))}

                                    até

                                    ${esc(ERP.formatDate(
                                        reportPeriod.end
                                    ))}

                                </p>

                            </header>

                            ${$("#reportSummary").innerHTML}

                            ${anchor.innerHTML}

                            <footer>

                                Documento de uso administrativo.

                                Contém informações confidenciais.

                                WhatsApp: (31) 98420-5162

                            </footer>

                        </body>

                        </html>

                    `);

                    printWindow.document.close();

                    printWindow.focus();

                    printWindow.print();

                } catch (_) {

                    message(
                        "Não foi possível imprimir.",
                        "error"
                    );

                }

            }
        );

        // ==================================
        // EVENTOS
        // ==================================

        generate.addEventListener(
            "click",
            loadReport
        );

        [

            "#reportStart",
            "#reportEnd",
            "#reportTechnician",
            "#reportCustomer",
            "#reportService",
            "#reportStatus"

        ].forEach(selector => {

            $(selector).addEventListener(
                "input",
                () => {

                    invalidateReport();

                    message(
                        "Filtros alterados. Gere um novo relatório."
                    );

                }
            );

        });

    }

    // ======================================
    // REGISTRAR MODULO
    // ======================================

    ERP.registerModule(
        "relatorios",
        loadRelatorios
    );

})();
