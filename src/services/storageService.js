// src/services/storageService.js - COMPLETO COM CORREÇÃO DO MÉTODO adicionarProspec
import apiService from './apiService';

class StorageService {
    constructor() {
        this.useAPI = false;
        this.calibragemGlobal = 0;
        console.log('🚀 StorageService inicializado em modo híbrido');
        this.detectarModoOperacao();
    }

    // ========================================
    // DETECÇÃO DE MODO DE OPERAÇÃO
    // ========================================

    async detectarModoOperacao() {
        try {
            const healthCheck = await apiService.healthCheck();
            this.useAPI = healthCheck && healthCheck.status === 'ok';
            
            if (this.useAPI) {
                console.log('✅ Modo API ativado - Conectado ao backend');
            } else {
                console.log('⚠️ Modo offline - Usando localStorage apenas');
            }
        } catch (error) {
            this.useAPI = false;
            console.log('⚠️ API não disponível - Modo offline ativo');
        }
    }

    // ========================================
    // AUTENTICAÇÃO - CORRIGIDO
    // ========================================

    async login(credentials) {
        // CORREÇÃO: Aceitar tanto objeto credentials quanto email, password separados
        let email, password;
        
        if (typeof credentials === 'object' && credentials.email && credentials.password) {
            email = credentials.email;
            password = credentials.password;
        } else if (arguments.length === 2) {
            // Compatibilidade com login(email, password)
            email = credentials;
            password = arguments[1];
        } else {
            throw new Error('Credenciais inválidas');
        }

        console.log('🔐 login - tentando autenticação para:', email);

        if (this.useAPI) {
            console.log('🔐 login (API)');
            try {
                const response = await apiService.post('/auth/login', { email, password });
                
                if (response.success && response.user && response.token) {
                    // Salvar token no apiService
                    apiService.setToken(response.token);
                    
                    // Salvar dados do usuário
                    const userData = {
                        ...response.user,
                        token: response.token,
                        lastLogin: new Date().toISOString()
                    };
                    
                    localStorage.setItem('user', JSON.stringify(userData));
                    localStorage.setItem('token', response.token);
                    
                    console.log('✅ Login API realizado:', response.user.nome);
                    return userData;
                } else {
                    throw new Error(response.message || 'Resposta inválida da API');
                }
            } catch (error) {
                console.log('⚠️ API login falhou, tentando localStorage:', error.message);
                return this.loginLocal(email, password);
            }
        } else {
            console.log('🔐 login (localStorage)');
            return this.loginLocal(email, password);
        }
    }

    loginLocal(email, password) {
        // Usuários de desenvolvimento
        const devUsers = [
            {
                id: '1',
                email: 'admin@aupus.com',
                password: 'admin123',
                nome: 'Administrador',
                role: 'admin'
            },
            {
                id: '2',
                email: 'consultor@aupus.com',
                password: 'consultor123',
                nome: 'Consultor Principal',
                role: 'consultor'
            },
            {
                id: '3',
                email: 'gerente@aupus.com',
                password: 'gerente123',
                nome: 'Gerente Regional',
                role: 'gerente'
            },
            {
                id: '4',
                email: 'vendedor@aupus.com',
                password: 'vendedor123',
                nome: 'Vendedor',
                role: 'vendedor'
            }
        ];

        const user = devUsers.find(u => u.email === email && u.password === password);
        
        if (user) {
            const userData = {
                id: user.id,
                nome: user.nome,
                email: user.email,
                role: user.role,
                lastLogin: new Date().toISOString()
            };
            
            localStorage.setItem('user', JSON.stringify(userData));
            console.log('✅ Login localStorage realizado:', user.nome);
            return userData;
        }
        
        throw new Error('Credenciais inválidas');
    }

    logout() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        apiService.clearToken();
        console.log('👋 Logout realizado');
    }

    getCurrentUser() {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('❌ Erro ao obter dados do usuário:', error);
            return null;
        }
    }

    // ========================================
    // PROPOSTAS
    // ========================================

    async getProspec() {
        if (this.useAPI) {
            try {
                console.log('📥 getProspec (API)');
                const response = await apiService.get('/propostas');
                const propostas = Array.isArray(response) ? response : (response.data || []);
                
                // Cache no localStorage
                localStorage.setItem('propostas', JSON.stringify(propostas));
                console.log(`✅ Carregadas ${propostas.length} propostas da API`);
                
                return propostas;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                // Fallback para localStorage
                const localPropostas = JSON.parse(localStorage.getItem('propostas') || '[]');
                console.log(`✅ Carregadas ${localPropostas.length} propostas do localStorage`);
                return localPropostas;
            }
        } else {
            const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
            console.log(`✅ Carregadas ${propostas.length} propostas do localStorage`);
            return propostas;
        }
    }

    async saveProspec(proposta) {
        if (this.useAPI) {
            try {
                console.log('💾 saveProspec (API):', proposta.numeroProposta || proposta.numero_proposta);
                const response = await apiService.post('/propostas', proposta);
                
                // Atualizar cache local
                const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
                const existingIndex = propostas.findIndex(p => p.id === proposta.id);
                
                if (existingIndex >= 0) {
                    propostas[existingIndex] = response;
                } else {
                    propostas.push(response);
                }
                
                localStorage.setItem('propostas', JSON.stringify(propostas));
                console.log('✅ Proposta salva na API e cache atualizado');
                
                return response;
            } catch (error) {
                console.log('⚠️ API falhou, salvando localmente:', error.message);
                return this.saveProspecLocal(proposta);
            }
        } else {
            return this.saveProspecLocal(proposta);
        }
    }

    // ✅ MÉTODO ADICIONADO - adicionarProspec como alias para saveProspec
    async adicionarProspec(proposta) {
        console.log('📝 adicionarProspec - Alias para saveProspec');
        return await this.saveProspec(proposta);
    }

    saveProspecLocal(proposta) {
        try {
            const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
            const timestamp = new Date().toISOString();
            
            if (proposta.id) {
                // Atualizar existente
                const index = propostas.findIndex(p => p.id === proposta.id);
                if (index >= 0) {
                    propostas[index] = { ...proposta, updated_at: timestamp };
                } else {
                    propostas.push({ ...proposta, updated_at: timestamp });
                }
            } else {
                // Nova proposta
                const novaProposta = {
                    ...proposta,
                    id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    created_at: timestamp,
                    updated_at: timestamp
                };
                propostas.push(novaProposta);
            }
            
            localStorage.setItem('propostas', JSON.stringify(propostas));
            console.log('✅ Proposta salva no localStorage');
            
            return propostas[propostas.length - 1];
        } catch (error) {
            console.error('❌ Erro ao salvar proposta:', error);
            throw error;
        }
    }

    async deleteProspec(id) {
        if (this.useAPI) {
            try {
                console.log('🗑️ deleteProspec (API)');
                await apiService.delete(`/propostas/${id}`);
                
                // Remover do cache local
                const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
                const novasPropostas = propostas.filter(p => p.id !== id);
                localStorage.setItem('propostas', JSON.stringify(novasPropostas));
                
                console.log('✅ Proposta removida da API');
            } catch (error) {
                console.log('⚠️ API falhou, removendo localmente:', error.message);
                this.deleteProspecLocal(id);
            }
        } else {
            this.deleteProspecLocal(id);
        }
    }

    deleteProspecLocal(id) {
        try {
            const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
            const novasPropostas = propostas.filter(p => p.id !== id);
            localStorage.setItem('propostas', JSON.stringify(novasPropostas));
            console.log('✅ Proposta removida do localStorage');
        } catch (error) {
            console.error('❌ Erro ao remover proposta:', error);
            throw error;
        }
    }

    async atualizarProspec(index, dadosAtualizados) {
        const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
        
        if (index >= 0 && index < propostas.length) {
            propostas[index] = { 
                ...propostas[index], 
                ...dadosAtualizados,
                updated_at: new Date().toISOString()
            };
            
            if (this.useAPI) {
                try {
                    await apiService.put(`/propostas/${propostas[index].id}`, propostas[index]);
                    console.log('✅ Proposta atualizada na API');
                } catch (error) {
                    console.log('⚠️ API falhou, mantendo alteração local:', error.message);
                }
            }
            
            localStorage.setItem('propostas', JSON.stringify(propostas));
            console.log('✅ Proposta atualizada');
        }
    }

    async removerProspec(index) {
        const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
        
        if (index >= 0 && index < propostas.length) {
            const proposta = propostas[index];
            
            if (this.useAPI && proposta.id) {
                try {
                    await this.deleteProspec(proposta.id);
                } catch (error) {
                    console.log('⚠️ Erro na API, removendo localmente:', error.message);
                }
            }
            
            propostas.splice(index, 1);
            localStorage.setItem('propostas', JSON.stringify(propostas));
            console.log('✅ Proposta removida');
        }
    }

    // ========================================
    // CONTROLE
    // ========================================

    async getControle() {
        if (this.useAPI) {
            try {
                console.log('📥 getControle (API)');
                const response = await apiService.get('/controle');
                const controles = Array.isArray(response) ? response : (response.data || []);
                
                // Cache no localStorage
                localStorage.setItem('controle', JSON.stringify(controles));
                console.log(`✅ Carregadas ${controles.length} do controle da API`);
                
                return controles;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                // Fallback para localStorage
                const localControles = JSON.parse(localStorage.getItem('controle') || '[]');
                console.log(`✅ Carregadas ${localControles.length} do controle do localStorage`);
                return localControles;
            }
        } else {
            const controles = JSON.parse(localStorage.getItem('controle') || '[]');
            console.log(`✅ Carregadas ${controles.length} do controle do localStorage`);
            return controles;
        }
    }

    async saveControle(controle) {
        if (this.useAPI) {
            try {
                console.log('💾 saveControle (API)');
                const response = await apiService.post('/controle', controle);
                
                // Atualizar cache local
                const controles = JSON.parse(localStorage.getItem('controle') || '[]');
                const existingIndex = controles.findIndex(c => c.id === controle.id);
                
                if (existingIndex >= 0) {
                    controles[existingIndex] = response;
                } else {
                    controles.push(response);
                }
                
                localStorage.setItem('controle', JSON.stringify(controles));
                console.log('✅ Controle salvo na API');
                
                return response;
            } catch (error) {
                console.log('⚠️ API falhou, salvando localmente:', error.message);
                return this.saveControleLocal(controle);
            }
        } else {
            return this.saveControleLocal(controle);
        }
    }

    saveControleLocal(controle) {
        try {
            const controles = JSON.parse(localStorage.getItem('controle') || '[]');
            const timestamp = new Date().toISOString();
            
            if (controle.id) {
                const index = controles.findIndex(c => c.id === controle.id);
                if (index >= 0) {
                    controles[index] = { ...controle, updated_at: timestamp };
                } else {
                    controles.push({ ...controle, updated_at: timestamp });
                }
            } else {
                const novoControle = {
                    ...controle,
                    id: `ctrl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    created_at: timestamp,
                    updated_at: timestamp
                };
                controles.push(novoControle);
            }
            
            localStorage.setItem('controle', JSON.stringify(controles));
            console.log('✅ Controle salvo no localStorage');
            
            return controles[controles.length - 1];
        } catch (error) {
            console.error('❌ Erro ao salvar controle:', error);
            throw error;
        }
    }

    // ========================================
    // UGS (USINAS GERADORAS)
    // ========================================

    async getUGs() {
        if (this.useAPI) {
            try {
                console.log('📥 getUGs (API)');
                const response = await apiService.get('/ugs');
                const ugs = Array.isArray(response) ? response : (response.data || []);
                
                // Cache no localStorage
                localStorage.setItem('ugs', JSON.stringify(ugs));
                console.log(`✅ Carregadas ${ugs.length} UGs da API`);
                
                return ugs;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                // Fallback para localStorage
                const localUGs = JSON.parse(localStorage.getItem('ugs') || '[]');
                console.log(`✅ Carregadas ${localUGs.length} UGs do localStorage`);
                return localUGs;
            }
        } else {
            const ugs = JSON.parse(localStorage.getItem('ugs') || '[]');
            console.log(`✅ Carregadas ${ugs.length} UGs do localStorage`);
            return ugs;
        }
    }

    async saveUG(ug) {
        if (this.useAPI) {
            try {
                console.log('💾 saveUG (API)');
                const response = await apiService.post('/ugs', ug);
                
                // Atualizar cache local
                const ugs = JSON.parse(localStorage.getItem('ugs') || '[]');
                const existingIndex = ugs.findIndex(u => u.id === ug.id);
                
                if (existingIndex >= 0) {
                    ugs[existingIndex] = response;
                } else {
                    ugs.push(response);
                }
                
                localStorage.setItem('ugs', JSON.stringify(ugs));
                console.log('✅ UG salva na API');
                
                return response;
            } catch (error) {
                console.log('⚠️ API falhou, salvando localmente:', error.message);
                return this.saveUGLocal(ug);
            }
        } else {
            return this.saveUGLocal(ug);
        }
    }

    saveUGLocal(ug) {
        try {
            const ugs = JSON.parse(localStorage.getItem('ugs') || '[]');
            const timestamp = new Date().toISOString();
            
            if (ug.id) {
                const index = ugs.findIndex(u => u.id === ug.id);
                if (index >= 0) {
                    ugs[index] = { ...ug, updated_at: timestamp };
                } else {
                    ugs.push({ ...ug, updated_at: timestamp });
                }
            } else {
                const novaUG = {
                    ...ug,
                    id: `ug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    created_at: timestamp,
                    updated_at: timestamp
                };
                ugs.push(novaUG);
            }
            
            localStorage.setItem('ugs', JSON.stringify(ugs));
            console.log('✅ UG salva no localStorage');
            
            return ugs[ugs.length - 1];
        } catch (error) {
            console.error('❌ Erro ao salvar UG:', error);
            throw error;
        }
    }

    // ========================================
    // CALIBRAGEM GLOBAL
    // ========================================

    getCalibragemGlobal() {
        return parseFloat(localStorage.getItem('calibragemGlobal') || '0');
    }

    setCalibragemGlobal(valor) {
        this.calibragemGlobal = parseFloat(valor);
        localStorage.setItem('calibragemGlobal', valor.toString());
        console.log(`🎛️ Calibragem global definida: ${valor}%`);
    }

    aplicarCalibragemGlobal(novoValor) {
        const controles = JSON.parse(localStorage.getItem('controle') || '[]');
        const calibragemAtual = this.getCalibragemGlobal();
        
        controles.forEach(controle => {
            if (controle.consumoMedio > 0) {
                // Reverter calibragem anterior
                if (calibragemAtual !== 0) {
                    controle.consumoMedio = controle.consumoMedio / (1 + calibragemAtual / 100);
                }
                // Aplicar nova calibragem
                controle.consumoMedio = controle.consumoMedio * (1 + novoValor / 100);
            }
        });
        
        localStorage.setItem('controle', JSON.stringify(controles));
        this.setCalibragemGlobal(novoValor);
        
        console.log(`🎛️ Calibragem global aplicada: ${novoValor}%`);
        return controles.length;
    }

    // ========================================
    // UTILITÁRIOS DE EXPORT
    // ========================================

    async exportarParaCSV(tipo, filtros = {}) {
        try {
            let dados = [];
            let nomeArquivo = '';
            
            switch (tipo) {
                case 'prospec':
                    dados = await this.getProspec();
                    nomeArquivo = `prospec_${new Date().toISOString().slice(0, 10)}`;
                    break;
                case 'controle':
                    dados = await this.getControle();
                    nomeArquivo = `controle_${new Date().toISOString().slice(0, 10)}`;
                    break;
                case 'ugs':
                    dados = await this.getUGs();
                    nomeArquivo = `ugs_${new Date().toISOString().slice(0, 10)}`;
                    break;
                default:
                    throw new Error('Tipo de exportação não suportado');
            }
            
            if (dados.length === 0) {
                throw new Error('Nenhum dado para exportar');
            }
            
            // Aplicar filtros se fornecidos
            if (filtros.consultor) {
                dados = dados.filter(item => item.consultor?.toLowerCase().includes(filtros.consultor.toLowerCase()));
            }
            
            if (filtros.status) {
                dados = dados.filter(item => item.status === filtros.status);
            }
            
            if (filtros.dataInicio && filtros.dataFim) {
                dados = dados.filter(item => {
                    const dataItem = new Date(item.data || item.created_at);
                    return dataItem >= new Date(filtros.dataInicio) && dataItem <= new Date(filtros.dataFim);
                });
            }
            
            // Converter para CSV
            const csvContent = this.jsonToCSV(dados);
            this.downloadCSV(csvContent, `${nomeArquivo}.csv`);
            
            console.log(`✅ Dados exportados: ${dados.length} registros`);
            return dados.length;
            
        } catch (error) {
            console.error('❌ Erro na exportação:', error);
            throw error;
        }
    }

    jsonToCSV(jsonData) {
        if (!jsonData || jsonData.length === 0) {
            return '';
        }
        
        // Obter todas as chaves possíveis
        const allKeys = new Set();
        jsonData.forEach(item => {
            Object.keys(item).forEach(key => allKeys.add(key));
        });
        
        const headers = Array.from(allKeys);
        
        // Criar linhas CSV
        const csvRows = [
            headers.join(','), // Cabeçalho
            ...jsonData.map(item => 
                headers.map(header => {
                    const value = item[header];
                    if (value === null || value === undefined) {
                        return '';
                    }
                    // Escapar vírgulas e aspas
                    const stringValue = String(value).replace(/"/g, '""');
                    return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
                        ? `"${stringValue}"`
                        : stringValue;
                }).join(',')
            )
        ];
        
        return csvRows.join('\n');
    }

    downloadCSV(csvContent, filename) {
        // Adicionar BOM para UTF-8
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(url);
    }

    // ========================================
    // LIMPEZA E MANUTENÇÃO
    // ========================================

    limparDados(tipo) {
        switch (tipo) {
            case 'prospec':
                localStorage.removeItem('propostas');
                console.log('🧹 Propostas limpas');
                break;
            case 'controle':
                localStorage.removeItem('controle');
                console.log('🧹 Controles limpos');
                break;
            case 'ugs':
                localStorage.removeItem('ugs');
                console.log('🧹 UGs limpas');
                break;
            case 'all':
                localStorage.removeItem('propostas');
                localStorage.removeItem('controle');
                localStorage.removeItem('ugs');
                localStorage.removeItem('calibragemGlobal');
                console.log('🧹 Todos os dados limpos');
                break;
            default:
                console.log('⚠️ Tipo de limpeza não reconhecido');
        }
    }

    // ========================================
    // ESTATÍSTICAS
    // ========================================

    async getEstatisticas() {
        try {
            const [propostas, controles, ugs] = await Promise.all([
                this.getProspec(),
                this.getControle(),
                this.getUGs()
            ]);

            return {
                propostas: {
                    total: propostas.length,
                    aguardando: propostas.filter(p => p.status === 'Aguardando').length,
                    fechadas: propostas.filter(p => p.status === 'Fechado').length,
                    canceladas: propostas.filter(p => p.status === 'Cancelado').length
                },
                controles: {
                    total: controles.length,
                    ativos: controles.filter(c => c.ativo !== false).length,
                    comUG: controles.filter(c => c.ugVinculada).length
                },
                ugs: {
                    total: ugs.length,
                    ativas: ugs.filter(u => u.status === 'Ativa').length,
                    capacidadeTotal: ugs.reduce((sum, u) => sum + (u.capacidade || 0), 0)
                },
                calibragem: {
                    global: this.getCalibragemGlobal()
                }
            };
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            return null;
        }
    }
}

// Instância única
const storageService = new StorageService();

// ✅ EXPORTAÇÕES CORRETAS
export default storageService;
export { storageService };