<script>
    const menuBtn = document.querySelector('.hamburguer');
    const menuLista = document.querySelector('.menu ul');

    menuBtn.addEventListener('click', () => {
        // alterna se está visível ou não
        if (menuLista.style.display === 'flex') {
            menuLista.style.display = 'none';
        } else {
            menuLista.style.display = 'flex';
            menuLista.style.flexDirection = 'column';
            menuLista.style.background = 'white';
            menuLista.style.padding = '20px';
            menuLista.style.position = 'absolute';
            menuLista.style.top = '60px';
            menuLista.style.right = '20px';
            menuLista.style.gap = '20px';
            menuLista.style.zIndex = '9999';
        }
    });
</script>

<script>
const chatFloating = document.getElementById("chatFloating");
const chatCotacao = document.getElementById("chatCotacao");
const chatClose = document.getElementById("chatClose");
const chatBody = document.getElementById("chatBody");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");

let etapa = 0;
let dados = {
    nome: "",
    email: "",
    whatsapp: "",
    necessidade: ""
};

chatFloating.onclick = () => {
    chatCotacao.style.display = "flex";
    iniciarChat();
};

chatClose.onclick = () => {
    chatCotacao.style.display = "none";
    chatBody.innerHTML = "";
    etapa = 0;
};

function enviarMensagemAtendente(texto) {
    chatBody.innerHTML += `<div class="msg-atendente">${texto}</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
}

function enviarMensagemCliente(texto) {
    chatBody.innerHTML += `<div class="msg-cliente">${texto}</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
}

function iniciarChat() {
    setTimeout(() => enviarMensagemAtendente("Olá, tudo bem?"), 500);
    setTimeout(() => enviarMensagemAtendente("Vamos agendar sua visita técnica e montar seu orçamento agora? 📞"), 1500);
    setTimeout(() => enviarMensagemAtendente("Para isso preciso de algumas informações rápidas 🙂"), 2500);
    setTimeout(() => enviarMensagemAtendente("Qual é o seu <strong>nome</strong>?"), 3500);
}

chatSend.onclick = () => processarResposta();

function processarResposta() {
    let resposta = chatInput.value.trim();
    if (!resposta) return;

    enviarMensagemCliente(resposta);
    chatInput.value = "";

    if (etapa === 0) {
        dados.nome = resposta;
        enviarMensagemAtendente("Ótimo! Agora me informe seu <strong>e-mail</strong>.");
        etapa++;
    } 
    
    else if (etapa === 1) {
        dados.email = resposta;
        enviarMensagemAtendente("Perfeito! Qual seu <strong>WhatsApp</strong>?");
        etapa++;
    } 
    
    else if (etapa === 2) {
        dados.whatsapp = resposta;
        enviarMensagemAtendente("Do que você precisa? (Câmeras, portão, manutenção, etc)");
        etapa++;
    } 
    
    else if (etapa === 3) {
        dados.necessidade = resposta;
        enviarMensagemAtendente("Aguarde nosso retorno em até 2 horas.");
        
        let msg =
`COTAÇÃO SEGMAX PROTEC
Nome: ${dados.nome}
Email: ${dados.email}
WhatsApp: ${dados.whatsapp}
Necessidade: ${dados.necessidade}`;

        setTimeout(() => {
            window.open("https://wa.me/5531999097336?text=" + encodeURIComponent(msg), "_blank");
        }, 1500);

        etapa++;
    }
}
</script>
