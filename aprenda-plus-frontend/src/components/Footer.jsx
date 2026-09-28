import logoBranco from '../assets/logo-aprenda-plus-branco.png';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-logo">
          <img src={logoBranco} alt="Aprenda Plus" className="logo-img footer-logo-img" />
        </div>
        <div className="contact-info">
          <h4>FALE CONOSCO</h4>
          <p>aprendaplus@gmail.com | (51) 0000-0000</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>Desenvolvido por: <strong>Alunos +Pra TI</strong></p>
      </div>
    </footer>
  );
}

export default Footer;