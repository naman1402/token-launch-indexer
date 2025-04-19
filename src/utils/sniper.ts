import { ZERO_ADDRESS } from "viem";

type SwapEvent = {
  buyer: string;
  tokenAmount: bigint;
  ethAmount: bigint;
};

export function getSnipers(swaps: SwapEvent[]): string[] {
  const uniqueBuyers = new Set<string>();

  for (const swap of swaps) {
    uniqueBuyers.add(swap.buyer.toLowerCase());
  }

  return [...uniqueBuyers];
}

export function calculateSniperVolume(swaps: SwapEvent[]): {
  totalEth: bigint;
  totalTokens: bigint;
} {
  let totalEth = 0n;
  let totalTokens = 0n;

  for (const swap of swaps) {
    totalEth += swap.ethAmount;
    totalTokens += swap.tokenAmount;
  }

  return { totalEth, totalTokens };
}

export function calculateSniperSupplyPercent(
  sniperTokenAmount: bigint,
  totalSupply: bigint
): number {
  if (totalSupply === 0n) return 0;
  const percent = (Number(sniperTokenAmount) / Number(totalSupply)) * 100;
  return Math.round(percent * 100) / 100; // rounded to 2 decimals
}
