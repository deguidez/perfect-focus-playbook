# Migração FocoAI — ia.evenon.com.br

## Situação e limites

Preparação documental para migrar site, contas, dados e IA à VPS com aaPanel. Nada foi instalado na VPS e nenhuma exportação privada foi gerada. O Evenon não deve ser alterado. A lista abaixo registra nomes de configuração, nunca valores de chaves.

## Exportação suportada: ação do titular

1. Abrir **Mais → Database → Manage → Settings** no Lovable.
2. Em **Export project data**, selecionar **Export data**.
3. No cartão **Database**, selecionar **Export → Start export**.
4. Baixar pelo link enviado por e-mail ou por **Mais → Storage**.
5. Guardar o arquivo em local privado e transferir por canal protegido ao responsável pela restauração. Não enviar pelo chat, GitHub ou pasta pública do site.

Inclui estrutura, dados e contas com hashes de senha. Não inclui arquivos de Storage, segredos, configurações de login ou código de funções. Baixar eventuais arquivos de Storage separadamente pelo Lovable. Os JPG originais continuam nos computadores dos fotógrafos; não fazem parte da migração do banco.

Não é possível consultar as senhas originais. Restaurar hashes em um serviço compatível pode conservar o acesso. Validar uma entrada real antes da troca; caso a compatibilidade não permita, disponibilizar recuperação por e-mail para redefinir as senhas. Não recriar contas com novos identificadores: os álbuns precisam manter seus donos.

## Segredos existentes: apenas nomes

Inventário consultado em 19/10/2026:

| Nome | Situação | Tratamento para VPS independente |
| --- | --- | --- |
| `LOVABLE_API_KEY` | Credencial gerenciada da IA atual | Não consta do export; não assumir disponibilidade fora do Lovable. Preparar provedor e credencial próprios. |
| `LOVABLE_CRON_SECRET` | Segredo gerenciado da plataforma | Não consta do export. Não copiar como requisito automático; verificar se o destino terá tarefas agendadas próprias. |

Não há uma chave própria de OpenAI no inventário consultado. Isso não é evidência de ausência de outras configurações públicas ou de serviços administrados pela plataforma.

## Serviços a preparar no destino

- **Contas e dados compatíveis:** restauração do export, preservação de IDs e políticas de isolamento, acesso privilegiado próprio e seguro para criação de contas. As credenciais privilegiadas do Lovable Cloud não estão disponíveis para exportação.
- **E-mail de recuperação:** remetente e serviço de envio configurados no destino, com links para `https://ia.evenon.com.br/reset-password`. Sem isso, redefinição de senha não está pronta.
- **IA própria:** credencial do provedor escolhido, cobranças próprias e adaptação/testes da análise. Se usar OpenAI, obter uma chave em `platform.openai.com → API keys`; o consumo é separado do ChatGPT. Não basta trocar a chave do gateway por uma chave OpenAI.
- **Hospedagem isolada:** versão moderna de Node instalada separadamente, formato de execução validado, usuário de serviço/diretório exclusivos, portas locais verificadas e limites de recursos.
- **HTTPS e DNS:** criar somente o site e o registro de `ia.evenon.com.br`, depois da validação; não editar o Evenon nem os registros dos demais sites.

Guardar credenciais no ambiente protegido do destino, nunca no código ou em um arquivo `.env` versionado. Um formulário de segredos do Lovable não instala nem configura automaticamente segredos na VPS.

## Ordem de execução

1. Concluir a verificação somente leitura descrita em [README.md](./README.md).
2. Receber o export oficial por canal protegido e confirmar o serviço compatível e sua capacidade sem afetar o Evenon.
3. Configurar execução, contas/dados, envio de e-mail e IA próprios; restaurar numa instalação separada, sem alterar a origem.
4. Identificar o único superadministrador indicado pelo titular, sem promover uma conta arbitrária.
5. Testar login, recuperação, álbuns anteriores, isolamento entre fotógrafos, gestão de contas/equipes, análise de JPG e exportação.
6. Validar HTTPS, acesso direto às páginas e disponibilidade do Evenon antes/depois; só então autorizar a troca do subdomínio, mantendo retorno à instalação anterior.

## GitHub não é exportação de dados

As alterações de código seguem a sincronização do Lovable quando há um repositório conectado. O titular verifica o recebimento em **Configurações do projeto → Git**. Não há confirmação de sincronização nesta preparação. Exports, contas, segredos e arquivos privados ficam fora do GitHub; sincronização não executa a instalação na VPS.

## Pendências para ativação

- Export oficial ainda não iniciado pelo titular.
- Acesso autorizado à VPS e verificação atual de capacidade não disponíveis.
- Serviço independente de contas/dados, envio de e-mail e credencial própria de IA ainda não configurados.
- E-mail do novo superadministrador ainda não informado.
- Execução Node e testes de migração no destino ainda não validados.