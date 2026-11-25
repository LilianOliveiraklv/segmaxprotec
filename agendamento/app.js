// Configure com a URL e a chave anon/public do projeto Supabase.
const SUPABASE_URL = "https://zmmgvptazjjtcydltnvf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cGXbORnLTBKcDTAyX11Lcg_YtVaMWZ1";
const sbReady = SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.startsWith("COLE_");
const db = sbReady ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = s => document.querySelector(s);
const cityList = ["Santa Luzia","Belo Horizonte","Sabará","Caeté","Vespasiano","São José da Lapa","Lagoa Santa","Confins","Pedro Leopoldo","Matozinhos","Capim Branco","Prudente de Morais","Sete Lagoas","Ribeirão das Neves","Esmeraldas","Contagem","Betim","Igarapé","São Joaquim de Bicas","Mateus Leme","Juatuba","Florestal","Jaboticatubas","Taquaraçu de Minas","Baldim","Santana do Riacho","Nova União","Bom Jesus do Amparo","São Gonçalo do Rio Abaixo","Barão de Cocais","Itabira","Raposos","Rio Acima","Nova Lima","Santa Bárbara"];
cityList.sort((a,b)=>a.localeCompare(b,"pt-BR")).forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;$("#city").append(o)});
function msg(el,text,type=""){el.textContent=text;el.className="message "+type}
function requireConfig(){if(!db){alert("O sistema ainda precisa ser conectado ao Supabase. Consulte o arquivo LEIA-ME.");return false}return true}
async function loadDates(){
 const date=$("#date"),slot=$("#slot");date.innerHTML='<option value="">Carregando datas...</option>';slot.innerHTML='<option value="">Escolha primeiro uma data</option>';slot.disabled=true;
 if(!requireConfig())return;
 const service=$("#bookingForm select[name=service]").value;
 if(!service){date.innerHTML='<option value="">Selecione primeiro o serviço</option>';return}
 const {data,error}=await db.rpc("available_dates",{p_service:service});
 if(error){date.innerHTML='<option value="">Não foi possível carregar datas</option>';console.error(error);return}
 date.innerHTML='<option value="">Selecione uma data disponível</option>';
 (data||[]).forEach(row=>{const v=row.available_date;const o=document.createElement("option");o.value=v;o.textContent=new Date(v+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"});date.append(o)});
 if(!data?.length)date.innerHTML='<option value="">Sem datas disponíveis no momento</option>';
}
async function loadSlots(){
 const slot=$("#slot");slot.disabled=true;slot.innerHTML='<option value="">Carregando horários...</option>';
 if(!$("#date").value)return;
 const {data,error}=await db.rpc("available_slots",{p_date:$("#date").value,p_service:$("#bookingForm select[name=service]").value});
 if(error){slot.innerHTML='<option value="">Indisponível</option>';console.error(error);return}
 slot.innerHTML='<option value="">Selecione um horário</option>';
 (data||[]).forEach(s=>{const o=document.createElement("option");o.value=s.slot;o.textContent=s.slot;slot.append(o)});
 if(!data?.length)slot.innerHTML='<option value="">Não há horários livres nesta data</option>';
 slot.disabled=!(data||[]).length;
}
$("#date").addEventListener("change",loadSlots);
$("#bookingForm select[name=service]").addEventListener("change",loadDates);
$("#bookingForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!requireConfig())return;
 const f=new FormData(e.currentTarget);
 const payload={p_client_name:f.get("name").trim(),p_phone:f.get("phone").trim(),p_city:f.get("city"),p_service:f.get("service"),p_notes:f.get("notes").trim(),p_date:$("#date").value,p_slot:$("#slot").value};
 const button=e.currentTarget.querySelector('button[type="submit"]');button.disabled=true;button.textContent="Confirmando...";
 const {error}=await db.rpc("book_appointment",payload);
 button.disabled=false;button.textContent="Confirmar agendamento";
 if(error){msg($("#bookingMessage"),error.message.includes("SLOT_UNAVAILABLE")?"Esse horário acabou de ser reservado. Escolha outra opção.":"Não foi possível confirmar. Atualize as datas e tente novamente.","error");await loadDates();await loadSlots();return}
 msg($("#bookingMessage"),"Agendamento confirmado! A SEGMAX PROTEC recebeu seu pedido.","success");e.currentTarget.reset();await loadDates();
});
$("#loginOpen").onclick=()=>$("#authPanel").classList.remove("hidden");$("#closeAuth").onclick=()=>$("#authPanel").classList.add("hidden");
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();if(!requireConfig())return;const f=new FormData(e.currentTarget);const {error}=await db.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});msg($("#loginMessage"),error?error.message:"Acesso autorizado.",error?"error":"success");if(!error)showDashboard()});
async function showDashboard(){const {data:{user}}=await db.auth.getUser();if(!user)return;$("#authPanel").classList.add("hidden");$("#dashboard").classList.remove("hidden");$("#who").textContent=user.email;await loadAppointments()}
async function loadAppointments(){
 const day=$("#filterDate").value,status=$("#filterStatus").value;let q=db.from("appointments").select("*").order("starts_at",{ascending:true});
 if(day){const a=new Date(day+"T00:00:00"),b=new Date(day+"T23:59:59");q=q.gte("starts_at",a.toISOString()).lte("starts_at",b.toISOString())}if(status)q=q.eq("status",status);
 const {data,error}=await q;const root=$("#appointments");root.innerHTML="";if(error){root.textContent="Erro ao carregar agenda.";return}if(!data?.length){root.textContent="Nenhum atendimento encontrado.";return}
 data.forEach(a=>{const card=document.createElement("article");card.className="appointment";const info=document.createElement("div"),actions=document.createElement("div");actions.className="appt-actions";const d=new Date(a.starts_at);
 info.innerHTML=`<h3>${esc(a.client_name)} <span class="status">${esc(a.status)}</span></h3><p><b>${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</b> · ${esc(a.service)}</p><p>${esc(a.phone)} · ${esc(a.city)}</p><p>${esc(a.notes||"Sem observações")}</p>`;
 const sel=document.createElement("select");["Agendado","Em andamento","Concluído","Cancelado","Reagendar"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;o.selected=v===a.status;sel.append(o)});
 const save=document.createElement("button");save.className="primary";save.textContent="Atualizar status";save.onclick=async()=>{save.disabled=true;const {error}=await db.from("appointments").update({status:sel.value}).eq("id",a.id);save.disabled=false;if(error)alert("Não foi possível atualizar.");else loadAppointments()};actions.append(sel,save);card.append(info,actions);root.append(card)});
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
$("#logout").onclick=async()=>{await db.auth.signOut();$("#dashboard").classList.add("hidden")};$("#refresh").onclick=loadAppointments;$("#filterDate").onchange=loadAppointments;$("#filterStatus").onchange=loadAppointments;
if(db){loadDates();db.auth.getSession().then(({data})=>{if(data.session)showDashboard()})}
