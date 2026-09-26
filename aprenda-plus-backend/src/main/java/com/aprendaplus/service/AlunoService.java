package com.aprendaplus.service;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.repository.AlunoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

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
        // Só criptografa se a senha ainda não estiver criptografada
        // (evita criptografar de novo numa edição que não mexeu na senha)
        if (aluno.getSenhaHash() != null && !aluno.getSenhaHash().startsWith("$2a$")) {
            aluno.setSenhaHash(encoder.encode(aluno.getSenhaHash()));
        }
        return alunoRepository.save(aluno);
    }

    public void deletar(Integer id) {
        alunoRepository.deleteById(id);
    }
}