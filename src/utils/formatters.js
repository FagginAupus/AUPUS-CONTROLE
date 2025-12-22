// Formatar CPF: 000.000.000-00 ou CNPJ: 00.000.000/0000-00
export const formatarCpfCnpj = (valor) => {
  if (!valor) return '-';

  // Remove tudo que não é número
  const numeros = valor.replace(/\D/g, '');

  if (numeros.length === 11) {
    // CPF: 000.000.000-00
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (numeros.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  // Retorna o valor original se não for CPF nem CNPJ válido
  return valor;
};

// Formatar WhatsApp: (00) 00000-0000 ou +55 (00) 00000-0000
export const formatarWhatsApp = (valor) => {
  if (!valor) return '-';

  // Remove tudo que não é número
  const numeros = valor.replace(/\D/g, '');

  if (numeros.length === 11) {
    // Celular com DDD: (00) 00000-0000
    return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (numeros.length === 10) {
    // Fixo com DDD: (00) 0000-0000
    return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (numeros.length === 13) {
    // Com código do país: +55 (00) 00000-0000
    return numeros.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4');
  } else if (numeros.length === 12) {
    // Com código do país (fixo): +55 (00) 0000-0000
    return numeros.replace(/(\d{2})(\d{2})(\d{4})(\d{4})/, '+$1 ($2) $3-$4');
  }

  // Retorna o valor original se não for um formato reconhecido
  return valor;
};

export const formatarPrimeiraMaiuscula = (texto, duranteDigitacao = false) => {
  if (!texto || typeof texto !== 'string') return texto;

  // Durante digitação, não remover espaços do final (permite ao usuário digitar espaços)
  const espacosFinais = texto.match(/\s+$/)?.[0] || '';

  // Remover apenas espaços extras no meio e início
  if (!duranteDigitacao) {
    texto = texto.trim().replace(/\s+/g, ' ');
  } else {
    // Durante digitação, preservar estrutura mas limpar múltiplos espaços no meio
    texto = texto.replace(/\s{2,}/g, ' ');
  }

  // Converter para minúsculo
  texto = texto.toLowerCase();

  // Lista de preposições e artigos que devem ficar em minúsculo
  const minusculas = ['de', 'da', 'do', 'dos', 'das', 'e', 'a', 'o', 'as', 'os'];

  // Separar por espaços (não usar \b que não funciona com acentos)
  const palavras = texto.split(' ');

  // Capitalizar cada palavra (exceto preposições que não sejam a primeira)
  const palavrasFormatadas = palavras.map((palavra, index) => {
    if (!palavra) return palavra;

    // Primeira palavra sempre maiúscula, ou se não for preposição/artigo
    if (index === 0 || !minusculas.includes(palavra)) {
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    }

    return palavra;
  });

  const resultado = palavrasFormatadas.join(' ');

  // Durante digitação, preservar espaços do final
  return duranteDigitacao ? resultado + espacosFinais : resultado;
};