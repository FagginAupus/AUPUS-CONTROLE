# Estilos Comuns - Sistema de Design Dark Mode

Este diretório contém todos os estilos globais e reutilizáveis da aplicação, seguindo o tema dark mode.

## 📁 Estrutura de Arquivos

```
common/
├── index.css              # Arquivo principal - importa todos os módulos
├── buttons-dark.css       # Sistema de botões
├── modals-dark.css        # Sistema de modais
├── forms-dark.css         # Sistema de formulários
├── utilities-dark.css     # Classes utilitárias
└── README.md             # Este arquivo
```

## 🚀 Como Usar

### Importação

Importe o arquivo principal no topo do seu componente:

```javascript
import '../../styles/common/index.css';
```

Ou importe módulos específicos:

```javascript
import '../../styles/common/buttons-dark.css';
import '../../styles/common/modals-dark.css';
```

## 📘 Guia de Uso

### 1. Botões (`buttons-dark.css`)

#### Botões Básicos

```jsx
// Botão Primário (azul/roxo gradient)
<button className="btn btn-primary">
  <Save size={18} />
  Salvar
</button>

// Botão Secundário (semi-transparente)
<button className="btn btn-secondary">
  <X size={18} />
  Cancelar
</button>

// Botão Danger (vermelho gradient)
<button className="btn btn-danger">
  <Trash size={18} />
  Excluir
</button>

// Botão Success (verde gradient)
<button className="btn btn-success">
  <Check size={18} />
  Confirmar
</button>
```

#### Tamanhos

```jsx
<button className="btn btn-primary btn-sm">Pequeno</button>
<button className="btn btn-primary">Normal</button>
<button className="btn btn-primary btn-lg">Grande</button>
```

#### Variações

```jsx
// Botão de largura total
<button className="btn btn-primary btn-block">
  Largura Total
</button>

// Botão apenas com ícone
<button className="btn btn-primary btn-icon">
  <Plus size={18} />
</button>

// Botão ghost/outline
<button className="btn btn-ghost">
  Ghost Button
</button>
```

#### Grupos de Botões

```jsx
<div className="btn-group">
  <button className="btn btn-primary">Salvar</button>
  <button className="btn btn-secondary">Cancelar</button>
</div>
```

### 2. Modais (`modals-dark.css`)

#### Modal Básico

```jsx
<div className="common-modal-overlay">
  <div className="common-modal">
    <div className="common-modal-header">
      <h2>
        <User size={20} />
        Título do Modal
      </h2>
      <button className="common-close-btn" onClick={onClose}>
        <X size={20} />
      </button>
    </div>

    <div className="common-modal-content">
      {/* Conteúdo aqui */}
    </div>

    <div className="common-modal-footer">
      <button className="btn btn-secondary" onClick={onClose}>
        Cancelar
      </button>
      <button className="btn btn-primary" onClick={onSave}>
        Salvar
      </button>
    </div>
  </div>
</div>
```

#### Tamanhos de Modal

```jsx
// Modal pequeno
<div className="common-modal small">...</div>

// Modal normal (padrão)
<div className="common-modal">...</div>

// Modal grande
<div className="common-modal large">...</div>

// Modal extra grande
<div className="common-modal xlarge">...</div>
```

#### Modal com Tabs

```jsx
<div className="common-modal-tabs">
  <button className={`common-modal-tab ${activeTab === 'info' ? 'active' : ''}`}>
    <Info size={18} />
    Informações
  </button>
  <button className={`common-modal-tab ${activeTab === 'team' ? 'active' : ''}`}>
    <Users size={18} />
    Equipe
  </button>
</div>
```

#### Modal de Loading

```jsx
<div className="common-modal-overlay">
  <div className="common-modal">
    <div className="modal-loading">
      <div className="modal-loading-spinner"></div>
      <p>Carregando...</p>
    </div>
  </div>
</div>
```

#### Modal de Confirmação

```jsx
<div className="common-modal">
  <div className="modal-confirmation">
    <div className="modal-confirmation-icon">
      <AlertTriangle size={32} />
    </div>
    <h3>Confirmar Exclusão</h3>
    <p>Tem certeza que deseja excluir este item?</p>
    <div className="btn-group">
      <button className="btn btn-secondary">Cancelar</button>
      <button className="btn btn-danger">Confirmar</button>
    </div>
  </div>
</div>
```

### 3. Formulários (`forms-dark.css`)

#### Input Básico

```jsx
<div className="form-group">
  <label>Nome Completo</label>
  <input
    type="text"
    className="form-control"
    placeholder="Digite seu nome"
    value={nome}
    onChange={(e) => setNome(e.target.value)}
  />
</div>
```

#### Label Obrigatório

```jsx
<label className="required">Email</label>
```

#### Select

```jsx
<div className="form-group">
  <label>Estado</label>
  <select className="form-control">
    <option>Selecione...</option>
    <option value="SP">São Paulo</option>
    <option value="RJ">Rio de Janeiro</option>
  </select>
</div>
```

#### Textarea

```jsx
<div className="form-group">
  <label>Observações</label>
  <textarea className="form-control" placeholder="Digite aqui..."></textarea>
</div>
```

#### Checkbox e Radio

```jsx
<div className="form-check">
  <input type="checkbox" id="terms" />
  <label htmlFor="terms">Aceito os termos</label>
</div>

<div className="form-check">
  <input type="radio" name="option" id="opt1" />
  <label htmlFor="opt1">Opção 1</label>
</div>
```

#### Input com Ícone

```jsx
<div className="form-input-icon">
  <Mail size={18} />
  <input type="email" placeholder="seu@email.com" />
</div>
```

#### Estados de Validação

```jsx
// Com erro
<div className="form-group has-error">
  <label>Email</label>
  <input type="email" />
  <div className="form-error">
    <AlertCircle size={14} />
    Email inválido
  </div>
</div>

// Com sucesso
<div className="form-group has-success">
  <label>Email</label>
  <input type="email" />
  <div className="form-success">
    <Check size={14} />
    Email válido
  </div>
</div>

// Texto de ajuda
<div className="form-help">
  <Info size={14} />
  Digite um email válido
</div>
```

#### Grid de Formulário

```jsx
<div className="form-grid form-grid-2">
  <div className="form-group">
    <label>Nome</label>
    <input type="text" />
  </div>
  <div className="form-group">
    <label>Sobrenome</label>
    <input type="text" />
  </div>
</div>
```

#### Switch Toggle

```jsx
<div className="form-switch">
  <input type="checkbox" className="form-switch-input" />
  <label>Ativar notificações</label>
</div>
```

### 4. Utilitários (`utilities-dark.css`)

#### Cores de Fundo

```jsx
<div className="bg-dark-gradient">Fundo escuro gradient</div>
<div className="bg-primary-gradient">Fundo azul/roxo gradient</div>
<div className="bg-transparent-light">Fundo semi-transparente</div>
```

#### Textos

```jsx
<p className="text-white">Texto branco</p>
<p className="text-white-70">Texto 70% opacidade</p>
<p className="text-primary">Texto azul</p>
<p className="text-danger">Texto vermelho</p>
```

#### Flexbox

```jsx
<div className="d-flex align-center justify-between gap-4">
  <span>Item 1</span>
  <span>Item 2</span>
</div>
```

#### Espaçamentos

```jsx
<div className="mt-4 mb-6 p-3">
  Conteúdo com margens e padding
</div>
```

#### Badges

```jsx
<span className="badge badge-primary">Novo</span>
<span className="badge badge-success">Ativo</span>
<span className="badge badge-danger">Erro</span>
```

#### Loading Spinner

```jsx
<div className="spinner"></div>
<div className="spinner spinner-sm"></div>
<div className="spinner spinner-lg"></div>
```

#### Transições e Hover

```jsx
<div className="transition-all hover-lift">
  Hover para elevar
</div>

<div className="transition-all hover-scale">
  Hover para escalar
</div>
```

## 🎨 Paleta de Cores

### Cores Primárias
- **Primary**: `#3b82f6` → `#8b5cf6` (gradient)
- **Danger**: `#ef4444` → `#dc2626` (gradient)
- **Success**: `#10b981` → `#059669` (gradient)
- **Warning**: `#f59e0b` → `#d97706` (gradient)
- **Info**: `#06b6d4` → `#0891b2` (gradient)

### Backgrounds
- **Dark Gradient**: `#1e293b` → `#0f172a`
- **Semi-transparente Claro**: `rgba(255, 255, 255, 0.05)`
- **Semi-transparente Médio**: `rgba(255, 255, 255, 0.1)`

### Bordas
- **Borda Padrão**: `rgba(255, 255, 255, 0.1)`
- **Borda Foco**: `#3b82f6`

## 📱 Responsividade

Todos os componentes são responsivos:
- **Desktop**: > 768px
- **Tablet**: 768px - 480px
- **Mobile**: < 480px

## ⚡ Migração de Páginas Existentes

Para migrar uma página para usar os estilos comuns:

1. **Importe os estilos comuns no topo do componente**:
   ```javascript
   import '../../styles/common/index.css';
   ```

2. **Substitua classes antigas pelas novas**:
   ```jsx
   // Antes
   <button className="btn-primary-proposta">Salvar</button>

   // Depois
   <button className="btn btn-primary">Salvar</button>
   ```

3. **Remova CSS duplicado** do arquivo de estilo da página

4. **Teste a página** para garantir que tudo funciona

## 🔧 Manutenção

- **NÃO** modifique estes arquivos diretamente
- Se precisar de novos estilos, adicione-os aqui e documente
- Sempre use as classes padronizadas ao invés de criar novas
- Mantenha a consistência visual em toda a aplicação

## 📝 Convenções

- Use `btn` para botões
- Use `common-modal` para modais
- Use `form-group` para grupos de formulário
- Use classes utilitárias para ajustes pequenos
- Sempre adicione ícones com tamanho 18px nos botões

## 🆘 Suporte

Se encontrar problemas ou precisar de novos componentes:
1. Verifique se já existe uma classe que atende sua necessidade
2. Consulte este README
3. Entre em contato com a equipe de desenvolvimento
