package com.aprendaplus.service;

import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.NivelAcesso;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.NivelAcessoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FuncionarioService {

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    @Autowired
    private NivelAcessoRepository nivelAcessoRepository;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public List<Funcionario> listarTodos() {
        return funcionarioRepository.findAll();
    }

    public Funcionario buscarPorId(Integer id) {
        return funcionarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado com id: " + id));
    }

    // Sem saber quem está alterando (uso interno e testes antigos)
    public Funcionario salvar(Funcionario funcionario) {
        return salvar(funcionario, null);
    }

    // idQuemAltera = funcionário logado que está salvando (vem do token)
    public Funcionario salvar(Funcionario funcionario, Integer idQuemAltera) {
        conferirCamposObrigatorios(funcionario);
        conferirNivel(funcionario, idQuemAltera);

        String senha = funcionario.getSenhaHash();
        boolean senhaVazia = senha == null || senha.isBlank();

        if (senhaVazia) {
            if (funcionario.getIdFuncionario() == null) {
                throw new RegraDeNegocioException("Informe uma senha para o novo funcionário.");
            }
            // Edição sem senha nova: mantém a senha que já está salva
            funcionario.setSenhaHash(buscarPorId(funcionario.getIdFuncionario()).getSenhaHash());
        } else if (!senha.startsWith("$2")) {
            if (senha.length() < 6) {
                throw new RegraDeNegocioException("A senha deve ter pelo menos 6 caracteres.");
            }
            funcionario.setSenhaHash(encoder.encode(senha));
        }

        return funcionarioRepository.save(funcionario);
    }

    public void deletar(Integer id) {
        deletar(id, null);
    }

    public void deletar(Integer id, Integer idQuemAltera) {
        if (idQuemAltera != null && !ehMaster(idQuemAltera)) {
            boolean alvoEhMaster = funcionarioRepository.findById(id)
                    .map(f -> f.getNivel() != null && f.getNivel().isMaster())
                    .orElse(false);
            if (alvoEhMaster) {
                throw new RegraDeNegocioException("Só um usuário Master pode excluir uma conta Master.");
            }
        }
        funcionarioRepository.deleteById(id);
    }

    // Nível de acesso: obrigatório, e só um Master mexe em contas Master.
    // Ninguém muda o próprio nível (para não se trancar fora nem se promover).
    private void conferirNivel(Funcionario funcionario, Integer idQuemAltera) {
        Funcionario atual = funcionario.getIdFuncionario() == null ? null
                : funcionarioRepository.findById(funcionario.getIdFuncionario()).orElse(null);

        NivelAcesso nivelNovo = null;
        if (funcionario.getNivel() != null && funcionario.getNivel().getIdNivel() != null) {
            nivelNovo = nivelAcessoRepository.findById(funcionario.getNivel().getIdNivel())
                    .orElseThrow(() -> new RegraDeNegocioException("Nível de acesso não encontrado."));
        } else if (atual != null) {
            nivelNovo = atual.getNivel(); // edição sem informar o nível: mantém o atual
        }
        if (nivelNovo == null) {
            throw new RegraDeNegocioException("Escolha o nível de acesso do funcionário.");
        }
        funcionario.setNivel(nivelNovo);

        if (idQuemAltera == null) {
            return;
        }

        NivelAcesso nivelAntigo = atual == null ? null : atual.getNivel();
        boolean mexeEmMaster = nivelNovo.isMaster() || (nivelAntigo != null && nivelAntigo.isMaster());
        if (mexeEmMaster && !ehMaster(idQuemAltera)) {
            throw new RegraDeNegocioException("Só um usuário Master pode criar ou alterar contas Master.");
        }

        boolean propriaConta = atual != null && idQuemAltera.equals(atual.getIdFuncionario());
        Integer idAntigo = nivelAntigo == null ? null : nivelAntigo.getIdNivel();
        if (propriaConta && !java.util.Objects.equals(idAntigo, nivelNovo.getIdNivel())) {
            throw new RegraDeNegocioException("Você não pode mudar o seu próprio nível de acesso.");
        }
    }

    // Contas Master (devs/suporte) ficam escondidas de quem não é Master.
    // idQuemVe null = chamada interna (sem usuário logado): vê tudo.
    public boolean podeVerContasMaster(Integer idQuemVe) {
        return idQuemVe == null || ehMaster(idQuemVe);
    }

    public static boolean ehContaMaster(Funcionario f) {
        return f != null && f.getNivel() != null && f.getNivel().isMaster();
    }

    // Ids das contas Master (para esconder as ações delas no histórico)
    public java.util.Set<Integer> idsDasContasMaster() {
        java.util.Set<Integer> ids = new java.util.HashSet<>();
        for (Funcionario f : funcionarioRepository.findAll()) {
            if (ehContaMaster(f)) ids.add(f.getIdFuncionario());
        }
        return ids;
    }

    private boolean ehMaster(Integer idFuncionario) {
        return funcionarioRepository.findById(idFuncionario)
                .map(f -> f.getNivel() != null && f.getNivel().isMaster())
                .orElse(false);
    }

    // O banco exige esses dados; aqui damos uma mensagem clara antes de chegar lá
    private void conferirCamposObrigatorios(Funcionario f) {
        if (vazio(f.getNomeCompleto())) throw new RegraDeNegocioException("Informe o nome completo.");
        if (vazio(f.getEmail()) || !f.getEmail().contains("@")) throw new RegraDeNegocioException("Informe um e-mail válido.");
        if (vazio(f.getTelefone())) throw new RegraDeNegocioException("Informe o telefone.");
        if (f.getCpf() == null || !f.getCpf().matches("\\d{11}")) {
            throw new RegraDeNegocioException("O CPF deve conter exatamente 11 números.");
        }
        if (f.getDataNascimento() == null) throw new RegraDeNegocioException("Informe a data de nascimento.");
        if (vazio(f.getCargo())) f.setCargo("administrativo");
        if (vazio(f.getStatus())) f.setStatus("ativo");
    }

    private boolean vazio(String texto) {
        return texto == null || texto.isBlank();
    }
}
