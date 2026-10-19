# FocoAI no aaPanel — preparação

Destino solicitado: `ia.fotogrer.com.br`, na VPS `162.35.101.152`.

## Estado real

Nada foi enviado ou instalado na VPS. Ter o IP e o nome de usuário não concede acesso autorizado ao servidor. Não envie senha root pelo chat.

## Verificação inicial, sem mudanças

1. No gerenciador de arquivos do aaPanel, crie `/tmp/focoai-preflight.sh` e copie para ele o conteúdo de `deploy/aapanel-preflight.sh` deste projeto.
2. No terminal do aaPanel, execute:

```bash
bash /tmp/focoai-preflight.sh
```

3. Compartilhe apenas o resultado desse comando. Ele verifica versões, espaço, memória e DNS; não lê senhas e não altera sites existentes.

Se Node.js não aparecer, ele pode estar instalado pelo gerenciador do aaPanel sem estar no caminho do terminal; não reinstale antes de verificar isso no painel.

## Bloqueios antes da instalação completa

- A análise de fotos usa uma credencial de IA gerenciada pelo Lovable, que não pode ser exportada por este fluxo. Uma instalação independente exige uma integração de IA própria, com credencial fornecida de forma segura e custos próprios.
- A criação e administração de contas usam acesso privilegiado do Lovable Cloud que não está disponível para exportação. Uma instalação independente exige preparar um serviço de contas compatível e migrar os dados com segurança.
- Falta o e-mail da pessoa que será o único superadministrador. Não promover automaticamente o usuário atual.
- O formato de execução em Node.js precisa ser configurado e validado para este projeto antes de gerar instruções de inicialização. Não assumir que o resultado atual, voltado ao hosting Lovable, roda com Node.js.

Não apontar o domínio para uma instalação parcial: entrada, análise de uma foto e gestão de contas devem funcionar antes da troca. Não reiniciar nem substituir o Nginx global do aaPanel.

## Alternativa sem migrar os serviços

Manter o aplicativo no Lovable e conectar o domínio solicitado preserva a IA e a gestão de contas atuais. Isso não instala o aplicativo na VPS. DNS deve ser alterado no serviço que realmente administra a zona do domínio, que não necessariamente é o aaPanel.