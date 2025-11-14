// ============================== MENU HAMBURGUER ==============================
const hamburger = document.getElementById('hamburger');
const menu = document.getElementById('menuPrincipal');

if (hamburger && menu) {

  // Abrir / fechar menu
  hamburger.addEventListener('click', () => {
    menu.classList.toggle('show');
    hamburger.classList.toggle('active');
  });

  // fechar menu ao clicar em um link
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('show');
      hamburger.classList.remove('active');
    });
  });

  // fechar menu clicando fora
  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target) && !hamburger.contains(event.target)) {
      menu.classList.remove('show');
      hamburger.classList.remove('active');
    }
  });

  // fechar com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
      menu.classList.remove('show');
      hamburger.classList.remove('active');
    }
  });
}



// ============================== ANIMAÇÕES AO SCROLL ==============================
const elementosAnimar = document.querySelectorAll(
  ".animar-esquerda, .animar-direita, .animar, .instalacoes, .depoimentos"
);

const opcoes = {
  root: null,
  rootMargin: "0px",
  threshold: 0.2
};

const observer = new IntersectionObserver((entradas) => {
  entradas.forEach((entrada) => {
    if (entrada.isIntersecting) {
      entrada.target.classList.add("visivel");
    }
  });
}, opcoes);

elementosAnimar.forEach((el) => observer.observe(el));




// ============================== MENSAGEM ALEATÓRIA WHATSAPP ==============================
const mensagens = [
  "<strong>Vamos realizar sua cotação</strong> em 5min.",
  "Estamos online! Clique para falar com um especialista.",
  "Tire suas dúvidas agora pelo WhatsApp!"
];

const mensagemDiv = document.getElementById("mensagemWhatsApp");
let indice = 0;
const intervalo = 6000;

if (mensagemDiv) {
  mensagemDiv.innerHTML = `<p>${mensagens[indice]}</p>`;

  setInterval(() => {
    mensagemDiv.style.opacity = 0;

    setTimeout(() => {
      indice = (indice + 1) % mensagens.length;
      mensagemDiv.innerHTML = `<p>${mensagens[indice]}</p>`;
      mensagemDiv.style.opacity = 1;
    }, 400);

  }, intervalo);
}
