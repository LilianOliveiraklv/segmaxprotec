// ==========================================
// SEGMAX PROTEC - ERP 2.0
// MODULO DE ORDENS DE SERVICO
// ==========================================

"use strict";

(() => {

    const ERP = window.SEGMAX;

    if (!ERP) return;

    const db = ERP.db;

    const $ = selector =>
        document.querySelector(selector);

    const esc = ERP.escapeHTML;

    const serviceTypes = [

        "Instalação de câmeras",
        "Manutenção de câmeras",
        "Instalação de portão",
        "Manutenção de portão",
        "Instalação de cerca elétrica",
        "Manutenção de cerca elétrica",
        "Instalação de alarme",
        "Manutenção de alarme",
        "Controle de acesso",
        "Interfone",
        "Visita técnica",
        "Outros serviços"

    ];

    // ======================================
    // CARREGAR MODULO
    // ======================================

    async function loadServicos() {

        const version = ERP.getSessionVersion();

        const user = ERP.getUser();

        if (!user) return;

        const container = $("#servicosContent");

        container.textContent =
            "Carregando ordens de serviço...";

        const { data: technicians, error } = await db
            .from("technicians")
            .select("user_id,full_name,active")
            .order("full_name");

        if (version !== ERP.getSessionVersion()) {
            return;
        }

        if (error) {

            container.textContent =
                "Não foi possível consultar os técnicos.";

            return;

        }

        const names = new Map(

            technicians.map(item => [

                item.user_id,
                item.full_name

            ])

        );

        // ==================================
        // INTERFACE
        // ==================================

        container.innerHTML = `

            <div class="form-card">

                <h2>Nova ordem de serviço</h2>

                <p class="muted">
                    Registre o serviço contratado
                    pelo cliente.
                </p>

                <form id="serviceForm">

                    <div class="form-grid">

                        <div class="full-width">

                            <label for="serviceCustomerSearch">
                                Buscar cliente cadastrado
                            </label>

                            <input
                                id="serviceCustomerSearch"
                                placeholder="Digite o nome ou telefone"
                                autocomplete="off">

                        </div>

                        <div class="full-width">

                            <label for="serviceCustomer">
                                Cliente *
                            </label>

                            <select
                                id="serviceCustomer"
                                required>

                                <option value="">
                                    Pesquise um cliente
                                </option>

                            </select>

                            <p
                                id="serviceCapture"
                                class="muted">
                            </p>

                        </div>

                        <div>

                            <label for="serviceTechnician">
                                Técnico executor *
                            </label>

                            <select
                                id="serviceTechnician"
                                required>
                            </select>

                        </div>

                        <div>

                            <label for="serviceType">
                                Tipo de serviço *
                            </label>

                            <select
                                id="serviceType"
                                required>
                            </select>

                        </div>

                        <div class="full-width">

                            <label for="serviceDescription">
                                Descrição do serviço *
                            </label>

                            <textarea
                                id="serviceDescription"
                                maxlength="2000"
                                required
                                placeholder="Descreva o serviço e os equipamentos">
                            </textarea>

                        </div>

                        <div>

                            <label for="serviceDate">
                                Data do serviço *
                            </label>

                            <input
                                id="serviceDate"
                                type="date"
                                required>

                        </div>

                        <div>

                            <label for="serviceStatus">
                                Situação do serviço
                            </label>

                            <select id="serviceStatus">

                                <option>Pendente</option>

                                <option>Concluído</option>

                            </select>

                        </div>

                        <div>

                            <label for="serviceAmount">
                                Valor contratado (R$) *
                            </label>

                            <input
                                id="serviceAmount"
                                type="number"
                                min="0"
                                max="9999999.99"
                                step="0.01"
                                required>

                        </div>

                        <div>

                            <label for="serviceDiscount">
                                Desconto (R$)
                            </label>

                            <input
                                id="serviceDiscount"
                                type="number"
                                min="0"
                                step="0.01"
                                value="0"
                                required>

                        </div>

                        <div class="full-width">

                            <div class="stat-card">

                                <span>Valor final do serviço</span>

                                <strong id="serviceFinalAmount">
                                    R$ 0,00
                                </strong>

                            </div>

                        </div>

                        <div>

                            <label for="serviceWarranty">
                                Garantia até
                            </label>

                            <input
                                id="serviceWarranty"
                                type="date">

                        </div>

                        <div>

                            <label for="serviceNextPayment">
                                Previsão de pagamento
                            </label>

                            <input
                                id="serviceNextPayment"
                                type="date">

                        </div>

                        <div class="full-width">

                            <label for="serviceNotes">
                                Observações
                            </label>

                            <textarea
                                id="serviceNotes"
                                maxlength="1000">
                            </textarea>

                        </div>

                        <div class="full-width">

                            <button
                                type="submit"
                                id="saveService"
                                class="btn-primary">

                                Registrar ordem de serviço

                            </button>

                        </div>

                    </div>

                </form>

                <div
                    id="serviceMessage"
                    role="status"
                    aria-live="polite">
                </div>

            </div>

            <div class="table-card">

                <h2>Ordens de serviço registradas</h2>

                <div class="filters">

                    <div>

                        <label for="serviceStart">
                            Data inicial
                        </label>

                        <input
                            id="serviceStart"
                            type="date">

                    </div>

                    <div>

                        <label for="serviceEnd">
                            Data final
                        </label>

                        <input
                            id="serviceEnd"
                            type="date">

                    </div>

                    <div>

                        <label for="serviceFilterTechnician">
                            Técnico executor
                        </label>

                        <select id="serviceFilterTechnician">

                            <option value="">
                                Todos
                            </option>

                        </select>

                    </div>

                    <button
                        id="filterServices"
                        class="btn-secondary">

                        Consultar

                    </button>

                </div>

                <p
                    id="serviceCount"
                    class="muted">
                </p>

                <div
                    id="serviceList"
                    class="table-wrapper">
                </div>

                <div class="actions">

                    <button
                        id="servicePrevious"
                        class="btn-secondary"
                        disabled>

                        Anterior

                    </button>

                    <button
                        id="serviceNext"
                        class="btn-secondary"
                        disabled>

                        Próxima

                    </button>

                </div>

            </div>

        `;

        const form = $("#serviceForm");

        const customerSelect = $("#serviceCustomer");

        const technicianSelect = $("#serviceTechnician");

        const customerSearch = $("#serviceCustomerSearch");

        const technicianFilter =
            $("#serviceFilterTechnician");

        const typeSelect = $("#serviceType");

        const list = $("#serviceList");

        let customerMap = new Map();

        let customerRequest = 0;

        let listRequest = 0;

        let searchTimer;

        let saving = false;

        let page = 0;

        const pageSize = 25;

        function validSession() {

            return (

                version === ERP.getSessionVersion() &&

                form.isConnected

            );

        }

        // ==================================
        // CONFIGURAR CAMPOS
        // ==================================

        function message(text, type = "") {

            if (!validSession()) return;

            const element = $("#serviceMessage");

            element.textContent = text;

            element.className = type
                ? `message-${type}`
                : "";

        }

        typeSelect.append(

            new Option("Selecione o serviço", "")

        );

        serviceTypes.forEach(type => {

            typeSelect.append(

                new Option(type, type)

            );

        });

        technicianSelect.append(

            new Option("Selecione o técnico", "")

        );

        technicians.forEach(technician => {

            if (technician.active) {

                technicianSelect.append(

                    new Option(

                        technician.full_name,

                        technician.user_id

                    )

                );

            }

            technicianFilter.append(

                new Option(

                    technician.full_name,

                    technician.user_id

                )

            );

        });

        if (!ERP.isAdmin()) {

            technicianSelect.value = user.id;

        }

        function resetDates() {

            $("#serviceDate").value = ERP.today();

        }

        resetDates();

        $("#serviceStart").value =
            ERP.today().slice(0, 8) + "01";

        $("#serviceEnd").value = ERP.today();

        // ==================================
        // BUSCAR CLIENTES
        // ==================================

        async function searchCustomers() {

            if (!validSession()) return;

            const request = ++customerRequest;

            const search = customerSearch.value
                .trim()
                .replace(/[(),.%_*"\\]/g, " ")
                .trim();

            customerSelect.replaceChildren(

                new Option("Pesquisando...", "")

            );

            customerSelect.disabled = true;

            $("#serviceCapture").textContent = "";

            customerMap.clear();

            let query = db
                .from("customers")
                .select(
                    "id,full_name,phone,city,captured_by"
                )
                .eq("active", true)
                .order("full_name")
                .limit(50);

            if (search) {

                const digits = search.replace(/\D/g, "");

                const filters = [

                    `full_name.ilike.%${search}%`

                ];

                if (digits.length >= 3) {

                    filters.push(

                        `phone.ilike.%${digits}%`

                    );

                }

                query = query.or(filters.join(","));

            }

            const { data, error } = await query;

            if (

                !validSession() ||

                request !== customerRequest

            ) return;

            customerSelect.replaceChildren(

                new Option("Selecione o cliente", "")

            );

            customerSelect.disabled = false;

            if (error) {

                message(

                    "Não foi possível buscar clientes.",

                    "error"

                );

                return;

            }

            data.forEach(customer => {

                customerMap.set(

                    customer.id,

                    customer

                );

                customerSelect.append(

                    new Option(

                        `${customer.full_name} - ${customer.phone}`,

                        customer.id

                    )

                );

            });

            if (!data.length) {

                customerSelect.replaceChildren(

                    new Option(

                        "Nenhum cliente encontrado",

                        ""

                    )

                );

            }

        }

        customerSearch.addEventListener("input", () => {

            clearTimeout(searchTimer);

            customerRequest++;

            customerMap.clear();

            customerSelect.replaceChildren(

                new Option("Pesquisando...", "")

            );

            customerSelect.disabled = true;

            $("#serviceCapture").textContent = "";

            searchTimer = setTimeout(

                searchCustomers,

                350

            );

        });

        customerSelect.addEventListener("change", () => {

            const customer = customerMap.get(

                customerSelect.value

            );

            $("#serviceCapture").textContent = customer

                ? "Captado por: " +

                    (names.get(customer.captured_by) ||

                    "Não identificado")

                : "";

        });

        // ==================================
        // CALCULAR VALOR FINAL
        // ==================================

        function calculateTotal() {

            const amount = Number(

                $("#serviceAmount").value

            );

            const discount = Number(

                $("#serviceDiscount").value

            );

            const total = Math.round(

                (amount - discount) * 100

            ) / 100;

            $("#serviceFinalAmount").textContent =

                ERP.money(total);

            return total;

        }

        $("#serviceAmount").addEventListener(

            "input",

            calculateTotal

        );

        $("#serviceDiscount").addEventListener(

            "input",

            calculateTotal

        );

        // ==================================
        // CONSULTAR ORDENS DE SERVICO
        // ==================================

        async function loadList() {

            if (!validSession()) return;

            const request = ++listRequest;

            const start = $("#serviceStart").value;

            const end = $("#serviceEnd").value;

            if (start && end && start > end) {

                list.textContent =

                    "Período inválido.";

                return;

            }

            list.textContent = "Carregando...";

            $("#servicePrevious").disabled = true;

            $("#serviceNext").disabled = true;

            let query = db

                .from("service_financial_summary")

                .select(

                    "service_order_id,customer_name," +

                    "captured_by,technician_id," +

                    "service_type,service_date," +

                    "final_amount,total_paid," +

                    "balance_due,payment_status",

                    { count: "exact" }

                )

                .order("service_date", {

                    ascending: false

                })

                .order("service_order_id");

            if (start) {

                query = query.gte(

                    "service_date",

                    start

                );

            }

            if (end) {

                query = query.lte(

                    "service_date",

                    end

                );

            }

            if (technicianFilter.value) {

                query = query.eq(

                    "technician_id",

                    technicianFilter.value

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

                list.textContent =

                    "Consulta indisponível para este perfil.";

                return;

            }

            $("#serviceCount").textContent =

                `${count ?? 0} ordem(ns) encontrada(s)`;

            $("#servicePrevious").disabled = page === 0;

            $("#serviceNext").disabled =

                (page + 1) * pageSize >= (count ?? 0);

            if (!data.length) {

                list.textContent =

                    "Nenhum serviço encontrado.";

                return;

            }

            list.innerHTML = `

                <table>

                    <thead>

                        <tr>

                            <th>Data</th>
                            <th>Cliente</th>
                            <th>Serviço</th>
                            <th>Captador</th>
                            <th>Executor</th>
                            <th>Valor final</th>
                            <th>Pago</th>
                            <th>A receber</th>
                            <th>Pagamento</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${data.map(service => `

                            <tr>

                                <td>
                                    ${esc(ERP.formatDate(
                                        service.service_date
                                    ))}
                                </td>

                                <td>
                                    ${esc(service.customer_name)}
                                </td>

                                <td>
                                    ${esc(service.service_type)}
                                </td>

                                <td>
                                    ${esc(names.get(
                                        service.captured_by
                                    ) || "—")}
                                </td>

                                <td>
                                    ${esc(names.get(
                                        service.technician_id
                                    ) || "—")}
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

                                    <span class="status ${
                                        Number(service.balance_due) > 0
                                            ? "status-pending"
                                            : ""
                                    }">

                                        ${esc(service.payment_status)}

                                    </span>

                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            `;

        }

        $("#filterServices").addEventListener(

            "click",

            () => {

                page = 0;

                void loadList();

            }

        );

        $("#servicePrevious").addEventListener(

            "click",

            () => {

                if (page > 0) page--;

                void loadList();

            }

        );

        $("#serviceNext").addEventListener(

            "click",

            () => {

                page++;

                void loadList();

            }

        );

        // ==================================
        // REGISTRAR ORDEM DE SERVICO
        // ==================================

        form.addEventListener("submit", async event => {

            event.preventDefault();

            if (saving || !validSession()) return;

            const customer = customerMap.get(

                customerSelect.value

            );

            const technician = technicianSelect.value;

            const type = typeSelect.value;

            const description = $("#serviceDescription")

                .value.trim();

            const date = $("#serviceDate").value;

            const status = $("#serviceStatus").value;

            const amount = Number(

                $("#serviceAmount").value

            );

            const discount = Number(

                $("#serviceDiscount").value

            );

            const warranty = $("#serviceWarranty").value;

            const nextPayment = $("#serviceNextPayment").value;

            if (

                !customer ||

                !technician ||

                !type ||

                !description ||

                !date

            ) {

                message(

                    "Preencha os campos obrigatórios.",

                    "error"

                );

                return;

            }

            if (

                !Number.isFinite(amount) ||

                !Number.isFinite(discount) ||

                amount < 0 ||

                discount < 0 ||

                discount > amount

            ) {

                message(

                    "Confira o valor e o desconto.",

                    "error"

                );

                return;

            }

            if (

                status === "Concluído" &&

                date > ERP.today()

            ) {

                message(

                    "Um serviço futuro não pode estar concluído.",

                    "error"

                );

                return;

            }

            if (warranty && warranty < date) {

                message(

                    "A garantia não pode terminar antes do serviço.",

                    "error"

                );

                return;

            }

            const service = {

                customer_id: customer.id,

                technician_id: technician,

                service_type: type,

                description,

                service_date: date,

                total_amount: amount,

                discount,

                warranty_until: warranty || null,

                next_payment_date: nextPayment || null,

                status,

                notes:

                    $("#serviceNotes")

                        .value.trim() || null

            };

            const button = $("#saveService");

            saving = true;

            button.disabled = true;

            button.textContent = "Registrando...";

            try {

                const { error } = await db

                    .from("service_orders")

                    .insert(service);

                if (!validSession()) return;

                if (error) {

                    message(

                        "Não foi possível registrar. Confira os dados e as permissões.",

                        "error"

                    );

                    return;

                }

                form.reset();

                resetDates();

                if (!ERP.isAdmin()) {

                    technicianSelect.value = user.id;

                }

                $("#serviceCapture").textContent = "";

                calculateTotal();

                message(

                    "Ordem de serviço registrada com sucesso!",

                    "success"

                );

                page = 0;

                await loadList();

            } catch (_) {

                message(

                    "Falha na conexão. Confira a lista antes de tentar novamente.",

                    "error"

                );

            } finally {

                saving = false;

                if (validSession()) {

                    button.disabled = false;

                    button.textContent =

                        "Registrar ordem de serviço";

                }

            }

        });

        await Promise.all([

            searchCustomers(),

            loadList()

        ]);

    }

    ERP.registerModule(

        "servicos",

        loadServicos

    );

})();
