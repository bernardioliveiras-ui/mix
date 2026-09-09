"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function LoginForm() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar o código.");
      setStep("code");
      setMessage("Código enviado. Confira também a caixa de spam.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Código inválido.");
      window.location.assign("/painel");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tente novamente.");
      setLoading(false);
    }
  }

  if (step === "code") {
    return (
      <form className="mt-7" onSubmit={verifyCode}>
        <label className="text-sm font-bold text-[#153b31]">Código recebido</label>
        <InputOTP
          maxLength={6}
          value={code}
          onChange={setCode}
          containerClassName="mt-3 justify-between"
          inputMode="numeric"
        >
          <InputOTPGroup className="w-full justify-between gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="h-12 w-full rounded-xl border border-[#cddbd6] bg-[#f7faf9] text-lg first:rounded-xl last:rounded-xl"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <p className="mt-3 text-sm text-[#60766f]">Enviado para <b>{email}</b></p>
        {message && <p className="mt-4 rounded-xl bg-[#edf7f4] p-3 text-sm text-[#356258]">{message}</p>}
        <Button className="mt-5 h-12 w-full rounded-xl bg-[#08705c] text-white hover:bg-[#065d4d]" disabled={loading || code.length !== 6}>
          {loading ? <LoaderCircle className="animate-spin" /> : <>Confirmar e entrar <ArrowRight /></>}
        </Button>
        <button type="button" className="mt-4 w-full text-sm font-semibold text-[#08705c]" onClick={() => { setStep("email"); setCode(""); setMessage(""); }}>
          Usar outro e-mail
        </button>
      </form>
    );
  }

  return (
    <form className="mt-7" onSubmit={requestCode}>
      <label htmlFor="login-email" className="text-sm font-bold text-[#153b31]">Seu e-mail profissional</label>
      <div className="relative mt-3">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6f837d]" size={18} />
        <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com.br" className="h-12 rounded-xl border-[#cddbd6] bg-[#f7faf9] pl-11" />
      </div>
      {message && <p className="mt-4 rounded-xl bg-[#fff1ef] p-3 text-sm text-[#8b3a2f]">{message}</p>}
      <Button className="mt-5 h-12 w-full rounded-xl bg-[#08705c] text-white hover:bg-[#065d4d]" disabled={loading}>
        {loading ? <LoaderCircle className="animate-spin" /> : <>Receber código de acesso <ArrowRight /></>}
      </Button>
      <p className="mt-5 text-center text-xs text-[#7a8c86]">O mesmo acesso serve para proprietário, gerente e vendedor.</p>
    </form>
  );
}
