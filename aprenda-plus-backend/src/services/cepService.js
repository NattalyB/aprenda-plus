import axios from 'axios';

// Deixa só os números do CEP: "92035-540" -> "92035540"
export const somenteDigitosCep = (cep) => String(cep || '').replace(/\D/g, '').slice(0, 8);

// Máscara do CEP enquanto o usuário digita: "92035540" -> "92035-540"
export const formatarCep = (cep) => {
  const digitos = somenteDigitosCep(cep);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
};

// Consulta o endereço no ViaCEP (serviço público e gratuito dos Correios).
// Usa o axios direto, e não o "api", porque não é a nossa API (não leva token).
// Devolve { rua, bairro, cidade, estado } ou null se o CEP não existir.
export const buscarEnderecoPorCep = async (cep) => {
  const digitos = somenteDigitosCep(cep);
  if (digitos.length !== 8) return null;

  const { data } = await axios.get(`https://viacep.com.br/ws/${digitos}/json/`);
  if (!data || data.erro) return null;

  return {
    rua: data.logradouro || '',
    bairro: data.bairro || '',
    cidade: data.localidade || '',
    estado: data.uf || '',
  };
};
