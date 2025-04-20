import { Address, createPublicClient, http, parseEther } from "viem";
import { mainnet } from "viem/chains";

// Use Viem or Ethers.js provider
const client = createPublicClient({
  chain: mainnet,
  transport: http(), // optionally pass { url: process.env.ALCHEMY_URL }
});

type FunderResult = {
  level1: Address | null;
  level2: Address | null;
  level3: Address | null;
};

/**
 * Finds the 3-level funders of a deployer address by scanning historical blocks.
 * @param deployer Deployer address (EOA or contract deployer)
 * @param creationBlock Block number when the deployer contract was created
 */
export async function findThreeLevelFunders(
  deployer: Address,
  creationBlock: bigint
): Promise<FunderResult> {
  const level1 = await findFirstETHSender(deployer, creationBlock);
  const level2 = level1
    ? await findFirstETHSender(level1, creationBlock)
    : null;
  const level3 = level2
    ? await findFirstETHSender(level2, creationBlock)
    : null;

  return { level1, level2, level3 };
}

/**
 * Finds the earliest address that sent ETH to a target address before a certain block.
 * @param target Address to find funder for
 * @param maxBlock Maximum block to scan backwards
 */
async function findFirstETHSender(
  target: Address,
  maxBlock: bigint
): Promise<Address | null> {

  // Skip 2000 blocks at a time
  // @note Use binary search for better performance
  const blocksToScan = 2000n;
  // Start scanning from the maximum block down to 0
  let currentBlock = maxBlock;

  while (currentBlock > 0n) {
    const block = await client.getBlock({
      blockNumber: currentBlock,
      includeTransactions: true,
    });
    // Search for transactions that sent ETH to the target address
    // This approach only captures ETH transfers
    // Note: This does not capture ERC20 transfers, NFT Transfers, Indirect Funding
    const incomingTx = block.transactions.find(
      (tx) =>
        tx.to?.toLowerCase() === target.toLowerCase() &&
        tx.value > 0n &&
        tx.from.toLowerCase() !== target.toLowerCase()
    );

    if (incomingTx) {
      return incomingTx.from;
    }

    currentBlock -= blocksToScan;
  }

  return null;
}

/* 
------------------------------------------------------
 Optional: Trace API version (requires Alchemy paid plan)
------------------------------------------------------

// This uses Alchemy Trace API to find internal and external funders.
export async function findThreeLevelFundersWithTrace(
  deployer: Address
): Promise<FunderResult> {
  const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY!;
  const url = `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY}`;

  const traceTxs = async (address: Address): Promise<Address | null> => {
    const res = await fetch(`${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [
          {
            toAddress: address,
            category: ["external", "internal"],
            maxCount: "1",
            order: "asc",
          },
        ],
      }),
    });

    const data = await res.json();
    if (
      data?.result?.transfers?.length &&
      data.result.transfers[0].from !== address
    ) {
      return data.result.transfers[0].from;
    }

    return null;
  };

  const level1 = await traceTxs(deployer);
  const level2 = level1 ? await traceTxs(level1) : null;
  const level3 = level2 ? await traceTxs(level2) : null;

  return { level1, level2, level3 };
}
*/

