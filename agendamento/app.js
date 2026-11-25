
// SEGMAX PROTEC - Sistema de agendamento
const SUPABASE_URL = "https://zmmgvptazjjtcydltnvf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cGXbORnLTBKcDTAyX11Lcg_YtVaMWZ1";

const ADMIN_ID = "0bc09a34-009c-462b-ad69-32b45e8b00fb";
const db = window.supabase.createClient(
  SUPABASE_URL, SUPABASE_ANON_KEY
);

const $ = s => document.querySelector(s);
const TZ = "America/Sao_Paulo";

let isAdmin = false;
let technicians = [];
let recovering = location.hash.includes("type=recovery");

const cityList = [
  "Santa Luzia","Belo Horizonte","Sabará","Caeté",
  "Vespasiano","São José da Lapa","Lagoa Santa",
  "Confins","Pedro Leopoldo","Matozinhos",
  "Capim Branco","Prudente de Morais","Sete Lagoas",
  "Ribeirão das Neves","Esmeraldas","Contagem",
  "Betim","Igarapé","São Joaquim de Bicas",
  "Mateus Leme","Juatuba","Florestal",
  "Jaboticatubas","Taquaraçu de Minas","Baldim",
  "Santana do Riacho","Nova União",
  "Bom Jesus do Amparo","São Gonçalo do Rio Abaixo",
  "Barão de Cocais","Itabira","Raposos",
  "Rio Acima","Nova Lima","Santa Bárbara"
];

function option(value, label) {
  return new Option(label, value);
}

cityList.sort((a,b) => a.localeCompare(b,"pt-BR"))
  .forEach(c => $("#city").append(option(c,c)));

function msg(el, text, type = "") {
  el.textContent = text;
  el.className = "message " + type;
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g,c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",
    '"':"&quot;","'":"&#39;"
  }[c]));
}

function localDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year:"numeric",month:"2-digit",day:"2-digit"
  }).format(new Date(value));
}

function localTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone:TZ,hour:"2-digit",minute:"2-digit",
    hourCycle:"h23"
  }).format(new Date(value));
}

// AGENDAMENTO DO CLIENTE

let dateRequest = 0;
let slotRequest = 0;

async function loadDates() {
  const request = ++dateRequest;
  ++slotRequest;

  const date = $("#date");
  const slot = $("#slot");
  const service =
    $("#bookingForm select[name=service]").value;

  date.replaceChildren(option("","Carregando datas..."));
  date.disabled = true;
  slot.replaceChildren(option("","Escolha uma data"));
  slot.disabled = true;

  if (!service) {
    date.replaceChildren(option("","Selecione o serviço"));
    return;
  }

  const {data,error} = await db.rpc(
    "available_dates",{p_service:service}
  );

  if (request !== dateRequest) return;

  if (error) {
    date.replaceChildren(option("","Erro ao carregar datas"));
    console.error(error);
    return;
  }

  date.replaceChildren(option("","Selecione uma data"));

  (data || []).forEach(row => {
    const v = row.available_date;
    date.append(option(v,
      new Date(v+"T12:00:00").toLocaleDateString(
        "pt-BR",{
          weekday:"long",day:"2-digit",
          month:"2-digit",year:"numeric"
        }
      )
    ));
  });

  date.disabled = !data?.length;
  if (!data?.length) {
    date.replaceChildren(option("","Sem datas disponíveis"));
  }
}

async function loadSlots() {
  const request = ++slotRequest;
  const slot = $("#slot");
  const date = $("#date").value;
  const service =
    $("#bookingForm select[name=service]").value;

  slot.disabled = true;
  slot.replaceChildren(option("","Carregando horários..."));

  if (!date || !service) return;

  const {data,error} = await db.rpc(
    "available_slots",{
      p_date:date,p_service:service
    }
  );

  if (request !== slotRequest) return;

  if (error) {
    slot.replaceChildren(option("","Horários indisponíveis"));
    return;
  }

  slot.replaceChildren(option("","Selecione um horário"));

  (data || []).forEach(s =>
    slot.append(option(s.slot,s.slot))
  );

  slot.disabled = !data?.length;

  if (!data?.length) {
    slot.replaceChildren(option("","Sem horários livres"));
  }
}

$("#date").onchange = loadSlots;
$("#bookingForm select[name=service]").onchange = loadDates;

$("#bookingForm button[type=submit]").textContent =
  "Solicitar agendamento";

$(".hero p:last-child").textContent =
  "Sem cadastro e sem senha. Escolha o serviço e solicite um horário disponível.";

$("#bookingForm").onsubmit = async e => {
  e.preventDefault();

  const form = e.currentTarget;
  const f = new FormData(form);
  const button = form.querySelector("button[type=submit]");

  const payload = {
    p_client_name:f.get("name").trim(),
    p_phone:f.get("phone").trim(),
    p_city:f.get("city"),
    p_service:f.get("service"),
    p_notes:(f.get("notes") || "").trim(),
    p_date:$("#date").value,
    p_slot:$("#slot").value
  };

  button.disabled = true;
  button.textContent = "Enviando...";

  try {
    const {error} = await db.rpc("book_appointment",payload);

    if (error) throw error;

    msg($("#bookingMessage"),
      "Solicitação recebida! Aguarde a aprovação da SEGMAX PROTEC.",
      "success");

    form.reset();
    await loadDates();

  } catch(error) {
    msg($("#bookingMessage"),
      "Não foi possível solicitar. Verifique os horários e tente novamente.",
      "error");
    console.error(error);
    await loadDates();
  } finally {
    button.disabled = false;
    button.textContent = "Solicitar agendamento";
  }
};
// CARTÕES DE DISPONIBILIDADE

function renderAvailabilityCards(selectId, containerId) {
  const select = document.getElementById(selectId);
  const container = document.getElementById(containerId);

  if (!select || !container) return;

  container.replaceChildren();

  const options = Array.from(select.options)
    .filter(o => o.value && !o.disabled);

  if (select.disabled || !options.length) {
    const message = document.createElement("p");
    message.className = "availability-message";
    message.textContent =
      select.options[0]?.textContent ||
      "Nenhuma opção disponível.";

    container.append(message);
    return;
  }

  options.forEach(o => {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "availability-card";

    card.classList.toggle(
      "selected", select.value === o.value
    );

    card.setAttribute(
      "aria-pressed",
      String(select.value === o.value)
    );

    if (selectId === "date") {
      const day = new Date(o.value + "T12:00:00");

      const weekday = document.createElement("span");
      weekday.className = "card-weekday";
      weekday.textContent = day.toLocaleDateString(
        "pt-BR", {weekday:"short"}
      );

      const number = document.createElement("strong");
      number.className = "card-day";
      number.textContent = day.toLocaleDateString(
        "pt-BR", {day:"2-digit"}
      );

      const month = document.createElement("span");
      month.className = "card-month";
      month.textContent = day.toLocaleDateString(
        "pt-BR", {month:"short",year:"numeric"}
      );

      card.append(weekday, number, month);

    } else {
      card.textContent = o.textContent;
    }

    card.onclick = () => {
      select.value = o.value;

      select.dispatchEvent(
        new Event("change", {bubbles:true})
      );

      renderAvailabilityCards(
        selectId, containerId
      );
    };

    container.append(card);
  });
}

function activateAvailabilityCards(
  selectId, containerId
) {
  const select = document.getElementById(selectId);
  const container = document.getElementById(containerId);

  if (!select || !container) return;

  const refresh = () =>
    renderAvailabilityCards(selectId, containerId);

  const observer = new MutationObserver(refresh);

  observer.observe(select, {
    childList:true,
    subtree:true,
    attributes:true
  });

  select.addEventListener("change", refresh);

  refresh();
}

activateAvailabilityCards("date", "dateCards");
activateAvailabilityCards("slot", "slotCards");
// AUTENTICAÇÃO

$("#loginOpen").textContent = "Área da equipe";
$("#authPanel h2").textContent = "Área da equipe";

$("#loginOpen").onclick = () =>
  $("#authPanel").classList.remove("hidden");

$("#closeAuth").onclick = () =>
  $("#authPanel").classList.add("hidden");


// LOGIN COM TELEFONE OU E-MAIL

const loginInput = $("#loginForm input[name=email]");

loginInput.type = "text";
loginInput.placeholder = "Telefone ou e-mail";
loginInput.autocomplete = "username";

loginInput.closest("label").firstChild.textContent =
  "Telefone ou e-mail";

$("#loginForm").onsubmit = async e => {
  e.preventDefault();

  const f = new FormData(e.currentTarget);
  let login = f.get("email").trim().toLowerCase();

  if (!login.includes("@")) {
    let phone = login.replace(/\D/g, "");

    if (phone.length === 11) {
      phone = "55" + phone;
    }

    if (!/^55\d{11}$/.test(phone)) {
      msg($("#loginMessage"),
        "Informe um celular válido com DDD.",
        "error");
      return;
    }

    login = phone + "@tecnicos.segmaxprotec.com.br";
  }

  const {error} = await db.auth.signInWithPassword({
    email:login,
    password:f.get("password")
  });

  if (error) {
    msg($("#loginMessage"),
      "Telefone, e-mail ou senha inválidos.",
      "error");
    return;
  }

  $("#loginForm").reset();
  $("#loginMessage").textContent = "";

  await showDashboard();
};


// TROCA SEGURA DE SENHA

function changePassword(recovery = false) {
  if (document.querySelector("#passwordDialog")) return;

  const dialog = document.createElement("dialog");
  dialog.id = "passwordDialog";
  dialog.style.maxWidth = "90vw";
  dialog.style.padding = "24px";

  dialog.innerHTML = `
    <form>
      <h2>Alterar senha</h2>
      <label>Nova senha
        <input name="password" type="password"
          autocomplete="new-password"
          minlength="16" required>
      </label>
      <label>Confirmar nova senha
        <input name="confirmation" type="password"
          autocomplete="new-password"
          minlength="16" required>
      </label>
      <p role="status"></p>
      <button class="primary" type="submit">
        Salvar nova senha
      </button>
      <button class="outline" type="button">
        Cancelar
      </button>
    </form>`;

  document.body.append(dialog);

  const form = dialog.querySelector("form");
  const message = dialog.querySelector("p");

  async function closeDialog() {
    dialog.close();
    dialog.remove();

    if (recovery) {
      await db.auth.signOut();
      location.replace(location.pathname);
    }
  }

  dialog.querySelector("button[type=button]").onclick =
    closeDialog;

  dialog.oncancel = e => {
    e.preventDefault();
    closeDialog();
  };

  form.onsubmit = async e => {
    e.preventDefault();

    const f = new FormData(form);
    const password = f.get("password");

    if (password !== f.get("confirmation")) {
      message.textContent = "As senhas não coincidem.";
      return;
    }

    const button = form.querySelector("button[type=submit]");
    button.disabled = true;

    const {error} = await db.auth.updateUser({
      password:password
    });

    button.disabled = false;

    if (error) {
      message.textContent =
        "Não foi possível alterar a senha: " + error.message;
      return;
    }

    alert("Senha alterada com sucesso. Entre novamente.");
    await db.auth.signOut();
    location.replace(location.pathname);
  };

  dialog.showModal();
}

const passwordButton = document.createElement("button");
passwordButton.className = "outline";
passwordButton.textContent = "Alterar senha";
passwordButton.onclick = () => changePassword();

$("#logout").before(passwordButton);

db.auth.onAuthStateChange(event => {
  if (event === "PASSWORD_RECOVERY") {
    recovering = true;
    $("#dashboard").classList.add("hidden");
    setTimeout(() => changePassword(true),0);
  }
});

// PAINEL ADMINISTRATIVO E TÉCNICO

["Aguardando aprovação","Recusado"].forEach(status =>
  $("#filterStatus").append(option(status,status))
);

async function showDashboard() {
  if (recovering) return;

  const {data:{user}} = await db.auth.getUser();
  if (!user) return;

  isAdmin = user.id === ADMIN_ID;

  let name = user.email;

  if (isAdmin) {
    const {data,error} = await db.from("technicians")
      .select("user_id,full_name,active")
      .eq("active",true)
      .order("full_name");

    technicians = error ? [] : (data || []);
    name = "Administrador - SEGMAX PROTEC";

  } else {
    const {data,error} = await db.from("technicians")
      .select("user_id,full_name,active")
      .eq("user_id",user.id)
      .eq("active",true)
      .maybeSingle();

    if (error || !data) {
      await db.auth.signOut();
      alert("Usuário sem autorização.");
      return;
    }

    name = "Equipe SEGMAX PROTEC | " + data.full_name;
  }

  $("#authPanel").classList.add("hidden");
  $("#dashboard").classList.remove("hidden");

  $("#dashboard h2").textContent = isAdmin
    ? "Painel administrativo"
    : "Agenda da equipe";

  $("#who").textContent = name;

  await loadAppointments();
}

async function loadAppointments() {
  if (recovering) return;

  const day = $("#filterDate").value;
  const status = $("#filterStatus").value;

  let q = db.from("appointments")
    .select("*")
    .order("starts_at",{ascending:true});

  if (day) {
    const start = new Date(day+"T00:00:00-03:00");
    const end = new Date(start.getTime()+86400000);

    q = q.gte("starts_at",start.toISOString())
         .lt("starts_at",end.toISOString());
  }

  if (status) q = q.eq("status",status);

  const {data,error} = await q;
  const root = $("#appointments");
  root.replaceChildren();

  if (error) {
    root.textContent = "Erro ao carregar agenda.";
    return;
  }

  if (!data?.length) {
    root.textContent = "Nenhum atendimento encontrado.";
    return;
  }

  data.forEach(a => {
    const card = document.createElement("article");
    card.className = "appointment";

    const info = document.createElement("div");
    const actions = document.createElement("div");
    actions.className = "appt-actions";

    const date = new Date(a.starts_at).toLocaleDateString(
      "pt-BR",{timeZone:TZ}
    );

    const tech = technicians.find(
      t => t.user_id === a.technician_id
    );

    info.innerHTML = `
      <h3>${esc(a.client_name)}
        <span class="status">${esc(a.status)}</span>
      </h3>
      <p><b>${date} às ${localTime(a.starts_at)}</b></p>
      <p>${esc(a.service)}</p>
      <p>${esc(a.phone)} · ${esc(a.city)}</p>
      <p>${esc(a.notes || "Sem observações")}</p>
      <p>Duração na agenda: ${esc(a.duration_minutes)} minutos</p>
      ${isAdmin ? `<p>Equipe: ${
  a.technician_id
    ? "SEGMAX PROTEC - Breno e Vinícius"
    : "Aguardando aprovação"
}</p>` : ""}
    `;

    card.append(info,actions);
    root.append(card);

    // Técnicos possuem acesso somente de leitura.
    if (!isAdmin) return;

    if (a.status === "Aguardando aprovação") {
      renderApproval(a,actions);
      return;
    }

    renderStatus(a,actions);
  });
}

// APROVAÇÃO ADMINISTRATIVA

function renderApproval(a,root) {
const tech = document.createElement("select");

const equipeAtiva = technicians[0];

tech.append(option(
  equipeAtiva?.user_id || "",
  equipeAtiva
    ? "Equipe SEGMAX PROTEC"
    : "Nenhum técnico ativo"
));

tech.disabled = true;

  const date = document.createElement("input");
  date.type = "date";
  date.min = localDate(new Date());
  date.value = localDate(a.starts_at);

  const slot = document.createElement("select");
  slot.append(option("","Selecione o horário"));

  const approve = document.createElement("button");
  approve.className = "primary";
  approve.textContent = "Aprovar agendamento";
  approve.disabled = true;

  const refuse = document.createElement("button");
  refuse.className = "outline";
  refuse.textContent = "Recusar solicitação";

  const message = document.createElement("p");

  root.append(tech,date,slot,approve,refuse,message);

  let request = 0;

  function validate() {
    approve.disabled =
      !tech.value || !date.value || !slot.value;
  }

  async function refreshSlots() {
    const current = ++request;
    const preferred = slot.value || localTime(a.starts_at);

    slot.disabled = true;
    slot.replaceChildren(option("","Carregando..."));
    validate();

    if (!date.value) return;

    const {data,error} = await db.rpc("available_slots",{
      p_date:date.value,
      p_service:a.service
    });

    if (current !== request) return;

    slot.replaceChildren(option("","Selecione o horário"));

    if (error) {
      message.textContent = "Erro ao consultar horários.";
      return;
    }

    (data || []).forEach(s =>
      slot.append(option(s.slot,s.slot))
    );

    if ((data || []).some(s => s.slot === preferred)) {
      slot.value = preferred;
    }

    slot.disabled = !data?.length;
    validate();
  }

  tech.onchange = validate;
  slot.onchange = validate;
  date.onchange = refreshSlots;

  approve.onclick = async () => {
    approve.disabled = true;
    refuse.disabled = true;
    message.textContent = "Aprovando...";

    const {error} = await db.rpc("approve_appointment",{
      p_appointment_id:a.id,
      p_technician_id:tech.value,
      p_date:date.value,
      p_slot:slot.value
    });

    if (error) {
      message.textContent =
        error.message.includes("TECHNICIAN_BUSY")
          ? "Equipe ocupada. Escolha outro horário."
          : "Não foi possível aprovar: " + error.message;

      refuse.disabled = false;
      validate();
      return;
    }

    alert("Agendamento aprovado com sucesso!");
    await loadAppointments();
    await loadDates();
  };

  refuse.onclick = async () => {
    if (!confirm("Deseja recusar esta solicitação?")) return;

    approve.disabled = true;
    refuse.disabled = true;

    const {data,error} = await db.from("appointments")
      .update({status:"Recusado"})
      .eq("id",a.id)
      .eq("status","Aguardando aprovação")
      .select("id");

    if (error || !data?.length) {
      message.textContent = "Não foi possível recusar.";
      refuse.disabled = false;
      validate();
      return;
    }

    await loadAppointments();
    await loadDates();
  };

  refreshSlots();
}

// ATUALIZAÇÃO DE STATUS

function renderStatus(a,root) {
  const transitions = {
    "Agendado":["Em andamento","Concluído","Cancelado"],
    "Em andamento":["Concluído","Cancelado"]
  };

  const allowed = transitions[a.status] || [];
  if (!allowed.length) return;

  const select = document.createElement("select");
  select.append(option(a.status,a.status));

  allowed.forEach(s => select.append(option(s,s)));

  const save = document.createElement("button");
  save.className = "primary";
  save.textContent = "Atualizar status";

  save.onclick = async () => {
    if (select.value === a.status) return;

    save.disabled = true;

    const {data,error} = await db.from("appointments")
      .update({status:select.value})
      .eq("id",a.id)
      .eq("status",a.status)
      .select("id");

    save.disabled = false;

    if (error || !data?.length) {
      alert("Não foi possível atualizar o status.");
      return;
    }

    await loadAppointments();
    await loadDates();
  };

  root.append(select,save);
}

// INICIALIZAÇÃO

$("#logout").onclick = async () => {
  await db.auth.signOut();
  isAdmin = false;
  technicians = [];
  $("#appointments").replaceChildren();
  $("#dashboard").classList.add("hidden");
};

$("#refresh").onclick = loadAppointments;
$("#filterDate").onchange = loadAppointments;
$("#filterStatus").onchange = loadAppointments;

loadDates();

db.auth.getSession().then(({data}) => {
  if (data.session && !recovering) {
    showDashboard();
  }
});
