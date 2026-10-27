package com.aprendaplus.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.LoginFuncionarioResponse;
import com.aprendaplus.entity.LoginRequest;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.ProfessorRepository;
import com.aprendaplus.security.JwtUtil;
import com.aprendaplus.security.StatusConta;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AlunoRepository alunoRepository;

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    @Autowired
    private ProfessorRepository professorRepository;

    @Autowired
    private JwtUtil jwtUtil;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Aluno aluno = alunoRepository.findByEmail(request.getEmail());

        if (aluno == null || !encoder.matches(request.getSenha(), aluno.getSenhaHash())) {
            return ResponseEntity.status(401).body(Map.of("erro", "E-mail ou senha inválidos"));
        }

        // Senha certa, mas conta inativa ou bloqueada: não entra (403 = acesso negado)
        String bloqueio = StatusConta.motivoDoBloqueio(aluno.getStatus());
        if (bloqueio != null) {
            return ResponseEntity.status(403).body(Map.of("erro", bloqueio));
        }

        String token = jwtUtil.gerarToken(aluno.getEmail(), aluno.getIdAluno(), "ALUNO");

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("idAluno", aluno.getIdAluno());
        response.put("nome", aluno.getNomeCompleto());

        return ResponseEntity.ok(response);
    }

    // Portal do Professor: e-mail do cadastro + senha criada pelo link de acesso
    @PostMapping("/login-professor")
    public ResponseEntity<?> loginProfessor(@RequestBody LoginRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        Professor professor = email.isEmpty() ? null : professorRepository.findFirstByEmailIgnoreCase(email);

        if (professor != null && professor.getSenhaHash() == null) {
            return ResponseEntity.status(401).body(Map.of("erro",
                    "Você ainda não criou sua senha. Use o link de acesso enviado pela secretaria ou clique em \"Esqueci minha senha\"."));
        }
        if (professor == null || request.getSenha() == null || !encoder.matches(request.getSenha(), professor.getSenhaHash())) {
            return ResponseEntity.status(401).body(Map.of("erro", "E-mail ou senha inválidos"));
        }

        String bloqueio = StatusConta.motivoDoBloqueio(professor.getStatus());
        if (bloqueio != null) {
            return ResponseEntity.status(403).body(Map.of("erro", bloqueio));
        }

        String token = jwtUtil.gerarToken(professor.getEmail(), professor.getIdProfessor(), "PROFESSOR");
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("idProfessor", professor.getIdProfessor());
        response.put("nome", professor.getNomeCompleto());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login-funcionario")
    public ResponseEntity<?> loginFuncionario(@RequestBody LoginRequest request) {
        Funcionario funcionario = funcionarioRepository.findByEmail(request.getEmail());

        if (funcionario == null || !encoder.matches(request.getSenha(), funcionario.getSenhaHash())) {
            return ResponseEntity.status(401).body(Map.of("erro", "E-mail ou senha inválidos"));
        }

        // Funcionário desligado ou bloqueado também não entra no painel
        String bloqueio = StatusConta.motivoDoBloqueio(funcionario.getStatus());
        if (bloqueio != null) {
            return ResponseEntity.status(403).body(Map.of("erro", bloqueio));
        }

        String token = jwtUtil.gerarToken(funcionario.getEmail(), funcionario.getIdFuncionario(), "ADMIN");
        return ResponseEntity.ok(new LoginFuncionarioResponse(
                token,
                funcionario.getIdFuncionario(),
                funcionario.getNomeCompleto(),
                funcionario.getCargo(),
                funcionario.getNivel()
        ));
    }
}