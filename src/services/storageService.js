// src/services/storageService.js - Sistema de armazenamento local completo

class StorageService {
    constructor() {
        console.log('🗄️ StorageService inicializado (localStorage)');
        this.calibragemGlobal = 0;
        this.carregarCalibragemGlobal();
    }

    // ========================================
    // MÉTODOS PARA PROSPECÇÃO
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
            dados[index] = { ...dados[index], ...dadosAtualizados };
            await this.salvarProspec(dados);
            return true;
        }
        return false;
    }

    async removerProspec(index) {
        console.log(`🗑️ removerProspec (localStorage) - index ${index}`);
        const dados = await this.getProspec();
        if (index >= 0 && index < dados.length) {
            dados.splice(index, 1);
            await this.salvarProspec(dados);
            return true;
        }
        return false;
    }

    async gerarNumeroProposta() {
        try {
            const propostas = await this.getProspec();
            const ano = new Date().getFullYear();
            
            // Encontrar o maior número do ano atual
            const propostasAno = propostas.filter(p => 
                p.numeroProposta && p.numeroProposta.startsWith(ano.toString())
            );
            
            let maiorNumero = 0;
            propostasAno.forEach(p => {
                const match = p.numeroProposta.match(/(\d{4})\/(\d+)/);
                if (match) {
                    const numero = parseInt(match[2]);
                    if (numero > maiorNumero) {
                        maiorNumero = numero;
                    }
                }
            });
            
            const proximoNumero = maiorNumero + 1;
            const numeroProposta = `${ano}/${proximoNumero.toString().padStart(3, '0')}`;
            
            console.log(`📋 Número da proposta gerado: ${numeroProposta}`);
            return numeroProposta;
            
        } catch (error) {
            console.error('❌ Erro ao gerar número da proposta:', error);
            const fallback = `${new Date().getFullYear()}/${Date.now().toString().slice(-3)}`;
            return fallback;
        }
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
            dados.push(proposta);
            await this.salvarControle(dados);
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
        
        if (novosDados.length !== dados.length) {
            await this.salvarControle(novosDados);
            console.log('✅ UC removida do controle');
            return true;
        }
        
        console.log('⚠️ UC não encontrada no controle');
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
            const ug = dados[index];
            
            // Verificar se a UG tem UCs atribuídas
            const controle = await this.getControle();
            const ucsAtribuidas = controle.filter(uc => uc.ug === ug.nomeUsina);
            
            if (ucsAtribuidas.length > 0) {
                console.log(`❌ Não é possível remover UG "${ug.nomeUsina}" - possui ${ucsAtribuidas.length} UCs atribuídas`);
                throw new Error(`Não é possível remover a UG "${ug.nomeUsina}" pois ela possui ${ucsAtribuidas.length} UC(s) atribuída(s). Remova primeiro as atribuições.`);
            }
            
            dados.splice(index, 1);
            await this.salvarUGs(dados);
            console.log(`✅ UG "${ug.nomeUsina}" removida com sucesso`);
            return true;
        }
        return false;
    }

    // ========================================
    // CÁLCULO DE MÉDIA E CALIBRAGEM DAS UGs BASEADO NAS UCs ATRIBUÍDAS
    // ========================================

    async calcularMediaUG(nomeUG) {
        try {
            const controle = await this.getControle();
            const ucsAtribuidas = controle.filter(uc => uc.ug === nomeUG);
            
            if (ucsAtribuidas.length === 0) {
                return { media: 0, calibragem: 0, ucsCount: 0 };
            }
            
            // Somar todas as médias das UCs atribuídas
            const mediaTotal = ucsAtribuidas.reduce((acc, uc) => {
                const media = parseFloat(uc.media) || 0;
                return acc + media;
            }, 0);
            
            // Buscar o valor de calibragem global salvo no localStorage
            const calibragemPercent = this.getCalibragemGlobal();
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
    }

    async aplicarCalibragemGlobal(percentual) {
        try {
            // Salvar a calibragem global no localStorage
            this.setCalibragemGlobal(percentual);
            
            const ugs = await this.getUGs();
            const ugsAtualizadas = [];
            
            for (const ug of ugs) {
                const calculo = await this.calcularMediaUG(ug.nomeUsina);
                
                const ugAtualizada = {
                    ...ug,
                    media: calculo.media,
                    calibragem: calculo.calibragem,
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

    // ========================================
    // CALIBRAGEM GLOBAL
    // ========================================

    setCalibragemGlobal(percentual) {
        this.calibragemGlobal = percentual;
        localStorage.setItem('aupus_calibragem_global', percentual.toString());
        console.log(`💾 Calibragem global salva: ${percentual}%`);
    }

    getCalibragemGlobal() {
        return this.calibragemGlobal;
    }

    carregarCalibragemGlobal() {
        const calibragem = localStorage.getItem('aupus_calibragem_global');
        this.calibragemGlobal = calibragem ? parseFloat(calibragem) : 0;
        console.log(`📥 Calibragem global carregada: ${this.calibragemGlobal}%`);
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
                    ug: '' // UG vazia inicialmente
                });
                if (sucesso) {
                    console.log(`✅ UC ${numeroUC} da proposta ${numeroProposta} adicionada ao controle`);
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
    // EXPORTAÇÃO CSV
    // ========================================

    async exportarParaCSV(tipo) {
        try {
            console.log(`📊 exportarParaCSV (${tipo})`);
            
            let dados = [];
            let csvContent = '';
            let nomeArquivo = '';

            switch (tipo) {
                case 'prospec':
                    dados = await this.getProspec();
                    
                    if (dados.length === 0) {
                        throw new Error('Nenhuma proposta disponível para exportação');
                    }

                    // Cabeçalhos
                    const headersProspec = [
                        'Número Proposta',
                        'Data',
                        'Nome Cliente',
                        'Celular',
                        'Consultor',
                        'Recorrência',
                        'Desconto Tarifa',
                        'Desconto Bandeira',
                        'Distribuidora',
                        'Número UC',
                        'Apelido UC',
                        'Ligação',
                        'Média (kWh)',
                        'Status'
                    ];
                    
                    csvContent = headersProspec.join(',') + '\n';
                    
                    dados.forEach(item => {
                        const linha = [
                            `"${item.numeroProposta || ''}"`,
                            `"${item.data || ''}"`,
                            `"${item.nomeCliente || ''}"`,
                            `"${item.celular || item.telefone || ''}"`,
                            `"${item.consultor || ''}"`,
                            `"${item.recorrencia || ''}"`,
                            `"${((item.descontoTarifa || 0) * 100).toFixed(1)}%"`,
                            `"${((item.descontoBandeira || 0) * 100).toFixed(1)}%"`,
                            `"${item.distribuidora || ''}"`,
                            `"${item.numeroUC || ''}"`,
                            `"${item.apelido || ''}"`,
                            `"${item.ligacao || ''}"`,
                            `"${item.media || 0}"`,
                            `"${item.status || 'Aguardando'}"`
                        ];
                        csvContent += linha.join(',') + '\n';
                    });
                    
                    nomeArquivo = `aupus_prospec_${new Date().toISOString().slice(0, 10)}.csv`;
                    break;

                case 'controle':
                    dados = await this.getControle();
                    
                    if (dados.length === 0) {
                        throw new Error('Nenhum dado de controle disponível para exportação');
                    }

                    // Cabeçalhos
                    const headersControle = [
                        'Número Proposta',
                        'Data',
                        'Nome Cliente',
                        'Celular',
                        'Consultor',
                        'Número UC',
                        'Apelido UC',
                        'Média (kWh)',
                        'UG Atribuída',
                        'Calibragem (kWh)',
                        'Status Calibragem'
                    ];
                    
                    csvContent = headersControle.join(',') + '\n';
                    
                    dados.forEach(item => {
                        const linha = [
                            `"${item.numeroProposta || ''}"`,
                            `"${item.data || ''}"`,
                            `"${item.nomeCliente || ''}"`,
                            `"${item.celular || item.telefone || ''}"`,
                            `"${item.consultor || ''}"`,
                            `"${item.numeroUC || ''}"`,
                            `"${item.apelido || ''}"`,
                            `"${item.media || 0}"`,
                            `"${item.ug || 'Sem UG'}"`,
                            `"${item.calibragem || 0}"`,
                            `"${item.calibrado ? 'Calibrada' : 'Não Calibrada'}"`
                        ];
                        csvContent += linha.join(',') + '\n';
                    });
                    
                    nomeArquivo = `aupus_controle_${new Date().toISOString().slice(0, 10)}.csv`;
                    break;

                case 'ugs':
                    dados = await this.getUGs();
                    
                    if (dados.length === 0) {
                        throw new Error('Nenhuma UG disponível para exportação');
                    }

                    // Cabeçalhos
                    const headersUGs = [
                        'Nome Usina',
                        'Potência CA (kW)',
                        'Potência CC (kW)',
                        'Fator Capacidade (%)',
                        'Capacidade (kWh)',
                        'Média Total (kWh)',
                        'Calibragem (kWh)',
                        'UCs Atribuídas',
                        'Status Calibragem',
                        'Data Cadastro'
                    ];
                    
                    csvContent = headersUGs.join(',') + '\n';
                    
                    dados.forEach(item => {
                        const linha = [
                            `"${item.nomeUsina || ''}"`,
                            `"${item.potenciaCA || 0}"`,
                            `"${item.potenciaCC || 0}"`,
                            `"${item.fatorCapacidade || 0}"`,
                            `"${item.capacidade || 0}"`,
                            `"${item.media || 0}"`,
                            `"${item.calibragem || 0}"`,
                            `"${item.ucsAtribuidas || 0}"`,
                            `"${item.calibrado ? 'Calibrada' : 'Não Calibrada'}"`,
                            `"${item.dataCadastro || ''}"`
                        ];
                        csvContent += linha.join(',') + '\n';
                    });
                    
                    nomeArquivo = `aupus_ugs_${new Date().toISOString().slice(0, 10)}.csv`;
                    break;

                default:
                    throw new Error('Tipo de exportação não suportado');
            }

            // Criar e baixar arquivo
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', nomeArquivo);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                throw new Error('Seu navegador não suporta download de arquivos');
            }

            console.log(`✅ Arquivo ${nomeArquivo} exportado com sucesso`);
            return true;

        } catch (error) {
            console.error(`❌ Erro ao exportar CSV (${tipo}):`, error);
            throw error;
        }
    }

    // Método para exportar dados filtrados (para relatórios por equipe)
    async exportarDadosFiltrados(tipo, dadosFiltrados) {
        try {
            console.log(`📊 exportarDadosFiltrados (${tipo}) - ${dadosFiltrados.length} registros`);
            
            if (!dadosFiltrados || dadosFiltrados.length === 0) {
                throw new Error('Nenhum dado disponível para exportação');
            }

            let csvContent = '';
            let nomeArquivo = '';

            switch (tipo) {
                case 'prospec':
                    // Cabeçalhos para prospecção
                    const headersProspec = [
                        'Número Proposta',
                        'Data',
                        'Nome Cliente',
                        'Celular',
                        'Consultor',
                        'Recorrência',
                        'Desconto Tarifa',
                        'Desconto Bandeira',
                        'Distribuidora',
                        'Número UC',
                        'Apelido UC',
                        'Ligação',
                        'Média (kWh)',
                        'Status'
                    ];
                    
                    csvContent = headersProspec.join(',') + '\n';
                    
                    dadosFiltrados.forEach(item => {
                        const linha = [
                            `"${item.numeroProposta || ''}"`,
                            `"${item.data || ''}"`,
                            `"${item.nomeCliente || ''}"`,
                            `"${item.celular || item.telefone || ''}"`,
                            `"${item.consultor || ''}"`,
                            `"${item.recorrencia || ''}"`,
                            `"${((item.descontoTarifa || 0) * 100).toFixed(1)}%"`,
                            `"${((item.descontoBandeira || 0) * 100).toFixed(1)}%"`,
                            `"${item.distribuidora || ''}"`,
                            `"${item.numeroUC || ''}"`,
                            `"${item.apelido || ''}"`,
                            `"${item.ligacao || ''}"`,
                            `"${item.media || 0}"`,
                            `"${item.status || 'Aguardando'}"`
                        ];
                        csvContent += linha.join(',') + '\n';
                    });
                    
                    nomeArquivo = `aupus_prospec_filtrado_${new Date().toISOString().slice(0, 10)}.csv`;
                    break;

                case 'controle':
                    // Cabeçalhos para controle
                    const headersControle = [
                        'Número Proposta',
                        'Data',
                        'Nome Cliente',
                        'Celular',
                        'Consultor',
                        'Número UC',
                        'Apelido UC',
                        'Média (kWh)',
                        'UG Atribuída',
                        'Calibragem (kWh)',
                        'Status Calibragem'
                    ];
                    
                    csvContent = headersControle.join(',') + '\n';
                    
                    dadosFiltrados.forEach(item => {
                        const linha = [
                            `"${item.numeroProposta || ''}"`,
                            `"${item.data || ''}"`,
                            `"${item.nomeCliente || ''}"`,
                            `"${item.celular || item.telefone || ''}"`,
                            `"${item.consultor || ''}"`,
                            `"${item.numeroUC || ''}"`,
                            `"${item.apelido || ''}"`,
                            `"${item.media || 0}"`,
                            `"${item.ug || 'Sem UG'}"`,
                            `"${item.calibragem || 0}"`,
                            `"${item.calibrado ? 'Calibrada' : 'Não Calibrada'}"`
                        ];
                        csvContent += linha.join(',') + '\n';
                    });
                    
                    nomeArquivo = `aupus_controle_filtrado_${new Date().toISOString().slice(0, 10)}.csv`;
                    break;

                default:
                    throw new Error('Tipo de exportação não suportado');
            }

            // Criar e baixar arquivo
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', nomeArquivo);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                throw new Error('Seu navegador não suporta download de arquivos');
            }

            console.log(`✅ Arquivo ${nomeArquivo} exportado com sucesso`);
            return true;

        } catch (error) {
            console.error(`❌ Erro ao exportar dados filtrados (${tipo}):`, error);
            throw error;
        }
    }
}

// Instância única do serviço
const storageService = new StorageService();

export default storageService;