"use client";
import { motion, useReducedMotion } from "motion/react";

/** Volante 5×5 da Lotofácil; as sorteadas acendem em sequência (ordem do sorteio). */
export function Volante({ dezenas, ordem, chave }: { dezenas?: number[]; ordem?: number[]; chave: string }) {
  const reduzir = useReducedMotion();
  const sorteadas = new Set(dezenas ?? []);
  const pos = new Map((ordem?.length ? ordem : dezenas ?? []).map((d, i) => [d, i]));
  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
      {Array.from({ length: 25 }, (_, k) => {
        const d = k + 1;
        const on = sorteadas.has(d);
        return (
          <div key={d} className="relative aspect-square">
            <div className="absolute inset-0 grid place-items-center rounded-full bg-bola text-[15px] font-semibold text-texto-3 tabular sm:text-base">
              {String(d).padStart(2, "0")}
            </div>
            {on && (
              <motion.div
                key={chave}
                initial={reduzir ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduzir ? { duration: 0.2 } : { type: "spring", bounce: 0.35, duration: 0.5, delay: 0.05 + (pos.get(d) ?? 0) * 0.045 }}
                className="absolute inset-0 grid place-items-center rounded-full bg-gradient-to-b from-roxo-claro to-roxo text-[15px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_4px_10px_color-mix(in_srgb,var(--roxo)_35%,transparent)] tabular sm:text-base"
              >
                {String(d).padStart(2, "0")}
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}
