package com.aprendaplus.controller;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.LoginFuncionarioResponse;
import com.aprendaplus.entity.LoginRequest;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AlunoRepository alunoRepository;

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    @Autowired
    private JwtUtil jwtUtil;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Aluno aluno = alunoRepository.findByEmail(request.getEmail());

        if (aluno == null || !encoder.matches(request.getSenha(), aluno.getSenhaHash())) {
            return ResponseEntity.status(401).body(Map.of("erro", "E-mail ou senha inválidos"));
        }

        String token = jwtUtil.gerarToken(aluno.getEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("idAluno", aluno.getIdAluno());
        response.put("nome", aluno.getNomeCompleto());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login-funcionario")
    public ResponseEntity<?> loginFuncionario(@RequestBody LoginRequest request) {
        Funcionario funcionario = funcionarioRepository.findByEmail(request.getEmail());

        if (funcionario == null || !encoder.matches(request.getSenha(), funcionario.getSenhaHash())) {
            return ResponseEntity.status(401).body(Map.of("erro", "E-mail ou senha inválidos"));
        }

        String token = jwtUtil.gerarToken(funcionario.getEmail());
        return ResponseEntity.ok(new LoginFuncionarioResponse(
                token,
                funcionario.getIdFuncionario(),
                funcionario.getNomeCompleto(),
                funcionario.getCargo()
        ));
    }
}