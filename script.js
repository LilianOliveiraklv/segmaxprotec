
document.addEventListener('DOMContentLoaded', function(){
  var form = document.getElementById('contactForm');
  if(form){
    form.addEventListener('submit', function(e){
      // Form not connected yet - prevent submission and show friendly message
      if(form.getAttribute('action') === '#'){
        e.preventDefault();
        alert('O formulário ainda não está configurado. Quando ativar o Formspree, substitua o atributo action pelo endpoint. Enquanto isso, use o WhatsApp para contato.');
      }
    });
  }
});
