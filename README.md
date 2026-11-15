Mental Help

Protótipo de plataforma de apoio emocional para jovens. Projeto multidisciplinar do curso de Desenvolvimento de Sistemas, E.E. Carolina Cintra da Silveira (2026).

Equipe: Arthur Ramos, Francisco Henrique Silva Ferreira, Fernando Galdino Yokiti, Kauan da Silva Batista e Hector Prado Ferreira.

O que o site faz
Cadastro e login com segurança básica. A senha nunca é guardada, só o hash (SHA-256 com salt e várias rodadas). Há bloqueio temporário depois de 5 senhas erradas.
Diário emocional: registro diário de humor (1 a 5), sentimentos e texto livre.
Análise de sentimentos (IA básica): lê o texto do diário, procura palavras de cada emoção (tratando negações como “não estou triste”) e sugere até 3 ações práticas.
Conteúdos recomendados: materiais sobre saúde emocional, filtrados pelo humor mais recente.
Comunidade: desabafos anônimos (cada conta ganha um apelido automático) com comentários.
Perfil: estatísticas, personalização (apelido, cor, símbolo, frase) e gerenciamento dos próprios desabafos. O perfil público abre por perfil.html?u=<id>.
Como abrir

Não precisa instalar nada nem ter servidor. Abra o arquivo index.html em qualquer navegador atual (Chrome, Edge, Firefox, Safari).

Para testar a comunidade com várias pessoas, abra duas abas e entre com uma conta diferente em cada uma.

Estrutura de arquivos
Arquivo	Para que serve
index.html	Página inicial
login.html, cadastro.html	Entrar e criar conta
diario.html	Diário emocional
conteudos.html	Conteúdos recomendados
comunidade.html	Comunidade
perfil.html	Perfil (próprio e público)
style.css	Todo o visual (no final há blocos de ajustes)
auth.js	Cadastro, login, sessão, hash de senha
diario.js	Registros do diário e regras de humor
ia.js	Análise de sentimentos e sugestões
conteudos.js	Lista de conteúdos e filtros
comunidade.js	Publicações e comentários
perfil.js	Telas de perfil
script.js	Menu mobile, animações ao rolar, botão “Começar agora”
img/	Logo, favicon e ícones
Detalhes do front-end
Lazy loading: as imagens usam loading="lazy" (a logo do topo carrega normalmente) e as seções abaixo da tela usam content-visibility: auto.
Animações: os elementos da página inicial aparecem suavemente ao rolar, o menu destaca a seção atual e há um botão “voltar ao topo”. Quem usa “reduzir movimento” no sistema não vê as animações.
Botão “Começar agora”: leva ao login. Se a pessoa já estiver logada, vai direto ao diário.
Visual: minimalista e editorial (títulos em caixa alta, linhas finas, botões retos), com a paleta azul e branco do projeto. As cores ficam no começo do style.css e em um bloco no final.
Como editar
Adicionar um conteúdo: em conteudos.js, copie um bloco { ... } da lista e mude os textos e os humores indicados. O card é criado sozinho.
Mudar as emoções reconhecidas pela IA: edite o léxico em ia.js.
Mudar os limites de login: LIMITE_TENTATIVAS, BLOQUEIO_SEGUNDOS e RODADAS_HASH no topo de auth.js.
Mudar as cores: variáveis --blue-* e --ink* em style.css.
Limitações (é um protótipo)
Todos os dados (contas, diário, comunidade) ficam no localStorage do navegador. Não há banco de dados nem servidor.
Por isso nada é compartilhado entre aparelhos ou navegadores diferentes, e limpar os dados do navegador apaga tudo.
A segurança de senha é didática. Num sistema real, a autenticação e o armazenamento ficariam em um servidor.
A análise de sentimentos é uma versão básica baseada em dicionário de palavras, não um modelo de IA treinado.
Os conteúdos são informativos e não substituem o acompanhamento de um profissional de saúde.
Se você precisa de ajuda agora

No Brasil, o CVV atende pelo telefone 188, 24 horas por dia, de graça. Em caso de emergência, ligue 192 (SAMU).
