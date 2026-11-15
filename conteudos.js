// ==========================================================
// PÁGINA DE CONTEÚDOS RECOMENDADOS
//
// Aqui os conteúdos ficam numa lista (um "array" de objetos).
// Para adicionar um conteúdo novo, é só copiar um bloco { ... }
// e mudar os textos: a página cria o card sozinha.
// Cada conteúdo diz para quais humores ele é indicado.
// ==========================================================

const NOMES_HUMOR = {
  bem: 'bem',
  ansioso: 'ansioso(a)',
  triste: 'triste',
  estressado: 'estressado(a)',
  semenergia: 'sem energia'
};

const TODOS_HUMORES = ['bem', 'ansioso', 'triste', 'estressado', 'semenergia'];

const CONTEUDOS = [
  {
    id: 'respiracao',
    titulo: 'Respiração lenta para acalmar o corpo',
    categoria: 'Ansiedade',
    tempo: '3 min',
    resumo: 'Respirar devagar avisa ao corpo que ele pode relaxar. É um exercício simples que você pode fazer em qualquer lugar.',
    listaTitulo: 'Passo a passo',
    ordenada: true,
    lista: [
      'Sente-se com as costas apoiadas e os ombros soltos.',
      'Inspire pelo nariz contando até 4.',
      'Solte o ar devagar pela boca contando até 6.',
      'Repita por 2 a 3 minutos, prestando atenção só no ar entrando e saindo.'
    ],
    nota: 'Se sentir tontura, volte a respirar normalmente e tente de novo mais tarde, com calma.',
    humores: ['ansioso', 'estressado']
  },
  {
    id: 'cinco-sentidos',
    titulo: 'Técnica dos 5 sentidos para voltar ao presente',
    categoria: 'Ansiedade',
    tempo: '3 min',
    resumo: 'Quando os pensamentos aceleram, focar no que está ao seu redor ajuda a trazer a atenção de volta para o momento atual.',
    listaTitulo: 'Observe',
    ordenada: true,
    lista: [
      '5 coisas que você consegue ver.',
      '4 coisas que você consegue tocar.',
      '3 sons que você consegue ouvir.',
      '2 cheiros que você consegue sentir.',
      '1 gosto que você consegue perceber.'
    ],
    nota: 'Vá devagar e nomeie cada coisa mentalmente ou em voz baixa.',
    humores: ['ansioso', 'estressado']
  },
  {
    id: 'sono',
    titulo: 'Hábitos para dormir melhor',
    categoria: 'Sono',
    tempo: '5 min',
    resumo: 'Dormir bem influencia o humor, a concentração e a energia do dia seguinte. Pequenos hábitos fazem diferença.',
    listaTitulo: 'Dicas',
    ordenada: false,
    lista: [
      'Tente dormir e acordar em horários parecidos todos os dias.',
      'Evite telas (celular, TV) cerca de uma hora antes de deitar.',
      'Evite café e bebidas com cafeína no fim da tarde e à noite.',
      'Deixe o quarto escuro, silencioso e confortável.',
      'Se a cabeça estiver cheia, anote as preocupações em um papel antes de deitar.'
    ],
    nota: 'Se a dificuldade para dormir durar semanas, converse com um profissional de saúde.',
    humores: ['semenergia', 'estressado', 'ansioso']
  },
  {
    id: 'escrita',
    titulo: 'Escrever o que você sente',
    categoria: 'Autocuidado',
    tempo: '4 min',
    resumo: 'Colocar os sentimentos em palavras pode ajudar a organizar os pensamentos e a entender melhor o que está acontecendo por dentro.',
    listaTitulo: 'Como fazer',
    ordenada: true,
    lista: [
      'Reserve uns 10 minutos em um lugar tranquilo.',
      'Escreva livremente o que está sentindo, sem se preocupar com erros ou com o que os outros vão pensar.',
      'Se quiser, termine com uma frase sobre algo que ajudaria você agora.',
      'Você pode reler depois ou simplesmente guardar só para você.'
    ],
    nota: 'O diário do Mental Help foi pensado exatamente para isso.',
    humores: ['triste', 'estressado', 'semenergia', 'ansioso']
  },
  {
    id: 'estudos',
    titulo: 'Organizar os estudos sem se sobrecarregar',
    categoria: 'Estresse',
    tempo: '5 min',
    resumo: 'Muita coisa para fazer ao mesmo tempo pesa. Dividir e priorizar deixa tudo mais leve.',
    listaTitulo: 'Dicas',
    ordenada: false,
    lista: [
      'Escolha até 3 prioridades por dia e comece pela mais importante.',
      'Divida tarefas grandes em partes pequenas.',
      'Estude em blocos de 25 minutos, com pausas de 5 minutos.',
      'Faça pausas de verdade: levante, beba água, respire.',
      'Se estiver difícil acompanhar, converse com professores ou com a coordenação.'
    ],
    humores: ['estressado', 'ansioso']
  },
  {
    id: 'conversar',
    titulo: 'Como conversar sobre o que você sente',
    categoria: 'Relacionamentos',
    tempo: '4 min',
    resumo: 'Dividir o que sentimos com alguém de confiança costuma aliviar. Mas começar a conversa pode ser a parte mais difícil.',
    listaTitulo: 'Ideias para começar',
    ordenada: false,
    lista: [
      'Escolha uma pessoa em quem você confia: familiar, amigo, professor ou orientador.',
      'Procure um momento tranquilo, sem pressa.',
      'Você pode começar com algo simples, como "tenho me sentido mal e queria conversar".',
      'Você não precisa explicar tudo de uma vez.',
      'Diga do que precisa: ser ouvido, um conselho ou apenas companhia.'
    ],
    humores: ['triste', 'ansioso', 'semenergia']
  },
  {
    id: 'energia',
    titulo: 'Quando falta energia: comece pequeno',
    categoria: 'Autocuidado',
    tempo: '3 min',
    resumo: 'Em dias pesados, metas gigantes desanimam. Escolher passos bem pequenos já é uma conquista.',
    listaTitulo: 'Passos pequenos',
    ordenada: false,
    lista: [
      'Beba um copo de água.',
      'Abra a janela e deixe a luz natural entrar.',
      'Tome um banho ou lave o rosto.',
      'Dê uma caminhada de 5 minutos.',
      'Mande uma mensagem para alguém de quem você gosta.'
    ],
    nota: 'Se a falta de energia e de vontade durar semanas, vale conversar com um profissional de saúde.',
    humores: ['semenergia', 'triste']
  },
  {
    id: 'movimento',
    titulo: 'Movimento para cuidar do humor',
    categoria: 'Autocuidado',
    tempo: '3 min',
    resumo: 'Mexer o corpo costuma ajudar a aliviar a tensão e a melhorar o humor, e não precisa ser academia.',
    listaTitulo: 'Ideias',
    ordenada: false,
    lista: [
      'Caminhar ao ar livre por 10 a 15 minutos.',
      'Alongar o corpo ao acordar ou entre os estudos.',
      'Dançar uma música de que você gosta.',
      'Escolher uma atividade prazerosa, para ficar fácil de repetir.'
    ],
    humores: ['estressado', 'semenergia', 'bem']
  },
  {
    id: 'manter',
    titulo: 'Mantendo o que está fazendo bem',
    categoria: 'Bem-estar',
    tempo: '3 min',
    resumo: 'Nos dias bons, vale prestar atenção no que ajudou. Isso vira um "kit" para usar nos dias mais difíceis.',
    listaTitulo: 'Pratique',
    ordenada: false,
    lista: [
      'Anote no diário o que contribuiu para o seu dia bom.',
      'Mantenha hábitos simples: sono, alimentação, movimento e tempo com quem você gosta.',
      'Reconheça algo que você fez bem nesta semana.',
      'Lembre do que funcionou, para usar depois quando precisar.'
    ],
    humores: ['bem']
  },
  {
    id: 'ajuda',
    titulo: 'Quando e onde buscar ajuda profissional',
    categoria: 'Apoio',
    tempo: '4 min',
    destaque: true,
    resumo: 'Pedir ajuda é um ato de cuidado. Você não precisa esperar chegar ao limite para procurar apoio.',
    listaTitulo: 'Vale procurar ajuda quando',
    ordenada: false,
    lista: [
      'A tristeza, a ansiedade ou o desânimo duram semanas.',
      'Os sentimentos atrapalham o sono, os estudos ou as relações.',
      'Você pensa em se machucar ou sente que não aguenta mais.'
    ],
    nota: 'Onde buscar: Unidade Básica de Saúde (posto de saúde) e CAPS, pelo SUS, além de psicólogos e psiquiatras. O CVV atende pelo telefone 188, 24 horas por dia, de graça. Em emergência, ligue 192 (SAMU).',
    humores: TODOS_HUMORES
  }
];

// ----------------------------------------------------------
// Tela
// ----------------------------------------------------------
const listaEl = document.getElementById('lista');
const msgEl = document.getElementById('resultado-msg');
const notaDiarioEl = document.getElementById('nota-diario');
const chips = document.querySelectorAll('[data-humor]');
const leitor = document.getElementById('leitor');
const leitorCorpo = document.getElementById('leitor-corpo');

// Cria um elemento HTML com classe e texto (texto sempre via textContent, que é seguro)
function criar(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto) el.textContent = texto;
  return el;
}

function criarCard(conteudo) {
  const card = criar('article', 'card content-card' + (conteudo.destaque ? ' content-card--destaque' : ''));

  const topo = criar('div', 'content-card__topo');
  topo.append(criar('span', 'badge', conteudo.categoria), criar('span', 'content-card__tempo', conteudo.tempo + ' de leitura'));

  const botao = criar('button', 'btn btn--outline content-card__botao', 'Ler agora');
  botao.type = 'button';
  botao.addEventListener('click', () => abrirLeitor(conteudo));

  card.append(topo, criar('h3', '', conteudo.titulo), criar('p', '', conteudo.resumo), botao);
  return card;
}

function renderLista(humor) {
  const filtrados = humor === 'todos'
    ? CONTEUDOS
    : CONTEUDOS.filter((c) => c.humores.includes(humor));

  listaEl.textContent = '';
  filtrados.forEach((c) => listaEl.append(criarCard(c)));

  msgEl.textContent = humor === 'todos'
    ? 'Mostrando todos os ' + filtrados.length + ' conteúdos.'
    : 'Mostrando ' + filtrados.length + ' conteúdos para quando você está se sentindo ' + NOMES_HUMOR[humor] + '.';
}

function selecionarHumor(humor) {
  chips.forEach((chip) => {
    const ativo = chip.dataset.humor === humor;
    chip.classList.toggle('chip--ativo', ativo);
    chip.setAttribute('aria-pressed', ativo);
  });
  renderLista(humor);
}

function abrirLeitor(conteudo) {
  leitorCorpo.textContent = '';

  const meta = criar('div', 'content-card__topo');
  meta.append(criar('span', 'badge', conteudo.categoria), criar('span', 'content-card__tempo', conteudo.tempo + ' de leitura'));

  const lista = criar(conteudo.ordenada ? 'ol' : 'ul', 'leitor__lista');
  conteudo.lista.forEach((item) => lista.append(criar('li', '', item)));

  leitorCorpo.append(meta, criar('h2', '', conteudo.titulo), criar('p', 'leitor__resumo', conteudo.resumo),
                     criar('h3', '', conteudo.listaTitulo), lista);
  if (conteudo.nota) leitorCorpo.append(criar('p', 'leitor__nota', conteudo.nota));

  leitor.showModal();
}

chips.forEach((chip) => chip.addEventListener('click', () => selecionarHumor(chip.dataset.humor)));
document.getElementById('leitor-fechar').addEventListener('click', () => leitor.close());
// Clicar fora da janela (no fundo escuro) também fecha
leitor.addEventListener('click', (evento) => { if (evento.target === leitor) leitor.close(); });

// Se a pessoa estiver logada e já tiver registros no diário, começamos
// com o filtro do último humor registrado. Senão, mostramos todos.
let inicial = 'todos';
const sessaoAtual = getSessao();
if (sessaoAtual) {
  const sugerido = humorParaConteudo(getRegistros(sessaoAtual.email));
  if (sugerido) {
    inicial = sugerido;
    notaDiarioEl.hidden = false;
  }
}
selecionarHumor(inicial);

// Link direto para um conteúdo (ex.: conteudos.html#respiracao).
// É o que as sugestões da IA no diário usam no "Ler mais".
const alvoHash = decodeURIComponent(window.location.hash.slice(1));
const conteudoAlvo = CONTEUDOS.find((c) => c.id === alvoHash);
if (conteudoAlvo) {
  selecionarHumor('todos');
  notaDiarioEl.hidden = true;
  abrirLeitor(conteudoAlvo);
}
