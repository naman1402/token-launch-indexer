import { erc20Abi } from "viem";

export async function getTokenMetadata({
  client,
  address,
}: {
  client: any;
  address: `0x${string}`;
}) {
  const [name, symbol, decimals] = await Promise.all([
    client.readContract({
      address,
      abi: erc20Abi,
      functionName: "name",
    }),
    client.readContract({
      address,
      abi: erc20Abi,
      functionName: "symbol",
    }),
    client.readContract({
      address,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  ]);

  return { name, symbol, decimals };
}
