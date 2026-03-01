import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface WhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteNome: string;
  clienteTelefone: string;
  numeroOrcamento: string;
  validade: string | null;
  valorTotal: number;
  agenciaNome: string;
  onSend: (telefone: string, mensagem: string, gerarPdf: boolean) => Promise<void>;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function WhatsAppModal({
  open,
  onOpenChange,
  clienteNome,
  clienteTelefone,
  numeroOrcamento,
  validade,
  valorTotal,
  agenciaNome,
  onSend,
}: WhatsAppModalProps) {
  const validadeFormatada = validade
    ? new Date(validade).toLocaleDateString("pt-BR")
    : "Não informada";

  const mensagemPadrao = `Olá, ${clienteNome}!\nSegue o orçamento ${numeroOrcamento} preparado especialmente para você.\n\nVálido até: ${validadeFormatada}\nValor total: ${fmt(valorTotal)}\n\nQualquer dúvida, estou à disposição!\n\n${agenciaNome}`;

  const [telefone, setTelefone] = useState(clienteTelefone.replace(/\D/g, ""));
  const [mensagem, setMensagem] = useState(mensagemPadrao);
  const [gerarPdf, setGerarPdf] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await onSend(telefone, mensagem, gerarPdf);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#25D366]">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Enviar via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Envie o orçamento diretamente pelo WhatsApp Web.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="whatsapp-phone">WhatsApp do cliente</Label>
            <Input
              id="whatsapp-phone"
              placeholder="5554999999999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ""))}
            />
            <p className="text-xs text-muted-foreground">
              Digite o número com DDD e código do país (ex: 55 + DDD + número)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-msg">Mensagem</Label>
            <Textarea
              id="whatsapp-msg"
              rows={8}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="whatsapp-pdf"
              checked={gerarPdf}
              onCheckedChange={(v) => setGerarPdf(!!v)}
            />
            <Label htmlFor="whatsapp-pdf" className="cursor-pointer">
              Gerar e anexar PDF automaticamente
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !telefone}
            className="text-white"
            style={{ backgroundColor: "#25D366" }}
          >
            {sending ? "Enviando..." : "Enviar WhatsApp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
