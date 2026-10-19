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

### Configurações exigidas pelo código

Os nomes abaixo são referências do código, não uma afirmação de que seus valores estejam disponíveis para exportação:

| Nome | Uso no destino |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Configurações públicas de compilação do cliente para o serviço de contas/dados compatível do destino. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Configurações do serviço de contas/dados usadas no servidor. |
| `SUPABASE_SERVICE_ROLE_KEY` | Credencial privilegiada emitida pelo serviço compatível do destino, exclusivamente no servidor; a credencial do Lovable Cloud não está disponível. |
| `LOVABLE_API_KEY` | Credencial gerenciada referenciada pela análise atual; exige adaptação para o provedor independente. |
| `LOVABLE_DB_MIGRATION_URL` | Referência da ferramenta de migrações atual; não é requisito de execução do site nem uma credencial exportável. Definir ferramenta apropriada no destino. |
| `LOVABLE_CRON_SECRET`, `LOVABLE_CRON_SECRET_PREVIOUS` | Referências do auxiliar de agendamento; não foram encontrados chamadores na aplicação. Não exigir cron sem necessidade comprovada. |

O nome da chave de IA independente será definido junto da adaptação; nenhuma chave foi solicitada ou armazenada nesta preparação. A implementação atual chama `https://ai.gateway.lovable.dev/v1` e `openai/gpt-6-astra` com cabeçalhos e opções do gateway. Para OpenAI direto, revisar URL, autenticação, modelo disponível, opções e resposta estruturada; não apresentar esse identificador do gateway como garantia de modelo disponível no serviço direto.

### Dados e estrutura a conferir após restauração

Tabelas da aplicação: `user_roles`, `invitations` (legado), `albums`, `photo_results`, `profiles`, `teams` e `team_members`. A autenticação também depende das contas e funções do serviço compatível, não apenas destas tabelas.

As sete migrações SQL de referência estão em `drizzle/migrations/`, de `0000_photo_culling_core.sql` a `0006_atomic_team_assignment.sql`. Não executá-las cegamente sobre um export já restaurado: verificar primeiro o histórico e a estrutura existente. `drizzle/schema.ts` está vazio e não reconstrói essas migrações. Conferir totais, vínculos de donos, categorias manuais, presets, renomeação, exposição, perfis ativos e equipes; nunca imprimir hashes ou dados privados nos registros.

## Serviços a preparar no destino

- **Contas e dados compatíveis:** restauração do export, preservação de IDs e políticas de isolamento, acesso privilegiado próprio e seguro para criação de contas. As credenciais privilegiadas do Lovable Cloud não estão disponíveis para exportação.
- **E-mail de recuperação:** remetente e serviço de envio configurados no destino, com links para `https://ia.evenon.com.br/reset-password`. Sem isso, redefinição de senha não está pronta.
- **IA própria:** credencial do provedor escolhido, cobranças próprias e adaptação/testes da análise. Se usar OpenAI, obter uma chave em `platform.openai.com → API keys`; o consumo é separado do ChatGPT. Não basta trocar a chave do gateway por uma chave OpenAI.
- **Hospedagem isolada:** versão moderna de Node instalada separadamente, formato de execução validado, usuário de serviço/diretório exclusivos, portas locais verificadas e limites de recursos.
- **HTTPS e DNS:** criar somente o site e o registro de `ia.evenon.com.br`, depois da validação; não editar o Evenon nem os registros dos demais sites.

Guardar credenciais no ambiente protegido do destino, nunca no código ou em um arquivo `.env` versionado. Um formulário de segredos do Lovable não instala nem configura automaticamente segredos na VPS.

O projeto atual não define um comando de início para produção Node nem um preset Node explícito. A configuração existente é voltada ao hosting Lovable. Não assumir que `vite preview` é um serviço de produção ou que um arquivo de saída específico existe antes de configurar e validar o destino.

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