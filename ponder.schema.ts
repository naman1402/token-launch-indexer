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
}));

// ──────────────
// Pool Table
// ──────────────
export const pools = onchainTable("pools", (t) => ({
  id: t.hex().primaryKey(),              
  token0: t.hex().notNull(),  
  token1: t.hex().notNull(),            
  lpType: t.text().notNull(),                    
  launchBlock: t.integer().notNull(),             
  launchTimestamp: t.integer().notNull(),
  initialLpEth: t.bigint(),
  totalSniperVolume: t.bigint(),
  totalSnipersCount: t.integer(),
  totalSniperSupplyPercent: t.real(),                       
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
