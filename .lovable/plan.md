# Migração do FocoAI para ia.evenon.com.br

## Objetivo
Migrar o site, as contas, os dados e a análise de fotos para a VPS com aaPanel, sem modificar o Evenon. Nada foi instalado na VPS e ainda não há acesso remoto autorizado disponível nesta conversa.

## 1. Verificar e separar a instalação
- Conferir os serviços e o consumo do Evenon com verificações somente de leitura.
- Confirmar uma versão moderna de Node compatível com o projeto, instalada separadamente: não substituir o Node 14 usado por outros sites.
- Criar diretório, usuário de serviço, portas locais e configuração exclusiva para o FocoAI; não substituir a configuração global do Nginx nem reiniciar serviços do Evenon.
- Verificar se os 1,6 GB de memória e 14 GB livres comportam o novo serviço e suas contas/dados. Se não comportarem, parar antes de instalar e informar o recurso necessário.

## 2. Preservar contas e dados
- Solicitar a exportação oficial em **Mais → Database → Manage → Settings → Export project data → Export data → Database → Export → Start export**.
- Esse arquivo inclui estrutura, dados e contas com hashes de senha; tratá-lo como confidencial e transferi-lo diretamente ao destino por canal protegido, nunca pelo chat público.
- Restaurar em um serviço de contas e dados compatível e independente, preservando identificadores, donos de álbuns, resultados, presets, nomes de exportação e equipes.
- Conferir separadamente eventuais arquivos armazenados: não estão incluídos nessa exportação. As fotos originais continuam no computador de cada fotógrafo.
- Manter login por e-mail/senha, sem cadastro público, e administração exclusiva do superadministrador; confirmar a identidade da pessoa escolhida antes de transferir privilégios.
- Configurar recuperação de senha e envio de e-mails no destino. Segredos e configurações de entrada não acompanham a exportação.

## 3. Tornar o aplicativo independente
- Preparar e validar a execução em Node, sem alterar a publicação atual enquanto a VPS não estiver pronta.
- Substituir a credencial de IA gerenciada por uma integração independente, com credencial própria configurada de forma segura e cobrança do fornecedor.
- Configurar as credenciais do novo serviço de contas e dados somente no destino; não tentar exportar credenciais privilegiadas do Lovable Cloud.
- Preservar a análise por cópia JPG reduzida, classificação manual, presets, exposição automática, renomeação e processamento ao navegar entre páginas.

## 4. Testar antes de trocar o domínio
- Validar entrada com uma conta migrada, recuperação de senha e acesso aos álbuns antigos.
- Testar criação/edição de usuário e equipe com o superadministrador e impedir acesso aos álbuns de outro fotógrafo.
- Analisar uma foto real e conferir a exportação, categoria, preset e nome final.
- Validar HTTPS, reinicialização do serviço do FocoAI e acesso direto às páginas internas.
- Conferir que o Evenon continua respondendo normalmente antes e depois da ativação.
- Só então configurar o registro específico de **ia.evenon.com.br**, sem alterar registros do Evenon; manter a instalação atual disponível para retorno caso necessário.

## Dependências para executar
- Operações no aaPanel precisam ser executadas pelo usuário ou por um canal remoto autorizado disponível; o formulário de segredos não cria acesso à VPS.
- Exportação oficial dos dados, credencial própria de IA, serviço compatível de contas/dados e envio de e-mails.
- E-mail do novo superadministrador e confirmação da capacidade da VPS.

## Detalhes técnicos
O aplicativo usa TanStack Start e está configurado para o hosting atual. A saída de produção para Node precisa ser validada, não apenas presumida. O destino deve preservar autenticação compatível, políticas de acesso por proprietário e funções de administração. A estratégia de instalação dos serviços será definida após a verificação de capacidade; não instalar uma pilha pesada nessa VPS sem essa conferência.