import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    setCarregando(false);
    if (error) setErro("E-mail ou senha inválidos.");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#F4F4F4" }}
    >
      <form
        onSubmit={entrar}
        className="w-full max-w-sm p-8 rounded-xl bg-white"
        style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 6px 18px rgba(0,0,0,0.05)" }}
      >
        <h1 className="font-display text-2xl font-bold mb-1" style={{ color: "#2C2C2E" }}>
          Mudança de Vida
        </h1>
        <p className="text-sm mb-6" style={{ color: "#7A7A7E" }}>
          Cronograma & evolução
        </p>

        <label className="text-xs font-medium" style={{ color: "#7A7A7E" }}>
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: "#E6E6E6" }}
          required
        />

        <label className="text-xs font-medium" style={{ color: "#7A7A7E" }}>
          Senha
        </label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: "#E6E6E6" }}
          required
        />

        {erro && (
          <p className="text-xs mb-3" style={{ color: "#B06B63" }}>
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundImage: "linear-gradient(90deg, #8B7FC7, #C98AA8)" }}
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-xs mt-4" style={{ color: "#ABABB0" }}>
          Sua conta é criada direto no painel do Supabase (Authentication → Users → Add user), não existe cadastro público aqui.
        </p>
      </form>
    </div>
  );
}
