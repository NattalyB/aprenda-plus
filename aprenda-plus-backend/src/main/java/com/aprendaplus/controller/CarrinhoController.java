package com.aprendaplus.controller;

import com.aprendaplus.entity.Carrinho;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.CarrinhoRepository;
import com.aprendaplus.service.CarrinhoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/carrinhos")
public class CarrinhoController {

    @Autowired
    private CarrinhoService carrinhoService;

    @Autowired
    private CarrinhoRepository carrinhoRepository;

    @Autowired
    private AlunoRepository alunoRepository;

    // ===== Rota do aluno logado =====

    // Devolve o carrinho do aluno do token (cria um se ainda não existir)
    @GetMapping("/meu")
    public ResponseEntity<?> meuCarrinho(@RequestAttribute(name = "usuarioId", required = false) Integer usuarioId) {
        if (usuarioId == null) {
            return ResponseEntity.status(401).body(Map.of("erro", "Faça login para continuar."));
        }

        Carrinho carrinho = carrinhoRepository.findFirstByAluno_IdAluno(usuarioId)
                .orElseGet(() -> {
                    Carrinho novo = new Carrinho();
                    novo.setAluno(alunoRepository.getReferenceById(usuarioId));
                    return carrinhoRepository.save(novo);
                });

        return ResponseEntity.ok(Map.of(
                "idCarrinho", carrinho.getIdCarrinho(),
                "idAluno", usuarioId
        ));
    }

    // ===== Rotas do admin =====

    @GetMapping
    public List<Carrinho> listar() {
        return carrinhoService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Carrinho> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(carrinhoService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Carrinho> criar(@RequestBody Carrinho carrinho) {
        return ResponseEntity.ok(carrinhoService.salvar(carrinho));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        carrinhoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}