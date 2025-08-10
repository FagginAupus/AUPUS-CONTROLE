// src/services/storageService.js - Híbrido: API + localStorage como fallback
import apiService from './apiService';

class StorageService {
    constructor() {
        this.useAPI = true; // Flag para usar API ou localStorage
        this.calibragemGlobal = 0; // Cache local
        
        console.log('🚀 StorageService inicializado em modo híbrido');
        this.detectarModoOperacao();
    }

    // ========================================
    // CONFIGURAÇÃO E DETECÇÃO DE MODO
    // ========================================

    async detectarModoOperacao() {
        try {
            await apiService.healthCheck();
            this.useAPI = true;
            console.log('✅ Modo API ativado - Conectado ao backend');
        } catch (error) {
            this.useAPI = false;
            console.log('⚠️ Modo localStorage ativado - Backend indisponível:', error.message);
        }
    }

    setMode(useAPI) {
        this.useAPI = useAPI;
        console.log(`🔧 Modo alterado para: ${useAPI ? 'API' : 'localStorage'}`);
    }

    // ========================================
    // MÉTODOS PARA PROPOSTAS (PROSPEC)
    // ========================================

    async getProspec() {
        if (this.useAPI) {
            try {
                console.log('📥 getProspec (API)');
                const response = await apiService.getPropostas();
                const dados = response.data || response;
                
                // Cache no localStorage como backup
                localStorage.setItem('aupus_prospec', JSON.stringify(dados));
                return dados;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.getProspecLocal();
            }
        } else {
            return this.getProspecLocal();
        }
    }

    async salvarProspec(dados) {
        if (this.useAPI) {
            try {
                console.log(`💾 salvarProspec (API) - ${dados.length} registros`);
                // Para salvamento em lote, salvar localmente e sincronizar depois
                localStorage.setItem('aupus_prospec', JSON.stringify(dados));
                // TODO: Implementar sincronização em lote
                return true;
            } catch (error) {
                console.log('⚠️ API falhou, salvando no localStorage:', error.message);
                return this.salvarProspecLocal(dados);
            }
        } else {
            return this.salvarProspecLocal(dados);
        }
    }

    async adicionarProspec(proposta) {
        if (this.useAPI) {
            try {
                console.log('💾 adicionarProspec (API):', proposta);
                const response = await apiService.criarProposta(proposta);
                const novaProposta = response.data || response;
                
                // Atualizar cache local
                const dadosLocal = this.getProspecLocal();
                dadosLocal.push(novaProposta);
                localStorage.setItem('aupus_prospec', JSON.stringify(dadosLocal));
                
                return true;
            } catch (error) {
                console.log('⚠️ API falhou, salvando no localStorage:', error.message);
                return this.adicionarProspecLocal(proposta);
            }
        } else {
            return this.adicionarProspecLocal(proposta);
        }
    }

    async atualizarProspec(index, dadosAtualizados) {
        if (this.useAPI) {
            try {
                const dadosLocal = this.getProspecLocal();
                if (index >= 0 && index < dadosLocal.length) {
                    const proposta = dadosLocal[index];
                    
                    console.log(`🔄 atualizarProspec (API) - ID ${proposta.id}`);
                    await apiService.atualizarProposta(proposta.id, dadosAtualizados);
                    
                    // Atualizar cache local
                    dadosLocal[index] = { ...proposta, ...dadosAtualizados };
                    localStorage.setItem('aupus_prospec', JSON.stringify(dadosLocal));
                    
                    return true;
                }
                return false;
            } catch (error) {
                console.log('⚠️ API falhou, atualizando localStorage:', error.message);
                return this.atualizarProspecLocal(index, dadosAtualizados);
            }
        } else {
            return this.atualizarProspecLocal(index, dadosAtualizados);
        }
    }

    async removerProspec(index) {
        if (this.useAPI) {
            try {
                const dadosLocal = this.getProspecLocal();
                if (index >= 0 && index < dadosLocal.length) {
                    const proposta = dadosLocal[index];
                    
                    console.log(`🗑️ removerProspec (API) - ID ${proposta.id}`);
                    await apiService.excluirProposta(proposta.id);
                    
                    // Remover do cache local
                    dadosLocal.splice(index, 1);
                    localStorage.setItem('aupus_prospec', JSON.stringify(dadosLocal));
                    
                    return true;
                }
                return false;
            } catch (error) {
                console.log('⚠️ API falhou, removendo do localStorage:', error.message);
                return this.removerProspecLocal(index);
            }
        } else {
            return this.removerProspecLocal(index);
        }
    }

    // ========================================
    // MÉTODOS PARA CONTROLE
    // ========================================

    async getControle() {
        if (this.useAPI) {
            try {
                console.log('📥 getControle (API)');
                const response = await apiService.getControle();
                const dados = response.data || response;
                
                localStorage.setItem('aupus_controle', JSON.stringify(dados));
                return dados;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.getControleLocal();
            }
        } else {
            return this.getControleLocal();
        }
    }

    async adicionarControle(proposta) {
        if (this.useAPI) {
            try {
                console.log('💾 adicionarControle (API):', proposta);
                const response = await apiService.adicionarControle(proposta);
                const novoItem = response.data || response;
                
                const dadosLocal = this.getControleLocal();
                dadosLocal.push(novoItem);
                localStorage.setItem('aupus_controle', JSON.stringify(dadosLocal));
                
                return true;
            } catch (error) {
                console.log('⚠️ API falhou, salvando no localStorage:', error.message);
                return this.adicionarControleLocal(proposta);
            }
        } else {
            return this.adicionarControleLocal(proposta);
        }
    }

    // ========================================
    // MÉTODOS PARA USUÁRIOS & AUTENTICAÇÃO
    // ========================================

    async login(credentials) {
        if (this.useAPI) {
            try {
                console.log('🔐 login (API)');
                const response = await apiService.login(credentials);
                
                if (response.success) {
                    // Salvar dados do usuário no localStorage
                    localStorage.setItem('aupus_user', JSON.stringify(response.user));
                    return response;
                }
                
                throw new Error(response.message || 'Falha no login');
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.loginLocal(credentials);
            }
        } else {
            return this.loginLocal(credentials);
        }
    }

    async logout() {
        if (this.useAPI) {
            try {
                console.log('🚪 logout (API)');
                await apiService.logout();
            } catch (error) {
                console.log('⚠️ Erro no logout da API:', error.message);
            }
        }
        
        // Limpar dados locais
        localStorage.removeItem('aupus_user');
        localStorage.removeItem('aupus_token');
    }

    async getCurrentUser() {
        if (this.useAPI) {
            try {
                const response = await apiService.getCurrentUser();
                const user = response.data || response;
                localStorage.setItem('aupus_user', JSON.stringify(user));
                return user;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.getUserLocal();
            }
        } else {
            return this.getUserLocal();
        }
    }

    async getTeam() {
        if (this.useAPI) {
            try {
                const response = await apiService.getTeam();
                return response.data || response;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.getTeamLocal();
            }
        } else {
            return this.getTeamLocal();
        }
    }

    // ========================================
    // MÉTODOS PARA CONFIGURAÇÕES
    // ========================================

    async getConfiguracoes(grupo = null) {
        if (this.useAPI) {
            try {
                const response = await apiService.getConfiguracoes(grupo);
                const dados = response.data || response;
                
                // Cache local
                const chave = grupo ? `aupus_config_${grupo}` : 'aupus_config';
                localStorage.setItem(chave, JSON.stringify(dados));
                
                return dados;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.getConfiguracoesLocal(grupo);
            }
        } else {
            return this.getConfiguracoesLocal(grupo);
        }
    }

    async salvarConfiguracao(chave, valor, grupo = 'geral') {
        if (this.useAPI) {
            try {
                await apiService.salvarConfiguracao(chave, valor, grupo);
                
                // Atualizar cache local
                const configsLocal = this.getConfiguracoesLocal(grupo);
                const existing = configsLocal.find(c => c.chave === chave);
                if (existing) {
                    existing.valor = valor;
                } else {
                    configsLocal.push({ chave, valor, grupo });
                }
                
                const chaveStorage = grupo ? `aupus_config_${grupo}` : 'aupus_config';
                localStorage.setItem(chaveStorage, JSON.stringify(configsLocal));
                
                return true;
            } catch (error) {
                console.log('⚠️ API falhou, salvando no localStorage:', error.message);
                return this.salvarConfiguracaoLocal(chave, valor, grupo);
            }
        } else {
            return this.salvarConfiguracaoLocal(chave, valor, grupo);
        }
    }

    // ========================================
    // MÉTODOS PARA ESTATÍSTICAS
    // ========================================

    async getEstatisticas() {
        if (this.useAPI) {
            try {
                const response = await apiService.getDashboardData();
                return response.data || response;
            } catch (error) {
                console.log('⚠️ API falhou, calculando estatísticas locais:', error.message);
                return this.calcularEstatisticasLocais();
            }
        } else {
            return this.calcularEstatisticasLocais();
        }
    }

    // ========================================
    // MÉTODOS LOCAIS (FALLBACK)
    // ========================================

    getProspecLocal() {
        console.log('📥 getProspec (localStorage)');
        const dados = localStorage.getItem('aupus_prospec');
        const resultado = dados ? JSON.parse(dados) : [];
        console.log(`✅ Carregadas ${resultado.length} propostas do localStorage`);
        return resultado;
    }

    salvarProspecLocal(dados) {
        console.log(`💾 salvarProspec (localStorage) - ${dados.length} registros`);
        localStorage.setItem('aupus_prospec', JSON.stringify(dados));
        return true;
    }

    async adicionarProspecLocal(proposta) {
        console.log('💾 adicionarProspec (localStorage):', proposta);
        const dados = this.getProspecLocal();
        dados.push(proposta);
        this.salvarProspecLocal(dados);
        return true;
    }

    async atualizarProspecLocal(index, dadosAtualizados) {
        console.log(`🔄 atualizarProspec (localStorage) - index ${index}`);
        const dados = this.getProspecLocal();
        
        if (index >= 0 && index < dados.length) {
            const statusAnterior = dados[index].status;
            dados[index] = { ...dados[index], ...dadosAtualizados };
            this.salvarProspecLocal(dados);
            
            // Sincronizar com controle se mudou status
            if (statusAnterior !== dadosAtualizados.status) {
                console.log(`🔄 Status mudou, sincronizando controle...`);
                await this.sincronizarStatusFechado(
                    dados[index].numeroProposta,
                    dados[index].numeroUC,
                    dadosAtualizados.status
                );
            }
            
            return true;
        }
        return false;
    }

    async removerProspecLocal(index) {
        console.log(`🗑️ removerProspec (localStorage) - index ${index}`);
        const dados = this.getProspecLocal();
        
        if (index >= 0 && index < dados.length) {
            const proposta = dados[index];
            
            if (proposta.status === 'Fechado') {
                await this.removerControle(proposta.numeroProposta, proposta.numeroUC);
            }
            
            dados.splice(index, 1);
            this.salvarProspecLocal(dados);
            return true;
        }
        return false;
    }

    getControleLocal() {
        console.log('📥 getControle (localStorage)');
        const dados = localStorage.getItem('aupus_controle');
        const resultado = dados ? JSON.parse(dados) : [];
        console.log(`✅ Carregadas ${resultado.length} do controle do localStorage`);
        return resultado;
    }

    async adicionarControleLocal(proposta) {
        console.log('💾 adicionarControle (localStorage):', proposta);
        const dados = this.getControleLocal();
        dados.push(proposta);
        localStorage.setItem('aupus_controle', JSON.stringify(dados));
        return true;
    }

    getUserLocal() {
        const dados = localStorage.getItem('aupus_user');
        return dados ? JSON.parse(dados) : null;
    }

    loginLocal(credentials) {
        // Implementação básica para fallback
        const mockUser = {
            id: 1,
            name: 'Usuário Local',
            email: credentials.email,
            role: 'user'
        };
        
        localStorage.setItem('aupus_user', JSON.stringify(mockUser));
        return {
            success: true,
            user: mockUser,
            token: 'local_token'
        };
    }

    getTeamLocal() {
        // Retorna equipe local básica
        return [
            { id: 1, name: 'Equipe Local', role: 'user' }
        ];
    }

    getConfiguracoesLocal(grupo = null) {
        const chave = grupo ? `aupus_config_${grupo}` : 'aupus_config';
        const dados = localStorage.getItem(chave);
        return dados ? JSON.parse(dados) : [];
    }

    salvarConfiguracaoLocal(chave, valor, grupo = 'geral') {
        const configs = this.getConfiguracoesLocal(grupo);
        const existing = configs.find(c => c.chave === chave);
        
        if (existing) {
            existing.valor = valor;
        } else {
            configs.push({ chave, valor, grupo });
        }
        
        const chaveStorage = grupo ? `aupus_config_${grupo}` : 'aupus_config';
        localStorage.setItem(chaveStorage, JSON.stringify(configs));
        return true;
    }

    calcularEstatisticasLocais() {
        const prospec = this.getProspecLocal();
        const controle = this.getControleLocal();
        
        return {
            total_propostas: prospec.length,
            propostas_fechadas: prospec.filter(p => p.status === 'Fechado').length,
            propostas_em_andamento: prospec.filter(p => p.status === 'Em andamento').length,
            total_controle: controle.length,
            taxa_conversao: prospec.length > 0 
                ? ((prospec.filter(p => p.status === 'Fechado').length / prospec.length) * 100).toFixed(2)
                : 0
        };
    }

    // ========================================
    // MÉTODOS AUXILIARES
    // ========================================

    async sincronizarStatusFechado(numeroProposta, numeroUC, novoStatus) {
        if (novoStatus === 'Fechado') {
            const prospecData = this.getProspecLocal();
            const proposta = prospecData.find(p => 
                p.numeroProposta === numeroProposta && p.numeroUC === numeroUC
            );
            
            if (proposta) {
                await this.adicionarControle(proposta);
            }
        } else {
            await this.removerControle(numeroProposta, numeroUC);
        }
    }

    async removerControle(numeroProposta, numeroUC) {
        const dados = this.getControleLocal();
        const index = dados.findIndex(item => 
            item.numeroProposta === numeroProposta && item.numeroUC === numeroUC
        );
        
        if (index !== -1) {
            dados.splice(index, 1);
            localStorage.setItem('aupus_controle', JSON.stringify(dados));
            console.log(`🗑️ Item removido do controle: ${numeroProposta}/${numeroUC}`);
        }
    }

    // ========================================
    // MÉTODOS DE EXPORTAÇÃO
    // ========================================

    async exportarDados(tipo) {
        let dados;
        let nomeArquivo;
        
        switch (tipo) {
            case 'prospec':
                dados = await this.getProspec();
                nomeArquivo = `prospec_${new Date().toISOString().split('T')[0]}.csv`;
                break;
            case 'controle':
                dados = await this.getControle();
                nomeArquivo = `controle_${new Date().toISOString().split('T')[0]}.csv`;
                break;
            default:
                throw new Error('Tipo de exportação inválido');
        }
        
        this.baixarCSV(dados, nomeArquivo);
        return true;
    }

    async exportarDadosFiltrados(tipo, dadosFiltrados) {
        const nomeArquivo = `${tipo}_filtrado_${new Date().toISOString().split('T')[0]}.csv`;
        this.baixarCSV(dadosFiltrados, nomeArquivo);
        return true;
    }

    baixarCSV(dados, nomeArquivo) {
        if (!dados || dados.length === 0) {
            throw new Error('Nenhum dado para exportar');
        }
        
        const headers = Object.keys(dados[0]);
        const csv = [
            headers.join(','),
            ...dados.map(row => 
                headers.map(header => 
                    JSON.stringify(row[header] || '')
                ).join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, nomeArquivo);
        } else {
            link.href = URL.createObjectURL(blob);
            link.download = nomeArquivo;
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        console.log(`📄 Arquivo exportado: ${nomeArquivo}`);
    }

    // ========================================
    // CALIBRAGEM
    // ========================================

    getCalibragemGlobal() {
        const calibragem = localStorage.getItem('aupus_calibragem_global');
        return calibragem ? parseFloat(calibragem) : 0;
    }

    setCalibragemGlobal(valor) {
        this.calibragemGlobal = valor;
        localStorage.setItem('aupus_calibragem_global', valor.toString());
        console.log(`🎯 Calibragem global definida: ${valor}%`);
    }
}

// Criar instância única (Singleton)
const storageService = new StorageService();

export default storageService;