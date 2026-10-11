import { useRef, useState } from 'react';
import { buscarEnderecoPorCep, formatarCep, somenteDigitosCep } from '../services/cepService';

const MENSAGENS = {
  buscando: 'Buscando endereço...',
  encontrado: 'Endereço preenchido pelo CEP. Confira os dados e informe o número.',
  'nao-encontrado': 'CEP não encontrado. Preencha o endereço manualmente.',
  erro: 'Não foi possível buscar o CEP agora. Preencha o endereço manualmente.',
};

// Campo de CEP que, ao completar os 8 números, busca e preenche o endereço.
// Os campos preenchidos continuam editáveis normalmente no formulário.
// - onChange: recebe um evento { target: { name: 'cep', value } }, igual a um input comum
// - onEnderecoEncontrado: recebe { rua, bairro, cidade, estado } (só os que vieram preenchidos)
function CampoCep({ value, onChange, onEnderecoEncontrado }) {
  const [situacao, setSituacao] = useState(null);
  const ultimaBusca = useRef(somenteDigitosCep(value));

  const handleChange = (e) => {
    const cep = formatarCep(e.target.value);
    onChange({ target: { name: 'cep', value: cep } });

    const digitos = somenteDigitosCep(cep);
    if (digitos.length !== 8) {
      ultimaBusca.current = digitos;
      setSituacao(null);
      return;
    }
    if (digitos === ultimaBusca.current) return; // mesmo CEP: não busca de novo

    ultimaBusca.current = digitos;
    setSituacao('buscando');

    buscarEnderecoPorCep(digitos)
      .then((endereco) => {
        if (ultimaBusca.current !== digitos) return; // o usuário já digitou outro CEP
        if (!endereco) {
          setSituacao('nao-encontrado');
          return;
        }
        // Não apaga o que o usuário digitou se o CEP não trouxer aquele dado
        // (ex.: CEP geral de cidade pequena vem sem rua e sem bairro)
        const preenchidos = Object.fromEntries(Object.entries(endereco).filter(([, valor]) => valor));
        onEnderecoEncontrado(preenchidos);
        setSituacao('encontrado');
      })
      .catch(() => {
        if (ultimaBusca.current === digitos) setSituacao('erro');
      });
  };

  return (
    <>
      <input
        id="cep"
        name="cep"
        placeholder="00000-000"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        maxLength={9}
        required
      />
      {situacao && (
        <small className={`campo-cep-situacao campo-cep-${situacao}`} role="status">
          {MENSAGENS[situacao]}
        </small>
      )}
    </>
  );
}

export default CampoCep;
