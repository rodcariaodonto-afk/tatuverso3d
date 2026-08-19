import { Link } from "@tanstack/react-router";
import { tenantConfig } from "@/lib/tenant-config";
import logoAsset from "@/assets/tatuverso3d-logo.png.asset.json";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-brand-dark text-[oklch(0.95_0.01_265)]">
      <div className="container mx-auto grid gap-10 px-4 py-16 md:grid-cols-4 md:px-6">
        <div>
          <div className="inline-flex rounded-2xl bg-white/95 p-3">
            <img
              src={tenantConfig.logoUrl ?? logoAsset.url}
              alt={`Logotipo ${tenantConfig.name}`}
              className="h-16 w-auto"
            />
          </div>
          <p className="mt-4 text-sm font-semibold text-white/85">{tenantConfig.tagline}</p>
          <p className="mt-2 text-sm leading-relaxed text-white/65">{tenantConfig.description}</p>
          <div className="mt-4 flex gap-4 text-sm text-white/80">
            <a href={tenantConfig.instagram} target="_blank" rel="noreferrer" className="hover:text-white">
              Instagram
            </a>
            <a href={tenantConfig.tiktok} target="_blank" rel="noreferrer" className="hover:text-white">
              TikTok
            </a>
          </div>
        </div>
        <div>
          <h4 className="eyebrow !text-white/60">Comprar</h4>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li><Link to="/catalogo" search={{ q: "" } as never}>Loja</Link></li>
            <li><Link to="/catalogo" search={{ q: "sensorial" } as never}>Sensoriais</Link></li>
            <li><Link to="/catalogo" search={{ q: "decoração" } as never}>Decoração e Utilidades</Link></li>
            <li><Link to="/catalogo" search={{ q: "presente" } as never}>Presentes</Link></li>
            <li><Link to="/catalogo" search={{ q: "colecionável" } as never}>Colecionáveis</Link></li>
            <li><Link to="/personalizados">Personalizados</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="eyebrow !text-white/60">Atendimento</h4>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li><Link to="/contato">Fale conosco</Link></li>
            <li><Link to="/faq">Perguntas frequentes</Link></li>
            <li><Link to="/faq" hash="prazos">Prazos de produção</Link></li>
            <li><Link to="/envios">Envios e entregas</Link></li>
            <li><Link to="/trocas">Trocas e devoluções</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="eyebrow !text-white/60">{tenantConfig.name}</h4>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li><Link to="/sobre">Sobre nós</Link></li>
            <li><Link to="/privacidade">Privacidade</Link></li>
            <li><Link to="/termos">Termos de uso</Link></li>
            <li><Link to="/termos" hash="seguranca">Segurança</Link></li>
            <li><Link to="/cuidados">Cuidados com os produtos</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/50">
        © {new Date().getFullYear()} {tenantConfig.name}. Todos os direitos reservados.
      </div>
    </footer>
  );
}
