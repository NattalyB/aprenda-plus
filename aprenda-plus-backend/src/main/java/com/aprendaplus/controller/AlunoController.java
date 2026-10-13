package com.aprendaplus.controller;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.service.AlunoService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/alunos")
public class AlunoController {

    @Autowired
    private AlunoService alunoService;

    @GetMapping
    public List<Aluno> listar() {
        return alunoService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Aluno> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(alunoService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<?> criar(@Valid @RequestBody Aluno aluno) {
        // Na criação a senha é obrigatória
        if (aluno.getSenhaHash() == null || aluno.getSenhaHash().isBlank()) {
            Map<String, Object> resposta = new LinkedHashMap<>();
            resposta.put("mensagem", "Verifique os dados preenchidos.");
            resposta.put("erros", Map.of("senhaHash", "A senha é obrigatória."));
            return ResponseEntity.badRequest().body(resposta);
        }
        return ResponseEntity.ok(alunoService.salvar(aluno));
    }

    // Cadastro pelo site: os dados do aluno + o certificado de conclusão, numa requisição só.
    // Se o arquivo for inválido, o aluno nem chega a ser criado.
    @PostMapping(value = "/com-documento", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> cadastrarComDocumento(@Valid @RequestPart("aluno") Aluno aluno,
                                                   @RequestPart(name = "documento", required = false) MultipartFile documento)
            throws IOException {
        if (aluno.getSenhaHash() == null || aluno.getSenhaHash().isBlank()) {
            Map<String, Object> resposta = new LinkedHashMap<>();
            resposta.put("mensagem", "Verifique os dados preenchidos.");
            resposta.put("erros", Map.of("senhaHash", "A senha é obrigatória."));
            return ResponseEntity.badRequest().body(resposta);
        }
        aluno.setIdAluno(null);
        byte[] conteudo = documento == null ? null : documento.getBytes();
        String nome = documento == null ? null : documento.getOriginalFilename();
        return ResponseEntity.ok(alunoService.cadastrarComDocumento(aluno, nome, conteudo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Aluno> atualizar(@PathVariable Integer id, @Valid @RequestBody Aluno aluno) {
        aluno.setIdAluno(id);
        return ResponseEntity.ok(alunoService.salvar(aluno));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        alunoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}