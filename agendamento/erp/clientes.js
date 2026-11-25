// ==========================================
// SEGMAX PROTEC - ERP 2.0
// MODULO DE CLIENTES - CRM
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
    // CARREGAR MODULO
    // ======================================

    async function loadClientes() {

        const version = ERP.getSessionVersion();

        const container = $("#clientesContent");

        const user = ERP.getUser();

        if (!user) return;

        container.textContent = "Carregando clientes...";

        const { data: technicians, error } = await db
            .from("technicians")
            .select("user_id, full_name, active")
            .order("full_name");

        if (version !== ERP.getSessionVersion()) {
            return;
        }

        if (error) {

            container.textContent =
                "Nao foi possivel consultar os socios.";

            return;

        }

        const activePartners = technicians.filter(
            item => item.active
        );

        const names = new Map(
            technicians.map(item => [
                item.user_id,
                item.full_name
            ])
        );

        // ==================================
        // FORMULARIO
        // ==================================

        container.innerHTML = `

            <div class="form-card">

                <h2>Novo cliente</h2>

                <p class="muted">
                    Registre os dados e a origem
                    da captacao do cliente.
                </p>

                <form id="customerForm">

                    <div class="form-grid">

                        <div>
                            <label for="customerName">
                                Nome completo *
                            </label>

                            <input
                                id="customerName"
                                maxlength="150"
                                required>
                        </div>

                        <div>
                            <label for="customerPhone">
                                Telefone / WhatsApp *
                            </label>

                            <input
                                id="customerPhone"
                                type="tel"
                                maxlength="20"
                                placeholder="(31) 99999-9999"
                                required>
                        </div>

                        <div>
                            <label for="customerCity">
                                Cidade *
                            </label>

                            <input
                                id="customerCity"
                                maxlength="100"
                                required>
                        </div>

                        <div>
                            <label for="customerNeighborhood">
                                Bairro
                            </label>

                            <input
                                id="customerNeighborhood"
                                maxlength="100">
                        </div>

                        <div class="full-width">
                            <label for="customerAddress">
                                Endereco
                            </label>

                            <input
                                id="customerAddress"
                                maxlength="250">
                        </div>

                        <div>
                            <label for="customerPartner">
                                Captado por *
                            </label>

                            <select
                                id="customerPartner"
                                required>
                            </select>
                        </div>

                        <div>
                            <label for="customerSource">
                                Origem do cliente
                            </label>

                            <select id="customerSource">

                                <option>Não informado</option>
                                <option>WhatsApp</option>
                                <option>Instagram</option>
                                <option>Facebook</option>
                                <option>Site</option>
                                <option>Google</option>
                                <option>Indicação</option>
                                <option>Cliente antigo</option>
                                <option>Prospecção direta</option>
                                <option>Outros</option>

                            </select>
                        </div>

                        <div class="full-width">
                            <label for="customerNotes">
                                Observacoes
                            </label>

                            <textarea
                                id="customerNotes"
                                maxlength="1000">
                            </textarea>
                        </div>

                        <div class="full-width">

                            <button
                                type="submit"
                                id="saveCustomer"
                                class="btn-primary">

                                Cadastrar cliente

                            </button>

                        </div>

                    </div>

                </form>

                <div
                    id="customerMessage"
                    role="status"
                    aria-live="polite">
                </div>

            </div>

            <div class="table-card">

                <h2>Clientes cadastrados</h2>

                <div class="filters">

                    <div>
                        <label for="customerSearch">
                            Pesquisar cliente
                        </label>

                        <input
                            id="customerSearch"
                            placeholder="Nome, telefone ou cidade">
                    </div>

                    <div>
                        <label for="partnerFilter">
                            Filtrar por captador
                        </label>

                        <select id="partnerFilter">
                            <option value="">
                                Todos os socios
                            </option>
                        </select>
                    </div>

                </div>

                <p id="customerCount" class="muted"></p>

                <div
                    id="customerList"
                    class="table-wrapper">
                </div>

                <div class="actions">

                    <button
                        id="customerPrevious"
                        class="btn-secondary"
                        disabled>
                        Anterior
                    </button>

                    <button
                        id="customerNext"
                        class="btn-secondary"
                        disabled>
                        Proxima
                    </button>

                </div>

            </div>

        `;

        const form = $("#customerForm");
        const partnerSelect = $("#customerPartner");
        const partnerFilter = $("#partnerFilter");
        const searchInput = $("#customerSearch");
        const list = $("#customerList");

        const pageSize = 25;

        let page = 0;
        let requestId = 0;
        let searchTimer;
        let saving = false;

        function validSession() {

            return (
                version === ERP.getSessionVersion() &&
                form.isConnected
            );

        }

        // ==================================
        // IDENTIFICAR CAPTADOR
        // ==================================

        if (ERP.isAdmin()) {

            partnerSelect.append(
                new Option("Selecione o socio", "")
            );

            activePartners.forEach(partner => {

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
                    names.get(user.id) || "Meu cadastro",
                    user.id
                )
            );

            partnerSelect.disabled = true;

        }

        technicians.forEach(partner => {

            partnerFilter.append(
                new Option(
                    partner.full_name,
                    partner.user_id
                )
            );

        });

        // ==================================
        // MENSAGENS
        // ==================================

        function message(text, type = "") {

            if (!validSession()) return;

            const element = $("#customerMessage");

            element.textContent = text;

            element.className = type
                ? `message-${type}`
                : "";

        }

        // ==================================
        // CONSULTAR CLIENTES
        // ==================================

        async function loadList() {

            if (!validSession()) return;

            const request = ++requestId;

            list.textContent = "Carregando...";

            $("#customerPrevious").disabled = true;
            $("#customerNext").disabled = true;

            let query = db
                .from("customers")
                .select(
                    "id,full_name,phone,city,neighborhood," +
                    "captured_by,source,created_at",
                    { count: "exact" }
                )
                .eq("active", true)
                .order("full_name")
                .order("id");

            const search = searchInput.value
                .trim()
                .replace(/[(),.%_*"\\]/g, " ")
                .trim();

            if (search) {

                const digits = search.replace(/\D/g, "");

                const filters = [
                    `full_name.ilike.%${search}%`,
                    `city.ilike.%${search}%`
                ];

                if (digits.length >= 3) {

                    filters.push(
                        `phone.ilike.%${digits}%`
                    );

                }

                query = query.or(filters.join(","));

            }

            if (partnerFilter.value) {

                query = query.eq(
                    "captured_by",
                    partnerFilter.value
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
            ) {
                return;
            }

            if (error) {

                list.textContent =
                    "Nao foi possivel consultar os clientes.";

                return;

            }

            $("#customerCount").textContent =
                `${count ?? 0} cliente(s) encontrado(s)`;

            $("#customerPrevious").disabled =
                page === 0;

            $("#customerNext").disabled =
                (page + 1) * pageSize >= (count ?? 0);

            if (!data.length) {

                list.textContent =
                    "Nenhum cliente encontrado.";

                return;

            }

            list.innerHTML = `

                <table>

                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Telefone</th>
                            <th>Cidade</th>
                            <th>Captador</th>
                            <th>Origem</th>
                            <th>Cadastro</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${data.map(customer => `

                            <tr>

                                <td>
                                    ${esc(customer.full_name)}
                                </td>

                                <td>
                                    ${esc(customer.phone)}
                                </td>

                                <td>
                                    ${esc(customer.city)}
                                </td>

                                <td>
                                    ${esc(
                                        names.get(
                                            customer.captured_by
                                        ) || "Nao identificado"
                                    )}
                                </td>

                                <td>
                                    ${esc(customer.source)}
                                </td>

                                <td>
                                    ${esc(
                                        ERP.formatDate(
                                            customer.created_at
                                        )
                                    )}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            `;

        }

        // ==================================
        // PESQUISA E PAGINACAO
        // ==================================

        searchInput.addEventListener("input", () => {

            clearTimeout(searchTimer);

            page = 0;

            searchTimer = setTimeout(loadList, 350);

        });

        partnerFilter.addEventListener("change", () => {

            page = 0;

            void loadList();

        });

        $("#customerPrevious").addEventListener(
            "click",
            () => {

                if (page > 0) page--;

                void loadList();

            }
        );

        $("#customerNext").addEventListener(
            "click",
            () => {

                page++;

                void loadList();

            }
        );

        // ==================================
        // CADASTRAR CLIENTE
        // ==================================

        form.addEventListener("submit", async event => {

            event.preventDefault();

            if (saving || !validSession()) return;

            const name = $("#customerName")
                .value.trim();

            const phone = $("#customerPhone")
                .value.replace(/\D/g, "");

            const city = $("#customerCity")
                .value.trim();

            const capturedBy = ERP.isAdmin()
                ? partnerSelect.value
                : user.id;

            if (!name || !city || !capturedBy) {

                message(
                    "Preencha os campos obrigatorios.",
                    "error"
                );

                return;

            }

            if (!/^\d{10,11}$/.test(phone)) {

                message(
                    "Informe o telefone com DDD.",
                    "error"
                );

                return;

            }

            const customer = {

                full_name: name,

                phone,

                city,

                neighborhood:
                    $("#customerNeighborhood")
                        .value.trim() || null,

                address:
                    $("#customerAddress")
                        .value.trim() || null,

                captured_by: capturedBy,

                source:
                    $("#customerSource").value,

                notes:
                    $("#customerNotes")
                        .value.trim() || null

            };

            const button = $("#saveCustomer");

            saving = true;

            button.disabled = true;

            button.textContent = "Salvando...";

            try {

                const { error } = await db
                    .from("customers")
                    .insert(customer);

                if (!validSession()) return;

                if (error) {

                    if (error.code === "23505") {

                        message(
                            "Cadastro duplicado. Confira os dados.",
                            "warning"
                        );

                    } else {

                        message(
                            "Cadastro nao autorizado ou dados invalidos.",
                            "error"
                        );

                    }

                    return;

                }

                form.reset();

                message(
                    "Cliente cadastrado com sucesso!",
                    "success"
                );

                page = 0;

                await loadList();

            } catch (_) {

                message(
                    "Falha na conexao. Confira a lista antes de tentar novamente.",
                    "error"
                );

            } finally {

                saving = false;

                if (validSession()) {

                    button.disabled = false;

                    button.textContent =
                        "Cadastrar cliente";

                }

            }

        });

        await loadList();

    }

    ERP.registerModule(
        "clientes",
        loadClientes
    );

})();
