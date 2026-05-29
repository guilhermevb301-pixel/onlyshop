import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import {
  ShoppingBag,
  CreditCard,
  QrCode,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentMethod = "pix" | "card";

export default function Checkout() {
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-4">
        <p className="text-muted-foreground">Faça login para finalizar a compra.</p>
        <Button asChild className="bg-gradient-primary border-0 rounded-xl">
          <Link to="/auth">Entrar</Link>
        </Button>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-6 animate-fade-in">
        <div className="h-20 w-20 mx-auto rounded-full bg-gradient-success flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold">Pedido Confirmado! 🎉</h1>
        <p className="text-muted-foreground text-sm">
          Seu pedido <span className="font-mono font-semibold text-foreground">#{orderId?.slice(0, 8)}</span> foi
          recebido com sucesso.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            className="bg-gradient-primary border-0 rounded-xl"
            onClick={() => navigate("/inicio")}
          >
            Voltar ao início
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/products")}>
            Continuar Comprando
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Seu carrinho está vazio.</p>
        <Button variant="outline" className="rounded-xl" onClick={() => navigate("/products")}>
          Ver Produtos
        </Button>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    setProcessing(true);
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total,
          payment_method: paymentMethod,
          status: paymentMethod === "pix" ? "awaiting_payment" : "pending",
        })
        .select("id")
        .single();

      if (orderError || !order) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        commission_percentage: item.product.commissionType === "percentage" ? item.product.commissionValue : 0,
        commission_amount:
          item.product.commissionType === "percentage"
            ? (item.product.price * item.quantity * item.product.commissionValue) / 100
            : item.product.commissionValue * item.quantity,
      }));

      await supabase.from("order_items").insert(orderItems);

      await clearCart();
      setOrderId(order.id);
      setOrderComplete(true);
      toast({ title: "Pedido realizado com sucesso! 🎉" });
    } catch (err) {
      console.error("Error placing order:", err);
      toast({ title: "Erro ao processar pedido", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Checkout</h1>
      </div>

      {/* Order Summary */}
      <div className="rounded-2xl border border-border/50 p-4 space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" /> Resumo do Pedido
        </h2>
        <div className="divide-y divide-border/30">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
              </div>
              <span className="text-sm font-semibold shrink-0">
                R$ {(item.product.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className="font-semibold">Total</span>
          <span className="text-lg font-bold text-gradient-primary bg-gradient-primary bg-clip-text text-transparent">
            R$ {total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payment Method */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm">Forma de Pagamento</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPaymentMethod("pix")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
              paymentMethod === "pix"
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-primary/30"
            )}
          >
            <QrCode className={cn("h-8 w-8", paymentMethod === "pix" ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-semibold">PIX</span>
            <span className="text-[11px] text-muted-foreground">Instantâneo</span>
          </button>
          <button
            onClick={() => setPaymentMethod("card")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
              paymentMethod === "card"
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-primary/30"
            )}
          >
            <CreditCard className={cn("h-8 w-8", paymentMethod === "card" ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-semibold">Cartão</span>
            <span className="text-[11px] text-muted-foreground">Crédito/Débito</span>
          </button>
        </div>
      </div>

      {/* Security Badge */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50 text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-success shrink-0" />
        <p className="text-xs">Pagamento seguro e criptografado. Seus dados estão protegidos.</p>
      </div>

      {/* Place Order */}
      <Button
        className="w-full bg-gradient-primary border-0 rounded-xl h-12 text-base font-semibold"
        onClick={handlePlaceOrder}
        disabled={processing}
      >
        {processing ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : null}
        {processing ? "Processando..." : `Pagar R$ ${total.toFixed(2)}`}
      </Button>
    </div>
  );
}
