package com.aprendaplus.service;

import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.FuncionarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FuncionarioService {

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public List<Funcionario> listarTodos() {
        return funcionarioRepository.findAll();
    }

    public Funcionario buscarPorId(Integer id) {
        return funcionarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado com id: " + id));
    }

    public Funcionario salvar(Funcionario funcionario) {
        conferirCamposObrigatorios(funcionario);

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
        funcionarioRepository.deleteById(id);
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
