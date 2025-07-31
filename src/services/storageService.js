// src/services/storageService.js - Corrigido com sincronização aprimorada
class StorageService {
    constructor() {
        this.modo = 'local'; // Para localStorage
        this.calibragemGlobal = 0;
        this.carregarCalibragemGlobal();
    }

    // ========================================
    // MÉTODOS PARA PROSPEC
    // ========================================

    async getProspec() {
        console.log('📥 getProspec (localStorage)');
        const dados = localStorage.getItem('aupus_prospec');
        const resultado = dados ? JSON.parse(dados) : [];
        console.log(`✅ Carregadas ${resultado.length} propostas do localStorage`);
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
        dados.push(proposta);
        await this.salvarProspec(dados);
        return true;
    }

    async atualizarProspec(index, dadosAtualizados) {
        console.log(`🔄 atualizarProspec (localStorage) - index ${index}`);
        const dados = await this.getProspec();
        
        if (index >= 0 && index < dados.length) {
            const statusAnterior = dados[index].status;
            const numeroProposta = dados[index].numeroProposta;
            const numeroUC = dados[index].numeroUC;
            
            dados[index] = { ...dados[index], ...dadosAtualizados };
            await this.salvarProspec(dados);
            
            // 🔄 SINCRONIZAÇÃO APRIMORADA: Se mudou status, sincronizar controle
            if (statusAnterior !== dadosAtualizados.status) {
                console.log(`🔄 Status mudou de '${statusAnterior}' para '${dadosAtualizados.status}', sincronizando controle...`);
                await this.sincronizarStatusFechado(numeroProposta, numeroUC, dadosAtualizados.status);
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
            
            // Se era fechado, remover do controle também
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
        const resultado = dados ? JSON.parse(dados) : [];
        console.log(`✅ Carregadas ${resultado.length} do controle do localStorage`);
        return resultado;
    }

    async salvarControle(dados) {
        console.log(`💾 salvarControle (localStorage) - ${dados.length} registros`);
        localStorage.setItem('aupus_controle', JSON.stringify(dados));
        return true;
    }

    async adicionarControle(proposta) {
        console.log('💾 adicionarControle (localStorage):', proposta);
        const dados = await this.getControle();
        
        // Verificar se já existe essa UC na proposta
        const jaExiste = dados.find(item => 
            item.numeroProposta === proposta.numeroProposta && 
            item.numeroUC === proposta.numeroUC
        );
        
        if (!jaExiste) {
            // Garantir que a UG está vazia inicialmente
            const propostaControle = {
                ...proposta,
                ug: proposta.ug || '', // UG vazia por padrão
                dataTransferencia: new Date().toISOString()
            };
            
            dados.push(propostaControle);
            await this.salvarControle(dados);
            console.log(`✅ UC ${proposta.numeroUC} da proposta ${proposta.numeroProposta} adicionada ao controle`);
            return true;
        }
        
        console.log('⚠️ UC já existe no controle');
        return false;
    }

    async atualizarControle(index, dadosAtualizados) {
        console.log(`🔄 atualizarControle (localStorage) - index ${index}`);
        const dados = await this.getControle();
        if (index >= 0 && index < dados.length) {
            dados[index] = { ...dados[index], ...dadosAtualizados };
            await this.salvarControle(dados);
            return true;
        }
        return false;
    }

    async atualizarUGControle(index, ug) {
        console.log(`🔄 atualizarUGControle (localStorage) - index ${index}, UG: ${ug}`);
        const dados = await this.getControle();
        if (index >= 0 && index < dados.length) {
            dados[index].ug = ug || '';
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
        
        if (novosDados.length !== dados.length) {
            await this.salvarControle(novosDados);
            console.log(`✅ UC ${numeroUC} da proposta ${numeroProposta} removida do controle`);
            return true;
        }
        
        console.log('⚠️ UC não encontrada no controle');
        return false;
    }

    // ========================================
    // SINCRONIZAÇÃO APRIMORADA
    // ========================================

    async sincronizarStatusFechado(numeroProposta, numeroUC, novoStatus) {
        console.log(`🔄 sincronizarStatusFechado - Proposta: ${numeroProposta}, UC: ${numeroUC}, Status: ${novoStatus}`);
        
        try {
            const prospec = await this.getProspec();
            const proposta = prospec.find(p => 
                p.numeroProposta === numeroProposta && p.numeroUC === numeroUC
            );
            
            if (!proposta) {
                console.log('⚠️ Proposta não encontrada no prospec');
                return false;
            }
            
            if (novoStatus === 'Fechado') {
                // Adicionar esta UC específica ao controle
                const sucesso = await this.adicionarControle({
                    ...proposta,
                    ug: '', // UG vazia inicialmente
                    status: 'Fechado' // Garantir que o status é Fechado
                });
                
                if (sucesso) {
                    console.log(`✅ UC ${numeroUC} da proposta ${numeroProposta} transferida para o controle`);
                }
                
            } else {
                // Remover esta UC específica do controle
                await this.removerControle(numeroProposta, numeroUC);
                console.log(`✅ UC ${numeroUC} da proposta ${numeroProposta} removida do controle`);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Erro na sincronização:', error);
            return false;
        }
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
            const ug = dados[index];
            
            // Verificar se a UG tem UCs atribuídas
            const controle = await this.getControle();
            const ucsAtribuidas = controle.filter(uc => uc.ug === ug.nomeUsina);
            
            if (ucsAtribuidas.length > 0) {
                console.log(`❌ Não é possível remover UG "${ug.nomeUsina}" - possui ${ucsAtribuidas.length} UCs atribuídas`);
                throw new Error(`Não é possível remover a UG "${ug.nomeUsina}" pois ela possui ${ucsAtribuidas.length} UC(s) atribuída(s). Transfira as UCs para outras UGs antes de remover.`);
            }
            
            dados.splice(index, 1);
            await this.salvarUGs(dados);
            return true;
        }
        return false;
    }

    // ========================================
    // MÉTODOS DE NÚMERO DE PROPOSTA
    // ========================================

    async gerarNumeroProposta() {
        try {
            const ano = new Date().getFullYear();
            const prospec = await this.getProspec();
            
            // Filtrar propostas do ano atual
            const propostasAno = prospec.filter(p => {
                const [anoP] = p.numeroProposta.split('/');
                return parseInt(anoP) === ano;
            });
            
            // Obter próximo número sequencial
            let proximoNumero = propostasAno.length + 1;
            let numeroProposta;
            
            // Verificar se já existe essa numeração
            do {
                numeroProposta = `${ano}/${proximoNumero.toString().padStart(4, '0')}`;
                const existe = prospec.find(p => p.numeroProposta === numeroProposta);
                if (!existe) break;
                proximoNumero++;
            } while (true);
            
            console.log('📋 Número da proposta gerado:', numeroProposta);
            return numeroProposta;
            
        } catch (error) {
            console.error('❌ Erro ao gerar número da proposta:', error);
            // Fallback: usar timestamp
            const ano = new Date().getFullYear();
            const timestamp = Date.now().toString().slice(-4);
            return `${ano}/${timestamp}`;
        }
    }

    // ========================================
    // CALIBRAGEM GLOBAL
    // ========================================

    carregarCalibragemGlobal() {
        const calibragem = localStorage.getItem('aupus_calibragem_global');
        this.calibragemGlobal = calibragem ? parseFloat(calibragem) : 0;
        console.log(`📥 Calibragem global carregada: ${this.calibragemGlobal}%`);
    }

    setCalibragemGlobal(valor) {
        this.calibragemGlobal = valor;
        localStorage.setItem('aupus_calibragem_global', valor.toString());
        console.log(`💾 Calibragem global salva: ${valor}%`);
    }

    getCalibragemGlobal() {
        return this.calibragemGlobal;
    }

    async aplicarCalibragemGlobal(percentual) {
        console.log(`⚙️ Aplicando calibragem global de ${percentual}%`);
        
        try {
            const ugs = await this.getUGs();
            
            // Aplicar calibragem em todas as UGs
            const ugsAtualizadas = ugs.map(ug => ({
                ...ug,
                calibrado: true,
                percentualCalibragem: percentual,
                dataUltimaCalibragem: new Date().toISOString()
            }));
            
            await this.salvarUGs(ugsAtualizadas);
            
            // Atualizar médias
            await this.atualizarMediasUGs();
            
            console.log(`✅ Calibragem aplicada em ${ugs.length} UGs`);
            return true;
            
        } catch (error) {
            console.error('❌ Erro na calibragem global:', error);
            throw error;
        }
    }

    async atualizarMediasUGs() {
        console.log('🔄 Atualizando médias das UGs...');
        
        try {
            const controle = await this.getControle();
            const ugs = await this.getUGs();
            
            // Calcular médias por UG
            const mediasUG = {};
            
            controle.forEach(uc => {
                if (uc.ug && uc.media) {
                    if (!mediasUG[uc.ug]) {
                        mediasUG[uc.ug] = { total: 0, count: 0 };
                    }
                    mediasUG[uc.ug].total += parseFloat(uc.media) || 0;
                    mediasUG[uc.ug].count += 1;
                }
            });
            
            // Atualizar UGs com novas médias
            const ugsAtualizadas = ugs.map(ug => {
                const media = mediasUG[ug.nomeUsina];
                return {
                    ...ug,
                    media: media ? Math.round(media.total / media.count) : 0,
                    totalUCs: media ? media.count : 0
                };
            });
            
            await this.salvarUGs(ugsAtualizadas);
            console.log('✅ Médias das UGs atualizadas');
            
        } catch (error) {
            console.error('❌ Erro ao atualizar médias das UGs:', error);
        }
    }

    // ========================================
    // EXPORTAÇÃO CSV
    // ========================================

    async exportarParaCSV(tipo) {
        try {
            console.log(`📊 exportarParaCSV (${tipo})`);
            
            let dados = [];
            let nomeArquivo = '';
            
            switch (tipo) {
                case 'prospec':
                    dados = await this.getProspec();
                    nomeArquivo = `aupus-prospec-${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'controle':
                    dados = await this.getControle();
                    nomeArquivo = `aupus-controle-${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'ugs':
                    dados = await this.getUGs();
                    nomeArquivo = `aupus-ugs-${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                default:
                    throw new Error('Tipo de exportação inválido');
            }
            
            if (dados.length === 0) {
                throw new Error('Não há dados para exportar');
            }
            
            // Converter para CSV
            const headers = Object.keys(dados[0]);
            const csvContent = [
                headers.join(','), // Cabeçalho
                ...dados.map(row => 
                    headers.map(header => {
                        const value = row[header];
                        // Escapar valores que contêm vírgula ou aspas
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value || '';
                    }).join(',')
                )
            ].join('\n');
            
            // Download do arquivo
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', nomeArquivo);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`✅ Arquivo ${nomeArquivo} baixado com sucesso`);
            return { sucesso: true, nomeArquivo };
            
        } catch (error) {
            console.error('❌ Erro na exportação:', error);
            throw error;
        }
    }

    async exportarDadosFiltrados(tipo, dadosFiltrados) {
        try {
            console.log(`📊 exportarDadosFiltrados (${tipo}) - ${dadosFiltrados.length} registros`);
            
            if (dadosFiltrados.length === 0) {
                throw new Error('Não há dados para exportar');
            }
            
            const nomeArquivo = `aupus-${tipo}-filtrado-${new Date().toISOString().split('T')[0]}.csv`;
            
            // Converter para CSV
            const headers = Object.keys(dadosFiltrados[0]);
            const csvContent = [
                headers.join(','), // Cabeçalho
                ...dadosFiltrados.map(row => 
                    headers.map(header => {
                        const value = row[header];
                        // Escapar valores que contêm vírgula ou aspas
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value || '';
                    }).join(',')
                )
            ].join('\n');
            
            // Download do arquivo
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', nomeArquivo);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`✅ Arquivo ${nomeArquivo} baixado com sucesso`);
            return { sucesso: true, nomeArquivo };
            
        } catch (error) {
            console.error('❌ Erro na exportação filtrada:', error);
            throw error;
        }
    }

    // ========================================
    // MÉTODOS DE DEBUG E LIMPEZA
    // ========================================

    async limparTodosDados() {
        console.log('🗑️ Limpando todos os dados do localStorage...');
        
        localStorage.removeItem('aupus_prospec');
        localStorage.removeItem('aupus_controle');
        localStorage.removeItem('aupus_ugs');
        localStorage.removeItem('aupus_calibragem_global');
        
        this.calibragemGlobal = 0;
        
        console.log('✅ Todos os dados foram limpos');
        return true;
    }

    async obterEstatisticas() {
        try {
            const prospec = await this.getProspec();
            const controle = await this.getControle();
            const ugs = await this.getUGs();
            
            const estatisticas = {
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
            
            console.log('📊 Estatísticas:', estatisticas);
            return estatisticas;
            
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            throw error;
        }
    }
}

// Exportar instância única
const storageService = new StorageService();
export default storageService;