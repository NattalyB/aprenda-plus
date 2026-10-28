package com.aprendaplus.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.repository.AlunoRepository;

@Service
public class AlunoService {

    @Autowired
    private AlunoRepository alunoRepository;

    @Autowired
    private DocumentoService documentoService;

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
        Aluno alunoExistente = null;

        if (senhaVazia) {
            // Edição sem senha nova: mantém a senha que já está salva no banco
            if (aluno.getIdAluno() != null) {
                alunoExistente = buscarPorId(aluno.getIdAluno());
                aluno.setSenhaHash(alunoExistente.getSenhaHash());
            }
        } else if (!senha.startsWith("$2")) {
            // Senha nova digitada: criptografa
            // (se já começar com "$2", ela já é um hash BCrypt e não criptografa de novo)
            aluno.setSenhaHash(encoder.encode(senha));
        }

        // Consentimento para ofertas (Comercial): se o pedido não informou, mantém o que já estava salvo.
        // Cadastro novo sem resposta conta como "não aceitou".
        if (aluno.getAceitaMarketing() == null) {
            if (alunoExistente == null && aluno.getIdAluno() != null) {
                alunoExistente = alunoRepository.findById(aluno.getIdAluno()).orElse(null);
            }
            aluno.setAceitaMarketing(alunoExistente != null && Boolean.TRUE.equals(alunoExistente.getAceitaMarketing()));
        }

        return alunoRepository.save(aluno);
    }

    // Cadastro pelo site com o certificado de conclusão (pré-requisito da matrícula).
    // O arquivo é conferido ANTES de criar o aluno; tudo é gravado junto ou nada é gravado.
    @Transactional
    public Aluno cadastrarComDocumento(Aluno aluno, String nomeArquivo, byte[] conteudo) {
        documentoService.validarArquivo(nomeArquivo, conteudo);
        Aluno salvo = salvar(aluno);
        documentoService.salvar(salvo.getIdAluno(), nomeArquivo, conteudo);
        return salvo;
    }

    public void deletar(Integer id) {
        alunoRepository.deleteById(id);
    }
}