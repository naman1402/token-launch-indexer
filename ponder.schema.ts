import { table } from "console";
import { index, onchainTable } from "ponder";
// https://ponder.sh/docs/schema

// ──────────────
// Token Table
// ──────────────
export const tokens = onchainTable("tokens", (t) => ({
  address: t.hex().primaryKey(),         
  name: t.text().notNull(),                      
  symbol: t.text().notNull(),                 
  creationBlock: t.integer().notNull(),    
  deployer: t.hex().notNull(),
  totalSupply: t.bigint(),
  marketCap: t.bigint(),
  hasTeamBundle: t.boolean().default(false),
  hasFunding: t.boolean().default(false),
}));

// ──────────────
// Uniswap V2 Pool Table
// ──────────────
export const poolsV2 = onchainTable("poolsV2", (t) => ({
  id: t.hex().primaryKey(),              
  token0: t.hex().notNull(),  // Now always the base token (WETH/USDC/USDT)
  token1: t.hex().notNull(),  // Now always the project token           
  lpType: t.text().notNull().default("UniswapV2"),                    
  launchBlock: t.integer().notNull(),             
  launchTimestamp: t.integer().notNull(),
  initialLpEth: t.bigint(),
  baseTokenIsToken0: t.boolean().notNull().default(true), // Track original token order
  totalSniperVolume: t.bigint(),
  totalSnipersCount: t.integer(),
  totalSniperSupplyPercent: t.real(),
  teamBundleDetected: t.boolean().default(false),
  teamBundleBlocks: t.bigint(),
  teamBundleTxCount: t.integer(),
}));

// ──────────────
// Uniswap V3 Pool Table
// ──────────────
export const poolsV3 = onchainTable("poolsV3", (t) => ({
  id: t.hex().primaryKey(),              
  token0: t.hex().notNull(),  
  token1: t.hex().notNull(),
  fee: t.integer().notNull(),            
  lpType: t.text().notNull().default("UniswapV3"),                    
  launchBlock: t.integer().notNull(),             
  launchTimestamp: t.integer().notNull(),
  initialLpEth: t.bigint(),
  totalSniperVolume: t.bigint(),
  totalSnipersCount: t.integer(),
  totalSniperSupplyPercent: t.real(),
  teamBundleDetected: t.boolean().default(false),
  teamBundleBlocks: t.bigint(),
  teamBundleTxCount: t.integer(),
}));

// ──────────────
// Sniper Table
// ──────────────
export const snipers = onchainTable("snipers", (t) => ({
  id: t.text().primaryKey(),
  pool: t.hex().notNull(),              
  address: t.hex().notNull(),                  
  ethAmount: t.bigint().notNull(),
  tokenAmount: t.bigint().notNull(),              
  percentOfSupply: t.real().notNull(),          
}), (table) => ({
    poolIndex: index().on(table.pool),
}));

// ──────────────
// Team Bundle Table
// ──────────────
export const teamBundles = onchainTable("teamBundles", (t) => ({
  id: t.text().primaryKey(),
  token: t.hex().notNull(),
  pool: t.hex().notNull(),
  bundleBlocks: t.bigint().notNull(),
  txCount: t.integer().notNull(),
  firstBlock: t.integer().notNull(),
  lastBlock: t.integer().notNull(),
  bundleHash: t.text(),
}), (table) => ({
  tokenIndex: index().on(table.token),
  poolIndex: index().on(table.pool),
}));

// ──────────────
// Funding Graph
// ──────────────
export const funding = onchainTable("funding", (t) => ({
    id: t.text().primaryKey(),               
    token: t.hex().notNull(),
    level: t.integer().notNull(),           
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    value: t.bigint().notNull(),
  }), (table) => ({
    tokenIndex: index().on(table.token),
  }));
