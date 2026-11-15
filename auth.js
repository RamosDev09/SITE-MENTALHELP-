// ==========================================================
// AUTENTICAÇÃO DO MENTAL HELP (protótipo)
//
// Este arquivo cuida de: criar conta, entrar, sair e mostrar
// quem está logado no cabeçalho.
//
// Os dados ficam no localStorage (uma "gaveta" do navegador).
// Isso NÃO é um banco de dados de verdade, mas já aplica boas
// práticas que um sistema real também usa:
//   1) a senha NUNCA é guardada: guardamos só o "hash" dela
//      (uma impressão digital irreversível, com SHA-256);
//   2) cada usuário tem um "salt" (tempero aleatório), então
//      duas pessoas com a mesma senha têm hashes diferentes;
//   3) bloqueio temporário depois de várias senhas erradas;
//   4) a sessão (quem está logado) some quando fecha a aba.
// ==========================================================

const CHAVE_USUARIOS = 'mentalhelp_usuarios_v2';
const CHAVE_SESSAO = 'mentalhelp_sessao';
const CHAVE_TENTATIVAS = 'mentalhelp_tentativas';

const LIMITE_TENTATIVAS = 5;      // erros seguidos permitidos
const BLOQUEIO_SEGUNDOS = 30;     // tempo de espera depois do limite
const RODADAS_HASH = 3000;        // quantas vezes repetimos o hash (deixa ataques mais lentos)

// ----------------------------------------------------------
// SHA-256 (algoritmo de hash). Escrito aqui para funcionar em
// qualquer navegador, mesmo abrindo o arquivo direto do PC.
// ----------------------------------------------------------
const K256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function sha256(texto) {
  const bytes = Array.from(new TextEncoder().encode(texto));
  const bits = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const alto = Math.floor(bits / 0x100000000);
  const baixo = bits >>> 0;
  for (let i = 3; i >= 0; i--) bytes.push((alto >>> (i * 8)) & 255);
  for (let i = 3; i >= 0; i--) bytes.push((baixo >>> (i * 8)) & 255);

  let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  for (let inicio = 0; inicio < bytes.length; inicio += 64) {
    const w = new Array(64);
    for (let i = 0; i < 16; i++) {
      const p = inicio + i * 4;
      w[i] = (bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K256[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h = [(h[0] + a) | 0, (h[1] + b) | 0, (h[2] + c) | 0, (h[3] + d) | 0,
         (h[4] + e) | 0, (h[5] + f) | 0, (h[6] + g) | 0, (h[7] + hh) | 0];
  }
  return h.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

// Gera um "salt": texto aleatório único para cada usuário.
function gerarSalt() {
  const lista = new Uint8Array(16);
  crypto.getRandomValues(lista);
  return Array.from(lista, (n) => n.toString(16).padStart(2, '0')).join('');
}

// Transforma senha + salt em hash, repetindo várias rodadas.
function hashSenha(senha, salt) {
  let resultado = sha256(salt + senha);
  for (let i = 0; i < RODADAS_HASH; i++) {
    resultado = sha256(resultado + salt);
  }
  return resultado;
}

// ----------------------------------------------------------
// Ler e salvar dados no navegador
// ----------------------------------------------------------
function lerJSON(armazenamento, chave, padrao) {
  try {
    const texto = armazenamento.getItem(chave);
    return texto ? JSON.parse(texto) : padrao;
  } catch (erro) {
    return padrao;
  }
}

function getUsuarios() { return lerJSON(localStorage, CHAVE_USUARIOS, []); }
function salvarUsuarios(lista) { localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(lista)); }
function getSessao() { return lerJSON(sessionStorage, CHAVE_SESSAO, null); }
function normalizarEmail(email) { return String(email).trim().toLowerCase(); }

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// ----------------------------------------------------------
// Regras e força da senha
// ----------------------------------------------------------
function avaliarSenha(senha) {
  const regras = {
    tamanho: senha.length >= 8,
    maiuscula: /[A-Z]/.test(senha),
    numero: /[0-9]/.test(senha)
  };
  let pontos = 0;
  if (regras.tamanho) pontos++;
  if (regras.maiuscula) pontos++;
  if (regras.numero) pontos++;
  if (/[a-z]/.test(senha)) pontos++;
  if (/[^A-Za-z0-9]/.test(senha)) pontos++;
  if (senha.length >= 12) pontos++;

  let nivel = 'vazia';
  if (senha.length > 0) nivel = pontos <= 3 ? 'fraca' : pontos <= 4 ? 'media' : 'forte';

  const atendeRegras = regras.tamanho && regras.maiuscula && regras.numero;
  return { regras, nivel, atendeRegras };
}

// ----------------------------------------------------------
// Criar conta
// Retorna { ok: true } ou { ok: false, erro: 'mensagem' }
// ----------------------------------------------------------
function criarConta(nome, email, senha, confirmar) {
  nome = String(nome).trim();
  email = normalizarEmail(email);

  if (nome.length < 2) return { ok: false, erro: 'Digite seu nome.' };
  if (!emailValido(email)) return { ok: false, erro: 'Digite um e-mail válido.' };
  if (!avaliarSenha(senha).atendeRegras) {
    return { ok: false, erro: 'A senha precisa ter 8 caracteres, uma letra maiúscula e um número.' };
  }
  if (senha !== confirmar) return { ok: false, erro: 'As senhas não são iguais.' };

  const usuarios = getUsuarios();
  if (usuarios.some((u) => u.email === email)) {
    return { ok: false, erro: 'Já existe uma conta com esse e-mail.' };
  }

  const salt = gerarSalt();
  usuarios.push({
    nome,
    email,
    salt,
    hash: hashSenha(senha, salt),   // guardamos o hash, nunca a senha
    criadoEm: new Date().toISOString()
  });
  salvarUsuarios(usuarios);
  return { ok: true };
}

// ----------------------------------------------------------
// Bloqueio por tentativas erradas
// ----------------------------------------------------------
function segundosBloqueado(email) {
  const tentativas = lerJSON(localStorage, CHAVE_TENTATIVAS, {});
  const registro = tentativas[email];
  if (registro && registro.ate > Date.now()) {
    return Math.ceil((registro.ate - Date.now()) / 1000);
  }
  return 0;
}

function registrarFalha(email) {
  const tentativas = lerJSON(localStorage, CHAVE_TENTATIVAS, {});
  const registro = tentativas[email] || { count: 0, ate: 0 };
  registro.count += 1;
  if (registro.count >= LIMITE_TENTATIVAS) {
    registro.ate = Date.now() + BLOQUEIO_SEGUNDOS * 1000;
    registro.count = 0;
  }
  tentativas[email] = registro;
  localStorage.setItem(CHAVE_TENTATIVAS, JSON.stringify(tentativas));
  return registro;
}

function limparTentativas(email) {
  const tentativas = lerJSON(localStorage, CHAVE_TENTATIVAS, {});
  delete tentativas[email];
  localStorage.setItem(CHAVE_TENTATIVAS, JSON.stringify(tentativas));
}

// ----------------------------------------------------------
// Entrar
// Retorna { ok: true } ou { ok: false, erro, bloqueado? }
// ----------------------------------------------------------
function entrar(email, senha) {
  email = normalizarEmail(email);

  const espera = segundosBloqueado(email);
  if (espera > 0) {
    return { ok: false, bloqueado: espera, erro: 'Muitas tentativas. Aguarde ' + espera + 's para tentar de novo.' };
  }

  const usuario = getUsuarios().find((u) => u.email === email);
  const confere = usuario && hashSenha(senha, usuario.salt) === usuario.hash;

  if (!confere) {
    const registro = registrarFalha(email);
    if (registro.ate > Date.now()) {
      return { ok: false, bloqueado: BLOQUEIO_SEGUNDOS, erro: 'Muitas tentativas. Aguarde ' + BLOQUEIO_SEGUNDOS + 's para tentar de novo.' };
    }
    // A mesma mensagem para e-mail errado ou senha errada,
    // para ninguém descobrir quais e-mails existem no sistema.
    return { ok: false, erro: 'E-mail ou senha incorretos.' };
  }

  limparTentativas(email);
  // Na sessão guardamos só o necessário (nunca o hash nem o salt).
  sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify({ nome: usuario.nome, email: usuario.email }));
  return { ok: true };
}

function sair() {
  sessionStorage.removeItem(CHAVE_SESSAO);
}

// ==========================================================
// PARTE DA TELA (só roda no navegador, onde existe "document")
// ==========================================================
if (typeof document !== 'undefined') {

  // ---- Cabeçalho: "Entrar / Criar conta" ou "Olá, Nome / Sair" ----
  const areaAuth = document.getElementById('auth-area');
  const sessao = getSessao();

  if (areaAuth && sessao) {
    areaAuth.textContent = '';

    const saudacao = document.createElement('span');
    saudacao.className = 'user-greeting';
    saudacao.append('Olá, ');
    const nomeEl = document.createElement('strong');
    nomeEl.textContent = sessao.nome.split(' ')[0];
    saudacao.append(nomeEl);

    const botaoSair = document.createElement('button');
    botaoSair.className = 'btn btn--outline';
    botaoSair.type = 'button';
    botaoSair.textContent = 'Sair';
    botaoSair.addEventListener('click', () => {
      sair();
      window.location.href = 'index.html';
    });

    areaAuth.append(saudacao, botaoSair);

    // Link "Meu perfil" no menu (no celular, a saudação some, por isso fica no menu)
    const menu = document.getElementById('nav');
    if (menu) {
      const linkPerfil = document.createElement('a');
      linkPerfil.href = 'perfil.html';
      linkPerfil.textContent = 'Meu perfil';
      if (window.location.pathname.endsWith('perfil.html')) linkPerfil.setAttribute('aria-current', 'page');
      menu.append(linkPerfil);
    }
  }

  // ---- Botões "Mostrar / Ocultar" senha ----
  document.querySelectorAll('[data-toggle-senha]').forEach((botao) => {
    const campo = document.getElementById(botao.dataset.toggleSenha);
    botao.addEventListener('click', () => {
      const mostrar = campo.type === 'password';
      campo.type = mostrar ? 'text' : 'password';
      botao.textContent = mostrar ? 'Ocultar' : 'Mostrar';
    });
  });

  const formCadastro = document.getElementById('form-cadastro');
  const formLogin = document.getElementById('form-login');

  // Quem já está logado não precisa ver login/cadastro
  if ((formCadastro || formLogin) && sessao) {
    window.location.replace('index.html');
  }

  // ---- Formulário de CADASTRO ----
  if (formCadastro) {
    const campoSenha = document.getElementById('senha');
    const medidor = document.getElementById('forca');
    const textoForca = document.getElementById('forca-texto');
    const itensRegra = document.querySelectorAll('[data-regra]');
    const rotulos = { vazia: '', fraca: 'Senha fraca', media: 'Senha razoável', forte: 'Senha forte' };

    // A cada letra digitada, atualiza o medidor e a lista de regras
    campoSenha.addEventListener('input', () => {
      const resultado = avaliarSenha(campoSenha.value);
      medidor.dataset.nivel = resultado.nivel;
      textoForca.textContent = rotulos[resultado.nivel];
      itensRegra.forEach((item) => {
        item.classList.toggle('ok', resultado.regras[item.dataset.regra]);
      });
    });

    formCadastro.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const erro = document.getElementById('form-error');

      if (!document.getElementById('termos').checked) {
        erro.textContent = 'Aceite a política de privacidade para continuar.';
        return;
      }

      const resultado = criarConta(
        document.getElementById('nome').value,
        document.getElementById('email').value,
        campoSenha.value,
        document.getElementById('confirmar-senha').value
      );

      if (!resultado.ok) {
        erro.textContent = resultado.erro;
        return;
      }
      window.location.href = 'login.html?conta=criada';
    });
  }

  // ---- Formulário de LOGIN ----
  if (formLogin) {
    const erro = document.getElementById('form-error');
    const botao = document.getElementById('btn-entrar');
    const aviso = document.getElementById('form-success');

    if (new URLSearchParams(window.location.search).get('conta') === 'criada') {
      aviso.hidden = false;
    }

    // Mostra a contagem regressiva quando a pessoa está bloqueada
    let relogio = null;
    function iniciarContagem(email) {
      clearInterval(relogio);
      const atualizar = () => {
        const seg = segundosBloqueado(email);
        if (seg <= 0) {
          clearInterval(relogio);
          botao.disabled = false;
          erro.textContent = '';
          return;
        }
        botao.disabled = true;
        erro.textContent = 'Muitas tentativas. Aguarde ' + seg + 's para tentar de novo.';
      };
      atualizar();
      relogio = setInterval(atualizar, 1000);
    }

    formLogin.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const email = document.getElementById('email').value;
      const resultado = entrar(email, document.getElementById('senha').value);

      if (resultado.ok) {
        window.location.href = 'index.html';
        return;
      }
      aviso.hidden = true;
      if (resultado.bloqueado) {
        iniciarContagem(normalizarEmail(email));
      } else {
        erro.textContent = resultado.erro;
      }
    });
  }
}
