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