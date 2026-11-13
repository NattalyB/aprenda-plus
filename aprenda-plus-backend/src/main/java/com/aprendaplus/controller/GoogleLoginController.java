package com.aprendaplus.controller;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.ProfessorRepository;
import com.aprendaplus.security.JwtUtil;
import com.aprendaplus.security.StatusConta;
import com.aprendaplus.service.AlunoService;
import com.aprendaplus.service.GoogleAuthService;
import com.aprendaplus.service.GoogleAuthService.UsuarioGoogle;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.validation.Valid;

// Entrar com o Google (site e Portal do Professor).
// - Aluno que já tem conta com o mesmo e-mail: entra direto.
// - Aluno novo: recebe um passe de 30 minutos e completa o cadastro (CPF, telefone, endereço...).
// - Professor: entra se o e-mail do Google for o mesmo do cadastro feito pela secretaria.
@RestController
@RequestMapping("/auth/google")
public class GoogleLoginController {

    static final String PASSE_INVALIDO = "O tempo para completar o cadastro acabou. Clique de novo em \"Continuar com o Google\".";
    static final String JA_CADASTRADO = "Este e-mail já tem cadastro. Entre pela tela de login.";
    static final String PROFESSOR_NAO_ENCONTRADO =
            "Não encontramos um professor com este e-mail do Google. Peça para a secretaria conferir o e-mail do seu cadastro.";

    private final GoogleAuthService google;
    private final AlunoRepository alunoRepository;
    private final ProfessorRepository professorRepository;
    private final AlunoService alunoService;
    private final JwtUtil jwtUtil;

    public GoogleLoginController(GoogleAuthService google, AlunoRepository alunoRepository,
                                 ProfessorRepository professorRepository, AlunoService alunoService, JwtUtil jwtUtil) {
        this.google = google;
        this.alunoRepository = alunoRepository;
        this.professorRepository = professorRepository;
        this.alunoService = alunoService;
        this.jwtUtil = jwtUtil;
    }

    public record Credencial(String credencial) { }

    // O front pergunta se o botão do Google deve aparecer e qual ID de cliente usar
    @GetMapping("/config")
    public Map<String, Object> config() {
        Map<String, Object> config = new HashMap<>();
        config.put("ativo", google.configurado());
        config.put("idCliente", google.idCliente());
        return config;
    }

    @PostMapping("/aluno")
    public ResponseEntity<?> aluno(@RequestBody Credencial pedido) {
        UsuarioGoogle usuario;
        try {
            usuario = google.verificar(pedido == null ? null : pedido.credencial());
        } catch (RegraDeNegocioException e) {
            return ResponseEntity.status(401).body(Map.of("erro", e.getMessage()));
        }

        Aluno aluno = alunoRepository.findFirstByEmailIgnoreCase(usuario.email());
        if (aluno == null) {
            Map<String, Object> pendente = new HashMap<>();
            pendente.put("cadastroPendente", true);
            pendente.put("tokenCadastro", jwtUtil.gerarTokenCadastroGoogle(usuario.email(), usuario.nome()));
            pendente.put("email", usuario.email());
            pendente.put("nome", usuario.nome());
            return ResponseEntity.ok(pendente);
        }

        String bloqueio = StatusConta.motivoDoBloqueio(aluno.getStatus());
        if (bloqueio != null) {
            return ResponseEntity.status(403).body(Map.of("erro", bloqueio));
        }
        return ResponseEntity.ok(sessaoDoAluno(aluno));
    }

    // Completa o cadastro de quem entrou com o Google pela primeira vez.
    // O e-mail vem do passe (confirmado pelo Google), nunca do formulário.
    @PostMapping(value = "/cadastro", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> cadastro(@RequestParam("tokenCadastro") String tokenCadastro,
                                      @Valid @RequestPart("aluno") Aluno aluno,
                                      @RequestPart(name = "documento", required = false) MultipartFile documento)
            throws IOException {
        Claims passe;
        try {
            passe = jwtUtil.validarToken(tokenCadastro);
        } catch (JwtException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("mensagem", PASSE_INVALIDO));
        }
        if (!JwtUtil.PAPEL_CADASTRO_GOOGLE.equals(passe.get("papel", String.class)) || passe.getSubject() == null) {
            return ResponseEntity.badRequest().body(Map.of("mensagem", PASSE_INVALIDO));
        }

        String email = passe.getSubject();
        if (alunoRepository.existsByEmailIgnoreCase(email)) {
            return ResponseEntity.badRequest().body(Map.of("mensagem", JA_CADASTRADO));
        }

        aluno.setIdAluno(null);
        aluno.setEmail(email);
        // Quem entra pelo Google não precisa de senha. Uma senha aleatória (que ninguém conhece) ocupa o lugar;
        // se um dia quiser entrar com e-mail e senha, usa o "Esqueci minha senha".
        aluno.setSenhaHash(UUID.randomUUID().toString() + UUID.randomUUID());
        byte[] conteudo = documento == null ? null : documento.getBytes();
        String nome = documento == null ? null : documento.getOriginalFilename();
        Aluno salvo = alunoService.cadastrarComDocumento(aluno, nome, conteudo);
        return ResponseEntity.ok(sessaoDoAluno(salvo));
    }

    @PostMapping("/professor")
    public ResponseEntity<?> professor(@RequestBody Credencial pedido) {
        UsuarioGoogle usuario;
        try {
            usuario = google.verificar(pedido == null ? null : pedido.credencial());
        } catch (RegraDeNegocioException e) {
            return ResponseEntity.status(401).body(Map.of("erro", e.getMessage()));
        }

        Professor professor = professorRepository.findFirstByEmailIgnoreCase(usuario.email());
        if (professor == null) {
            return ResponseEntity.status(401).body(Map.of("erro", PROFESSOR_NAO_ENCONTRADO));
        }
        String bloqueio = StatusConta.motivoDoBloqueio(professor.getStatus());
        if (bloqueio != null) {
            return ResponseEntity.status(403).body(Map.of("erro", bloqueio));
        }

        Map<String, Object> resposta = new HashMap<>();
        resposta.put("token", jwtUtil.gerarToken(professor.getEmail(), professor.getIdProfessor(), "PROFESSOR"));
        resposta.put("idProfessor", professor.getIdProfessor());
        resposta.put("nome", professor.getNomeCompleto());
        return ResponseEntity.ok(resposta);
    }

    // Mesma resposta do login com e-mail e senha (/auth/login)
    private Map<String, Object> sessaoDoAluno(Aluno aluno) {
        Map<String, Object> resposta = new HashMap<>();
        resposta.put("token", jwtUtil.gerarToken(aluno.getEmail(), aluno.getIdAluno(), "ALUNO"));
        resposta.put("idAluno", aluno.getIdAluno());
        resposta.put("nome", aluno.getNomeCompleto());
        return resposta;
    }
}
