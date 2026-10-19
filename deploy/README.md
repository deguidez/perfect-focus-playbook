# FocoAI no aaPanel — preparação

Destino solicitado: `ia.evenon.com.br`, na VPS `162.35.101.152`. Migrar site, contas, dados e IA sem alterar o Evenon.

## Estado real

Nada foi enviado ou instalado na VPS. Ter o IP e o nome de usuário não concede acesso autorizado ao servidor. Não envie senha root pelo chat.

## Verificação inicial, sem mudanças

1. No gerenciador de arquivos do aaPanel, crie `/tmp/focoai-preflight.sh` e copie para ele o conteúdo de `deploy/aapanel-preflight.sh` deste projeto.
2. No terminal do aaPanel, execute:

```bash
bash /tmp/focoai-preflight.sh
```

3. Compartilhe apenas o resultado desse comando. Ele verifica versões, espaço, memória, portas locais, nomes de processos e DNS; não lê senhas, argumentos de processos ou configurações privadas e não altera sites existentes.

Se Node.js não aparecer, ele pode estar instalado pelo gerenciador do aaPanel sem estar no caminho do terminal; não reinstale antes de verificar isso no painel.

Resultado anterior informado: Node 14.17.6, npm 6.14.15, Nginx 1.24.0, 1,6 GiB de RAM, 5 GiB de swap e 14 GB livres. Isso não comprova capacidade para executar contas e banco de dados adicionais junto do Evenon. Não substituir o Node global: confirmar uma versão moderna instalada separadamente e compatível com as dependências atuais.

## Preservar o Evenon

- Não editar o site, banco, variáveis, processos, certificados ou configurações do Evenon.
- Não instalar ou atualizar pacotes globais, trocar o Node global ou reiniciar o Nginx global com comandos de instalação automática.
- Reservar diretório e usuário de serviço exclusivos, portas locais livres confirmadas e limites de recursos para o FocoAI.
- Criar somente o novo site `ia.evenon.com.br`. Uma ativação que exija recarregar o Nginx compartilhado precisa de validação da configuração e de uma operação controlada no aaPanel; nunca substituir o arquivo global.
- Não alterar registros DNS do domínio principal ou de outros subdomínios. A troca do registro específico do FocoAI fica para depois dos testes.
- Medir disponibilidade do Evenon antes e depois. Sem acesso à VPS, não é possível comprovar isolamento ou disponibilidade.

## Exportar contas e dados com segurança

Esta exportação é iniciada pelo titular no Lovable; nenhum arquivo de contas ou dados foi gerado por esta preparação. Este projeto usa uma única instância de dados para a prévia e o aplicativo publicado.

No Lovable, abrir **Mais → Database → Manage → Settings → Export project data → Export data → Database → Export → Start export**. O arquivo fica disponível pelo link enviado por e-mail ou em **Mais → Storage**.

O export oficial inclui estrutura, dados e contas com hashes de senha. Não enviar esse arquivo pelo chat nem colocá-lo numa pasta pública do site: transferir por canal protegido para o responsável pela restauração no destino. Não gerar dumps alternativos nem reconstruir contas copiando linhas manualmente.

Limites do método suportado: banco de até 15 GB, arquivo de até 5 GB e uma exportação a cada 24 horas. O serviço precisa estar em execução. O arquivo contém hashes, não senhas consultáveis. Uma restauração compatível pode preservar as senhas; se isso não for possível, configurar recuperação por e-mail e pedir a redefinição aos usuários, sem atribuir senhas compartilhadas.

Segredos, configurações de provedores e arquivos armazenados não acompanham esse export. Se houver arquivos em Storage, baixar separadamente pelo Lovable. O código analisado não usa armazenamento de originais na nuvem: os JPG originais ficam nos computadores dos fotógrafos.

A restauração precisa de um serviço de contas e dados compatível. Preservar os identificadores das contas e donos de álbuns; conferir os totais e relações depois da importação. As senhas podem ser preservadas pelo import compatível dos hashes, mas a entrada deve ser testada antes de prometer continuidade. Não modificar nem apagar a origem durante a preparação.

## Bloqueios antes da instalação completa

- A análise de fotos usa uma credencial de IA gerenciada pelo Lovable, que não pode ser exportada por este fluxo. Uma instalação independente exige uma integração de IA própria, com credencial fornecida de forma segura e custos próprios.
- A criação e administração de contas usam acesso privilegiado do Lovable Cloud que não está disponível para exportação. Uma instalação independente exige preparar um serviço de contas compatível e migrar os dados com segurança.
- Falta o e-mail da pessoa que será o único superadministrador. Não promover automaticamente o usuário atual.
- O formato de execução em Node.js precisa ser configurado e validado para este projeto antes de gerar instruções de inicialização. Não assumir que o resultado atual, voltado ao hosting Lovable, roda com Node.js.

Não apontar o domínio para uma instalação parcial: entrada, análise de uma foto e gestão de contas devem funcionar antes da troca. Não reiniciar nem substituir o Nginx global do aaPanel.

## Critérios para liberar a troca

- Conta migrada entra e lê seus álbuns/resultados anteriores; recuperação de senha envia e permite redefinir a senha.
- Somente o superadministrador ativo cria/edita contas e equipes. Outro fotógrafo não acessa álbuns privados alheios.
- Uma foto real é analisada com a integração própria e exportada com categoria, preset, exposição e renomeação corretos.
- O novo serviço responde por HTTPS e abre páginas internas diretamente; volta após reinicialização somente de seu próprio processo.
- O Evenon permanece disponível e os limites medidos de memória/disco são aceitáveis.
- Exportação validada, instalação anterior disponível e procedimento de retorno definidos antes da troca do DNS.

Nenhum desses testes de destino foi realizado. A preparação atual não é uma instalação concluída.

## Código e GitHub

O inventário para a migração fica em [MIGRATION.md](./MIGRATION.md). A documentação não contém valores de chaves nem uma cópia dos dados privados.

Quando o projeto está conectado ao GitHub, o Lovable sincroniza as alterações de código com a branch conectada. Conferir a conexão e o estado em **Configurações do projeto → Git**; esta preparação não comprova que o GitHub recebeu os arquivos. Não desconectar para tentar corrigir a sincronização: reconectar cria outro repositório.

Banco de dados, contas, arquivos privados e segredos não são transferidos pela sincronização de código. Não adicionar o export ao repositório, mesmo privado. A atualização do código também não instala o serviço na VPS.

## Alternativa sem migrar os serviços

Manter o aplicativo no Lovable e conectar o domínio solicitado preserva a IA e a gestão de contas atuais. Isso não instala o aplicativo na VPS. DNS deve ser alterado no serviço que realmente administra a zona do domínio, que não necessariamente é o aaPanel.