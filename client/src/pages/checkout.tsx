import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import type { Collection } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

function CheckoutForm({ collectionId, amount }: { collectionId: string; amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/mint?collectionId=${collectionId}`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold">${(amount / 100).toFixed(2)}</div>
        </div>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="gap-2"
          data-testid="button-pay-now"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Pay ${(amount / 100).toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function Checkout() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  
  const params = new URLSearchParams(location.split('?')[1] || '');
  const collectionId = params.get('collectionId');

  // Set page title
  useEffect(() => {
    document.title = "Checkout - Solturio";
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: collection, isLoading: collectionLoading } = useQuery<Collection & { logoCount: number }>({
    queryKey: ["/api/collections", collectionId],
    enabled: !!collectionId && isAuthenticated,
  });

  const { data: paymentIntent, isLoading: paymentLoading } = useQuery<{ 
    clientSecret: string;
    amount: number;
  }>({
    queryKey: ["/api/payment/create-intent", collectionId],
    enabled: !!collectionId && !!collection && isAuthenticated,
  });

  if (authLoading || collectionLoading || paymentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !collectionId || !collection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Invalid Request</h2>
          <p className="text-sm text-muted-foreground mb-6">
            No collection found for checkout
          </p>
          <Button asChild>
            <Link href="/upload">Upload Logos</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Configuration Error</h2>
          <p className="text-sm text-muted-foreground">
            Payment system is not configured. Please contact support.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="h-20 flex items-center px-6 lg:px-8">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover-elevate">
              {/* Light Mode Logo - Dark colored logo for light backgrounds */}
              <img 
                src="/solturio-logo-light-mode.png"
                alt="Solturio Logo for Light Mode"
                className="w-14 h-14 object-contain dark:hidden"
              />
              {/* Dark Mode Logo - White colored logo for dark backgrounds */}
              <img 
                src="/solturio-logo-dark-mode.png"
                alt="Solturio Logo for Dark Mode"
                className="w-14 h-14 object-contain hidden dark:block"
              />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                Solturio
              </span>
            </Link>
            <div className="text-sm text-muted-foreground">
              Step 2 of 3: Payment
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Order Summary</h2>
            <Card className="p-6">
              <h3 className="font-semibold mb-4">{collection.name}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company</span>
                  <span className="font-medium">{collection.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Number of Logos</span>
                  <span className="font-medium">{collection.logoCount || 0}</span>
                </div>
                {collection.symbol && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Symbol</span>
                    <span className="font-medium">{collection.symbol}</span>
                  </div>
                )}
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>${paymentIntent ? (paymentIntent.amount / 100).toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="mt-6 p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                After payment, your logos will be minted as NFTs on the Solana blockchain, 
                creating permanent proof of ownership.
              </p>
            </div>
          </div>

          {/* Payment Form */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Payment Details</h2>
            {paymentIntent?.clientSecret ? (
              <Card className="p-6">
                <Elements 
                  stripe={stripePromise} 
                  options={{ clientSecret: paymentIntent.clientSecret }}
                >
                  <CheckoutForm 
                    collectionId={collectionId} 
                    amount={paymentIntent.amount}
                  />
                </Elements>
              </Card>
            ) : (
              <Card className="p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground mt-4">
                  Preparing payment...
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
