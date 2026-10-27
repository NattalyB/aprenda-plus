package com.aprendaplus.service;

import com.aprendaplus.entity.Treinamento;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.TreinamentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

// Treinamentos do painel: vídeos e PDFs que ensinam a equipe a usar o sistema.
// Todo funcionário do painel consulta; só o Master cadastra, edita e exclui (regra no AuthInterceptor).
@Service
public class TreinamentoService {

    public static final int TAMANHO_MAXIMO_PDF = 5 * 1024 * 1024;
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    @Autowired
    private TreinamentoRepository treinamentoRepository;

    // Dados do formulário (o PDF é opcional; removerPdf apaga o que já estava salvo)
    public record Dados(String titulo, String descricao, String videoUrl, Integer ordem,
                        String pdfNome, byte[] pdf, boolean removerPdf) {
    }

    public List<Treinamento> listar() {
        return treinamentoRepository.findAllByOrderByOrdemAscIdTreinamentoAsc();
    }

    @Transactional
    public Treinamento criar(Dados dados) {
        Treinamento treinamento = new Treinamento();
        treinamento.setCriadoEm(LocalDateTime.now(FUSO));
        preencher(treinamento, dados);
        return treinamentoRepository.save(treinamento);
    }

    @Transactional
    public Treinamento atualizar(Integer id, Dados dados) {
        Treinamento treinamento = buscar(id);
        preencher(treinamento, dados);
        return treinamentoRepository.save(treinamento);
    }

    @Transactional
    public void excluir(Integer id) {
        treinamentoRepository.delete(buscar(id));
    }

    public Treinamento pdf(Integer id) {
        Treinamento treinamento = buscar(id);
        if (!treinamento.isTemPdf() || treinamento.getPdfConteudo() == null) {
            throw new RegraDeNegocioException("Este treinamento não tem PDF.");
        }
        return treinamento;
    }

    private void preencher(Treinamento treinamento, Dados dados) {
        if (dados == null) {
            throw new RegraDeNegocioException("Informe os dados do treinamento.");
        }
        String titulo = texto(dados.titulo());
        if (titulo == null) {
            throw new RegraDeNegocioException("Informe o título do treinamento.");
        }
        if (titulo.length() > 150) {
            throw new RegraDeNegocioException("O título pode ter no máximo 150 caracteres.");
        }
        String descricao = texto(dados.descricao());
        if (descricao != null && descricao.length() > 5000) {
            throw new RegraDeNegocioException("A descrição pode ter no máximo 5000 caracteres.");
        }

        String video = texto(dados.videoUrl());
        if (video != null) {
            String idVideo = ConteudoEadService.idDoYoutube(video);
            if (idVideo == null) {
                throw new RegraDeNegocioException("Use um link de vídeo do YouTube (ex.: https://www.youtube.com/watch?v=...).");
            }
            video = "https://www.youtube.com/watch?v=" + idVideo;
        }

        boolean pdfNovo = dados.pdf() != null && dados.pdf().length > 0;
        if (pdfNovo) {
            if (dados.pdf().length > TAMANHO_MAXIMO_PDF) {
                throw new RegraDeNegocioException("O PDF pode ter no máximo 5 MB.");
            }
            if (!"application/pdf".equals(DocumentoService.tipoPeloConteudo(dados.pdf()))) {
                throw new RegraDeNegocioException("O arquivo precisa ser um PDF.");
            }
        }

        boolean ficaSemPdf = !pdfNovo && (dados.removerPdf() || !treinamento.isTemPdf());
        if (video == null && ficaSemPdf) {
            throw new RegraDeNegocioException("Coloque o link de um vídeo do YouTube, anexe um PDF, ou os dois.");
        }

        treinamento.setTitulo(titulo);
        treinamento.setDescricao(descricao);
        treinamento.setVideoUrl(video);
        treinamento.setOrdem(dados.ordem() == null ? 0 : dados.ordem());
        if (pdfNovo) {
            treinamento.setPdfNome(DocumentoService.limparNome(dados.pdfNome(), "application/pdf"));
            treinamento.setPdfTamanho(dados.pdf().length);
            treinamento.setPdfConteudo(dados.pdf());
        } else if (dados.removerPdf()) {
            treinamento.setPdfNome(null);
            treinamento.setPdfTamanho(null);
            treinamento.setPdfConteudo(null);
        }
        treinamento.setAtualizadoEm(LocalDateTime.now(FUSO));
    }

    private Treinamento buscar(Integer id) {
        return treinamentoRepository.findById(id)
                .orElseThrow(() -> new RegraDeNegocioException("Treinamento não encontrado."));
    }

    private static String texto(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
