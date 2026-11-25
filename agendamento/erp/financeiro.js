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
