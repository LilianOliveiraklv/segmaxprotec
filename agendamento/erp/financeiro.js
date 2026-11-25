// ==========================================
// SEGMAX PROTEC - ERP 2.0
// MODULO FINANCEIRO - PARTE 1
// PAGAMENTOS E CONTAS A RECEBER
// ==========================================

"use strict";

(() => {

    const ERP = window.SEGMAX;

    if (!ERP) return;

    const db = ERP.db;

    const $ = selector =>
        document.querySelector(selector);

    const esc = ERP.escapeHTML;

    // ======================================
    // REGISTRAR PAGAMENTOS
    // ======================================

    async function loadPagamentos() {

        const version = ERP.getSessionVersion();

        const user = ERP.getUser();

        if (!user) return;

        const container = $("#pagamentosContent");

        container.textContent = "Carregando...";

        const { data: technicians, error } = await db

            .from("technicians")

            .select("user_id,full_name,active")

            .eq("active", true)

            .order("full_name");

        if (version !== ERP.getSessionVersion()) {
            return;
        }

        if (error) {

            container.textContent =
                "Não foi possível consultar os sócios.";

            return;

        }

        // ==================================
        // FORMULARIO DE PAGAMENTO
        // ==================================

        container.innerHTML = `

            <div class="form-card">

                <h2>Registrar pagamento</h2>

                <p class="muted">
                    Selecione uma ordem de serviço
                    com saldo pendente.
                </p>

                <form id="paymentForm">

                    <div class="form-grid">

                        <div class="full-width">

                            <label for="paymentSearch">
                                Buscar cliente
                            </label>

                            <input
                                id="paymentSearch"
                                placeholder="Digite o nome do cliente">

                            <button
                                type="button"
                                id="paymentSearchButton"
                                class="btn-secondary">

                                Buscar serviços

                            </button>

                        </div>

                        <div class="full-width">

                            <label for="paymentService">
                                Ordem de serviço *
                            </label>

                            <select
                                id="paymentService"
                                required>

                                <option value="">
                                    Selecione o serviço
                                </option>

                            </select>

                        </div>

                        <div class="full-width">

                            <div class="dashboard-grid">

                                <div class="stat-card">

                                    <span>Valor contratado</span>

                                    <strong id="paymentTotal">
                                        —
                                    </strong>

                                </div>

                                <div class="stat-card">

                                    <span>Valor já pago</span>

                                    <strong id="paymentPaid">
                                        —
                                    </strong>

                                </div>

                                <div class="stat-card">

                                    <span>Saldo a receber</span>

                                    <strong id="paymentBalance">
                                        —
                                    </strong>

                                </div>

                            </div>

                        </div>

                        <div>

                            <label for="paymentAmount">
                                Valor do pagamento (R$) *
                            </label>

                            <input
                                id="paymentAmount"
                                type="number"
                                min="0.01"
                                step="0.01"
                                required>

                        </div>

                        <div>

                            <label for="paymentMethod">
                                Forma de pagamento *
                            </label>

                            <select
                                id="paymentMethod"
                                required>

                                <option>Pix</option>

                                <option>Dinheiro</option>

                                <option>Cartão de débito</option>

                                <option>Cartão de crédito</option>

                                <option>Transferência</option>

                                <option>Boleto</option>

                                <option>Outros</option>

                            </select>

                        </div>

                        <div>

                            <label for="paymentReceiver">
                                Recebido por *
                            </label>

                            <select
                                id="paymentReceiver"
                                required>
                            </select>

                        </div>

                        <div>

                            <label for="paymentDate">
                                Data do pagamento *
                            </label>

                            <input
                                id="paymentDate"
                                type="date"
                                required>

                        </div>

                        <div>

                            <label for="paymentInstallments">
                                Número de parcelas
                            </label>

                            <input
                                id="paymentInstallments"
                                type="number"
                                min="1"
                                max="12"
                                step="1"
                                value="1"
                                required>

                        </div>

                        <div>

                            <label for="paymentFee">
                                Taxa total da transação (R$)
                            </label>

                            <input
                                id="paymentFee"
                                type="number"
                                min="0"
                                step="0.01"
                                value="0"
                                required>

                        </div>

                        <div>

                            <label for="paymentReceived">
                                Situação do recebimento
                            </label>

                            <select id="paymentReceived">

                                <option value="true">
                                    Recebido
                                </option>

                                <option value="false">
                                    Aguardando recebimento
                                </option>

                            </select>

                        </div>

                        <div id="expectedDateGroup" hidden>

                            <label for="paymentExpected">
                                Previsão do primeiro recebimento
                            </label>

                            <input
                                id="paymentExpected"
                                type="date">

                        </div>

                        <div class="full-width">

                            <div class="stat-card">

                                <span>Valor líquido previsto</span>

                                <strong id="paymentNet">
                                    R$ 0,00
                                </strong>

                            </div>

                        </div>

                        <div class="full-width">

                            <label for="paymentNotes">
                                Observações
                            </label>

                            <textarea
                                id="paymentNotes"
                                maxlength="1000">
                            </textarea>

                        </div>

                        <div class="full-width">

                            <button
                                id="savePayment"
                                type="submit"
                                class="btn-primary">

                                Registrar pagamento

                            </button>

                        </div>

                    </div>

                </form>

                <div
                    id="paymentMessage"
                    role="status"
                    aria-live="polite">
                </div>

            </div>

        `;

        const form = $("#paymentForm");

        const serviceSelect = $("#paymentService");

        const receiver = $("#paymentReceiver");

        const method = $("#paymentMethod");

        const installments = $("#paymentInstallments");

        const received = $("#paymentReceived");

        const expected = $("#paymentExpected");

        const amount = $("#paymentAmount");

        const fee = $("#paymentFee");

        const date = $("#paymentDate");

        let services = new Map();

        let saving = false;

        let requestId = 0;

        function validSession() {

            return (

                version === ERP.getSessionVersion() &&

                form.isConnected

            );

        }

        function message(text, type = "") {

            if (!validSession()) return;

            const element = $("#paymentMessage");

            element.textContent = text;

            element.className = type
                ? `message-${type}`
                : "";

        }

        // ==================================
        // IDENTIFICAR RECEBEDOR
        // ==================================

        if (ERP.isAdmin()) {

            receiver.append(

                new Option("Selecione o sócio", "")

            );

            technicians.forEach(technician => {

                receiver.append(

                    new Option(

                        technician.full_name,

                        technician.user_id

                    )

                );

            });

        } else {

            const partner = technicians.find(

                item => item.user_id === user.id

            );

            receiver.append(

                new Option(

                    partner?.full_name || "Meu usuário",

                    user.id

                )

            );

            receiver.disabled = true;

        }

        date.value = ERP.today();

        date.max = ERP.today();

        // ==================================
        // CONSULTAR SERVICOS PENDENTES
        // ==================================

        function showBalance() {

            const service = services.get(

                serviceSelect.value

            );

            $("#paymentTotal").textContent =
                ERP.money(service?.final_amount);

            $("#paymentPaid").textContent =
                ERP.money(service?.total_paid);

            $("#paymentBalance").textContent =
                ERP.money(service?.balance_due);

            amount.value = "";

            if (service) {

                amount.max = service.balance_due;

            } else {

                amount.removeAttribute("max");

            }

            calculateNet();

        }

        async function searchServices() {

            if (!validSession()) return;

            const request = ++requestId;

            services.clear();

            serviceSelect.replaceChildren(

                new Option("Carregando...", "")

            );

            serviceSelect.disabled = true;

            showBalance();

            const search = $("#paymentSearch")

                .value.trim()

                .replace(/[%_\\]/g, "");

            let query = db

                .from("service_financial_summary")

                .select(

                    "service_order_id,customer_name," +

                    "service_type,service_date," +

                    "final_amount,total_paid,balance_due"

                )

                .gt("balance_due", 0)

                .order("service_date", {

                    ascending: false

                })

                .limit(50);

            if (search) {

                query = query.ilike(

                    "customer_name",

                    `%${search}%`

                );

            }

            const { data, error } = await query;

            if (

                !validSession() ||

                request !== requestId

            ) return;

            serviceSelect.replaceChildren(

                new Option("Selecione o serviço", "")

            );

            serviceSelect.disabled = false;

            if (error) {

                message(

                    "Não foi possível consultar os serviços.",

                    "error"

                );

                return;

            }

            data.forEach(service => {

                services.set(

                    service.service_order_id,

                    service

                );

                serviceSelect.append(

                    new Option(

                        `${service.customer_name} | ` +

                        `${service.service_type} | ` +

                        `${ERP.formatDate(service.service_date)} | ` +

                        `${ERP.money(service.balance_due)}`,

                        service.service_order_id

                    )

                );

            });

            if (!data.length) {

                serviceSelect.replaceChildren(

                    new Option(

                        "Nenhum serviço pendente encontrado",

                        ""

                    )

                );

            }

        }

        $("#paymentSearchButton").addEventListener(

            "click",

            searchServices

        );

        $("#paymentSearch").addEventListener(

            "keydown",

            event => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    void searchServices();

                }

            }

        );

        serviceSelect.addEventListener(

            "change",

            showBalance

        );

        // ==================================
        // CALCULAR VALOR LIQUIDO
        // ==================================

        function calculateNet() {

            const gross = Number(amount.value);

            const transactionFee = Number(fee.value);

            const net = Math.round(

                (gross - transactionFee) * 100

            ) / 100;

            $("#paymentNet").textContent =

                ERP.money(net);

        }

        amount.addEventListener(

            "input",

            calculateNet

        );

        fee.addEventListener(

            "input",

            calculateNet

        );

        // ==================================
        // CONTROLAR PARCELAMENTO
        // ==================================

        function updatePaymentFields() {

            const credit =

                method.value === "Cartão de crédito";

            installments.disabled = !credit;

            if (!credit) {

                installments.value = "1";

            }

            const multiple =

                Number(installments.value) > 1;

            if (multiple) {

                received.value = "false";

            }

            received.disabled = multiple;

            const pending =

                received.value === "false";

            $("#expectedDateGroup").hidden = !pending;

            expected.required = pending;

            expected.min = date.value;

            if (!pending) {

                expected.value = "";

            }

        }

        method.addEventListener(

            "change",

            updatePaymentFields

        );

        installments.addEventListener(

            "input",

            updatePaymentFields

        );

        received.addEventListener(

            "change",

            updatePaymentFields

        );

        date.addEventListener(

            "change",

            updatePaymentFields

        );

        updatePaymentFields();

        // ==================================
        // SALVAR PAGAMENTO VIA SUPABASE
        // ==================================

        form.addEventListener("submit", async event => {

            event.preventDefault();

            if (saving || !validSession()) return;

            const service = services.get(

                serviceSelect.value

            );

            const gross = Number(amount.value);

            const transactionFee = Number(fee.value);

            const quantity = Number(installments.value);

            const isReceived = received.value === "true";

            const receiverId = ERP.isAdmin()

                ? receiver.value

                : user.id;

            if (!service || !receiverId) {

                message(

                    "Selecione o serviço e o recebedor.",

                    "error"

                );

                return;

            }

            if (

                !Number.isFinite(gross) ||

                gross <= 0 ||

                gross > Number(service.balance_due)

            ) {

                message(

                    "O pagamento deve ser positivo e não pode exceder o saldo.",

                    "error"

                );

                return;

            }

            if (

                !Number.isFinite(transactionFee) ||

                transactionFee < 0 ||

                transactionFee > gross

            ) {

                message(

                    "Confira a taxa da transação.",

                    "error"

                );

                return;

            }

            if (

                !Number.isInteger(quantity) ||

                quantity < 1 ||

                quantity > 12 ||

                (

                    quantity > 1 &&

                    method.value !== "Cartão de crédito"

                )

            ) {

                message(

                    "Parcelamento inválido.",

                    "error"

                );

                return;

            }

            if (!date.value || date.value > ERP.today()) {

                message(

                    "Data de pagamento inválida.",

                    "error"

                );

                return;

            }

            if (

                !isReceived &&

                (

                    !expected.value ||

                    expected.value < date.value

                )

            ) {

                message(

                    "Informe uma previsão de recebimento válida.",

                    "error"

                );

                return;

            }

            const button = $("#savePayment");

            saving = true;

            button.disabled = true;

            button.textContent = "Registrando...";

            try {

                const { error } = await db.rpc(

                    "register_payment",

                    {

                        p_service_order_id:

                            service.service_order_id,

                        p_received_by: receiverId,

                        p_amount: gross,

                        p_payment_method: method.value,

                        p_payment_date: date.value,

                        p_installments: quantity,

                        p_transaction_fee: transactionFee,

                        p_first_expected_date:

                            isReceived

                                ? null

                                : expected.value,

                        p_received: isReceived,

                        p_notes:

                            $("#paymentNotes")

                                .value.trim() || null

                    }

                );

                if (!validSession()) return;

                if (error) {

                    message(

                        "Pagamento não registrado. Confira os valores e as permissões.",

                        "error"

                    );

                    return;

                }

                form.reset();

                date.value = ERP.today();

                if (!ERP.isAdmin()) {

                    receiver.value = user.id;

                }

                updatePaymentFields();

                calculateNet();

                message(

                    "Pagamento registrado com sucesso!",

                    "success"

                );

                await searchServices();

            } catch (_) {

                message(

                    "Falha de conexão. Confira os registros antes de tentar novamente.",

                    "error"

                );

            } finally {

                saving = false;

                if (validSession()) {

                    button.disabled = false;

                    button.textContent =

                        "Registrar pagamento";

                }

            }

        });

        await searchServices();

    }

    // ======================================
    // CONTAS A RECEBER
    // ======================================

    async function loadReceber() {

        const version = ERP.getSessionVersion();

        const container = $("#receberContent");

        if (!ERP.getUser()) return;

        container.innerHTML = `

            <div class="table-card">

                <h2>Saldos de clientes a receber</h2>

                <p class="muted">
                    Valores ainda não registrados como
                    pagamento nas ordens de serviço.
                </p>

                <div class="filters">

                    <div>

                        <label for="receivableSearch">
                            Buscar cliente
                        </label>

                        <input
                            id="receivableSearch"
                            placeholder="Nome do cliente">

                    </div>

                    <button
                        id="receivableFilter"
                        class="btn-secondary">

                        Consultar

                    </button>

                </div>

                <p id="receivableCount"></p>

                <div
                    id="receivableList"
                    class="table-wrapper">
                </div>

                <div class="actions">

                    <button
                        id="receivablePrevious"
                        class="btn-secondary"
                        disabled>

                        Anterior

                    </button>

                    <button
                        id="receivableNext"
                        class="btn-secondary"
                        disabled>

                        Próxima

                    </button>

                </div>

            </div>

        `;

        const list = $("#receivableList");

        const searchInput = $("#receivableSearch");

        let page = 0;

        let requestId = 0;

        const pageSize = 25;

        function validSession() {

            return (

                version === ERP.getSessionVersion() &&

                list.isConnected

            );

        }

        async function loadList() {

            if (!validSession()) return;

            const request = ++requestId;

            list.textContent = "Carregando...";

            $("#receivablePrevious").disabled = true;

            $("#receivableNext").disabled = true;

            let query = db

                .from("service_financial_summary")

                .select(

                    "service_order_id,customer_name," +

                    "service_type,final_amount,total_paid," +

                    "balance_due,next_payment_date,payment_status",

                    { count: "exact" }

                )

                .gt("balance_due", 0)

                .order("next_payment_date", {

                    ascending: true,

                    nullsFirst: false

                })

                .order("service_order_id");

            const search = searchInput.value

                .trim()

                .replace(/[%_\\]/g, "");

            if (search) {

                query = query.ilike(

                    "customer_name",

                    `%${search}%`

                );

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

            if (error) {

                list.textContent =

                    "Consulta financeira indisponível.";

                return;

            }

            $("#receivableCount").textContent =

                `${count ?? 0} serviço(s) com saldo pendente`;

            $("#receivablePrevious").disabled =

                page === 0;

            $("#receivableNext").disabled =

                (page + 1) * pageSize >= (count ?? 0);

            if (!data.length) {

                list.textContent =

                    "Nenhum saldo pendente encontrado.";

                return;

            }

            list.innerHTML = `

                <table>

                    <thead>

                        <tr>

                            <th>Cliente</th>
                            <th>Serviço</th>
                            <th>Valor final</th>
                            <th>Pago</th>
                            <th>A receber</th>
                            <th>Previsão</th>
                            <th>Situação</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${data.map(service => {

                            const overdue =

                                service.next_payment_date &&

                                service.next_payment_date < ERP.today();

                            return `

                                <tr>

                                    <td>
                                        ${esc(service.customer_name)}
                                    </td>

                                    <td>
                                        ${esc(service.service_type)}
                                    </td>

                                    <td>
                                        ${esc(ERP.money(
                                            service.final_amount
                                        ))}
                                    </td>

                                    <td>
                                        ${esc(ERP.money(
                                            service.total_paid
                                        ))}
                                    </td>

                                    <td>
                                        ${esc(ERP.money(
                                            service.balance_due
                                        ))}
                                    </td>

                                    <td>
                                        ${esc(ERP.formatDate(
                                            service.next_payment_date
                                        ))}
                                    </td>

                                    <td>

                                        <span class="status ${
                                            overdue
                                                ? "status-danger"
                                                : "status-pending"
                                        }">

                                            ${overdue

                                                ? "Vencido"

                                                : service.next_payment_date

                                                    ? "A receber"

                                                    : "Sem previsão"}

                                        </span>

                                    </td>

                                </tr>

                            `;

                        }).join("")}

                    </tbody>

                </table>

            `;

        }

        $("#receivableFilter").addEventListener(

            "click",

            () => {

                page = 0;

                void loadList();

            }

        );

        $("#receivablePrevious").addEventListener(

            "click",

            () => {

                if (page > 0) page--;

                void loadList();

            }

        );

        $("#receivableNext").addEventListener(

            "click",

            () => {

                page++;

                void loadList();

            }

        );

        await loadList();

    }

    // ======================================
    // REGISTRAR MODULOS
    // ======================================

    ERP.registerModule(

        "pagamentos",

        loadPagamentos

    );

    ERP.registerModule(

        "receber",

        loadReceber

    );

})();

// ==========================================
// SEGMAX PROTEC - ERP 2.0
// MODULO FINANCEIRO - PARTE 2
// LIQUIDACAO DE PAGAMENTOS E PARCELAS
// ==========================================

"use strict";

(() => {

    const ERP = window.SEGMAX;

    if (!ERP) return;

    const db = ERP.db;

    const esc = ERP.escapeHTML;

    const $ = selector =>
        document.querySelector(selector);

    // ======================================
    // PAINEL DE LIQUIDACOES
    // ======================================

    async function loadLiquidacoes() {

        const version = ERP.getSessionVersion();

        const user = ERP.getUser();

        if (!user) return;

        const container = $("#receberContent");

        if (!container) return;

        const previous = $("#settlementPanel");

        if (previous) previous.remove();

        const panel = document.createElement("div");

        panel.id = "settlementPanel";

        panel.className = "table-card";

        panel.innerHTML = `

            <h2>Recebimentos e liquidações</h2>

            <p class="muted">

                Confirme somente valores que
                efetivamente entraram na conta.

            </p>

            <div class="filters">

                <div>

                    <label for="settlementStart">
                        Previsão inicial
                    </label>

                    <input
                        id="settlementStart"
                        type="date"
                        required>

                </div>

                <div>

                    <label for="settlementEnd">
                        Previsão final
                    </label>

                    <input
                        id="settlementEnd"
                        type="date"
                        required>

                </div>

                <button
                    id="settlementSearch"
                    class="btn-secondary">

                    Consultar

                </button>

            </div>

            <div
                id="settlementMessage"
                role="status"
                aria-live="polite">
            </div>

            <h3>Pagamentos não parcelados</h3>

            <div
                id="singlePaymentList"
                class="table-wrapper">
            </div>

            <h3>Parcelas de cartão</h3>

            <div
                id="installmentList"
                class="table-wrapper">
            </div>

            <div
                id="settlementFormArea"
                hidden>

                <div class="form-card">

                    <h3>Confirmar recebimento</h3>

                    <p id="settlementDescription"></p>

                    <form id="settlementForm">

                        <div class="form-grid">

                            <div>

                                <label for="settlementDate">
                                    Data real do recebimento *
                                </label>

                                <input
                                    id="settlementDate"
                                    type="date"
                                    required>

                            </div>

                            <div>

                                <label for="settlementFee">
                                    Taxa real (R$) *
                                </label>

                                <input
                                    id="settlementFee"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required>

                            </div>

                            <div class="full-width">

                                <div class="stat-card">

                                    <span>
                                        Valor líquido recebido
                                    </span>

                                    <strong id="settlementNet">
                                        R$ 0,00
                                    </strong>

                                </div>

                            </div>

                            <div class="full-width">

                                <button
                                    type="submit"
                                    id="confirmSettlement"
                                    class="btn-success">

                                    Confirmar recebimento

                                </button>

                                <button
                                    type="button"
                                    id="cancelSettlement"
                                    class="btn-secondary">

                                    Cancelar

                                </button>

                            </div>

                        </div>

                    </form>

                </div>

            </div>

        `;

        container.append(panel);

        const records = new Map();

        let selected = null;

        let saving = false;

        let requestId = 0;

        function validSession() {

            return (

                version === ERP.getSessionVersion() &&

                panel.isConnected

            );

        }

        function message(text, type = "") {

            if (!validSession()) return;

            const element = $("#settlementMessage");

            element.textContent = text;

            element.className = type

                ? `message-${type}`

                : "";

        }

        // ==================================
        // PERIODO DE CONSULTA
        // ==================================

        function addDays(date, days) {

            const value = new Date(
                date + "T12:00:00Z"
            );

            value.setUTCDate(
                value.getUTCDate() + days
            );

            return value.toISOString().slice(0, 10);

        }

        $("#settlementStart").value =

            addDays(ERP.today(), -90);

        $("#settlementEnd").value =

            addDays(ERP.today(), 365);

        $("#settlementDate").value = ERP.today();

        $("#settlementDate").max = ERP.today();

        // ==================================
        // RENDERIZAR TABELAS
        // ==================================

        function renderTable(element, items, type) {

            if (!items.length) {

                element.textContent =

                    "Nenhum recebimento pendente no período.";

                return;

            }

            element.innerHTML = `

                <table>

                    <thead>

                        <tr>

                            <th>Identificação</th>
                            <th>Previsão</th>
                            <th>Valor bruto</th>
                            <th>Taxa prevista</th>
                            <th>Líquido previsto</th>
                            <th>Ação</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${items.map(item => {

                            const id = type === "installment"

                                ? item.installment_id

                                : item.id;

                            const key = `${type}:${id}`;

                            const gross = Number(

                                type === "installment"

                                    ? item.gross_amount

                                    : item.amount

                            );

                            const fee = Number(

                                item.transaction_fee || 0

                            );

                            const expectedDate =

                                type === "installment"

                                    ? item.expected_date

                                    : item.expected_settlement_date;

                            const description =

                                type === "installment"

                                    ? `${item.customer_name} - ` +

                                      `${item.installment_number}/` +

                                      `${item.total_installments}`

                                    : `Pagamento ${String(id).slice(0, 8)} - ` +

                                      `${item.payment_method}`;

                            records.set(key, {

                                id,

                                type,

                                gross,

                                fee,

                                description,

                                paymentDate:

                                    item.payment_date || null

                            });

                            return `

                                <tr>

                                    <td>
                                        ${esc(description)}
                                    </td>

                                    <td>
                                        ${esc(
                                            ERP.formatDate(expectedDate)
                                        )}
                                    </td>

                                    <td>
                                        ${esc(ERP.money(gross))}
                                    </td>

                                    <td>
                                        ${esc(ERP.money(fee))}
                                    </td>

                                    <td>
                                        ${esc(ERP.money(gross - fee))}
                                    </td>

                                    <td>

                                        <button
                                            type="button"
                                            class="btn-success"
                                            data-settlement="${esc(key)}">

                                            Confirmar

                                        </button>

                                    </td>

                                </tr>

                            `;

                        }).join("")}

                    </tbody>

                </table>

            `;

        }

        // ==================================
        // CONSULTAR RECEBIMENTOS
        // ==================================

        async function loadRecords() {

            if (!validSession() || saving) return;

            const start = $("#settlementStart").value;

            const end = $("#settlementEnd").value;

            if (!start || !end || start > end) {

                message(

                    "Informe um período válido.",

                    "error"

                );

                return;

            }

            const request = ++requestId;

            selected = null;

            records.clear();

            $("#settlementFormArea").hidden = true;

            $("#singlePaymentList").textContent =

                "Carregando pagamentos...";

            $("#installmentList").textContent =

                "Carregando parcelas...";

            let paymentsQuery = db

                .from("payments")

                .select(

                    "id,service_order_id,amount," +

                    "payment_method,payment_date," +

                    "received_by,transaction_fee," +

                    "expected_settlement_date"

                )

                .eq("installments", 1)

                .eq("settlement_status", "Pendente")

                .or(

                    `expected_settlement_date.is.null,` +

                    `and(expected_settlement_date.gte.${start},` +

                    `expected_settlement_date.lte.${end})`

                )

                .order("expected_settlement_date", {

                    ascending: true

                })

                .limit(100);

            if (!ERP.isAdmin()) {

                paymentsQuery = paymentsQuery.eq(

                    "received_by",

                    user.id

                );

            }

            const [payments, installments] =

                await Promise.all([

                    paymentsQuery,

                    db.rpc(

                        "get_payment_installments",

                        {

                            p_start_date: start,

                            p_end_date: end,

                            p_status: "Pendente"

                        }

                    )

                ]);

            if (

                !validSession() ||

                request !== requestId

            ) return;

            if (payments.error) {

                $("#singlePaymentList").textContent =

                    "Consulta indisponível para este perfil.";

            } else {

                renderTable(

                    $("#singlePaymentList"),

                    payments.data || [],

                    "payment"

                );

                if (payments.data?.length === 100) {

                    message(

                        "Limite de 100 pagamentos. Reduza o período.",

                        "warning"

                    );

                }

            }

            if (

                installments.error ||

                !Array.isArray(installments.data)

            ) {

                $("#installmentList").textContent =

                    "Não foi possível consultar as parcelas.";

            } else {

                renderTable(

                    $("#installmentList"),

                    installments.data,

                    "installment"

                );

            }

        }

        // ==================================
        // SELECIONAR RECEBIMENTO
        // ==================================

        panel.addEventListener("click", event => {

            const button = event.target.closest(

                "[data-settlement]"

            );

            if (!button || saving || !validSession()) {
                return;
            }

            selected = records.get(

                button.dataset.settlement

            );

            if (!selected) return;

            $("#settlementDescription").textContent =

                selected.description +

                " | Bruto: " +

                ERP.money(selected.gross);

            $("#settlementDate").value = ERP.today();

            $("#settlementDate").min =

                selected.paymentDate || "";

            $("#settlementFee").value = selected.fee;

            $("#settlementFee").max = selected.gross;

            $("#settlementFormArea").hidden = false;

            calculateNet();

            $("#settlementFormArea").scrollIntoView({

                behavior: "auto",

                block: "nearest"

            });

        });

        function calculateNet() {

            if (!selected) return;

            const fee = Number(

                $("#settlementFee").value

            );

            $("#settlementNet").textContent =

                ERP.money(selected.gross - fee);

        }

        $("#settlementFee").addEventListener(

            "input",

            calculateNet

        );

        $("#cancelSettlement").addEventListener(

            "click",

            () => {

                if (saving) return;

                selected = null;

                $("#settlementFormArea").hidden = true;

            }

        );

        // ==================================
        // CONFIRMAR LIQUIDACAO
        // ==================================

        $("#settlementForm").addEventListener(

            "submit",

            async event => {

                event.preventDefault();

                if (

                    saving ||

                    !selected ||

                    !validSession()

                ) return;

                const record = selected;

                const date = $("#settlementDate").value;

                const fee = Number(

                    $("#settlementFee").value

                );

                if (

                    !date ||

                    date > ERP.today() ||

                    (

                        record.paymentDate &&

                        date < record.paymentDate

                    )

                ) {

                    message(

                        "Data de recebimento inválida.",

                        "error"

                    );

                    return;

                }

                if (

                    !Number.isFinite(fee) ||

                    fee < 0 ||

                    fee > record.gross

                ) {

                    message(

                        "Confira a taxa informada.",

                        "error"

                    );

                    return;

                }

                const confirmed = window.confirm(

                    "Confirma o recebimento real de " +

                    ERP.money(record.gross - fee) +

                    " em " +

                    ERP.formatDate(date) +

                    "?"

                );

                if (!confirmed) return;

                const button = $("#confirmSettlement");

                saving = true;

                button.disabled = true;

                button.textContent = "Confirmando...";

                try {

                    let result;

                    if (record.type === "installment") {

                        result = await db.rpc(

                            "confirm_installment_settlement",

                            {

                                p_installment_id: record.id,

                                p_settlement_date: date,

                                p_transaction_fee: fee

                            }

                        );

                    } else {

                        result = await db.rpc(

                            "confirm_payment_settlement",

                            {

                                p_payment_id: record.id,

                                p_settlement_date: date,

                                p_transaction_fee: fee

                            }

                        );

                    }

                    if (!validSession()) return;

                    if (

                        result.error ||

                        result.data !== true

                    ) {

                        message(

                            "Recebimento não confirmado. Verifique permissões, datas e fechamento de caixa.",

                            "error"

                        );

                        return;

                    }

                    selected = null;

                    $("#settlementFormArea").hidden = true;

                    message(

                        "Recebimento confirmado com sucesso!",

                        "success"

                    );

                } catch (_) {

                    message(

                        "Falha de conexão. Consulte novamente antes de repetir a operação.",

                        "error"

                    );

                } finally {

                    saving = false;

                    if (validSession()) {

                        button.disabled = false;

                        button.textContent =

                            "Confirmar recebimento";

                        await loadRecords();

                    }

                }

            }

        );

        $("#settlementSearch").addEventListener(

            "click",

            () => {

                message("");

                void loadRecords();

            }

        );

        await loadRecords();

    }

    // ======================================
    // INTEGRAR AO MODULO CONTAS A RECEBER
    // ======================================

    document.addEventListener("DOMContentLoaded", () => {

        const button = document.querySelector(

            '#mainMenu [data-module="receber"]'

        );

        if (!button) return;

        button.addEventListener("click", () => {

            if (!ERP.getUser()) return;

            void loadLiquidacoes().catch(() => {

                ERP.notify(

                    "Não foi possível carregar as liquidações.",

                    "error"

                );

            });

        });

    });

})();


// ==========================================
// SEGMAX PROTEC - ERP 2.0
// MODULO FINANCEIRO - PARTE 3
// MATERIAIS E DESPESAS OPERACIONAIS
// ==========================================

"use strict";

(() => {

    const ERP = window.SEGMAX;

    if (!ERP) return;

    const db = ERP.db;

    const esc = ERP.escapeHTML;

    const $ = selector =>
        document.querySelector(selector);

    const categories = [

        "Combustível",
        "Ajudante",
        "Alimentação",
        "Pedágio",
        "Estacionamento",
        "Publicidade",
        "Ferramentas",
        "Manutenção de veículo",
        "Internet e telefone",
        "Despesas administrativas",
        "Outros"

    ];

    const methods = [

        "Pix",
        "Dinheiro",
        "Cartão de débito",
        "Cartão de crédito",
        "Transferência",
        "Boleto",
        "Outros"

    ];

    const units = [

        "Unidade",
        "Metro",
        "Kit",
        "Caixa",
        "Pacote",
        "Rolo",
        "Litro",
        "Outros"

    ];

    // ======================================
    // MODULO DE CUSTOS
    // ======================================

    async function loadCosts(type) {

        const version = ERP.getSessionVersion();

        const user = ERP.getUser();

        if (!user) return;

        const material = type === "material";

        const container = material

            ? $("#materiaisContent")

            : $("#despesasContent");

        const table = material

            ? "service_materials"

            : "daily_expenses";

        container.textContent = "Carregando...";

        const { data: partners, error } = await db

            .from("technicians")

            .select("user_id,full_name,active")

            .order("full_name");

        if (version !== ERP.getSessionVersion()) {
            return;
        }

        if (error) {

            container.textContent =

                "Não foi possível consultar os sócios.";

            return;

        }

        const names = new Map(

            partners.map(partner => [

                partner.user_id,

                partner.full_name

            ])

        );

        // ==================================
        // FORMULARIO
        // ==================================

        container.innerHTML = `

            <div class="form-card">

                <h2>

                    ${material

                        ? "Registrar material"

                        : "Registrar despesa"}

                </h2>

                <p class="muted">

                    ${material

                        ? "Vincule o custo à ordem de serviço."

                        : "Registre os gastos operacionais da empresa."}

                </p>

                <form data-field="form">

                    <div class="form-grid">

                        ${material ? `

                            <div class="full-width">

                                <label>
                                    Buscar cliente
                                </label>

                                <input
                                    data-field="search"
                                    placeholder="Nome do cliente">

                                <button
                                    type="button"
                                    data-field="searchButton"
                                    class="btn-secondary">

                                    Buscar serviços

                                </button>

                            </div>

                            <div class="full-width">

                                <label>
                                    Ordem de serviço *
                                </label>

                                <select
                                    data-field="service"
                                    required>

                                    <option value="">
                                        Selecione o serviço
                                    </option>

                                </select>

                            </div>

                            <div class="full-width">

                                <label>
                                    Nome do material *
                                </label>

                                <input
                                    data-field="description"
                                    maxlength="150"
                                    placeholder="Ex.: Motor Rossi"
                                    required>

                            </div>

                            <div>

                                <label>Quantidade *</label>

                                <input
                                    data-field="quantity"
                                    type="number"
                                    min="0.001"
                                    step="0.001"
                                    value="1"
                                    required>

                            </div>

                            <div>

                                <label>Unidade</label>

                                <select
                                    data-field="unit">
                                </select>

                            </div>

                            <div>

                                <label>
                                    Custo unitário (R$) *
                                </label>

                                <input
                                    data-field="amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    required>

                            </div>

                        ` : `

                            <div>

                                <label>Categoria *</label>

                                <select
                                    data-field="category"
                                    required>
                                </select>

                            </div>

                            <div>

                                <label>
                                    Valor da despesa (R$) *
                                </label>

                                <input
                                    data-field="amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    required>

                            </div>

                            <div class="full-width">

                                <label>Descrição *</label>

                                <input
                                    data-field="description"
                                    maxlength="250"
                                    placeholder="Ex.: Diária do ajudante"
                                    required>

                            </div>

                            <div>

                                <label>
                                    Forma de pagamento
                                </label>

                                <select
                                    data-field="method"
                                    required>
                                </select>

                            </div>

                        `}

                        <div>

                            <label>Pago por *</label>

                            <select
                                data-field="partner"
                                required>
                            </select>

                        </div>

                        <div>

                            <label>Data do gasto *</label>

                            <input
                                data-field="date"
                                type="date"
                                required>

                        </div>

                        <div class="full-width">

                            <label>Observações</label>

                            <textarea
                                data-field="notes"
                                maxlength="1000">
                            </textarea>

                        </div>

                        <div class="full-width">

                            <div class="stat-card">

                                <span>Custo total</span>

                                <strong data-field="total">
                                    R$ 0,00
                                </strong>

                            </div>

                        </div>

                        <div class="full-width">

                            <button
                                type="submit"
                                data-field="save"
                                class="btn-primary">

                                Registrar gasto

                            </button>

                        </div>

                    </div>

                </form>

                <div
                    data-field="message"
                    role="status"
                    aria-live="polite">
                </div>

            </div>

            <div class="table-card">

                <h2>

                    ${material

                        ? "Materiais registrados"

                        : "Despesas registradas"}

                </h2>

                <div class="filters">

                    <div>

                        <label>Data inicial</label>

                        <input
                            data-field="start"
                            type="date">

                    </div>

                    <div>

                        <label>Data final</label>

                        <input
                            data-field="end"
                            type="date">

                    </div>

                    <div>

                        <label>Pago por</label>

                        <select data-field="filterPartner">

                            <option value="">
                                Todos
                            </option>

                        </select>

                    </div>

                    <button
                        data-field="filter"
                        class="btn-secondary">

                        Consultar

                    </button>

                </div>

                <div
                    data-field="list"
                    class="table-wrapper">
                </div>

                <div class="actions">

                    <button
                        data-field="previous"
                        class="btn-secondary"
                        disabled>

                        Anterior

                    </button>

                    <button
                        data-field="next"
                        class="btn-secondary"
                        disabled>

                        Próxima

                    </button>

                </div>

                <div class="stat-card">

                    <span>Total desta página</span>

                    <strong data-field="pageTotal">
                        R$ 0,00
                    </strong>

                </div>

            </div>

        `;

        // ==================================
        // CAMPOS E VARIAVEIS
        // ==================================

        const field = name =>

            container.querySelector(

                `[data-field="${name}"]`

            );

        const form = field("form");

        const partnerSelect = field("partner");

        const filterPartner = field("filterPartner");

        let saving = false;

        let page = 0;

        let listRequest = 0;

        let searchRequest = 0;

        const pageSize = 25;

        const services = new Map();

        function validSession() {

            return (

                version === ERP.getSessionVersion() &&

                form.isConnected

            );

        }

        function message(text, type = "") {

            if (!validSession()) return;

            const element = field("message");

            element.textContent = text;

            element.className = type

                ? `message-${type}`

                : "";

        }

        function addOptions(element, options) {

            options.forEach(value => {

                element.append(

                    new Option(value, value)

                );

            });

        }

        if (material) {

            addOptions(field("unit"), units);

        } else {

            addOptions(field("category"), categories);

            addOptions(field("method"), methods);

        }

        // ==================================
        // IDENTIFICAR QUEM PAGOU
        // ==================================

        if (ERP.isAdmin()) {

            partnerSelect.append(

                new Option("Selecione o sócio", "")

            );

            partners

                .filter(partner => partner.active)

                .forEach(partner => {

                    partnerSelect.append(

                        new Option(

                            partner.full_name,

                            partner.user_id

                        )

                    );

                });

        } else {

            partnerSelect.append(

                new Option(

                    names.get(user.id) || "Meu usuário",

                    user.id

                )

            );

            partnerSelect.disabled = true;

        }

        partners.forEach(partner => {

            filterPartner.append(

                new Option(

                    partner.full_name,

                    partner.user_id

                )

            );

        });

        field("date").value = ERP.today();

        field("date").max = ERP.today();

        field("start").value =

            ERP.today().slice(0, 8) + "01";

        field("end").value = ERP.today();

        // ==================================
        // BUSCAR ORDEM DE SERVICO
        // ==================================

        async function searchServices() {

            if (!material || !validSession()) return;

            const request = ++searchRequest;

            const select = field("service");

            services.clear();

            select.replaceChildren(

                new Option("Carregando...", "")

            );

            select.disabled = true;

            const search = field("search")

                .value.trim()

                .replace(/[%_\\]/g, "");

            let query = db

                .from("service_financial_summary")

                .select(

                    "service_order_id,customer_name," +

                    "service_type,service_date"

                )

                .order("service_date", {

                    ascending: false

                })

                .limit(50);

            if (search) {

                query = query.ilike(

                    "customer_name",

                    `%${search}%`

                );

            }

            const { data, error } = await query;

            if (

                !validSession() ||

                request !== searchRequest

            ) return;

            select.replaceChildren(

                new Option("Selecione o serviço", "")

            );

            select.disabled = false;

            if (error) {

                message(

                    "Não foi possível consultar os serviços.",

                    "error"

                );

                return;

            }

            data.forEach(service => {

                services.set(

                    service.service_order_id,

                    service

                );

                select.append(

                    new Option(

                        `${service.customer_name} | ` +

                        `${service.service_type} | ` +

                        `${ERP.formatDate(service.service_date)}`,

                        service.service_order_id

                    )

                );

            });

            if (!data.length) {

                select.replaceChildren(

                    new Option(

                        "Nenhum serviço encontrado",

                        ""

                    )

                );

            }

        }

        if (material) {

            field("searchButton").addEventListener(

                "click",

                searchServices

            );

            field("search").addEventListener(

                "keydown",

                event => {

                    if (event.key === "Enter") {

                        event.preventDefault();

                        void searchServices();

                    }

                }

            );

        }

        // ==================================
        // CALCULAR CUSTO
        // ==================================

        function calculateTotal() {

            const amount = Number(

                field("amount").value

            );

            const quantity = material

                ? Number(field("quantity").value)

                : 1;

            const total = Math.round(

                amount * quantity * 100

            ) / 100;

            field("total").textContent =

                ERP.money(total);

            return total;

        }

        field("amount").addEventListener(

            "input",

            calculateTotal

        );

        if (material) {

            field("quantity").addEventListener(

                "input",

                calculateTotal

            );

        }

        // ==================================
        // CONSULTAR GASTOS
        // ==================================

        async function loadList() {

            if (!validSession()) return;

            const request = ++listRequest;

            const start = field("start").value;

            const end = field("end").value;

            if (start && end && start > end) {

                field("list").textContent =

                    "Período inválido.";

                field("pageTotal").textContent = "—";

                return;

            }

            field("list").textContent = "Carregando...";

            field("pageTotal").textContent = "—";

            field("previous").disabled = true;

            field("next").disabled = true;

            const columns = material

                ? "id,service_order_id,material_name," +

                  "quantity,unit,unit_cost,total_cost," +

                  "paid_by,expense_date"

                : "id,category,description,amount," +

                  "paid_by,payment_method,expense_date";

            let query = db

                .from(table)

                .select(columns, { count: "exact" })

                .order("expense_date", {

                    ascending: false

                })

                .order("id");

            if (start) {

                query = query.gte(

                    "expense_date",

                    start

                );

            }

            if (end) {

                query = query.lte(

                    "expense_date",

                    end

                );

            }

            if (filterPartner.value) {

                query = query.eq(

                    "paid_by",

                    filterPartner.value

                );

            }

            const { data, error, count } = await query

                .range(

                    page * pageSize,

                    (page + 1) * pageSize - 1

                );

            if (

                !validSession() ||

                request !== listRequest

            ) return;

            if (error) {

                field("list").textContent =

                    "Consulta indisponível para este perfil.";

                return;

            }

            field("previous").disabled = page === 0;

            field("next").disabled =

                (page + 1) * pageSize >= (count ?? 0);

            const total = data.reduce(

                (sum, item) => sum +

                    Number(

                        material

                            ? item.total_cost

                            : item.amount

                    ),

                0

            );

            field("pageTotal").textContent =

                ERP.money(total);

            if (!data.length) {

                field("list").textContent =

                    "Nenhum gasto encontrado.";

                return;

            }

            // Identificar clientes dos materiais.

            const orderNames = new Map();

            if (material) {

                const ids = [

                    ...new Set(

                        data.map(

                            item => item.service_order_id

                        )

                    )

                ];

                const result = await db

                    .from("service_financial_summary")

                    .select(

                        "service_order_id,customer_name"

                    )

                    .in("service_order_id", ids);

                if (

                    !validSession() ||

                    request !== listRequest

                ) return;

                if (!result.error) {

                    result.data.forEach(order => {

                        orderNames.set(

                            order.service_order_id,

                            order.customer_name

                        );

                    });

                }

            }

            field("list").innerHTML = `

                <table>

                    <thead>

                        <tr>

                            <th>Data</th>

                            <th>

                                ${material

                                    ? "Cliente"

                                    : "Categoria"}

                            </th>

                            <th>Descrição</th>

                            ${material

                                ? "<th>Quantidade</th>"

                                : "<th>Pagamento</th>"}

                            <th>Pago por</th>

                            <th>Valor</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${data.map(item => `

                            <tr>

                                <td>

                                    ${esc(ERP.formatDate(

                                        item.expense_date

                                    ))}

                                </td>

                                <td>

                                    ${esc(material

                                        ? orderNames.get(

                                            item.service_order_id

                                        ) || "Não disponível"

                                        : item.category)}

                                </td>

                                <td>

                                    ${esc(material

                                        ? item.material_name

                                        : item.description)}

                                </td>

                                <td>

                                    ${esc(material

                                        ? `${item.quantity} ${item.unit}`

                                        : item.payment_method)}

                                </td>

                                <td>

                                    ${esc(

                                        names.get(item.paid_by)

                                        || "Não identificado"

                                    )}

                                </td>

                                <td>

                                    ${esc(ERP.money(material

                                        ? item.total_cost

                                        : item.amount))}

                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            `;

        }

        field("filter").addEventListener(

            "click",

            () => {

                page = 0;

                void loadList();

            }

        );

        field("previous").addEventListener(

            "click",

            () => {

                if (page > 0) page--;

                void loadList();

            }

        );

        field("next").addEventListener(

            "click",

            () => {

                page++;

                void loadList();

            }

        );

        // ==================================
        // REGISTRAR GASTO
        // ==================================

        form.addEventListener(

            "submit",

            async event => {

                event.preventDefault();

                if (saving || !validSession()) return;

                const description = field("description")

                    .value.trim();

                const amount = Number(

                    field("amount").value

                );

                const quantity = material

                    ? Number(field("quantity").value)

                    : 1;

                const date = field("date").value;

                const partnerId = ERP.isAdmin()

                    ? partnerSelect.value

                    : user.id;

                const notes = field("notes")

                    .value.trim() || null;

                if (!description || !partnerId || !date) {

                    message(

                        "Preencha os campos obrigatórios.",

                        "error"

                    );

                    return;

                }

                if (

                    !Number.isFinite(amount) ||

                    amount <= 0 ||

                    !Number.isFinite(quantity) ||

                    quantity <= 0 ||

                    calculateTotal() <= 0

                ) {

                    message(

                        "Confira os valores e quantidades.",

                        "error"

                    );

                    return;

                }

                if (date > ERP.today()) {

                    message(

                        "Não é permitido registrar gastos futuros.",

                        "error"

                    );

                    return;

                }

                let payload;

                if (material) {

                    const serviceId = field("service").value;

                    if (!services.has(serviceId)) {

                        message(

                            "Selecione uma ordem de serviço.",

                            "error"

                        );

                        return;

                    }

                    payload = {

                        service_order_id: serviceId,

                        material_name: description,

                        quantity,

                        unit: field("unit").value,

                        unit_cost: amount,

                        paid_by: partnerId,

                        expense_date: date,

                        notes

                    };

                } else {

                    payload = {

                        category: field("category").value,

                        description,

                        amount,

                        paid_by: partnerId,

                        payment_method: field("method").value,

                        expense_date: date,

                        notes

                    };

                }

                const confirmed = window.confirm(

                    "Confirma o registro deste gasto de " +

                    ERP.money(calculateTotal()) +

                    "?"

                );

                if (!confirmed) return;

                const button = field("save");

                saving = true;

                button.disabled = true;

                button.textContent = "Registrando...";

                try {

                    const { error } = await db

                        .from(table)

                        .insert(payload);

                    if (!validSession()) return;

                    if (error) {

                        message(

                            "Gasto não registrado. Confira os dados, permissões e fechamento de caixa.",

                            "error"

                        );

                        return;

                    }

                    form.reset();

                    field("date").value = ERP.today();

                    if (!ERP.isAdmin()) {

                        partnerSelect.value = user.id;

                    }

                    calculateTotal();

                    message(

                        "Gasto registrado com sucesso!",

                        "success"

                    );

                    page = 0;

                    await loadList();

                } catch (_) {

                    message(

                        "Falha de conexão. Confira os registros antes de repetir.",

                        "error"

                    );

                } finally {

                    saving = false;

                    if (validSession()) {

                        button.disabled = false;

                        button.textContent =

                            "Registrar gasto";

                    }

                }

            }

        );

        await Promise.all([

            loadList(),

            material

                ? searchServices()

                : Promise.resolve()

        ]);

    }

    // ======================================
    // REGISTRAR MODULOS
    // ======================================

    ERP.registerModule(

        "materiais",

        () => loadCosts("material")

    );

    ERP.registerModule(

        "despesas",

        () => loadCosts("expense")

    );

})();

