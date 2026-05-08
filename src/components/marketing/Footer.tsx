import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-[oklch(0.16_0.03_45)] text-[oklch(0.92_0.02_80)]">
      <div className="container mx-auto grid gap-10 px-4 py-16 md:grid-cols-4 md:px-6">
        <div>
          <div className="font-display text-2xl font-bold text-[var(--gold)]">CAFÉ EX</div>
          <p className="mt-3 text-sm text-white/70">
            A nova vitrine digital dos cafés especiais latino-americanos. Origem, curadoria e torra fresca.
          </p>
        </div>
        <div>
          <h4 className="eyebrow !text-white/60">Comprar</h4>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li><Link to="/catalogo">Catálogo</Link></li>
            <li><Link to="/assinatura">Assinatura</Link></li>
            <li><Link to="/quiz">Quiz Sensorial</Link></li>
            <li><Link to="/produtores">Produtores</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="eyebrow !text-white/60">Para produtores</h4>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li><Link to="/vender-na-plataforma">Vender na Café EX</Link></li>
            <li><Link to="/blog">Guias e conteúdo</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="eyebrow !text-white/60">Café EX</h4>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li><Link to="/sobre">Sobre nós</Link></li>
            <li><Link to="/contato">Contato</Link></li>
            <li><Link to="/privacidade">Privacidade</Link></li>
            <li><Link to="/termos">Termos de uso</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Café EX · Cafés especiais com origem e curadoria
      </div>
    </footer>
  );
}
