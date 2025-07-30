async calcularMediaUG(nomeUG) {
        try {
            const controle = await this.getControle();
            const ucsAtribuidas = controle.filter(uc => uc.ug === nomeUG);
            
            if (ucsAtribuidas.length === 0) {
                return { media: 0, calibragem: 0, ucsCount: 0 };
            }
            
            // Somar todas as médias das UCs atribuídas
            const mediaTotal = ucsAtribuidas.reduce((acc, uc) => acc + (uc.media || 0), 0);
            
            // Buscar o valor de calibragem global (pode ser definido em algum lugar)
            // Por enquanto, vamos usar 0 se não tiver calibragem aplicada
            const calibragemPercent = 0; // Será atualizado quando aplicar calibragem
            const calibragem = mediaTotal * (1 + calibragemPercent / 100);
            
            return {
                media: mediaTotal,
                calibragem: calibragem,
                ucsCount: ucsAtribuidas.length
            };
        } catch (error) {
            console.error('❌ Erro ao calcular média UG:', error);
            return { media: 0, calibragem: 0, ucsCount: 0 };
        }
    }    // ========================================
    // UTILITÁRIOS
    // ========================================// src/services/storageService.js
class StorageService {
    constructor() {
        this.ready = true;
        this.MODO_LOCAL_FORCADO = true;
    }

    // ========================================
    // MÉTODOS PARA PROSPEC
    // ========================================

    async getProspec() {
        console.log('📥 getProspec (localStorage)');
        const dados = localStorage.getItem('aupus_prospec');
        const resultado = dados ? JSON.parse(dados) : [];
        console.log(`✅ Carregados ${resultado.length} registros do localStorage`);
        return resultado;
    }

    async salvarProspec(dados) {
        console.log(`💾 salvarProspec (localStorage) - ${dados.length} registros`);
        localStorage.setItem('aupus_prospec', JSON.stringify(dados));
        return true;
    }

    async adicionarProspec(proposta) {
        console.log('💾 adicionarProspec (localStorage):', proposta);
        const dados = await this.getProspec();
        
        // Adicionar ID único se não existir
        if (!proposta.id) {
            proposta.id = `${proposta.numeroProposta}-${proposta.numeroUC}-${Date.now()}`;
        }
        
        dados.push(proposta);
        await this.salvarProspec(dados);
        return true;
    }

    async atualizarProspec(index, dadosAtualizados) {
        console.log(`🔄 atualizarProspec (localStorage) - index ${index}`);
        const dados = await this.getProspec();
        if (index >= 0 && index < dados.length) {
            const statusAnterior = dados[index].status;
            const numeroUCAtual = dados[index].numeroUC;
            const numeroPropostaAtual = dados[index].numeroProposta;
            
            dados[index] = { ...dados[index], ...dadosAtualizados };
            await this.salvarProspec(dados);
            
            // Se mudou status, sincronizar controle APENAS para esta UC específica
            if (statusAnterior !== dadosAtualizados.status) {
                console.log(`🔄 Status mudou de '${statusAnterior}' para '${dadosAtualizados.status}', sincronizando controle...`);
                await this.sincronizarStatusFechado(numeroPropostaAtual, numeroUCAtual, dadosAtualizados.status);
            }
            
            return true;
        }
        return false;
    }

    async removerProspec(index) {
        console.log(`🗑️ removerProspec (localStorage) - index ${index}`);
        const dados = await this.getProspec();
        if (index >= 0 && index < dados.length) {
            const proposta = dados[index];
            
            // Se era fechado, remover do controle também (UC específica)
            if (proposta.status === 'Fechado') {
                await this.removerControle(proposta.numeroProposta, proposta.numeroUC);
            }
            
            dados.splice(index, 1);
            await this.salvarProspec(dados);
            return true;
        }
        return false;
    }

    // ========================================
    // MÉTODOS PARA CONTROLE
    // ========================================

    async getControle() {
        console.log('📥 getControle (localStorage)');
        const dados = localStorage.getItem('aupus_controle');
        return dados ? JSON.parse(dados) : [];
    }

    async salvarControle(dados) {
        console.log(`💾 salvarControle (localStorage) - ${dados.length} registros`);
        localStorage.setItem('aupus_controle', JSON.stringify(dados));
        return true;
    }

    async adicionarControle(proposta) {
        console.log('💾 adicionarControle (localStorage):', proposta);
        const dados = await this.getControle();
        
        const existe = dados.find(item => 
            item.numeroProposta === proposta.numeroProposta && 
            item.numeroUC === proposta.numeroUC
        );
        
        if (!existe) {
            // Garantir que tem campo UG vazio
            const propostaControle = { ...proposta, ug: proposta.ug || '' };
            dados.push(propostaControle);
            await this.salvarControle(dados);
            console.log(`✅ Proposta ${proposta.numeroProposta} (UC: ${proposta.numeroUC}) adicionada ao controle`);
            return true;
        }
        
        console.log(`⚠️ Proposta ${proposta.numeroProposta} (UC: ${proposta.numeroUC}) já existe no controle`);
        return false;
    }

    async atualizarUGControle(index, ug) {
        console.log(`🔄 atualizarUGControle (localStorage) - index ${index}, UG: ${ug}`);
        const dados = await this.getControle();
        if (index >= 0 && index < dados.length) {
            dados[index].ug = ug;
            await this.salvarControle(dados);
            
            // Atualizar médias das UGs após atribuição
            await this.atualizarMediasUGs();
            
            return true;
        }
        return false;
    }

    async removerControle(numeroProposta, numeroUC) {
        console.log(`🗑️ removerControle (localStorage) - Proposta: ${numeroProposta}, UC: ${numeroUC}`);
        const dados = await this.getControle();
        const novosDados = dados.filter(item => 
            !(item.numeroProposta === numeroProposta && item.numeroUC === numeroUC)
        );
        
        if (dados.length !== novosDados.length) {
            await this.salvarControle(novosDados);
            console.log(`✅ Proposta ${numeroProposta} (UC: ${numeroUC}) removida do controle`);
            return true;
        }
        
        console.log(`⚠️ Proposta ${numeroProposta} (UC: ${numeroUC}) não encontrada no controle`);
        return false;
    }

    // ========================================
    // MÉTODOS PARA UGs
    // ========================================

    async getUGs() {
        console.log('📥 getUGs (localStorage)');
        const dados = localStorage.getItem('aupus_ugs');
        const resultado = dados ? JSON.parse(dados) : [];
        console.log(`✅ Carregadas ${resultado.length} UGs do localStorage`);
        return resultado;
    }

    async salvarUGs(dados) {
        console.log(`💾 salvarUGs (localStorage) - ${dados.length} registros`);
        localStorage.setItem('aupus_ugs', JSON.stringify(dados));
        return true;
    }

    async adicionarUG(ug) {
        console.log('💾 adicionarUG (localStorage):', ug);
        const dados = await this.getUGs();
        
        // Adicionar ID único se não existir
        if (!ug.id) {
            ug.id = Date.now().toString();
        }
        
        dados.push(ug);
        await this.salvarUGs(dados);
        return true;
    }

    async atualizarUG(index, dadosAtualizados) {
        console.log(`🔄 atualizarUG (localStorage) - index ${index}`);
        const dados = await this.getUGs();
        if (index >= 0 && index < dados.length) {
            dados[index] = { ...dados[index], ...dadosAtualizados };
            await this.salvarUGs(dados);
            return true;
        }
        return false;
    }

    async removerUG(index) {
        console.log(`🗑️ removerUG (localStorage) - index ${index}`);
        const dados = await this.getUGs();
        if (index >= 0 && index < dados.length) {
            dados.splice(index, 1);
            await this.salvarUGs(dados);
            return true;
        }
        return false;
    }

    // ========================================
    // SINCRONIZAÇÃO APRIMORADA
    // ========================================

    async sincronizarStatusFechado(numeroProposta, novoStatus) {
        console.log(`🔄 sincronizarStatusFechado - Proposta: ${numeroProposta}, Status: ${novoStatus}`);
        
        try {
            const prospec = await this.getProspec();
            const propostas = prospec.filter(p => p.numeroProposta === numeroProposta);
            
            console.log(`📊 Encontradas ${propostas.length} UCs para a proposta ${numeroProposta}`);
            
            if (novoStatus === 'Fechado') {
                // Adicionar todas as UCs da proposta ao controle
                let adicionadas = 0;
                for (const proposta of propostas) {
                    const sucesso = await this.adicionarControle({
                        ...proposta,
                        ug: '' // UG vazia inicialmente
                    });
                    if (sucesso) adicionadas++;
                }
                console.log(`✅ ${adicionadas} UCs adicionadas ao controle`);
                
            } else {
                // Remover todas as UCs da proposta do controle
                let removidas = 0;
                for (const proposta of propostas) {
                    await this.removerControle(proposta.numeroProposta, proposta.numeroUC);
                    removidas++;
                }
                console.log(`✅ ${removidas} UCs removidas do controle`);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Erro na sincronização:', error);
            return false;
        }
    }

    // ========================================
    // ESTATÍSTICAS
    // ========================================

    async getEstatisticas() {
        const prospec = await this.getProspec();
        const controle = await this.getControle();
        const ugs = await this.getUGs();
        
        const total = prospec.length;
        const aguardando = prospec.filter(p => p.status === 'Aguardando').length;
        const fechadas = prospec.filter(p => p.status === 'Fechado').length;
        
        let ultimaProposta = '-';
        if (prospec.length > 0) {
            // Ordenar por número da proposta e pegar a última
            const ordenadas = prospec.sort((a, b) => {
                const numA = parseInt(a.numeroProposta.split('/')[1] || '0');
                const numB = parseInt(b.numeroProposta.split('/')[1] || '0');
                return numB - numA;
            });
            ultimaProposta = ordenadas[0].numeroProposta;
        }
        
        return {
            total,
            aguardando,
            fechadas,
            ultimaProposta,
            totalControle: controle.length,
            totalUGs: ugs.length
        };
    }

    // ========================================
    // CÁLCULO DE MÉDIA E CALIBRAGEM DAS UGs BASEADO NAS UCs ATRIBUÍDAS
    // ========================================

    async aplicarCalibragemGlobal(percentual) {
        try {
            const ugs = await this.getUGs();
            const ugsAtualizadas = [];
            
            for (const ug of ugs) {
                const calculo = await this.calcularMediaUG(ug.nomeUsina);
                
                const calibragem = calculo.media * (1 + percentual / 100);
                
                const ugAtualizada = {
                    ...ug,
                    media: calculo.media,
                    calibragem: calibragem,
                    ucsAtribuidas: calculo.ucsCount,
                    calibrado: calculo.ucsCount > 0,
                    percentualCalibragem: percentual
                };
                
                ugsAtualizadas.push(ugAtualizada);
            }
            
            await this.salvarUGs(ugsAtualizadas);
            console.log(`✅ Calibragem de ${percentual}% aplicada em todas as UGs`);
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao aplicar calibragem global:', error);
            return false;
        }
    }

    async atualizarMediasUGs() {
        try {
            const ugs = await this.getUGs();
            const ugsAtualizadas = [];
            
            for (const ug of ugs) {
                const calculo = await this.calcularMediaUG(ug.nomeUsina);
                
                const ugAtualizada = {
                    ...ug,
                    media: calculo.media,
                    calibragem: calculo.calibragem,
                    ucsAtribuidas: calculo.ucsCount,
                    // Manter o status de calibrado baseado se tem UCs atribuídas
                    calibrado: calculo.ucsCount > 0
                };
                
                ugsAtualizadas.push(ugAtualizada);
            }
            
            await this.salvarUGs(ugsAtualizadas);
            console.log('✅ Médias das UGs atualizadas baseadas nas UCs atribuídas');
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao atualizar médias UGs:', error);
            return false;
        }
    }

    async exportarParaCSV(tipo = 'prospec') {
        let dados;
        
        switch (tipo) {
            case 'prospec':
                dados = await this.getProspec();
                break;
            case 'controle':
                dados = await this.getControle();
                break;
            case 'ugs':
                dados = await this.getUGs();
                break;
            default:
                dados = await this.getProspec();
        }
        
        if (dados.length === 0) {
            alert('Nenhum dado para exportar');
            return;
        }
        
        const headers = Object.keys(dados[0]);
        const csvContent = [
            headers.join(','),
            ...dados.map(row => 
                headers.map(header => `"${row[header] || ''}"`).join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aupus_${tipo}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async limparTodosDados() {
        localStorage.removeItem('aupus_prospec');
        localStorage.removeItem('aupus_controle');
        localStorage.removeItem('aupus_ugs');
        console.log('🗑️ Dados locais limpos');
    }
}

// Criar instância global
const storageService = new StorageService();

// Disponibilizar globalmente (compatibilidade com projeto antigo)
window.aupusStorage = storageService;

export default storageService;