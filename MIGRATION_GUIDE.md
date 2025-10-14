# Guia de Migração - Estilos Comuns

Este guia explica como migrar as páginas existentes para usar o novo sistema de estilos comuns, eliminando duplicações e padronizando o código.

## 📊 Situação Atual

### Problemas Identificados

1. **Duplicação Massiva de CSS**:
   - O gradient `linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)` aparece em 4 arquivos
   - Estilos de botões `.btn-primary`, `.btn-secondary` duplicados em múltiplas páginas
   - Estilos de modais repetidos em ControlePage, Dashboard, ProspecPage, UGsPage
   - `rgba(255, 255, 255, 0.1)` usado 55+ vezes em diferentes arquivos

2. **Tamanhos de Arquivos CSS**:
   - ControlePage.css: **2.479 linhas** (muita duplicação)
   - ProspecPage.css: **1.968 linhas**
   - Dashboard.css: **1.195 linhas**
   - NovaPropostaPage.css: **1.179 linhas**

3. **Inconsistências**:
   - Botões com estilos ligeiramente diferentes entre páginas
   - Modais com estruturas similares mas CSS duplicado
   - Falta de padronização de cores e espaçamentos

## 🎯 Solução Implementada

### Nova Estrutura

```
src/styles/common/
├── index.css              # Importa todos os módulos
├── buttons-dark.css       # 226 linhas - Sistema completo de botões
├── modals-dark.css        # 406 linhas - Sistema completo de modais
├── forms-dark.css         # 390 linhas - Sistema completo de formulários
├── utilities-dark.css     # 442 linhas - Classes utilitárias
└── README.md             # Documentação completa
```

**Total**: ~1.464 linhas reutilizáveis que substituem milhares de linhas duplicadas!

## 🚀 Plano de Migração

### Fase 1: Páginas Prioritárias (Já feito parcialmente)

✅ **NovaPropostaPage**
- Já migrou os botões finais para o padrão comum
- Próximo: migrar modais e forms

✅ **Dashboard**
- Modais de cadastro já em dark mode
- Próximo: usar classes comuns ao invés de duplicar

### Fase 2: Páginas Grandes (Recomendado fazer agora)

#### 1. ControlePage.css (2.479 linhas)

**Estilos que podem ser removidos**:

```css
/* ANTES - Duplicado no arquivo (linhas 688-728) */
.modal-controle .btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%) !important;
  color: white !important;
}
/* ... +40 linhas de estilos de botões */

/* DEPOIS - Usar classes comuns */
/* Simplesmente remover e usar .btn .btn-primary */
```

**Passos**:
1. Importar `/styles/common/index.css` no componente
2. Substituir:
   - `.btn-primary`, `.btn-secondary`, `.btn-danger` → usar `.btn .btn-primary` etc
   - `.modal-header-controle` → usar `.common-modal-header`
   - `.modal-body-controle` → usar `.common-modal-content`
   - `.modal-footer-controle` → usar `.common-modal-footer`
3. Remover ~500 linhas de CSS duplicado
4. Testar todos os modais

**Economia estimada**: 500-700 linhas

#### 2. ProspecPage.css (1.968 linhas)

**Estilos que podem ser removidos**:
- Sistema de modais duplicado (~300 linhas)
- Botões duplicados (~150 linhas)
- Forms duplicados (~200 linhas)

**Passos**:
1. Importar `/styles/common/index.css`
2. Refatorar modais para usar `.common-modal`
3. Refatorar botões para usar `.btn`
4. Refatorar formulários para usar `.form-group`

**Economia estimada**: 650-800 linhas

#### 3. UGsPage.css (867 linhas)

**Estilos que podem ser removidos**:
- Botões duplicados
- Modais similares aos de ControlePage

**Economia estimada**: 300-400 linhas

### Fase 3: Páginas Menores

- LogsPage.css
- RelatoriosPage.css
- ModalConsultorDetalhes.css

## 📝 Checklist de Migração por Página

Para cada página, siga este checklist:

### 1. Preparação

- [ ] Ler o arquivo CSS da página
- [ ] Identificar estilos duplicados (botões, modais, forms)
- [ ] Fazer backup do arquivo CSS original
- [ ] Criar branch git para a migração

### 2. Importação

```javascript
// No topo do arquivo do componente (ex: ControlePage.jsx)
import '../../styles/common/index.css';
```

### 3. Substituição de Classes - Botões

```jsx
// ANTES
<button className="btn-primary-controle">Salvar</button>
<button className="btn-secondary-controle">Cancelar</button>

// DEPOIS
<button className="btn btn-primary">
  <Save size={18} />
  Salvar
</button>
<button className="btn btn-secondary">
  <X size={18} />
  Cancelar
</button>
```

### 4. Substituição de Classes - Modais

```jsx
// ANTES
<div className="modal-overlay-controle">
  <div className="modal-controle">
    <div className="modal-header-controle">
      <h3>Título</h3>
    </div>
    <div className="modal-body-controle">
      Conteúdo
    </div>
    <div className="modal-footer-controle">
      Botões
    </div>
  </div>
</div>

// DEPOIS
<div className="common-modal-overlay">
  <div className="common-modal">
    <div className="common-modal-header">
      <h2>
        <Icon size={20} />
        Título
      </h2>
      <button className="common-close-btn">
        <X size={20} />
      </button>
    </div>
    <div className="common-modal-content">
      Conteúdo
    </div>
    <div className="common-modal-footer">
      <button className="btn btn-secondary">Cancelar</button>
      <button className="btn btn-primary">Salvar</button>
    </div>
  </div>
</div>
```

### 5. Substituição de Classes - Formulários

```jsx
// ANTES
<div className="form-group-controle">
  <label className="label-controle">Nome:</label>
  <input className="input-controle" type="text" />
</div>

// DEPOIS
<div className="form-group">
  <label>Nome</label>
  <input type="text" className="form-control" />
</div>
```

### 6. Limpeza do CSS

No arquivo CSS da página, remover:

```css
/* REMOVER TUDO ISSO */
.btn-primary { ... }
.btn-secondary { ... }
.modal-overlay { ... }
.modal-header { ... }
.modal-body { ... }
.form-group { ... }
input[type="text"] { ... }
/* etc */
```

Manter apenas:
- Estilos específicos daquela página
- Layouts únicos
- Customizações que não existem no sistema comum

### 7. Testes

- [ ] Testar todos os botões (hover, disabled, click)
- [ ] Testar todos os modais (abrir, fechar, tabs)
- [ ] Testar todos os formulários (input, validação, submit)
- [ ] Testar responsividade (desktop, tablet, mobile)
- [ ] Testar com diferentes dados

### 8. Validação

- [ ] Verificar que não há console errors
- [ ] Verificar que não há estilos quebrados
- [ ] Verificar que a página funciona igual ou melhor que antes
- [ ] Comparar contagem de linhas CSS (antes vs depois)

## 🎯 Exemplo Prático: Migrando ControlePage

### Passo a Passo Detalhado

#### 1. Estado Atual

```javascript
// ControlePage.jsx
import './ControlePage.css';  // 2.479 linhas!
```

#### 2. Adicionar Import dos Estilos Comuns

```javascript
// ControlePage.jsx
import '../../styles/common/index.css';  // Novo
import './ControlePage.css';  // Manter temporariamente
```

#### 3. Refatorar um Modal (Exemplo: Modal de Status Troca)

**Antes**:
```jsx
<div className="modal-overlay" onClick={onClose}>
  <div className="modal-controle" onClick={(e) => e.stopPropagation()}>
    <div className="modal-header-controle">
      <h2>
        <Clock size={20} />
        Gerenciar Status de Troca
      </h2>
      <button onClick={onClose} className="btn-close">
        <X size={20} />
      </button>
    </div>

    <div className="modal-body-controle">
      <div className="form-group">
        <label>Status da Troca:</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Esteira">Esteira</option>
          <option value="Em andamento">Em andamento</option>
        </select>
      </div>
    </div>

    <div className="modal-footer-controle">
      <button onClick={onClose} className="btn btn-secondary">
        Cancelar
      </button>
      <button type="submit" className="btn btn-primary">
        Salvar
      </button>
    </div>
  </div>
</div>
```

**Depois**:
```jsx
<div className="common-modal-overlay" onClick={onClose}>
  <div className="common-modal" onClick={(e) => e.stopPropagation()}>
    <div className="common-modal-header">
      <h2>
        <Clock size={20} />
        Gerenciar Status de Troca
      </h2>
      <button onClick={onClose} className="common-close-btn">
        <X size={20} />
      </button>
    </div>

    <div className="common-modal-content">
      <div className="form-group">
        <label>Status da Troca:</label>
        <select className="form-control">
          <option value="Esteira">Esteira</option>
          <option value="Em andamento">Em andamento</option>
        </select>
      </div>
    </div>

    <div className="common-modal-footer">
      <button onClick={onClose} className="btn btn-secondary">
        <X size={18} />
        Cancelar
      </button>
      <button type="submit" className="btn btn-primary">
        <Save size={18} />
        Salvar
      </button>
    </div>
  </div>
</div>
```

#### 4. Remover CSS Duplicado

No `ControlePage.css`, remover:

```css
/* REMOVER (linhas 545-720) */
.modal-controle { ... }
.modal-header-controle { ... }
.modal-body-controle { ... }
.modal-footer-controle { ... }
.btn-primary { ... }
.btn-secondary { ... }
/* Total: ~175 linhas removidas */
```

#### 5. Manter CSS Específico

Manter apenas estilos únicos da página:

```css
/* MANTER - Específico da página de controle */
.controle-table { ... }
.ug-badge { ... }
.status-indicator { ... }
```

## 📈 Benefícios Esperados

### Redução de Código

| Página | Antes | Depois (estimado) | Redução |
|--------|-------|-------------------|---------|
| ControlePage.css | 2.479 | ~1.700 | ~31% |
| ProspecPage.css | 1.968 | ~1.200 | ~39% |
| Dashboard.css | 1.195 | ~700 | ~41% |
| NovaPropostaPage.css | 1.179 | ~600 | ~49% |
| UGsPage.css | 867 | ~500 | ~42% |
| **TOTAL** | **7.688** | **~4.700** | **~39%** |

### Outros Benefícios

✅ **Consistência Visual**: Todos os componentes seguem o mesmo padrão
✅ **Manutenção Facilitada**: Alterações em um lugar afetam toda a aplicação
✅ **Performance**: Menos CSS para o browser processar
✅ **Onboarding**: Novos desenvolvedores entendem o sistema mais rápido
✅ **Escalabilidade**: Adicionar novas páginas é mais rápido
✅ **Acessibilidade**: Padrões garantem melhor UX

## ⚠️ Cuidados

### Não Migrar Imediatamente

❌ **Não migre tudo de uma vez**
✅ Migre página por página, testando cada uma

❌ **Não remova CSS sem verificar**
✅ Use busca global para verificar se o CSS está sendo usado em outro lugar

❌ **Não force a migração se não fizer sentido**
✅ Se um estilo é muito específico de uma página, pode manter no arquivo da página

### Casos Especiais

1. **Estilos com `!important`**:
   - Se o sistema comum não funcionar, pode adicionar `!important` temporariamente
   - Depois, refatorar para remover a necessidade do `!important`

2. **Estilos muito específicos**:
   - Se um componente tem um comportamento único, pode manter CSS próprio
   - Exemplo: tabelas complexas, gráficos, layouts especiais

3. **Animações customizadas**:
   - Animações específicas podem permanecer nos arquivos originais

## 📞 Suporte

Se tiver dúvidas durante a migração:
1. Consulte o `README.md` em `/src/styles/common/`
2. Veja exemplos de uso no próprio README
3. Compare com páginas já migradas (NovaPropostaPage, Dashboard)
4. Teste localmente antes de commitar

## 🎉 Conclusão

Este sistema de estilos comuns é um grande passo para:
- Reduzir duplicação de código
- Melhorar manutenibilidade
- Padronizar a interface
- Facilitar o desenvolvimento futuro

A migração pode levar tempo, mas o resultado vale muito a pena!

---

**Última atualização**: 2025-10-14
**Versão**: 1.0.0
