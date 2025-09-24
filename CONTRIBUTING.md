# Guia de Contribuição

Obrigado por considerar contribuir para o SmileBooth! Este documento fornece diretrizes para contribuições ao projeto.

## Como Contribuir

### 1. Fork e Clone
```bash
# Fork o repositório no GitHub
# Clone seu fork
git clone https://github.com/SEU_USUARIO/smilebooth.git
cd smilebooth
```

### 2. Configurar Ambiente de Desenvolvimento
```bash
# Instalar dependências do frontend
npm install

# Configurar backend Python
cd python-backend
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configurar backend Node.js
cd ../backend
npm install
```

### 3. Criar Branch para Feature
```bash
git checkout -b feature/nome-da-feature
# ou
git checkout -b fix/descricao-do-bug
```

### 4. Fazer Mudanças
- Siga as convenções de código existentes
- Adicione testes quando apropriado
- Atualize documentação se necessário
- Mantenha commits pequenos e focados

### 5. Testar Localmente
```bash
# Testar frontend
npm run dev

# Testar backend Python
cd python-backend
source venv/bin/activate
python improved_smile_detector.py

# Testar backend Node.js
cd ../backend
npm run dev
```

### 6. Commit e Push
```bash
git add .
git commit -m "feat: adiciona nova funcionalidade"
git push origin feature/nome-da-feature
```

### 7. Abrir Pull Request
- Crie um PR no GitHub
- Descreva claramente as mudanças
- Referencie issues relacionadas
- Aguarde revisão da equipe

## Convenções de Código

### TypeScript/React
- Use TypeScript strict mode
- Siga as convenções do ESLint configurado
- Use componentes funcionais com hooks
- Prefira interfaces sobre types quando possível

### Python
- Siga PEP 8
- Use type hints
- Documente funções com docstrings
- Mantenha funções pequenas e focadas

### Node.js
- Use TypeScript
- Siga as convenções do ESLint
- Use async/await ao invés de callbacks
- Valide entrada de dados

## Estrutura de Commits

Use o formato conventional commits:

```
tipo(escopo): descrição

Corpo opcional explicando o que e por que

Footer opcional com breaking changes ou issues fechadas
```

### Tipos:
- `feat`: nova funcionalidade
- `fix`: correção de bug
- `docs`: mudanças na documentação
- `style`: formatação, sem mudança de código
- `refactor`: refatoração de código
- `test`: adição ou correção de testes
- `chore`: mudanças em ferramentas, configurações, etc.

### Exemplos:
```
feat(detection): adiciona novo algoritmo de detecção de sorrisos
fix(api): corrige erro de serialização JSON
docs(readme): atualiza instruções de instalação
```

## Reportando Bugs

Use o template de bug report:
1. Vá para a aba Issues
2. Clique em "New Issue"
3. Selecione "Bug report"
4. Preencha todas as informações solicitadas

## Sugerindo Funcionalidades

Use o template de feature request:
1. Vá para a aba Issues
2. Clique em "New Issue"
3. Selecione "Feature request"
4. Descreva a funcionalidade desejada

## Processo de Revisão

1. **Revisão de Código**: Todos os PRs passam por revisão
2. **Testes**: Certifique-se de que todos os testes passam
3. **Documentação**: Atualize documentação se necessário
4. **Aprovação**: Pelo menos 1 mantenedor deve aprovar
5. **Merge**: Após aprovação, o PR será mergeado

## Ambiente de Desenvolvimento

### Requisitos
- Node.js 18+
- Python 3.13+
- Git
- Editor de código (VS Code recomendado)

### Extensões VS Code Recomendadas
- TypeScript and JavaScript Language Features
- Python
- ESLint
- Prettier
- GitLens

### Scripts Úteis
```bash
# Executar todos os serviços
npm run start:all

# Apenas frontend
npm run dev

# Apenas backend Python
npm run start:python

# Apenas backend Node.js
npm run start:backend

# Build de produção
npm run build

# Lint
npm run lint
```

## Áreas de Contribuição

### Frontend
- Componentes React
- Hooks customizados
- Interface de usuário
- Integração com APIs

### Backend Python
- Algoritmos de detecção
- Processamento de imagens
- Otimizações de performance
- Novos métodos de detecção

### Backend Node.js
- APIs REST
- Processamento de arquivos
- Integração com banco de dados
- Middleware

### Documentação
- README
- Documentação da API
- Guias de instalação
- Exemplos de uso

### Testes
- Testes unitários
- Testes de integração
- Testes end-to-end
- Testes de performance

## Dúvidas?

Se você tem dúvidas sobre como contribuir:
1. Abra uma issue com a tag `question`
2. Entre em contato via email: felipe@example.com
3. Participe das discussões nas issues

## Obrigado!

Sua contribuição é muito importante para o projeto. Obrigado por ajudar a tornar o SmileBooth melhor! 🎉
