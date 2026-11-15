// ==========================================================
// COMUNIDADE
//
// As pessoas publicam desabafos, escolhem uma categoria e outras
// pessoas respondem nos comentários. Ninguém aparece com nome ou
// e-mail: cada conta ganha um apelido gerado automaticamente
// (ex.: @ana4821).
//
// IMPORTANTE: assim como o resto do site, tudo fica no localStorage.
// Isso quer dizer que as publicações são compartilhadas entre as
// contas que usam o MESMO navegador (dá para testar abrindo duas
// abas, cada uma com uma conta). Para conversar entre aparelhos
// diferentes seria preciso um servidor: veja o comentário em
// "Dados" logo abaixo, onde isso seria trocado.
//
// Usa de outros arquivos: lerJSON, getSessao, normalizarEmail
// (auth.js) e textoPreocupante (diario.js).
// ==========================================================

const CHAVE_COMUNIDADE = 'mentalhelp_comunidade_v1';
const LIMITE_POST = 500;
const LIMITE_COMENTARIO = 300;
const LIMITE_DENUNCIAS = 3;   // com 3 denúncias a publicação some para todos

const CATEGORIAS_COMUNIDADE = [
  { id: 'conselhos', rotulo: 'Conselhos', cor: '#64748B' },
  { id: 'amor', rotulo: 'Amor', cor: '#EF4444' },
  { id: 'familia', rotulo: 'Família', cor: '#22A55B' },
  { id: 'amizade', rotulo: 'Amizade', cor: '#E8A317' },
  { id: 'estudos', rotulo: 'Trabalho e estudos', cor: '#8B5CF6' },
  { id: 'ansiedade', rotulo: 'Ansiedade', cor: '#3B82F6' },
  { id: 'diversao', rotulo: 'Diversão', cor: '#14B8A6' },
  { id: 'outro', rotulo: 'Outro', cor: '#A8896C' }
];

// Cores que a pessoa pode escolher para o avatar
const CORES_AVATAR = ['#2563EB', '#0E9F8E', '#7C3AED', '#D9467A', '#E08A1E', '#3B7DDD', '#0F766E', '#B45309'];

// Símbolos opcionais para o avatar
const EMOJIS_PERFIL = ['🌱', '🌻', '🦋', '🐢', '🌙', '☀️', '🌊', '🍀', '🐱', '🐶', '⭐', '🕊️'];

const CHAVE_PERFIS = 'mentalhelp_perfis_v1';
const LIMITE_BIO = 160;
const APELIDOS_RESERVADOS = ['equipe', 'admin', 'administrador', 'mentalhelp', 'moderador', 'moderacao', 'suporte', 'cvv', 'samu'];

function comCategoria(id) {
  return CATEGORIAS_COMUNIDADE.find((c) => c.id === id) || CATEGORIAS_COMUNIDADE[CATEGORIAS_COMUNIDADE.length - 1];
}

// ----------------------------------------------------------
// Identidade: apelido público e id interno (sem nome nem e-mail)
// ----------------------------------------------------------
function comHash(texto) {
  let h = 5381;
  for (const ch of String(texto)) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0;
  return h;
}

// Ex.: "Ana Souza" + e-mail -> "@ana4821"
function comApelido(sessao) {
  const base = String(sessao.nome).trim().split(/\s+/)[0]
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '') || 'usuario';
  const numero = String(comHash('apelido|' + normalizarEmail(sessao.email)) % 10000).padStart(4, '0');
  return '@' + base + numero;
}

// Serve só para saber "isto é meu?" (apagar/denunciar). Não guarda o e-mail.
function comAutorId(sessao) {
  return comHash('autor|' + normalizarEmail(sessao.email)).toString(36);
}

// ----------------------------------------------------------
// Dados
//
// Para virar um chat de verdade entre aparelhos, é aqui que
// comLer/comSalvar seriam trocados por chamadas a um servidor
// (fetch). O resto do arquivo continuaria igual.
// ----------------------------------------------------------
function comLer() {
  const dados = lerJSON(localStorage, CHAVE_COMUNIDADE, { posts: [] });
  if (!dados || !Array.isArray(dados.posts)) return { posts: [] };
  return dados;
}

function comSalvar(dados) {
  localStorage.setItem(CHAVE_COMUNIDADE, JSON.stringify(dados));
}

function comNovoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function comCriarPost(sessao, categoria, texto) {
  texto = String(texto).trim().slice(0, LIMITE_POST);
  if (!CATEGORIAS_COMUNIDADE.some((c) => c.id === categoria)) {
    return { ok: false, erro: 'Escolha uma categoria.' };
  }
  if (texto.length < 3) {
    return { ok: false, erro: 'Escreva um pouco mais para publicar.' };
  }
  const dados = comLer();
  const post = {
    id: comNovoId(),
    autorId: comAutorId(sessao),
    apelido: comMeuApelido(sessao),
    categoria,
    texto,
    data: new Date().toISOString(),
    comentarios: [],
    denunciadoPor: []
  };
  dados.posts.unshift(post);
  comSalvar(dados);
  return { ok: true, post };
}

function comCriarComentario(sessao, postId, texto) {
  texto = String(texto).trim().slice(0, LIMITE_COMENTARIO);
  if (!texto) return { ok: false, erro: 'Escreva algo para comentar.' };

  const dados = comLer();
  const post = dados.posts.find((p) => p.id === postId);
  if (!post) return { ok: false, erro: 'Essa publicação não existe mais.' };

  const comentario = {
    id: comNovoId(),
    autorId: comAutorId(sessao),
    apelido: comMeuApelido(sessao),
    texto,
    data: new Date().toISOString()
  };
  post.comentarios.push(comentario);
  comSalvar(dados);
  return { ok: true, comentario };
}

// Só o autor apaga a própria publicação
function comApagarPost(sessao, postId) {
  const dados = comLer();
  const meu = comAutorId(sessao);
  dados.posts = dados.posts.filter((p) => !(p.id === postId && p.autorId === meu));
  comSalvar(dados);
}

function comApagarComentario(sessao, postId, comentarioId) {
  const dados = comLer();
  const post = dados.posts.find((p) => p.id === postId);
  if (!post) return;
  const meu = comAutorId(sessao);
  post.comentarios = post.comentarios.filter((c) => !(c.id === comentarioId && c.autorId === meu));
  comSalvar(dados);
}

function comDenunciar(sessao, postId) {
  const dados = comLer();
  const post = dados.posts.find((p) => p.id === postId);
  const meu = comAutorId(sessao);
  if (post && !post.denunciadoPor.includes(meu)) {
    post.denunciadoPor.push(meu);
    comSalvar(dados);
  }
}

// Quem denunciou deixa de ver; com várias denúncias some para todos
function comVisivel(post, sessao) {
  const denuncias = post.denunciadoPor || [];
  return denuncias.length < LIMITE_DENUNCIAS && !denuncias.includes(comAutorId(sessao));
}

// ----------------------------------------------------------
// Perfis
//
// Cada conta tem um perfil: apelido, cor, símbolo e uma frase sobre
// a pessoa. As publicações e os comentários guardam só o id do
// autor; na hora de mostrar, o perfil atual é consultado. Assim,
// quando alguém muda o apelido ou o avatar, tudo se atualiza.
// ----------------------------------------------------------
function comPerfis() {
  const perfis = lerJSON(localStorage, CHAVE_PERFIS, {});
  return perfis && typeof perfis === 'object' && !Array.isArray(perfis) ? perfis : {};
}

function comSalvarPerfis(perfis) {
  localStorage.setItem(CHAVE_PERFIS, JSON.stringify(perfis));
}

// Para publicações antigas, feitas antes de existirem perfis
function comAcharApelido(autorId) {
  for (const post of comLer().posts) {
    if (post.autorId === autorId) return post.apelido;
    const c = post.comentarios.find((x) => x.autorId === autorId);
    if (c) return c.apelido;
  }
  return '';
}

function comCorPadrao(autorId) {
  return CORES_AVATAR[comHash(autorId) % CORES_AVATAR.length];
}

// Perfil de alguém (ou null se não existe nenhum rastro dessa pessoa)
function comPerfilDe(autorId, apelidoReserva) {
  const reg = comPerfis()[autorId] || {};
  const apelido = reg.apelido || apelidoReserva || comAcharApelido(autorId);
  if (!apelido) return null;
  return {
    autorId,
    apelido,
    cor: reg.cor || comCorPadrao(autorId),
    emoji: reg.emoji || '',
    bio: reg.bio || '',
    criadoEm: reg.criadoEm || ''
  };
}

function comMeuApelido(sessao) {
  return comPerfilDe(comAutorId(sessao), comApelido(sessao)).apelido;
}

// Garante que a conta logada tem um perfil salvo e devolve ele
function comGarantirPerfil(sessao) {
  const id = comAutorId(sessao);
  const perfis = comPerfis();
  if (!perfis[id]) {
    perfis[id] = {
      apelido: comAcharApelido(id) || comApelido(sessao),
      cor: comCorPadrao(id),
      emoji: '',
      bio: '',
      criadoEm: new Date().toISOString()
    };
    comSalvarPerfis(perfis);
  }
  return comPerfilDe(id);
}

// Regras do apelido: 3 a 20 letras minúsculas (sem acento), números ou _
function comValidarApelido(texto, autorId) {
  const t = String(texto).trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(t)) {
    return { ok: false, erro: 'Use de 3 a 20 caracteres: letras minúsculas sem acento, números ou _.' };
  }
  if (APELIDOS_RESERVADOS.includes(t)) {
    return { ok: false, erro: 'Esse apelido é reservado. Escolha outro.' };
  }
  const apelido = '@' + t;

  const perfis = comPerfis();
  const emUso = Object.keys(perfis).some((id) => id !== autorId && perfis[id].apelido === apelido);
  // Apelidos antigos (de quem ainda não tem perfil salvo) também contam
  const emUsoAntigo = comLer().posts.some((p) =>
    (p.autorId !== autorId && !perfis[p.autorId] && p.apelido === apelido) ||
    p.comentarios.some((c) => c.autorId !== autorId && !perfis[c.autorId] && c.apelido === apelido));
  if (emUso || emUsoAntigo) return { ok: false, erro: 'Esse apelido já está em uso. Escolha outro.' };

  return { ok: true, apelido };
}

// campos = { apelido, cor, emoji, bio }
function comAtualizarPerfil(sessao, campos) {
  const id = comAutorId(sessao);
  const validacao = comValidarApelido(campos.apelido, id);
  if (!validacao.ok) return validacao;
  if (!CORES_AVATAR.includes(campos.cor)) return { ok: false, erro: 'Escolha uma cor para o avatar.' };
  const emoji = EMOJIS_PERFIL.includes(campos.emoji) ? campos.emoji : '';

  const perfis = comPerfis();
  const atual = perfis[id] || { criadoEm: new Date().toISOString() };
  perfis[id] = {
    criadoEm: atual.criadoEm,
    apelido: validacao.apelido,
    cor: campos.cor,
    emoji,
    bio: String(campos.bio || '').trim().slice(0, LIMITE_BIO)
  };
  comSalvarPerfis(perfis);
  return { ok: true, perfil: comPerfilDe(id) };
}

// Números do perfil: quanto a pessoa publicou e comentou
function comEstatisticas(autorId) {
  let desabafos = 0, comentarios = 0, recebidos = 0, desde = '';
  const marcar = (iso) => { if (!desde || iso < desde) desde = iso; };

  comLer().posts.forEach((p) => {
    if (p.autorId === autorId) {
      desabafos += 1;
      marcar(p.data);
      // respostas de outras pessoas aos desabafos dela
      recebidos += p.comentarios.filter((c) => c.autorId !== autorId).length;
    }
    p.comentarios.forEach((c) => {
      if (c.autorId === autorId) { comentarios += 1; marcar(c.data); }
    });
  });

  const reg = comPerfis()[autorId];
  if (reg && reg.criadoEm) marcar(reg.criadoEm);
  return { desabafos, comentarios, recebidos, desde };
}

// Desabafos da própria conta (inclui os que foram escondidos por denúncias)
function comMeusPosts(sessao) {
  const meu = comAutorId(sessao);
  return comLer().posts.filter((p) => p.autorId === meu);
}

// Apaga todos os desabafos da conta; devolve quantos foram apagados
function comApagarTodosPosts(sessao) {
  const meu = comAutorId(sessao);
  const dados = comLer();
  const antes = dados.posts.length;
  dados.posts = dados.posts.filter((p) => p.autorId !== meu);
  comSalvar(dados);
  return antes - dados.posts.length;
}

// Bolinha do avatar: símbolo (se escolheu) ou a inicial do apelido
function comCriarAvatar(perfil, grande) {
  const av = document.createElement('span');
  av.className = 'avatar' + (grande ? ' avatar--grande' : '');
  av.style.background = perfil.cor;
  av.textContent = perfil.emoji || perfil.apelido.charAt(1).toUpperCase();
  av.setAttribute('aria-hidden', 'true');
  return av;
}

// ----------------------------------------------------------
// "há 5 min", "há 2 h", "ontem"...
// ----------------------------------------------------------
function comTempo(iso, agora = new Date()) {
  const seg = Math.max(0, Math.floor((agora - new Date(iso)) / 1000));
  if (seg < 60) return 'agora há pouco';
  const min = Math.floor(seg / 60);
  if (min < 60) return 'há ' + min + ' min';
  const horas = Math.floor(min / 60);
  if (horas < 24) return 'há ' + horas + ' h';
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return 'há ' + dias + ' dias';
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

// ==========================================================
// PARTE DA TELA (só na página da comunidade)
// ==========================================================
if (typeof document !== 'undefined' && document.getElementById('comu-app')) {

  const sessao = getSessao();
  const aviso = document.getElementById('comu-aviso');
  const app = document.getElementById('comu-app');

  if (!sessao) {
    aviso.hidden = false;
  } else {
    app.hidden = false;
    document.getElementById('btn-desabafar').hidden = false;
    iniciarComunidade(sessao);
  }

  // Cria um elemento com texto seguro (textContent nunca interpreta HTML)
  function h(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined && texto !== null && texto !== '') el.textContent = texto;
    return el;
  }

  function iniciarComunidade(sessao) {
    const feed = document.getElementById('feed');
    const filtrosEl = document.getElementById('filtros');
    const apoio = document.getElementById('comu-apoio');
    const meuId = comAutorId(sessao);
    comGarantirPerfil(sessao);

    // Nome da pessoa como link para o perfil dela
    function linkPerfil(perfil, classe) {
      const a = h('a', classe, perfil.apelido);
      a.href = 'perfil.html?u=' + encodeURIComponent(perfil.autorId);
      return a;
    }

    let filtro = 'todas';
    const abertos = new Set();          // publicações com os comentários abertos
    const rascunhos = new Map();        // texto digitado e ainda não enviado, por publicação

    // ---- Mensagem de apoio (palavras de alerta) ----
    function mostrarApoio(mostrar) {
      apoio.textContent = '';
      if (!mostrar) return;
      const caixa = h('div', 'feedback feedback--alerta');
      caixa.append(
        h('strong', '', 'Você não está sozinho(a).'),
        h('p', '', 'Se você (ou alguém que você conhece) estiver pensando em se machucar, procure ajuda agora: o CVV atende pelo 188, 24 horas, de graça. Em emergência, ligue 192 (SAMU).')
      );
      const ligar = h('a', 'btn btn--primary', 'Ligar para o 188');
      ligar.href = 'tel:188';
      caixa.append(ligar);
      apoio.append(caixa);
    }

    // ---- Filtros por categoria ----
    function desenharFiltros() {
      filtrosEl.textContent = '';
      const todas = [{ id: 'todas', rotulo: 'Todas', cor: null }].concat(CATEGORIAS_COMUNIDADE);
      todas.forEach((c) => {
        const botao = h('button', 'filtro');
        botao.type = 'button';
        botao.setAttribute('aria-pressed', String(filtro === c.id));
        if (c.cor) {
          const bolinha = h('span', 'filtro__dot');
          bolinha.style.background = c.cor;
          botao.append(bolinha);
        }
        botao.append(c.rotulo);
        botao.addEventListener('click', () => {
          filtro = c.id;
          desenharFiltros();
          desenharFeed();
        });
        filtrosEl.append(botao);
      });
    }

    // ---- Publicação fixada com as regras da casa ----
    function cardFixado() {
      const card = h('article', 'post post--fixado');
      const topo = h('div', 'post__topo');
      const avatar = h('span', 'avatar avatar--equipe', 'M');
      avatar.setAttribute('aria-hidden', 'true');
      const meta = h('div', 'post__meta');
      meta.append(h('strong', 'post__apelido', '@equipe'), h('span', 'post__tempo', 'fixado'));
      topo.append(avatar, meta, h('span', 'badge', 'Regras da casa'));
      card.append(
        topo,
        h('p', 'post__texto', 'Aqui a gente se escuta com respeito. Não julgue, não dê ordens e não compartilhe dados pessoais (seus ou de outras pessoas). Esta comunidade não substitui um profissional de saúde.'),
        h('p', 'post__texto post__texto--sutil', 'Precisa conversar agora? CVV: 188 (24 h, gratuito). Emergência: 192 (SAMU).')
      );
      return card;
    }

    // ---- Um comentário ----
    function itemComentario(post, c) {
      const item = h('li', 'comentario');
      const topo = h('div', 'comentario__topo');
      const autor = comPerfilDe(c.autorId, c.apelido);
      topo.append(linkPerfil(autor, 'comentario__autor'), h('span', 'post__tempo', comTempo(c.data)));
      item.append(topo, h('p', 'comentario__texto', c.texto));
      if (c.autorId === meuId) {
        const apagar = h('button', 'link-acao link-acao--perigo', 'Apagar');
        apagar.type = 'button';
        apagar.addEventListener('click', () => {
          if (confirm('Apagar este comentário?')) {
            comApagarComentario(sessao, post.id, c.id);
            desenharFeed();
          }
        });
        item.append(apagar);
      }
      return item;
    }

    // ---- Uma publicação ----
    function cardPost(post) {
      const cat = comCategoria(post.categoria);
      const card = h('article', 'post');
      card.id = 'post-' + post.id;

      const topo = h('div', 'post__topo');
      const autor = comPerfilDe(post.autorId, post.apelido);
      const avatar = comCriarAvatar(autor);
      const meta = h('div', 'post__meta');
      meta.append(linkPerfil(autor, 'post__apelido'), h('span', 'post__tempo', comTempo(post.data)));
      const etiqueta = h('span', 'post__cat');
      const bolinha = h('span', 'filtro__dot');
      bolinha.style.background = cat.cor;
      etiqueta.append(bolinha, cat.rotulo);
      topo.append(avatar, meta, etiqueta);

      const texto = h('p', 'post__texto', post.texto);

      // Barra de ações
      const acoes = h('div', 'post__acoes');
      const qtd = post.comentarios.length;
      const botaoComentarios = h('button', 'post__acao',
        qtd === 0 ? 'Comentar' : qtd + (qtd === 1 ? ' comentário' : ' comentários'));
      botaoComentarios.type = 'button';
      botaoComentarios.setAttribute('aria-expanded', String(abertos.has(post.id)));
      acoes.append(botaoComentarios);

      if (post.autorId === meuId) {
        const apagar = h('button', 'link-acao link-acao--perigo', 'Apagar');
        apagar.type = 'button';
        apagar.addEventListener('click', () => {
          if (confirm('Apagar esta publicação e os comentários dela? Não dá para desfazer.')) {
            comApagarPost(sessao, post.id);
            desenharFeed();
          }
        });
        acoes.append(apagar);
      } else {
        const denunciar = h('button', 'link-acao', 'Denunciar');
        denunciar.type = 'button';
        denunciar.addEventListener('click', () => {
          if (confirm('Denunciar esta publicação? Ela deixa de aparecer para você e é sinalizada para as outras pessoas.')) {
            comDenunciar(sessao, post.id);
            desenharFeed();
          }
        });
        acoes.append(denunciar);
      }

      // Área dos comentários
      const thread = h('div', 'thread');
      thread.hidden = !abertos.has(post.id);
      if (qtd) {
        const lista = h('ul', 'thread__lista');
        post.comentarios.forEach((c) => lista.append(itemComentario(post, c)));
        thread.append(lista);
      }

      const form = h('form', 'thread__form');
      form.noValidate = true;
      const campo = document.createElement('input');
      campo.type = 'text';
      campo.maxLength = LIMITE_COMENTARIO;
      campo.placeholder = 'Escreva uma palavra de apoio…';
      campo.setAttribute('aria-label', 'Comentário em ' + autor.apelido);
      campo.dataset.comentarioDe = post.id;
      campo.value = rascunhos.get(post.id) || '';
      campo.addEventListener('input', () => rascunhos.set(post.id, campo.value));
      const enviar = h('button', 'btn btn--primary', 'Enviar');
      enviar.type = 'submit';
      form.append(campo, enviar);
      const erro = h('p', 'form-error');
      erro.setAttribute('role', 'alert');

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const resultado = comCriarComentario(sessao, post.id, campo.value);
        if (!resultado.ok) { erro.textContent = resultado.erro; return; }
        rascunhos.delete(post.id);
        abertos.add(post.id);
        mostrarApoio(textoPreocupante(resultado.comentario.texto));
        desenharFeed();
        const novo = feed.querySelector('input[data-comentario-de="' + post.id + '"]');
        if (novo) novo.focus();
      });
      thread.append(form, erro);

      botaoComentarios.addEventListener('click', () => {
        const abrir = thread.hidden;
        thread.hidden = !abrir;
        botaoComentarios.setAttribute('aria-expanded', String(abrir));
        if (abrir) { abertos.add(post.id); campo.focus(); } else { abertos.delete(post.id); }
      });

      card.append(topo, texto, acoes, thread);
      return card;
    }

    // ---- Lista completa ----
    function desenharFeed() {
      // Se a pessoa está digitando um comentário, lembramos onde ela estava
      const ativo = document.activeElement;
      const idFoco = ativo && ativo.dataset ? ativo.dataset.comentarioDe : null;
      const posicao = idFoco ? ativo.selectionStart : null;

      feed.textContent = '';
      if (filtro === 'todas') feed.append(cardFixado());

      const posts = comLer().posts
        .filter((p) => comVisivel(p, sessao))
        .filter((p) => filtro === 'todas' || p.categoria === filtro);

      posts.forEach((p) => feed.append(cardPost(p)));

      if (!posts.length) {
        feed.append(h('p', 'feed__vazio', filtro === 'todas'
          ? 'Ainda ninguém desabafou por aqui. Que tal ser a primeira pessoa?'
          : 'Nenhuma publicação nesta categoria ainda.'));
      }

      if (idFoco) {
        const campo = feed.querySelector('input[data-comentario-de="' + idFoco + '"]');
        if (campo) { campo.focus(); campo.setSelectionRange(posicao, posicao); }
      }
    }

    // ---- Janela "Desabafar" ----
    const dialogo = document.getElementById('dlg-post');
    const formPost = document.getElementById('form-post');
    const opcoesCategoria = document.getElementById('opcoes-categoria');
    const campoPost = document.getElementById('post-texto');
    const contador = document.getElementById('post-contador');
    const erroPost = document.getElementById('post-erro');

    campoPost.maxLength = LIMITE_POST;

    CATEGORIAS_COMUNIDADE.forEach((c) => {
      const label = h('label', 'tag-option');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'categoria';
      input.value = c.id;
      label.append(input, h('span', '', c.rotulo));
      opcoesCategoria.append(label);
    });

    campoPost.addEventListener('input', () => {
      contador.textContent = campoPost.value.length + '/' + LIMITE_POST;
    });

    document.getElementById('btn-desabafar').addEventListener('click', () => {
      erroPost.textContent = '';
      document.getElementById('dlg-apelido').textContent = comMeuApelido(sessao);
      dialogo.showModal();
      campoPost.focus();
    });
    document.getElementById('post-cancelar').addEventListener('click', () => dialogo.close());

    formPost.addEventListener('submit', (e) => {
      e.preventDefault();
      const escolhida = formPost.querySelector('input[name="categoria"]:checked');
      const resultado = comCriarPost(sessao, escolhida ? escolhida.value : '', campoPost.value);
      if (!resultado.ok) { erroPost.textContent = resultado.erro; return; }

      formPost.reset();
      contador.textContent = '0/' + LIMITE_POST;
      dialogo.close();
      filtro = 'todas';
      desenharFiltros();
      mostrarApoio(textoPreocupante(resultado.post.texto));
      desenharFeed();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Outra aba (com outra conta) publicou ou comentou: atualiza sozinho
    window.addEventListener('storage', (e) => {
      if (e.key === CHAVE_COMUNIDADE || e.key === CHAVE_PERFIS) desenharFeed();
    });

    // Os "há 5 min" ficam em dia
    setInterval(desenharFeed, 60000);

    desenharFiltros();

    // Link vindo do perfil (comunidade.html#post-ID): abre os comentários e rola até lá
    const alvoHash = location.hash.indexOf('#post-') === 0 ? location.hash.slice(6) : null;
    if (alvoHash) abertos.add(alvoHash);
    desenharFeed();
    if (alvoHash) {
      const card = document.getElementById('post-' + alvoHash);
      if (card) card.scrollIntoView({ block: 'center' });
    }
  }
}
