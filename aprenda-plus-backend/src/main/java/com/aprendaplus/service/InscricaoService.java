package com.aprendaplus.service;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.entity.Turma;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.InscricaoRepository;
import com.aprendaplus.repository.TurmaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class InscricaoService {

    // Mesmo desconto usado no front (precoCurso.js): 5% no Pix
    public static final BigDecimal DESCONTO_PIX = new BigDecimal("0.05");

    // Encontra o número de parcelas em textos como "Cartão de crédito · 10x"
    private static final Pattern PARCELAS = Pattern.compile("(\\d{1,3})\\s*x");

    @Autowired
    private InscricaoRepository inscricaoRepository;

    @Autowired
    private TurmaRepository turmaRepository;

    public List<Inscricao> listarTodos() {
        return inscricaoRepository.findAll();
    }

    public Inscricao buscarPorId(Integer id) {
        return inscricaoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inscrição não encontrada com id: " + id));
    }

    // Usado pelo admin no painel: salva exatamente o que foi enviado
    public Inscricao salvar(Inscricao inscricao) {
        return inscricaoRepository.save(inscricao);
    }

    // Usado quando o ALUNO finaliza a compra no site.
    // Do que vem do navegador, só aproveitamos a turma, a forma de pagamento e as observações.
    // Aluno, status e principalmente o VALOR são definidos aqui no servidor,
    // a partir do preço do curso salvo no banco. Assim ninguém consegue
    // alterar o valor pelo navegador e pagar menos.
    @Transactional
    public Inscricao criarInscricaoDoAluno(Inscricao dados, Integer idAluno) {
        if (dados.getTurma() == null || dados.getTurma().getIdTurma() == null) {
            throw new RegraDeNegocioException("Informe a turma da inscrição.");
        }

        Turma turma = turmaRepository.findById(dados.getTurma().getIdTurma())
                .orElseThrow(() -> new RegraDeNegocioException("Turma não encontrada."));

        Curso curso = turma.getCurso();
        if (curso == null || curso.getValor() == null) {
            throw new RegraDeNegocioException("Não foi possível identificar o valor do curso desta turma.");
        }

        Pagamento pagamento = calcularPagamento(curso, dados.getFormaPagamento());

        Aluno aluno = new Aluno();
        aluno.setIdAluno(idAluno);

        // A inscrição aponta para a turma só pelo id (o JPA faz o vínculo no banco)
        Turma turmaDaInscricao = new Turma();
        turmaDaInscricao.setIdTurma(turma.getIdTurma());

        Inscricao inscricao = new Inscricao();
        inscricao.setAluno(aluno);
        inscricao.setTurma(turmaDaInscricao);
        inscricao.setStatus("pendente_pagamento");
        inscricao.setFormaPagamento(pagamento.descricao());
        inscricao.setValorTotal(pagamento.valor());
        inscricao.setObservacoes(dados.getObservacoes());

        return inscricaoRepository.save(inscricao);
    }

    public void deletar(Integer id) {
        inscricaoRepository.deleteById(id);
    }

    // ===== Cálculo do pagamento =====

    // Resultado do cálculo: o texto salvo na inscrição e o valor final
    record Pagamento(String descricao, BigDecimal valor) {}

    Pagamento calcularPagamento(Curso curso, String formaPagamento) {
        String forma = normalizar(formaPagamento);
        BigDecimal valorCurso = curso.getValor().setScale(2, RoundingMode.HALF_UP);

        if (forma.startsWith("pix")) {
            BigDecimal comDesconto = valorCurso
                    .multiply(BigDecimal.ONE.subtract(DESCONTO_PIX))
                    .setScale(2, RoundingMode.HALF_UP);
            int percentual = DESCONTO_PIX.multiply(new BigDecimal(100)).intValue();
            return new Pagamento("Pix à vista (" + percentual + "% de desconto)", comDesconto);
        }

        boolean cartao = forma.startsWith("cartao");
        boolean boleto = forma.startsWith("boleto");
        if (!cartao && !boleto) {
            throw new RegraDeNegocioException("Escolha uma forma de pagamento válida: Pix, cartão ou boleto.");
        }

        int parcelas = lerParcelas(forma);
        int maximo = maximoDeParcelas(curso);
        if (parcelas < 1 || parcelas > maximo) {
            throw new RegraDeNegocioException(
                    "O curso \"" + curso.getNome() + "\" pode ser pago em no máximo " + maximo + "x.");
        }

        String nome = cartao ? "Cartão de crédito" : "Boleto bancário";
        return new Pagamento(nome + " · " + parcelas + "x", valorCurso);
    }

    // Sem número de parcelas no texto, considera pagamento à vista (1x)
    private int lerParcelas(String forma) {
        Matcher m = PARCELAS.matcher(forma);
        return m.find() ? Integer.parseInt(m.group(1)) : 1;
    }

    // Curso sem limite cadastrado só pode ser pago à vista
    private int maximoDeParcelas(Curso curso) {
        Integer limite = curso.getNumeroParcelas();
        return (limite == null || limite < 1) ? 1 : limite;
    }

    // "Cartão de Crédito" -> "cartao de credito" (sem acentos, minúsculo, sem espaços nas pontas)
    private String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        String semAcento = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return semAcento.trim().toLowerCase();
    }
}
