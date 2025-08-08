// src/services/storageService.js - Híbrido: API + localStorage como fallback
import apiService from './apiService';

class StorageService {
    constructor() {
        this.useAPI = true; // Flag para usar API ou localStorage
        this.calibragemGlobal = 0; // Cache local
        
        console.log('🚀 StorageService inicializado em modo híbrido');
        this.detectarModoOperacao();
    }

    // Detectar se deve usar API ou localStorage
    async detectarModoOperacao() {
        try {
            // Tentar fazer uma requisição simples para testar conectividade
            await apiService.get('/health-check');
            this.useAPI = true;
            console.log('✅ Modo API ativado - Conectado ao backend');
        } catch (error) {
            this.useAPI = false;
            console.log('⚠️ Modo localStorage ativado - Backend indisponível:', error.message);
        }
    }

    // Método para forçar uso de API ou localStorage
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
                const dados = await apiService.getPropostas();
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
                // Para o salvamento em lote, seria necessário um endpoint específico
                // Por enquanto, salvar no localStorage e sincronizar depois
                localStorage.setItem('aupus_prospec', JSON.stringify(dados));
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
                const novaProposta = await apiService.criarProposta(proposta);
                
                // Atualizar cache local
                const dadosLocal = await this.getProspecLocal();
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
                const dadosLocal = await this.getProspecLocal();
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
                const dadosLocal = await this.getProspecLocal();
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
                const dados = await apiService.getControle();
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
                const novoItem = await apiService.adicionarControle(proposta);
                
                const dadosLocal = await this.getControleLocal();
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
    // MÉTODOS PARA UGS
    // ========================================

    async getUGs() {
        if (this.useAPI) {
            try {
                console.log('📥 getUGs (API)');
                const dados = await apiService.getUGs();
                localStorage.setItem('aupus_ugs', JSON.stringify(dados));
                return dados;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.getUGsLocal();
            }
        } else {
            return this.getUGsLocal();
        }
    }

    async adicionarUG(ug) {
        if (this.useAPI) {
            try {
                console.log('💾 adicionarUG (API):', ug);
                const novaUG = await apiService.criarUG(ug);
                
                const dadosLocal = await this.getUGsLocal();
                dadosLocal.push(novaUG);
                localStorage.setItem('aupus_ugs', JSON.stringify(dadosLocal));
                
                return true;
            } catch (error) {
                console.log('⚠️ API falhou, salvando no localStorage:', error.message);
                return this.adicionarUGLocal(ug);
            }
        } else {
            return this.adicionarUGLocal(ug);
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

    getUGsLocal() {
        console.log('📥 getUGs (localStorage)');
        const dados = localStorage.getItem('aupus_ugs');
        const resultado = dados ? JSON.parse(dados) : [];
        console.log(`✅ Carregadas ${resultado.length} UGs do localStorage`);
        return resultado;
    }

    async adicionarControleLocal(proposta) {
        console.log('💾 adicionarControle (localStorage):', proposta);
        const dados = this.getControleLocal();
        
        const jaExiste = dados.find(item => 
            item.numeroProposta === proposta.numeroProposta && 
            item.numeroUC === proposta.numeroUC
        );
        
        if (!jaExiste) {
            const propostaControle = {
                ...proposta,
                ug: proposta.ug || '',
                dataTransferencia: new Date().toISOString()
            };
            
            dados.push(propostaControle);
            localStorage.setItem('aupus_controle', JSON.stringify(dados));
            return true;
        }
        
        return false;
    }

    async adicionarUGLocal(ug) {
        console.log('💾 adicionarUG (localStorage):', ug);
        const dados = this.getUGsLocal();
        
        if (!ug.id) {
            ug.id = Date.now().toString();
        }
        
        dados.push(ug);
        localStorage.setItem('aupus_ugs', JSON.stringify(dados));
        return true;
    }

    // ========================================
    // MÉTODOS DE SINCRONIZAÇÃO
    // ========================================

    async sincronizarComAPI() {
        if (!this.useAPI) {
            console.log('⚠️ API desabilitada, não é possível sincronizar');
            return false;
        }

        try {
            console.log('🔄 Iniciando sincronização com API...');
            
            // Migrar dados do localStorage para API
            await apiService.migrarDadosLocalStorage();
            
            // Recarregar dados da API
            await this.getProspec();
            await this.getControle();
            await this.getUGs();
            
            console.log('✅ Sincronização concluída');
            return true;
            
        } catch (error) {
            console.error('❌ Erro na sincronização:', error);
            return false;
        }
    }

    // Método para verificar status da conexão
    async verificarConexao() {
        try {
            await apiService.get('/health-check');
            this.useAPI = true;
            return true;
        } catch (error) {
            this.useAPI = false;
            return false;
        }
    }

    // ========================================
    // MÉTODOS UTILITÁRIOS
    // ========================================

    async obterEstatisticas() {
        if (this.useAPI) {
            try {
                return await apiService.getEstatisticas();
            } catch (error) {
                console.log('⚠️ API falhou, calculando estatísticas localmente');
                return this.calcularEstatisticasLocais();
            }
        } else {
            return this.calcularEstatisticasLocais();
        }
    }

    async calcularEstatisticasLocais() {
        try {
            const prospec = this.getProspecLocal();
            const controle = this.getControleLocal();
            const ugs = this.getUGsLocal();
            
            return {
                prospec: {
                    total: prospec.length,
                    aguardando: prospec.filter(p => p.status === 'Aguardando').length,
                    fechados: prospec.filter(p => p.status === 'Fechado').length
                },
                controle: {
                    total: controle.length,
                    comUG: controle.filter(c => c.ug && c.ug.trim() !== '').length,
                    semUG: controle.filter(c => !c.ug || c.ug.trim() === '').length
                },
                ugs: {
                    total: ugs.length,
                    calibradas: ugs.filter(u => u.calibrado).length,
                    naoCalibradas: ugs.filter(u => !u.calibrado).length
                }
            };
        } catch (error) {
            console.error('❌ Erro ao calcular estatísticas:', error);
            throw error;
        }
    }

    // Status do sistema
    getSystemStatus() {
        return {
            mode: this.useAPI ? 'API' : 'localStorage',
            apiConnected: this.useAPI,
            hasLocalData: !!(
                localStorage.getItem('aupus_prospec') ||
                localStorage.getItem('aupus_controle') ||
                localStorage.getItem('aupus_ugs')
            )
        };
    }

    // Migração de dados
    async migrarDados() {
        if (!this.useAPI) {
            console.log('❌ API não disponível para migração');
            return false;
        }

        try {
            const result = await apiService.migrarDadosLocalStorage();
            console.log('✅ Migração realizada:', result);
            return result;
        } catch (error) {
            console.error('❌ Erro na migração:', error);
            throw error;
        }
    }

    // Implementação dos métodos restantes que faltaram...
    // (sincronizarStatusFechado, removerControle, etc.)
    
    async sincronizarStatusFechado(numeroProposta, numeroUC, status) {
        if (status === 'Fechado') {
            const dadosProspec = this.getProspecLocal();
            const proposta = dadosProspec.find(p => 
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
        const novosDados = dados.filter(item => 
            !(item.numeroProposta === numeroProposta && item.numeroUC === numeroUC)
        );
        
        if (dados.length !== novosDados.length) {
            localStorage.setItem('aupus_controle', JSON.stringify(novosDados));
            return true;
        }
        return false;
    }
}

// Exportar instância única
const storageService = new StorageService();
export default storageService;