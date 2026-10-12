package com.aprendaplus.service;

import com.aprendaplus.dto.MinhaInscricao;
import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.entity.Turma;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.entity.ItemCarrinho;
import com.aprendaplus.repository.CarrinhoRepository;
import com.aprendaplus.repository.InscricaoRepository;
import com.aprendaplus.repository.ItemCarrinhoRepository;
import com.aprendaplus.repository.TurmaRepository;
import com.aprendaplus.security.StatusConta;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class InscricaoService {

    // Mesmo desconto usado no front (precoCurso.js): 5% no Pix
    public static final BigDecimal DESCONTO_PIX = new BigDecimal("0.05");

    // Situações em que o aluno ainda pode trocar de turma
    private static final Set<String> STATUS_QUE_PERMITEM_TROCA =
            Set.of("pendente_pagamento", "confirmada", "aguardando_vaga");

    // Encontra o número de parcelas em textos como "Cartão de crédito · 10x"
    private static final Pattern PARCELAS = Pattern.compile("(\\d{1,3})\\s*x");

    @Autowired
    private InscricaoRepository inscricaoRepository;

    @Autowired
    private TurmaRepository turmaRepository;

    @Autowired
    private AlunoRepository alunoRepository;

    @Autowired
    private CarrinhoRepository carrinhoRepository;

    @Autowired
    private ItemCarrinhoRepository itemCarrinhoRepository;

    @Autowired
    private TurmaService turmaService;

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
        // Aluno inativo ou bloqueado não pode comprar, mesmo que ainda esteja logado
        alunoRepository.findById(idAluno).ifPresent(aluno -> {
            String bloqueio = StatusConta.motivoDoBloqueio(aluno.getStatus());
            if (bloqueio != null) {
                throw new RegraDeNegocioException(bloqueio);
            }
        });

        if (dados.getTurma() == null || dados.getTurma().getIdTurma() == null) {
            throw new RegraDeNegocioException("Informe a turma da inscrição.");
        }

        Turma turma = turmaRepository.findById(dados.getTurma().getIdTurma())
                .orElseThrow(() -> new RegraDeNegocioException("Turma não encontrada."));

        Curso curso = turma.getCurso();
        if (curso == null || curso.getValor() == null) {
            throw new RegraDeNegocioException("Não foi possível identificar o valor do curso desta turma.");
        }

        conferirSeTurmaAceitaInscricao(turma);

        // Não deixa o aluno se inscrever duas vezes no mesmo curso
        boolean jaInscrito = inscricaoRepository.findByAluno_IdAlunoOrderByIdInscricaoDesc(idAluno).stream()
                .filter(existente -> !"cancelada".equals(existente.getStatus()))
                .anyMatch(existente -> existente.getTurma() != null
                        && existente.getTurma().getCurso() != null
                        && curso.getIdCurso() != null
                        && curso.getIdCurso().equals(existente.getTurma().getCurso().getIdCurso()));
        if (jaInscrito) {
            throw new RegraDeNegocioException("Você já tem uma inscrição no curso \"" + curso.getNome()
                    + "\". Para mudar de turma, use \"Minhas inscrições\".");
        }

        // Quem compra vários cursos juntos pode parcelar até o MAIOR limite entre eles
        int maximoDoPedido = Math.max(maximoDeParcelas(curso), maximoDoCarrinho(idAluno));
        Pagamento pagamento = calcularPagamento(curso, dados.getFormaPagamento(), maximoDoPedido);

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

    // ===== Área do aluno =====

    @Transactional(readOnly = true)
    public List<MinhaInscricao> listarDoAluno(Integer idAluno) {
        return inscricaoRepository.findByAluno_IdAlunoOrderByIdInscricaoDesc(idAluno).stream()
                .map(this::paraMinhaInscricao)
                .toList();
    }

    // Troca a turma de uma inscrição por outra turma aberta, com vaga, do mesmo curso.
    // idAluno = null quando quem troca é o admin (pode trocar a de qualquer aluno).
    @Transactional
    public MinhaInscricao trocarTurma(Integer idInscricao, Integer idNovaTurma, Integer idAluno) {
        Inscricao inscricao = inscricaoRepository.findById(idInscricao)
                .orElseThrow(() -> new RegraDeNegocioException("Inscrição não encontrada."));

        if (idAluno != null && (inscricao.getAluno() == null || !idAluno.equals(inscricao.getAluno().getIdAluno()))) {
            // Não conta ao aluno que a inscrição de outra pessoa existe
            throw new RegraDeNegocioException("Inscrição não encontrada.");
        }
        if (!STATUS_QUE_PERMITEM_TROCA.contains(inscricao.getStatus())) {
            throw new RegraDeNegocioException("Esta inscrição não permite mais troca de turma.");
        }
        if (idNovaTurma == null) {
            throw new RegraDeNegocioException("Escolha a nova turma.");
        }

        Turma atual = inscricao.getTurma();
        if (atual != null && idNovaTurma.equals(atual.getIdTurma())) {
            throw new RegraDeNegocioException("Você já está nesta turma.");
        }

        Turma nova = turmaRepository.findById(idNovaTurma)
                .orElseThrow(() -> new RegraDeNegocioException("Turma não encontrada."));

        Integer cursoAtual = atual == null || atual.getCurso() == null ? null : atual.getCurso().getIdCurso();
        Integer cursoNovo = nova.getCurso() == null ? null : nova.getCurso().getIdCurso();
        if (cursoAtual == null || !cursoAtual.equals(cursoNovo)) {
            throw new RegraDeNegocioException("A nova turma precisa ser do mesmo curso da inscrição.");
        }

        conferirSeTurmaAceitaInscricao(nova);

        inscricao.setTurma(nova);
        return paraMinhaInscricao(inscricaoRepository.save(inscricao));
    }

    // Turma precisa estar com inscrições abertas e ter vaga
    private void conferirSeTurmaAceitaInscricao(Turma turma) {
        if (!TurmaService.INSCRICOES_ABERTAS.equals(turma.getStatus())) {
            throw new RegraDeNegocioException("As inscrições da turma \"" + turma.getNome() + "\" estão encerradas.");
        }
        if (turmaService.vagasRestantes(turma) <= 0) {
            throw new RegraDeNegocioException("A turma \"" + turma.getNome() + "\" não tem mais vagas.");
        }
    }

    private MinhaInscricao paraMinhaInscricao(Inscricao inscricao) {
        Turma turma = inscricao.getTurma();
        Curso curso = turma == null ? null : turma.getCurso();
        return new MinhaInscricao(
                inscricao.getIdInscricao(),
                curso == null ? null : curso.getIdCurso(),
                curso == null ? null : curso.getNome(),
                turma == null ? null : turma.getIdTurma(),
                turma == null ? null : turma.getNome(),
                turma == null ? null : turma.getModalidade(),
                turma == null ? null : turma.getDiasHorarios(),
                inscricao.getStatus(),
                inscricao.getFormaPagamento(),
                inscricao.getValorTotal(),
                inscricao.getDataInscricao(),
                STATUS_QUE_PERMITEM_TROCA.contains(inscricao.getStatus()));
    }

    // ===== Cálculo do pagamento =====

    // Resultado do cálculo: o texto salvo na inscrição e o valor final
    record Pagamento(String descricao, BigDecimal valor) {}

    Pagamento calcularPagamento(Curso curso, String formaPagamento, int maximo) {
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
        if (parcelas < 1 || parcelas > maximo) {
            throw new RegraDeNegocioException("Este pedido pode ser parcelado em no máximo " + maximo + "x.");
        }

        String nome = cartao ? "Cartão de crédito" : "Boleto bancário";
        return new Pagamento(nome + " · " + parcelas + "x", valorCurso);
    }

    // Sem número de parcelas no texto, considera pagamento à vista (1x)
    private int lerParcelas(String forma) {
        Matcher m = PARCELAS.matcher(forma);
        return m.find() ? Integer.parseInt(m.group(1)) : 1;
    }

    // Maior limite de parcelas entre os cursos que estão no carrinho do aluno
    // (o carrinho só é esvaziado depois que todas as inscrições são criadas)
    private int maximoDoCarrinho(Integer idAluno) {
        return carrinhoRepository.findFirstByAluno_IdAluno(idAluno)
                .map(carrinho -> itemCarrinhoRepository.findByCarrinho_IdCarrinho(carrinho.getIdCarrinho()))
                .orElse(List.of())
                .stream()
                .map(ItemCarrinho::getCurso)
                .filter(cursoDoItem -> cursoDoItem != null)
                .mapToInt(this::maximoDeParcelas)
                .max()
                .orElse(1);
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
