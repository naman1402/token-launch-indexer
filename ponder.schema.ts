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
  launchTxHash: t.text().notNull(),  // Store the transaction hash of the launch
  initialLpEth: t.bigint(),
  baseTokenIsToken0: t.boolean().notNull().default(true), // Track original token order
  totalSniperVolume: t.bigint(),
  totalSnipersCount: t.integer(),
  totalSniperSupplyPercent: t.real(),
  teamBundle: t.boolean().default(false),
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
  launchTxHash: t.text().notNull(),
  baseTokenIsToken0: t.boolean().notNull().default(true), // Track original token order
  initialLpEth: t.bigint(),
  totalSniperVolume: t.bigint(),
  totalSnipersCount: t.integer(),
  totalSniperSupplyPercent: t.real(),
  teamBundle: t.boolean().default(false),
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

// ──────────────
// Dummy Table for Testing
// ──────────────
export const dummyTable = onchainTable("dummyTable", (t) => ({
  id: t.text().primaryKey(),
  name: t.text().notNull(),
  value: t.integer().notNull(),
  created_at: t.integer().notNull(), // Fixed column name to use snake_case
}));
