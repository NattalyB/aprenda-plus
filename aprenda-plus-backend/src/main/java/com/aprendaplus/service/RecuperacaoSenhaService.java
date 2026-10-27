package com.aprendaplus.service;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.entity.RedefinicaoSenha;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.ProfessorRepository;
import com.aprendaplus.repository.RedefinicaoSenhaRepository;
import com.aprendaplus.security.StatusConta;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.HexFormat;

// "Esqueci minha senha" para alunos, professores e funcionários do painel,
// e o link de primeiro acesso do Portal do Professor (enviado pela secretaria).
// - O link vale por 1 hora e só pode ser usado uma vez.
// - No banco fica só o hash do código: quem visse a tabela não conseguiria usar os links.
// - A resposta é sempre a mesma, exista ou não o e-mail (assim ninguém descobre quem tem conta).
@Service
public class RecuperacaoSenhaService {

    public static final String ALUNO = "aluno";
    public static final String FUNCIONARIO = "funcionario";
    public static final String PROFESSOR = "professor";
    static final Duration VALIDADE = Duration.ofHours(1);
    static final Duration VALIDADE_PRIMEIRO_ACESSO = Duration.ofDays(7);
    static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    static final String LINK_INVALIDO = "Este link não é mais válido. Peça um novo em \"Esqueci minha senha\".";

    private static final SecureRandom SORTEIO = new SecureRandom();
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Autowired
    private RedefinicaoSenhaRepository redefinicaoRepository;

    @Autowired
    private AlunoRepository alunoRepository;

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    @Autowired
    private ProfessorRepository professorRepository;

    @Autowired
    private EmailService emailService;

    // Link para o professor criar a senha do portal. Devolve o link (o painel mostra para copiar,
    // caso o e-mail não chegue) e se o e-mail foi enviado.
    public record AcessoProfessor(String link, boolean emailEnviado, String email) {
    }

    @Transactional
    public AcessoProfessor enviarAcessoProfessor(Integer idProfessor) {
        Professor professor = professorRepository.findById(idProfessor)
                .orElseThrow(() -> new RegraDeNegocioException("Professor não encontrado."));
        if (StatusConta.motivoDoBloqueio(professor.getStatus()) != null) {
            throw new RegraDeNegocioException("Ative o cadastro do professor antes de enviar o acesso.");
        }
        if (professor.getEmail() == null || professor.getEmail().isBlank()) {
            throw new RegraDeNegocioException("Cadastre o e-mail do professor antes de enviar o acesso.");
        }
        LocalDateTime agora = LocalDateTime.now(FUSO);
        String codigo = novoPedido(PROFESSOR, professor.getIdProfessor(), agora, VALIDADE_PRIMEIRO_ACESSO);
        String link = emailService.linkDoSite("#/redefinir-senha?token=" + codigo);
        emailService.acessoProfessor(professor.getEmail(), professor.getNomeCompleto(), link);
        return new AcessoProfessor(link, emailService.configurado(), professor.getEmail());
    }

    // Invalida os links abertos da pessoa e cria um novo. Devolve o código (só ele abre o link).
    private String novoPedido(String tipo, Integer id, LocalDateTime agora, Duration validade) {
        invalidarLinksAbertos(tipo, id, agora);
        String codigo = novoCodigo();
        RedefinicaoSenha pedido = new RedefinicaoSenha();
        pedido.setTipo(tipo);
        pedido.setUsuarioId(id);
        pedido.setTokenHash(hash(codigo));
        pedido.setCriadoEm(agora);
        pedido.setExpiraEm(agora.plus(validade));
        redefinicaoRepository.save(pedido);
        return codigo;
    }

    @Transactional
    public void solicitar(String email, String tipo) {
        String limpo = email == null ? "" : email.trim();
        if (limpo.isEmpty()) {
            throw new RegraDeNegocioException("Informe o seu e-mail.");
        }
        String quem = tipoValido(tipo);

        Integer id;
        String nome;
        String caminho;
        if (FUNCIONARIO.equals(quem)) {
            Funcionario funcionario = funcionarioRepository.findByEmail(limpo);
            if (funcionario == null || StatusConta.motivoDoBloqueio(funcionario.getStatus()) != null) {
                return;
            }
            id = funcionario.getIdFuncionario();
            nome = funcionario.getNomeCompleto();
            caminho = "#/admin/redefinir-senha?token=";
        } else if (PROFESSOR.equals(quem)) {
            Professor professor = professorRepository.findFirstByEmailIgnoreCase(limpo);
            if (professor == null || StatusConta.motivoDoBloqueio(professor.getStatus()) != null) {
                return;
            }
            id = professor.getIdProfessor();
            nome = professor.getNomeCompleto();
            caminho = "#/redefinir-senha?token=";
        } else {
            Aluno aluno = alunoRepository.findByEmail(limpo);
            if (aluno == null || StatusConta.motivoDoBloqueio(aluno.getStatus()) != null) {
                return;
            }
            id = aluno.getIdAluno();
            nome = aluno.getNomeCompleto();
            caminho = "#/redefinir-senha?token=";
        }

        LocalDateTime agora = LocalDateTime.now(FUSO);
        String codigo = novoPedido(quem, id, agora, VALIDADE);

        emailService.redefinirSenha(limpo, nome, emailService.linkDoSite(caminho + codigo));
    }

    // Troca a senha. Devolve "aluno", "professor" ou "funcionario" para a tela saber para qual login mandar.
    @Transactional
    public String redefinir(String codigo, String novaSenha) {
        if (novaSenha == null || novaSenha.isBlank()) {
            throw new RegraDeNegocioException("Digite a nova senha.");
        }
        if (novaSenha.length() < 6) {
            throw new RegraDeNegocioException("A nova senha deve ter pelo menos 6 caracteres.");
        }
        if (codigo == null || codigo.isBlank()) {
            throw new RegraDeNegocioException(LINK_INVALIDO);
        }

        LocalDateTime agora = LocalDateTime.now(FUSO);
        RedefinicaoSenha pedido = redefinicaoRepository.findFirstByTokenHash(hash(codigo.trim()))
                .filter(p -> p.getUsadoEm() == null && p.getExpiraEm() != null && p.getExpiraEm().isAfter(agora))
                .orElseThrow(() -> new RegraDeNegocioException(LINK_INVALIDO));

        String senhaCriptografada = encoder.encode(novaSenha);
        if (FUNCIONARIO.equals(pedido.getTipo())) {
            Funcionario funcionario = funcionarioRepository.findById(pedido.getUsuarioId())
                    .orElseThrow(() -> new RegraDeNegocioException(LINK_INVALIDO));
            funcionario.setSenhaHash(senhaCriptografada);
            funcionarioRepository.save(funcionario);
        } else if (PROFESSOR.equals(pedido.getTipo())) {
            Professor professor = professorRepository.findById(pedido.getUsuarioId())
                    .orElseThrow(() -> new RegraDeNegocioException(LINK_INVALIDO));
            professor.setSenhaHash(senhaCriptografada);
            professorRepository.save(professor);
        } else {
            Aluno aluno = alunoRepository.findById(pedido.getUsuarioId())
                    .orElseThrow(() -> new RegraDeNegocioException(LINK_INVALIDO));
            aluno.setSenhaHash(senhaCriptografada);
            alunoRepository.save(aluno);
        }

        invalidarLinksAbertos(pedido.getTipo(), pedido.getUsuarioId(), agora);
        pedido.setUsadoEm(agora);
        redefinicaoRepository.save(pedido);
        return pedido.getTipo();
    }

    static String tipoValido(String tipo) {
        String t = tipo == null ? "" : tipo.trim();
        if (FUNCIONARIO.equalsIgnoreCase(t)) return FUNCIONARIO;
        if (PROFESSOR.equalsIgnoreCase(t)) return PROFESSOR;
        return ALUNO;
    }

    // 32 bytes aleatórios em texto seguro para URL (43 caracteres)
    static String novoCodigo() {
        byte[] bytes = new byte[32];
        SORTEIO.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String codigo) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(sha.digest(codigo.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private void invalidarLinksAbertos(String tipo, Integer id, LocalDateTime agora) {
        for (RedefinicaoSenha aberto : redefinicaoRepository.findByTipoAndUsuarioIdAndUsadoEmIsNull(tipo, id)) {
            aberto.setUsadoEm(agora);
            redefinicaoRepository.save(aberto);
        }
    }
}
