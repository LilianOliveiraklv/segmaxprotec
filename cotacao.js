// Botão / imagem de atendimento
const chatButton = document.getElementById('chat-open-btn');
const chatBox = document.getElementById('chat-box');
const closeChat = document.getElementById('chat-close');

const form = document.getElementById('cotacao-form');
const messages = document.getElementById('messages');

// abre
chatButton.addEventListener('click', () => {
    chatBox.style.display = 'block';
});

// fecha
closeChat.addEventListener('click', () => {
    chatBox.style.display = 'none';
});

// Mensagem fixa no balão
document.getElementById("chat-msg-rotativo").innerText = "Vamos fazer uma cotação?";
const frases = [
    "Vamos fazer uma cotação?",
    "Posso te ajudar?",
    "Fale com um especialista!"
];

let atual = 0;

setInterval(() => {
    document.getElementById("chat-msg-rotativo").innerText = frases[atual];
    atual = (atual + 1) % frases.length;
}, 6000);


// envio mostrando mensagens simuladas
form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nome = form.nome.value;
    const email = form.email.value;
    const telefone = form.whatsapp.value;
    const servico = form.servico.value;

    // Monta a mensagem
    const mensagem = 
`*COTAÇÃO SEGMAX PROTEC*
--------------------------------
*Nome:* ${nome}
*E-mail:* ${email}
*Telefone:* ${telefone}
* Serviço que precisa:* ${servico}
--------------------------------
Enviado pelo site.`;

    // Mostra no painel interno
    messages.innerHTML = `
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Telefone:</strong> ${telefone}</p>
        <p><strong>Serviço:</strong> ${servico}</p>
        <hr>
        <p>Aguarde o retorno em até 2 horas.</p>
    `;

    // Limpa o formulário
    form.reset();

    // Abre o WhatsApp
    window.open(
        "https://wa.me/5531999097336?text=" + encodeURIComponent(mensagem),
        "_blank"
    );
    
});

