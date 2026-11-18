import { carregarBilhetes } from "@/lib/bilhetes";
import { PainelCliente } from "@/components/PainelCliente";

export default async function Home() {
  const bilhetes = await carregarBilhetes();
  return <PainelCliente bilhetes={bilhetes} />;
}
