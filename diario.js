// ==========================================================
// DIÁRIO EMOCIONAL
//
// A pessoa registra como se sente (humor de 1 a 5, sentimentos
// e um texto livre). Os registros ficam no localStorage, separados
// por e-mail. A página de conteúdos usa o último registro para
// sugerir o que ler.
//
// Este arquivo é carregado em duas páginas: diario.html (que usa
// tudo) e conteudos.html (que só usa getRegistros e
// humorParaConteudo). Por isso a parte da tela, lá embaixo, só
// roda se a página tiver o elemento #diario-app.
// ==========================================================

const CHAVE_DIARIO = 'mentalhelp_diario_v1';
const LIMITE_TEXTO = 500;

// Do humor mais alto (5) ao mais baixo (1)
const HUMORES_DIARIO = {
  5: { rotulo: 'Muito bem', emoji: '😄' },
  4: { rotulo: 'Bem', emoji: '🙂' },
  3: { rotulo: 'Mais ou menos', emoji: '😐' },
  2: { rotulo: 'Mal', emoji: '😔' },
  1: { rotulo: 'Muito mal', emoji: '😢' }
};

const SENTIMENTOS = [
  'Calmo', 'Feliz', 'Grato', 'Motivado', 'Cansado',
  'Ansioso', 'Estressado', 'Triste', 'Sozinho', 'Irritado'
];

// Palavras que indicam que a pessoa pode estar em sofrimento grave.
// Não bloqueiam nada: só mostram uma mensagem de apoio com o CVV.
const PALAVRAS_ALERTA = [
  'suicid', 'me matar', 'quero morrer', 'vou morrer', 'acabar com tudo',
  'acabar com a minha vida', 'me machucar', 'me cortar',
  'não aguento mais', 'nao aguento mais'
];

// ----------------------------------------------------------
// Dados
// ----------------------------------------------------------
function getRegistros(email) {
  const tudo = lerJSON(localStorage, CHAVE_DIARIO, {});
  return tudo[email] || [];
}

function salvarRegistros(email, lista) {
  const tudo = lerJSON(localStorage, CHAVE_DIARIO, {});
  tudo[email] = lista;
  localStorage.setItem(CHAVE_DIARIO, JSON.stringify(tudo));
}

// Cria um registro novo (o mais recente fica sempre no começo da lista).
function criarRegistro(email, humor, sentimentos, texto) {
  humor = Number(humor);
  if (!HUMORES_DIARIO[humor]) {
    return { ok: false, erro: 'Escolha como você está se sentindo.' };
  }

  const registro = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    data: new Date().toISOString(),
    humor,
    sentimentos: sentimentos.filter((s) => SENTIMENTOS.includes(s)),
    texto: String(texto).trim().slice(0, LIMITE_TEXTO)
  };

  const lista = getRegistros(email);
  lista.unshift(registro);
  salvarRegistros(email, lista);
  return { ok: true, registro };
}

function removerRegistro(email, id) {
  salvarRegistros(email, getRegistros(email).filter((r) => r.id !== id));
}

// ----------------------------------------------------------
// Análises guardadas junto com o registro
//
// Cada registro passa a ter o campo "analise", com o que a IA
// disse na hora de salvar. Assim a análise não some quando a
// página é recarregada e é apagada junto com o registro.
// ----------------------------------------------------------

// Guarda só os campos que precisamos (evita gravar lixo no localStorage)
function limparAnalise(analise, retroativa) {
  return {
    tom: ['positivo', 'neutro', 'dificil'].includes(analise.tom) ? analise.tom : 'neutro',
    mensagem: String(analise.mensagem || ''),
    categorias: (analise.categorias || []).map((c) => ({ id: c.id || '', rotulo: String(c.rotulo || '') })),
    sugestoes: (analise.sugestoes || []).map((s) => ({ texto: String(s.texto || ''), conteudoId: String(s.conteudoId || '') })),
    geradaEm: new Date().toISOString(),
    retroativa: Boolean(retroativa)
  };
}

// Grava a análise dentro do registro com o id indicado.
// Se o registro foi apagado enquanto a análise era gerada, não faz nada.
function anexarAnalise(email, id, analise, retroativa) {
  const lista = getRegistros(email);
  const registro = lista.find((r) => r.id === id);
  if (!registro) return false;
  registro.analise = limparAnalise(analise, retroativa);
  salvarRegistros(email, lista);
  return true;
}

// Registros feitos antes desta aba existir não têm análise.
// Geramos uma agora (marcada como "retroativa") para a aba não ficar com buracos.
function completarAnalises(email) {
  if (typeof analisarRegistro !== 'function') return;
  const lista = getRegistros(email);
  let mudou = false;
  lista.forEach((r) => {
    if (!r.analise) {
      r.analise = limparAnalise(analisarRegistro(r), true);
      mudou = true;
    }
  });
  if (mudou) salvarRegistros(email, lista);
}

// ----------------------------------------------------------
// Resumo da semana (para o gráfico de barras)
// ----------------------------------------------------------
function chaveDia(data) {
  const d = new Date(data);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Devolve os últimos 7 dias, cada um com a média do humor (ou null se não houve registro)
function ultimosSeteDias(registros, agora = new Date()) {
  const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - i);
    dias.push({ chave: chaveDia(d), rotulo: nomes[d.getDay()], soma: 0, total: 0, media: null });
  }
  registros.forEach((r) => {
    const dia = dias.find((x) => x.chave === chaveDia(r.data));
    if (dia) { dia.soma += r.humor; dia.total += 1; }
  });
  dias.forEach((dia) => { dia.media = dia.total ? dia.soma / dia.total : null; });
  return dias;
}

// ----------------------------------------------------------
// Apoio e recomendação
// ----------------------------------------------------------
function textoPreocupante(texto) {
  const t = String(texto).toLowerCase();
  return PALAVRAS_ALERTA.some((p) => t.includes(p));
}

// Que tipo de mensagem mostrar depois de salvar: 'alerta', 'suave' ou 'ok'
function tipoDeAviso(registro) {
  if (textoPreocupante(registro.texto)) return 'alerta';
  if (registro.humor <= 2) return 'suave';
  return 'ok';
}

// Olha o último registro e diz qual filtro da página de conteúdos combina
function humorParaConteudo(registros) {
  if (!registros.length) return null;
  const ultimo = registros[0];
  const s = ultimo.sentimentos;
  if (s.includes('Ansioso')) return 'ansioso';
  if (s.includes('Estressado')) return 'estressado';
  if (s.includes('Triste')) return 'triste';
  if (s.includes('Cansado')) return 'semenergia';
  if (ultimo.humor >= 4) return 'bem';
  if (ultimo.humor <= 2) return 'triste';
  return null;
}

// ==========================================================
// PARTE DA TELA (só na página do diário)
// ==========================================================
if (typeof document !== 'undefined' && document.getElementById('diario-app')) {

  const app = document.getElementById('diario-app');
  const avisoLogin = document.getElementById('diario-aviso');
  const sessao = getSessao();

  if (!sessao) {
    // Sem login não tem diário: mostramos um convite para entrar
    avisoLogin.hidden = false;
  } else {
    app.hidden = false;
    iniciarDiario(sessao);
  }

  function criarEl(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto) el.textContent = texto;
    return el;
  }

  function iniciarDiario(sessao) {
    const form = document.getElementById('form-diario');
    const opcoesHumor = document.getElementById('opcoes-humor');
    const opcoesSentimentos = document.getElementById('opcoes-sentimentos');
    const campoTexto = document.getElementById('texto');
    const contador = document.getElementById('contador');
    const erro = document.getElementById('diario-erro');
    const feedback = document.getElementById('diario-feedback');

    document.getElementById('diario-ola').textContent =
      'Olá, ' + sessao.nome.split(' ')[0] + '. Como foi o seu dia?';

    // ---- Opções de humor (botões de escolha única) ----
    [5, 4, 3, 2, 1].forEach((valor) => {
      const label = criarEl('label', 'mood-option');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'humor';
      input.value = valor;
      label.append(input, criarEl('span', 'mood-option__face', HUMORES_DIARIO[valor].emoji),
                   criarEl('span', 'mood-option__nome', HUMORES_DIARIO[valor].rotulo));
      opcoesHumor.append(label);
    });

    // ---- Opções de sentimentos (várias podem ser marcadas) ----
    SENTIMENTOS.forEach((nome) => {
      const label = criarEl('label', 'tag-option');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = nome;
      label.append(input, criarEl('span', '', nome));
      opcoesSentimentos.append(label);
    });

    // ---- Contador de caracteres ----
    campoTexto.maxLength = LIMITE_TEXTO;
    campoTexto.addEventListener('input', () => {
      contador.textContent = campoTexto.value.length + '/' + LIMITE_TEXTO;
    });

    // ---- Salvar registro ----
    form.addEventListener('submit', (evento) => {
      evento.preventDefault();
      erro.textContent = '';

      const escolhido = form.querySelector('input[name="humor"]:checked');
      const sentimentos = Array.from(opcoesSentimentos.querySelectorAll('input:checked')).map((i) => i.value);

      const resultado = criarRegistro(sessao.email, escolhido ? escolhido.value : 0, sentimentos, campoTexto.value);
      if (!resultado.ok) {
        erro.textContent = resultado.erro;
        return;
      }

      form.reset();
      contador.textContent = '0/' + LIMITE_TEXTO;
      mostrarFeedback(tipoDeAviso(resultado.registro));

      // A IA analisa o registro, mostra o que a pessoa pode fazer agora
      // e guarda a análise dentro do próprio registro
      if (typeof gerarSugestoes === 'function') {
        const id = resultado.registro.id;
        gerarSugestoes(resultado.registro)
          .catch(() => analisarRegistro(resultado.registro))   // reserva se a IA falhar
          .then((analise) => {
            anexarAnalise(sessao.email, id, analise, false);
            mostrarSugestoes(analise);
            desenharHistorico();
          });
      }
      desenharSemana();
      desenharHistorico();
    });

    function mostrarFeedback(tipo) {
      feedback.textContent = '';
      const caixa = criarEl('div', 'feedback feedback--' + tipo);

      if (tipo === 'alerta') {
        caixa.append(
          criarEl('strong', '', 'Você não está sozinho(a).'),
          criarEl('p', '', 'Sentimos muito que você esteja passando por isso. Se estiver pensando em se machucar, procure ajuda agora: o CVV atende pelo 188, 24 horas, de graça. Em emergência, ligue 192 (SAMU).')
        );
        const ligar = criarEl('a', 'btn btn--primary', 'Ligar para o 188');
        ligar.href = 'tel:188';
        caixa.append(ligar);
      } else if (tipo === 'suave') {
        caixa.append(
          criarEl('strong', '', 'Obrigado por registrar.'),
          criarEl('p', '', 'Dias difíceis acontecem. Se quiser, veja conteúdos que podem ajudar. E se estiver pesado demais, o CVV atende pelo 188.')
        );
        const link = criarEl('a', 'btn btn--outline', 'Ver conteúdos');
        link.href = 'conteudos.html';
        caixa.append(link);
      } else {
        caixa.append(criarEl('strong', '', 'Registro salvo!'),
                     criarEl('p', '', 'Voltar aqui todos os dias ajuda você a perceber seus padrões.'));
      }
      feedback.append(caixa);
    }

    // ---- Caixa com as sugestões da IA ----
    function mostrarSugestoes(analise) {
      const area = document.getElementById('diario-sugestoes');
      area.textContent = '';
      const caixa = criarEl('div', 'ia-box ia-box--' + analise.tom);

      const topo = criarEl('div', 'ia-box__topo');
      topo.append(criarEl('span', 'badge', 'Assistente Mental Help'),
                  criarEl('span', 'ia-box__auto', 'análise automática'));
      caixa.append(topo, criarEl('p', 'ia-box__msg', analise.mensagem));

      if (analise.categorias.length) {
        const emocoes = criarEl('div', 'ia-box__emocoes');
        emocoes.append(criarEl('span', 'ia-box__rotulo', 'Sentimentos que percebemos:'));
        analise.categorias.forEach((c) => emocoes.append(criarEl('span', 'badge', c.rotulo)));
        caixa.append(emocoes);
      }

      const lista = criarEl('ul', 'ia-box__lista');
      analise.sugestoes.forEach((s) => {
        const item = criarEl('li');
        item.append(criarEl('span', '', s.texto + ' '));
        const link = criarEl('a', '', 'Ler mais');
        link.href = 'conteudos.html#' + s.conteudoId;
        item.append(link);
        lista.append(item);
      });

      caixa.append(lista, criarEl('p', 'ia-box__aviso',
        'Sugestões automáticas. Elas não substituem o acompanhamento de um profissional de saúde.'));
      area.append(caixa);
    }

    // ---- Gráfico da semana ----
    function desenharSemana() {
      const dias = ultimosSeteDias(getRegistros(sessao.email));
      const area = document.getElementById('semana');
      area.textContent = '';

      dias.forEach((dia) => {
        const coluna = criarEl('div', 'week-chart__col');
        const barra = criarEl('div', 'week-chart__bar' + (dia.media === null ? ' week-chart__bar--vazia' : ''));
        if (dia.media !== null) {
          barra.style.height = (dia.media / 5 * 100) + '%';
          coluna.title = dia.rotulo + ': humor médio ' + dia.media.toFixed(1).replace('.', ',') + ' de 5';
        } else {
          coluna.title = dia.rotulo + ': sem registro';
        }
        coluna.append(criarEl('div', 'week-chart__trilho'), criarEl('span', 'week-chart__rotulo', dia.rotulo));
        coluna.firstChild.append(barra);
        area.append(coluna);
      });

      const comRegistro = dias.filter((d) => d.total > 0).length;
      document.getElementById('semana-resumo').textContent = comRegistro === 0
        ? 'Nenhum registro nos últimos 7 dias.'
        : 'Você registrou em ' + comRegistro + (comRegistro === 1 ? ' dia' : ' dias') + ' dos últimos 7. As barras mostram o humor médio de cada dia.';
    }

    // ---- Bloco com a análise guardada em um registro ----
    const NOMES_TOM = { positivo: 'Dia positivo', neutro: 'Dia neutro', dificil: 'Dia difícil' };

    function montarAnalise(analise) {
      // Ainda sendo gerada (acontece por um instante logo depois de salvar)
      if (!analise) {
        return criarEl('p', 'entry-analise entry-analise--pendente', 'Analisando seu registro…');
      }

      const caixa = criarEl('div', 'entry-analise entry-analise--' + analise.tom);

      const topo = criarEl('div', 'entry-analise__topo');
      topo.append(criarEl('span', 'entry-analise__titulo', 'Análise · ' + NOMES_TOM[analise.tom]));
      const quando = new Date(analise.geradaEm).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
      topo.append(criarEl('span', 'entry-analise__meta',
        analise.retroativa ? 'gerada depois, em ' + quando : 'gerada ao salvar'));
      caixa.append(topo, criarEl('p', 'entry-analise__msg', analise.mensagem));

      if (analise.categorias.length) {
        const emocoes = criarEl('div', 'entry__tags');
        emocoes.append(criarEl('span', 'ia-box__rotulo', 'Percebemos:'));
        analise.categorias.forEach((c) => emocoes.append(criarEl('span', 'badge', c.rotulo)));
        caixa.append(emocoes);
      }

      if (analise.sugestoes.length) {
        const lista = criarEl('ul', 'entry-analise__lista');
        analise.sugestoes.forEach((sug) => {
          const li = criarEl('li');
          li.append(criarEl('span', '', sug.texto + ' '));
          const link = criarEl('a', '', 'Ler mais');
          link.href = 'conteudos.html#' + sug.conteudoId;
          li.append(link);
          lista.append(li);
        });
        caixa.append(lista);
      }
      return caixa;
    }

    // ---- Abas (Registrar / Registros e análises) ----
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

    // Abre direto na aba de análises se o link terminar com #analises
    if (location.hash === '#analises') abrirAba(document.getElementById('aba-analises'), false);
    window.addEventListener('hashchange', () => {
      abrirAba(document.getElementById(location.hash === '#analises' ? 'aba-analises' : 'aba-registrar'), false);
    });

    // Registros antigos ganham a análise que faltava
    completarAnalises(sessao.email);

    // ---- Lista de registros ----
    function desenharHistorico() {
      const registros = getRegistros(sessao.email);
      const area = document.getElementById('historico');
      area.textContent = '';
      document.getElementById('historico-vazio').hidden = registros.length > 0;
      document.getElementById('aba-contagem').textContent = registros.length;

      registros.forEach((r) => {
        const data = new Date(r.data);
        const info = HUMORES_DIARIO[r.humor];
        const item = criarEl('article', 'entry');

        const topo = criarEl('div', 'entry__topo');
        const quando = criarEl('p', 'entry__data',
          data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' às ' +
          data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        const humor = criarEl('span', 'entry__humor', info.emoji + ' ' + info.rotulo);
        topo.append(quando, humor);
        item.append(topo);

        if (r.sentimentos.length) {
          const tags = criarEl('div', 'entry__tags');
          r.sentimentos.forEach((s) => tags.append(criarEl('span', 'badge', s)));
          item.append(tags);
        }
        if (r.texto) item.append(criarEl('p', 'entry__texto', r.texto));

        item.append(montarAnalise(r.analise));

        const apagar = criarEl('button', 'entry__apagar', 'Apagar');
        apagar.type = 'button';
        apagar.addEventListener('click', () => {
          if (confirm('Apagar este registro? Não dá para desfazer.')) {
            removerRegistro(sessao.email, r.id);
            desenharSemana();
            desenharHistorico();
          }
        });
        item.append(apagar);

        area.append(item);
      });
    }

    desenharSemana();
    desenharHistorico();
  }
}
