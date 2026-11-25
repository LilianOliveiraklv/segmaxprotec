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
