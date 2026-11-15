// ==========================================================
// IA DO MENTAL HELP — análise de sentimentos (versão básica)
//
// Como funciona, em 4 passos:
//   1) LIMPAR o texto: tudo minúsculo, sem acentos e sem pontuação.
//   2) PROCURAR palavras e frases de cada emoção (ansiedade,
//      tristeza, estresse...) num "léxico", que é um dicionário
//      de emoções. Se vier uma negação perto ("não estou triste"),
//      a palavra não conta.
//   3) SOMAR os pontos: texto + sentimentos marcados + humor (1 a 5)
//      para descobrir o tom do dia (positivo, neutro ou difícil).
//   4) ESCOLHER até 3 sugestões práticas para as emoções que
//      mais apareceram, cada uma ligada a um conteúdo do site.
//
// É uma técnica clássica de processamento de linguagem natural
// (análise de sentimentos baseada em léxico), e roda 100% no
// navegador: o texto do diário não sai do computador da pessoa.
//
// IMPORTANTE: a função gerarSugestoes() devolve uma Promise de
// propósito. Assim, no futuro, dá para trocar o miolo dela por uma
// chamada a um modelo de linguagem de verdade (veja o comentário
// perto do fim do arquivo) sem mexer no resto do site.
// ==========================================================

// Palavras que invertem o sentido ("não estou feliz", "sem medo")
const NEGACOES = ['nao', 'nunca', 'nem', 'jamais', 'sem'];

// Léxico: para cada emoção, palavras (começo da palavra) e frases.
// Regra: palavra terminada em "!" só vale se for exatamente aquela.
const LEXICO = {
  ansiedade: {
    rotulo: 'ansiedade',
    palavras: ['ansios', 'nervos', 'preocup', 'panico', 'medo', 'aflit', 'agonia', 'apreens', 'inquiet', 'tenso', 'tensa', 'tensao', 'angusti'],
    frases: ['nao consigo parar de pensar', 'coracao disparad', 'coracao acelerad', 'falta de ar', 'mente nao para']
  },
  tristeza: {
    rotulo: 'tristeza',
    palavras: ['triste', 'chorei', 'chorar', 'chorando', 'choro', 'vazio', 'vazia', 'desanimad', 'deprimid', 'saudade', 'decepcion', 'magoad', 'desesper', 'melancoli', 'sofr'],
    frases: ['sem vontade', 'pra baixo', 'para baixo', 'sem esperanca', 'nao tenho vontade']
  },
  estresse: {
    rotulo: 'estresse',
    palavras: ['estress', 'sobrecarreg', 'pressao', 'pressionad', 'prazo', 'correria', 'cobranc', 'prova!', 'provas!'],
    frases: ['muita coisa', 'muitas coisas', 'tanta coisa', 'trabalho demais', 'tarefas demais', 'nao dou conta', 'sem tempo']
  },
  cansaco: {
    rotulo: 'cansaço',
    palavras: ['cansad', 'cansac', 'exaust', 'esgotad', 'sonolent', 'preguic'],
    frases: ['sem energia', 'sem forcas', 'sem animo', 'sem disposicao', 'sem pique', 'nao consigo levantar']
  },
  sono: {
    rotulo: 'sono ruim',
    palavras: ['insonia', 'pesadelo'],
    frases: ['nao consegui dormir', 'nao consigo dormir', 'dormi mal', 'dormi pouco', 'nao dormi', 'acordei varias vezes', 'acordei de madrugada']
  },
  solidao: {
    rotulo: 'solidão',
    palavras: ['sozinh', 'solidao', 'isolad', 'abandonad', 'excluid', 'ignorad'],
    frases: ['ninguem liga', 'ninguem se importa', 'ninguem me entende', 'nao tenho ninguem']
  },
  raiva: {
    rotulo: 'irritação',
    palavras: ['raiva', 'irritad', 'revoltad', 'furios', 'estourei', 'briga!', 'brigas!', 'brigamos!', 'briguei!', 'brigou!', 'brigaram!', 'odio!', 'odeio!'],
    frases: ['perdi a paciencia']
  },
  malestar: {
    rotulo: 'mal-estar',
    palavras: ['mal!', 'pessim', 'horrivel', 'terrivel', 'pior!', 'ruim!', 'ruins!'],
    frases: ['nao estou bem', 'nao me sinto bem', 'nao to bem', 'nao estou legal', 'dia ruim', 'dia dificil']
  },
  positivo: {
    rotulo: 'bem-estar',
    palavras: ['feliz', 'felicidade', 'alegr', 'grato', 'grata', 'gratidao', 'animad', 'tranquil', 'orgulh', 'otimo', 'otima', 'calmo', 'calma', 'motivad', 'contente', 'aliviad', 'bem!', 'bom!', 'boa!', 'leve!', 'melhor!'],
    frases: ['em paz']
  }
};

// Sentimentos que a pessoa marca nos botões do diário -> emoção do léxico
const TAG_PARA_EMOCAO = {
  Ansioso: 'ansiedade',
  Triste: 'tristeza',
  Estressado: 'estresse',
  Cansado: 'cansaco',
  Sozinho: 'solidao',
  Irritado: 'raiva',
  Calmo: 'positivo',
  Feliz: 'positivo',
  Grato: 'positivo',
  Motivado: 'positivo'
};

// Sugestões práticas. "conteudoId" é o id de um conteúdo da página de conteúdos.
const SUGESTOES = {
  ansiedade: [
    { texto: 'Faça 2 minutos de respiração lenta: inspire contando até 4 e solte contando até 6.', conteudoId: 'respiracao' },
    { texto: 'Tente a técnica dos 5 sentidos para trazer a atenção de volta ao momento presente.', conteudoId: 'cinco-sentidos' }
  ],
  tristeza: [
    { texto: 'Converse com alguém de confiança. Pode ser só uma mensagem dizendo que você não está bem.', conteudoId: 'conversar' },
    { texto: 'Escolha um cuidado pequeno agora: beber água, tomar um banho ou abrir a janela.', conteudoId: 'energia' }
  ],
  estresse: [
    { texto: 'Escolha só 3 prioridades para hoje e deixe o resto para depois.', conteudoId: 'estudos' },
    { texto: 'Faça uma pausa de 5 minutos para respirar e esticar o corpo.', conteudoId: 'respiracao' }
  ],
  cansaco: [
    { texto: 'Comece pequeno: uma tarefa leve ou uma caminhada curta já ajudam.', conteudoId: 'energia' },
    { texto: 'Hoje, tente dormir mais cedo e evitar telas antes de deitar.', conteudoId: 'sono' }
  ],
  sono: [
    { texto: 'Antes de deitar, anote o que está na sua cabeça e deixe o celular longe da cama.', conteudoId: 'sono' },
    { texto: 'Se a cabeça estiver agitada, faça a respiração lenta por alguns minutos.', conteudoId: 'respiracao' }
  ],
  solidao: [
    { texto: 'Mande uma mensagem para alguém de quem você gosta, mesmo que seja algo simples.', conteudoId: 'conversar' },
    { texto: 'Dar uma volta ao ar livre, mesmo que curta, ajuda a se sentir mais conectado.', conteudoId: 'movimento' }
  ],
  raiva: [
    { texto: 'Antes de reagir, respire fundo algumas vezes e se afaste da situação por alguns minutos.', conteudoId: 'respiracao' },
    { texto: 'Gastar a energia com movimento, como caminhar ou dançar, ajuda a aliviar a tensão.', conteudoId: 'movimento' }
  ],
  malestar: [
    { texto: 'Dias ruins acontecem. Faça agora algo bem pequeno de cuidado com você.', conteudoId: 'energia' },
    { texto: 'Se puder, conte para alguém de confiança como você está.', conteudoId: 'conversar' }
  ],
  positivo: [
    { texto: 'Anote o que contribuiu para esse momento bom, para lembrar nos dias difíceis.', conteudoId: 'manter' },
    { texto: 'Mantenha os hábitos que fazem bem: sono, movimento e tempo com quem você gosta.', conteudoId: 'movimento' }
  ]
};

// Quando não dá para identificar nenhuma emoção no texto
const SUGESTOES_PADRAO = {
  positivo: SUGESTOES.positivo,
  neutro: [
    { texto: 'Uma caminhada curta ou um alongamento ajudam a manter o equilíbrio do dia.', conteudoId: 'movimento' },
    { texto: 'Continue registrando: com o tempo, você percebe o que influencia o seu humor.', conteudoId: 'escrita' }
  ],
  dificil: [
    { texto: 'Faça agora algo bem pequeno de cuidado com você, como beber água ou respirar fundo.', conteudoId: 'energia' },
    { texto: 'Se puder, conte para alguém de confiança como você está.', conteudoId: 'conversar' }
  ]
};

const SUGESTAO_AJUDA = {
  texto: 'Se esse sentimento durar vários dias ou estiver pesado demais, procure apoio com alguém de confiança ou com um serviço de saúde.',
  conteudoId: 'ajuda'
};

const MENSAGENS_TOM = {
  positivo: 'Que bom que o seu dia está sendo bom! Veja como manter isso:',
  neutro: 'Obrigado por registrar. Algumas ideias para o seu dia:',
  dificil: 'Parece que o momento não está fácil. Algumas coisas que podem ajudar agora:'
};

// ----------------------------------------------------------
// Passo 1: limpar o texto
// ----------------------------------------------------------
function normalizarTexto(texto) {
  return String(texto)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // tira acentos
    .replace(/[^a-z0-9\s]/g, ' ')                         // tira pontuação
    .replace(/\s+/g, ' ')
    .trim();
}

function palavraCasa(token, padrao) {
  return padrao.endsWith('!') ? token === padrao.slice(0, -1) : token.startsWith(padrao);
}

// ----------------------------------------------------------
// Passo 2: contar emoções no texto
// ----------------------------------------------------------
function contarEmocoesNoTexto(texto) {
  const limpo = normalizarTexto(texto);
  const tokens = limpo ? limpo.split(' ') : [];
  const contagem = {};
  Object.keys(LEXICO).forEach((id) => { contagem[id] = 0; });

  Object.keys(LEXICO).forEach((id) => {
    const emocao = LEXICO[id];

    tokens.forEach((token, i) => {
      if (!emocao.palavras.some((p) => palavraCasa(token, p))) return;
      // Olha as 3 palavras anteriores procurando uma negação
      const antes = tokens.slice(Math.max(0, i - 3), i);
      const negado = antes.some((t) => NEGACOES.includes(t));
      if (!negado) {
        contagem[id] += 1;
      } else if (id === 'positivo') {
        contagem.malestar += 1;   // "não estou feliz" conta como mal-estar
      }
    });

    emocao.frases.forEach((frase) => {
      if (limpo.includes(frase)) contagem[id] += 1;
    });
  });

  Object.keys(contagem).forEach((id) => { contagem[id] = Math.min(contagem[id], 3); });
  return contagem;
}

// ----------------------------------------------------------
// Passos 3 e 4: pontuar, definir o tom e escolher as sugestões
// registro = { humor: 1 a 5, sentimentos: ['Ansioso', ...], texto: '...' }
// ----------------------------------------------------------
function analisarRegistro(registro) {
  const humor = Number(registro.humor) || 3;
  const pontos = contarEmocoesNoTexto(registro.texto || '');

  // Cada sentimento marcado vale 2 pontos na emoção correspondente
  (registro.sentimentos || []).forEach((tag) => {
    const emocao = TAG_PARA_EMOCAO[tag];
    if (emocao) pontos[emocao] += 2;
  });

  const positivos = pontos.positivo;
  const negativos = Object.keys(pontos)
    .filter((id) => id !== 'positivo')
    .reduce((soma, id) => soma + pontos[id], 0);

  // O humor escolhido pesa bastante: (humor - 3) vai de -2 a +2, vezes 3
  const saldo = positivos - negativos + (humor - 3) * 3;
  let tom = 'neutro';
  if (saldo <= -3) tom = 'dificil';
  else if (saldo >= 3) tom = 'positivo';

  // Emoções percebidas, da mais forte para a mais fraca (no máximo 3)
  const categorias = Object.keys(pontos)
    .filter((id) => pontos[id] > 0)
    .sort((a, b) => pontos[b] - pontos[a])
    .slice(0, 3)
    .map((id) => ({ id, rotulo: LEXICO[id].rotulo, pontos: pontos[id] }));

  return {
    tom,
    mensagem: MENSAGENS_TOM[tom],
    categorias,
    sugestoes: escolherSugestoes(categorias, tom, humor)
  };
}

function escolherSugestoes(categorias, tom, humor) {
  const escolhidas = [];
  const usadas = new Set();

  function adicionar(sugestao) {
    if (sugestao && !usadas.has(sugestao.conteudoId) && escolhidas.length < 3) {
      usadas.add(sugestao.conteudoId);
      escolhidas.push(sugestao);
    }
  }

  if (categorias.length === 0) {
    SUGESTOES_PADRAO[tom].forEach(adicionar);
  } else {
    // Primeiro a melhor sugestão de cada emoção, depois as segundas opções
    categorias.forEach((c) => adicionar(SUGESTOES[c.id][0]));
    categorias.forEach((c) => adicionar(SUGESTOES[c.id][1]));
  }

  // Dia muito ruim: garantimos o convite para buscar apoio
  if (humor <= 2 && !usadas.has('ajuda')) {
    if (escolhidas.length >= 3) escolhidas.pop();
    escolhidas.push(SUGESTAO_AJUDA);
  }
  return escolhidas;
}

// ----------------------------------------------------------
// Função que o diário usa. Hoje ela roda a análise acima.
//
// Para usar uma IA de verdade (modelo de linguagem), bastaria
// trocar o corpo desta função por algo assim:
//
//   return fetch('/api/sugestoes', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(registro)
//   }).then((resposta) => resposta.json());
//
// desde que o servidor devolva o mesmo formato:
// { tom, mensagem, categorias: [{ rotulo }], sugestoes: [{ texto, conteudoId }] }
// (e, se o servidor falhar, usar analisarRegistro(registro) como reserva).
// ----------------------------------------------------------
function gerarSugestoes(registro) {
  return Promise.resolve(analisarRegistro(registro));
}
