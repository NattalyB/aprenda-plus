package com.aprendaplus.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.repository.AlunoRepository;

@Service
public class AlunoService {

    @Autowired
    private AlunoRepository alunoRepository;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public List<Aluno> listarTodos() {
        return alunoRepository.findAll();
    }

    public Aluno buscarPorId(Integer id) {
        return alunoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Aluno não encontrado com id: " + id));
    }

    public Aluno salvar(Aluno aluno) {
        String senha = aluno.getSenhaHash();
        boolean senhaVazia = senha == null || senha.isBlank();

        if (senhaVazia) {
            // Edição sem senha nova: mantém a senha que já está salva no banco
            if (aluno.getIdAluno() != null) {
                Aluno alunoExistente = buscarPorId(aluno.getIdAluno());
                aluno.setSenhaHash(alunoExistente.getSenhaHash());
            }
        } else if (!senha.startsWith("$2")) {
            // Senha nova digitada: criptografa
            // (se já começar com "$2", ela já é um hash BCrypt e não criptografa de novo)
            aluno.setSenhaHash(encoder.encode(senha));
        }

        return alunoRepository.save(aluno);
    }

    public void deletar(Integer id) {
        alunoRepository.deleteById(id);
    }
}