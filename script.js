// ============================== MENU HAMBURGER ==============================
const hamburger = document.getElementById('hamburger');
const menu = document.getElementById('menuPrincipal');

if (hamburger && menu) {
  hamburger.addEventListener('click', () => {
    menu.classList.toggle('show');
    hamburger.classList.toggle('active');
  });

  // fecha menu ao clicar em um link (mobile)
  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      menu.classList.remove('show');
      hamburger.classList.remove('active');
    });
  });

  // fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
      menu.classList.remove('show');
      hamburger.classList.remove('active');
    }
  });
}

// ============================== APARECER SEÇÕES AO SCROLL ==============================
const observarSecoes = () => {
  const alvo = document.querySelectorAll('.instalacoes, .depoimentos');
  const opcoes = { root: null, rootMargin: '0px', threshold: 0.15 };

  const observer = new IntersectionObserver((entradas) => {
    entradas.forEach(ent => {
      if (ent.isIntersecting) ent.target.classList.add('visivel');
    });
  }, opcoes);

  alvo.forEach(sec => observer.observe(sec));
};
observarSecoes();

// ============================== MENSAGEM ALEATÓRIA DO WHATSAPP ==============================
const mensagens = [
  "<strong>Vamos realizar sua cotação</strong> em 5min.",
  "Estamos online! Clique para falar com um especialista.",
  "Tire suas dúvidas agora pelo WhatsApp!"
];

const mensagemDiv = document.getElementById('mensagemWhatsApp');
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
    }, 500);
  }, intervalo);
}

// ============================== ACCESSIBILITY: keyboard close menu ESC ==============================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (menu && menu.classList.contains('show')) {
      menu.classList.remove('show');
      hamburger.classList.remove('active');
    }
  }
});
