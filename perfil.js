// ==========================================================
// PERFIL
//
// Duas telas na mesma página:
//   - perfil.html            -> o seu perfil: números, personalização
//                               (apelido, cor, símbolo, frase) e a aba
//                               "Meus desabafos", onde dá para apagar.
//   - perfil.html?u=<id>     -> o perfil público de outra pessoa (aberto
//                               ao clicar no apelido na comunidade).
//
// Os dados e as regras ficam em comunidade.js (comPerfilDe,
// comAtualizarPerfil, comEstatisticas, comApagarTodosPosts...).
// Usa também getSessao (auth.js) e textoPreocupante (diario.js).
// ==========================================================

const NOMES_CORES = ['Azul', 'Verde-água', 'Roxo', 'Rosa', 'Laranja', 'Azul claro', 'Verde escuro', 'Marrom'];

if (typeof document !== 'undefined' && document.getElementById('perfil-meu')) {
  const sessaoPerfil = getSessao();
  if (!sessaoPerfil) {
    document.getElementById('perfil-aviso').hidden = false;
  } else {
    iniciarPerfil(sessaoPerfil);
  }
}

// Cria um elemento com texto seguro (textContent nunca interpreta HTML)
function pEl(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined && texto !== null && texto !== '') el.textContent = texto;
  return el;
}

function pMes(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// Cartão com avatar, apelido, frase e os números da pessoa
function desenharCartao(area, perfil, stats, previa) {
  area.textContent = '';

  const topo = pEl('div', 'profile-card__topo');
  const ident = pEl('div', 'profile-card__ident');
  ident.append(
    pEl('h2', 'profile-card__apelido', perfil.apelido),
    pEl('p', 'profile-card__desde', stats.desde ? 'Na comunidade desde ' + pMes(stats.desde) : 'Novo por aqui')
  );
  topo.append(comCriarAvatar(perfil, true), ident);
  area.append(topo);

  if (previa) area.append(pEl('p', 'profile-card__previa', 'Prévia: você ainda não salvou essas mudanças.'));

  area.append(pEl('p', 'profile-card__bio' + (perfil.bio ? '' : ' profile-card__bio--vazia'),
    perfil.bio || 'Ainda sem descrição.'));

  const numeros = pEl('div', 'stats');
  [
    [stats.desabafos, stats.desabafos === 1 ? 'desabafo' : 'desabafos'],
    [stats.comentarios, stats.comentarios === 1 ? 'comentário feito' : 'comentários feitos'],
    [stats.recebidos, stats.recebidos === 1 ? 'comentário recebido' : 'comentários recebidos']
  ].forEach(([valor, rotulo]) => {
    const item = pEl('div', 'stat');
    item.append(pEl('strong', '', String(valor)), pEl('span', '', rotulo));
    numeros.append(item);
  });
  area.append(numeros);
}

function iniciarPerfil(sessao) {
  const meuId = comAutorId(sessao);
  const alvo = new URLSearchParams(location.search).get('u');

  if (alvo && alvo !== meuId) {
    mostrarPerfilPublico(alvo);
  } else {
    mostrarMeuPerfil(sessao, meuId);
  }
}

// ----------------------------------------------------------
// Perfil de outra pessoa
// ----------------------------------------------------------
function mostrarPerfilPublico(alvo) {
  const perfil = comPerfilDe(alvo);
  if (!perfil) {
    document.getElementById('perfil-inexistente').hidden = false;
    return;
  }
  document.getElementById('perfil-titulo').textContent = 'Perfil de ' + perfil.apelido;
  document.getElementById('perfil-lead').textContent = 'Veja como essa pessoa participa da comunidade.';
  document.getElementById('perfil-publico').hidden = false;
  desenharCartao(document.getElementById('card-publico'), perfil, comEstatisticas(alvo), false);
}

// ----------------------------------------------------------
// Meu perfil
// ----------------------------------------------------------
function mostrarMeuPerfil(sessao, meuId) {
  document.getElementById('perfil-meu').hidden = false;
  let salvo = comGarantirPerfil(sessao);

  const cartao = document.getElementById('card-meu');
  const form = document.getElementById('form-perfil');
  const campoApelido = document.getElementById('pf-apelido');
  const campoBio = document.getElementById('pf-bio');
  const contador = document.getElementById('pf-contador');
  const erro = document.getElementById('pf-erro');
  const ok = document.getElementById('pf-ok');
  const apoio = document.getElementById('pf-apoio');
  const areaCores = document.getElementById('pf-cores');
  const areaEmojis = document.getElementById('pf-emojis');

  // ---- Opções de cor (escolha única) ----
  CORES_AVATAR.forEach((cor, i) => {
    const label = pEl('label', 'swatch');
    label.title = NOMES_CORES[i] || cor;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'cor';
    input.value = cor;
    input.setAttribute('aria-label', NOMES_CORES[i] || cor);
    const bolinha = pEl('span', 'swatch__cor');
    bolinha.style.background = cor;
    label.append(input, bolinha);
    areaCores.append(label);
  });

  // ---- Opções de símbolo (escolha única, com "nenhum") ----
  [''].concat(EMOJIS_PERFIL).forEach((emoji) => {
    const label = pEl('label', 'tag-option');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'emoji';
    input.value = emoji;
    if (!emoji) input.setAttribute('aria-label', 'Nenhum símbolo');
    label.append(input, pEl('span', '', emoji || 'Nenhum'));
    areaEmojis.append(label);
  });

  campoBio.maxLength = LIMITE_BIO;

  function preencherForm(perfil) {
    campoApelido.value = perfil.apelido.slice(1);
    campoBio.value = perfil.bio;
    contador.textContent = perfil.bio.length + '/' + LIMITE_BIO;
    form.querySelector('input[name="cor"][value="' + perfil.cor + '"]').checked = true;
    form.querySelector('input[name="emoji"][value="' + perfil.emoji + '"]').checked = true;
  }

  // O que está escrito/escolhido agora, mesmo sem salvar
  function lerRascunho() {
    const cor = form.querySelector('input[name="cor"]:checked');
    const emoji = form.querySelector('input[name="emoji"]:checked');
    const digitado = campoApelido.value.trim().replace(/^@/, '').toLowerCase();
    return {
      autorId: meuId,
      apelido: '@' + (digitado || salvo.apelido.slice(1)),
      cor: cor ? cor.value : salvo.cor,
      emoji: emoji ? emoji.value : '',
      bio: campoBio.value.trim()
    };
  }

  function mudou(rascunho) {
    return rascunho.apelido !== salvo.apelido || rascunho.cor !== salvo.cor ||
           rascunho.emoji !== salvo.emoji || rascunho.bio !== salvo.bio;
  }

  function desenharTudo() {
    const rascunho = lerRascunho();
    desenharCartao(cartao, rascunho, comEstatisticas(meuId), mudou(rascunho));
  }

  form.addEventListener('input', () => {
    contador.textContent = campoBio.value.length + '/' + LIMITE_BIO;
    ok.textContent = '';
    desenharTudo();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    erro.textContent = '';
    ok.textContent = '';
    apoio.textContent = '';

    const r = lerRascunho();
    const resultado = comAtualizarPerfil(sessao, { apelido: r.apelido, cor: r.cor, emoji: r.emoji, bio: r.bio });
    if (!resultado.ok) { erro.textContent = resultado.erro; return; }

    salvo = resultado.perfil;
    preencherForm(salvo);
    desenharTudo();
    ok.textContent = 'Perfil salvo!';

    // Se a frase tiver palavras de alerta, mostramos o apoio (como no resto do site)
    if (textoPreocupante(salvo.bio)) {
      const caixa = pEl('div', 'feedback feedback--alerta');
      caixa.append(
        pEl('strong', '', 'Você não está sozinho(a).'),
        pEl('p', '', 'Se você estiver pensando em se machucar, procure ajuda agora: o CVV atende pelo 188, 24 horas, de graça. Em emergência, ligue 192 (SAMU).')
      );
      const ligar = pEl('a', 'btn btn--primary', 'Ligar para o 188');
      ligar.href = 'tel:188';
      caixa.append(ligar);
      apoio.append(caixa);
    }
  });

  // ---- Aba "Meus desabafos" ----
  const listaEl = document.getElementById('meus-desabafos');
  const vazioEl = document.getElementById('desabafos-vazio');
  const botaoTodos = document.getElementById('apagar-todos');
  const contagemAba = document.getElementById('aba-contagem');

  function desenharDesabafos() {
    const posts = comMeusPosts(sessao);
    listaEl.textContent = '';
    vazioEl.hidden = posts.length > 0;
    botaoTodos.hidden = posts.length === 0;
    contagemAba.textContent = posts.length;

    posts.forEach((post) => {
      const cat = comCategoria(post.categoria);
      const item = pEl('article', 'entry');

      const topo = pEl('div', 'entry__topo');
      topo.append(
        pEl('p', 'entry__data', new Date(post.data).toLocaleDateString('pt-BR',
          { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
      );
      const etiqueta = pEl('span', 'post__cat');
      const dot = pEl('span', 'filtro__dot');
      dot.style.background = cat.cor;
      etiqueta.append(dot, cat.rotulo);
      topo.append(etiqueta);
      item.append(topo, pEl('p', 'entry__texto', post.texto));

      if ((post.denunciadoPor || []).length >= LIMITE_DENUNCIAS) {
        item.append(pEl('p', 'entry__oculto', 'Este desabafo foi denunciado por outras pessoas e está oculto na comunidade.'));
      }

      const n = post.comentarios.length;
      const rodape = pEl('div', 'entry__rodape');
      rodape.append(pEl('span', 'entry__info', n === 0 ? 'Sem comentários' : n + (n === 1 ? ' comentário' : ' comentários')));
      const ver = pEl('a', '', 'Ver na comunidade');
      ver.href = 'comunidade.html#post-' + post.id;
      rodape.append(ver);

      const apagar = pEl('button', 'entry__apagar', 'Apagar');
      apagar.type = 'button';
      apagar.addEventListener('click', () => {
        if (confirm('Apagar este desabafo e os comentários dele? Não dá para desfazer.')) {
          comApagarPost(sessao, post.id);
          atualizarTudo();
        }
      });
      rodape.append(apagar);
      item.append(rodape);
      listaEl.append(item);
    });
  }

  botaoTodos.addEventListener('click', () => {
    const total = comMeusPosts(sessao).length;
    if (!total) return;
    const texto = total === 1
      ? 'Apagar o seu desabafo e os comentários dele? Não dá para desfazer.'
      : 'Apagar todos os ' + total + ' desabafos e os comentários deles? Não dá para desfazer.';
    if (confirm(texto)) {
      comApagarTodosPosts(sessao);
      atualizarTudo();
    }
  });

  function atualizarTudo() {
    desenharTudo();
    desenharDesabafos();
  }

  // ---- Abas (Meu perfil / Meus desabafos) ----
  const abas = Array.from(document.querySelectorAll('.tabs__tab'));

  function abrirAba(aba, focar) {
    abas.forEach((a) => {
      const ativa = a === aba;
      a.setAttribute('aria-selected', ativa ? 'true' : 'false');
      a.tabIndex = ativa ? 0 : -1;
      document.getElementById(a.getAttribute('aria-controls')).hidden = !ativa;
    });
    if (focar) aba.focus();
    history.replaceState(null, '', aba.dataset.hash ? '#' + aba.dataset.hash : location.pathname + location.search);
  }

  abas.forEach((aba, i) => {
    aba.addEventListener('click', () => abrirAba(aba, false));
    aba.addEventListener('keydown', (e) => {
      const teclas = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: abas.length - 1 };
      if (!(e.key in teclas)) return;
      e.preventDefault();
      abrirAba(abas[(teclas[e.key] + abas.length) % abas.length], true);
    });
  });
  if (location.hash === '#desabafos') abrirAba(document.getElementById('aba-desabafos'), false);

  // Se o link mudar com a página já aberta (ex.: clicar em perfil.html#desabafos), troca de aba
  window.addEventListener('hashchange', () => {
    abrirAba(document.getElementById(location.hash === '#desabafos' ? 'aba-desabafos' : 'aba-perfil'), false);
  });

  // Outra aba comentou ou publicou: os números e a lista se atualizam sozinhos
  window.addEventListener('storage', (e) => {
    if (e.key === CHAVE_COMUNIDADE || e.key === CHAVE_PERFIS) atualizarTudo();
  });

  preencherForm(salvo);
  atualizarTudo();
}
