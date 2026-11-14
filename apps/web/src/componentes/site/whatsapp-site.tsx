'use client';

// WhatsApp comercial do site de vendas (pedido do dono em 14/11): o número vem de /admin →
// Configurações; enquanto carrega (ou sem resposta), vale o padrão do Pente Fino. Vazio na
// administração tira o WhatsApp do site. O clique conta em "Visitantes da página de vendas".
import { lerContatoSite, linkWhatsapp, type ContatoSite } from '@pente-fino/shared';
import { cn } from '@pente-fino/ui';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { MENSAGEM_WHATSAPP } from '@/lib/contato';

function useLinkWhatsapp(): string | null {
  const contato = useQuery({
    queryKey: ['publico', 'contato'],
    queryFn: () => api<ContatoSite>('publico/contato'),
    staleTime: 10 * 60_000,
    retry: false,
  });
  return linkWhatsapp((contato.data ?? lerContatoSite(undefined)).whatsapp, MENSAGEM_WHATSAPP);
}

/** Link "WhatsApp" do rodapé. */
export function LinkWhatsappRodape() {
  const link = useLinkWhatsapp();
  if (!link) return null;
  return (
    <li>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-9 items-center text-tinta underline underline-offset-4"
      >
        WhatsApp
      </a>
    </li>
  );
}

/** Botão "Falar no WhatsApp" ao lado de "Criar conta", no fim da página de vendas. */
export function BotaoWhatsappSite({ className }: { className?: string }) {
  const link = useLinkWhatsapp();
  if (!link) return null;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex min-h-13 items-center justify-center gap-2 rounded-md border border-borda-forte px-5 text-lg font-semibold transition hover:bg-superficie-2',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco',
        className,
      )}
    >
      <MessageCircle aria-hidden className="size-5" /> Falar no WhatsApp
    </a>
  );
}
