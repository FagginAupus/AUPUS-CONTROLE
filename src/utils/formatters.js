export const formatarPrimeiraMaiuscula = (texto) => {
  if (!texto || typeof texto !== 'string') return texto;
  return texto.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};