package com.aprendaplus.controller;

import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.service.InscricaoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/inscricoes")
public class InscricaoController {

    @Autowired
    private InscricaoService inscricaoService;

    @GetMapping
    public List<Inscricao> listar() {
        return inscricaoService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Inscricao> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(inscricaoService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<?> criar(
            @RequestBody Inscricao inscricao,
            @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId,
            @RequestAttribute(name = "usuarioPapel", required = false) String papel) {

        // Quando quem cria é um ALUNO (compra pelo site), os dados sensíveis
        // NÃO vêm do navegador:
        // - o aluno é sempre o do token (não dá pra se inscrever em nome de outro);
        // - a inscrição sempre nasce "pendente de pagamento";
        // - o valor é recalculado no servidor a partir do preço do curso.
        // Tudo isso fica no InscricaoService.criarInscricaoDoAluno.
        if ("ALUNO".equals(papel)) {
            if (usuarioId == null) {
                return ResponseEntity.status(401).body(Map.of("erro", "Faça login para continuar."));
            }
            return ResponseEntity.ok(inscricaoService.criarInscricaoDoAluno(inscricao, usuarioId));
        }

        // O admin continua podendo criar inscrições livremente pelo painel
        return ResponseEntity.ok(inscricaoService.salvar(inscricao));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Inscricao> atualizar(@PathVariable Integer id, @RequestBody Inscricao inscricao) {
        inscricao.setIdInscricao(id);
        return ResponseEntity.ok(inscricaoService.salvar(inscricao));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        inscricaoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
