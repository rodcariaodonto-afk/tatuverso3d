Plano para resolver sem depender do email de redefinição:

1. **Criar ações seguras no backend**
   - Criar funções protegidas para administradores:
     - Criar usuário com email + senha temporária.
     - Promover usuário para admin.
     - Trocar senha de um usuário existente.
   - A verificação de permissão será feita no backend, usando o papel admin/support, não apenas pela tela.

2. **Adicionar área no Painel Admin > Clientes**
   - Incluir botão/formulário “Criar usuário admin”.
   - Campos: nome, email e senha temporária.
   - Na lista de clientes, adicionar ação “Definir senha temporária”.
   - Mostrar mensagens claras de sucesso/erro.

3. **Marcar senha como temporária**
   - Quando o admin criar usuário ou trocar a senha manualmente, o sistema marcará esse usuário como precisando alterar a senha.
   - Assim o Jozil consegue entrar com a senha temporária informada por você, sem depender de link por email.

4. **Forçar troca após o primeiro acesso**
   - Ao entrar com senha temporária, o usuário será orientado a definir uma nova senha própria.
   - Após trocar a senha, a marcação de “senha temporária” será removida.

5. **Ajustar tela de conta/login se necessário**
   - Adicionar uma área simples para o próprio usuário alterar a senha depois de logado.
   - Se houver senha temporária ativa, priorizar esse fluxo antes de navegação normal.

Detalhe técnico:
- Usarei funções server-side com chave administrativa somente dentro do backend.
- Nenhuma senha será exibida depois de salva.
- O admin define uma senha temporária e comunica fora do sistema ao usuário.