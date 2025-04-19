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

}));

// ──────────────
// Pool Table
// ──────────────
export const pools = onchainTable("pools", (t) => ({
  id: t.hex().primaryKey(),              
  token: t.hex().notNull(),              
  lpType: t.text().notNull(),                    
  launchBlock: t.integer().notNull(),             
  launchTimestamp: t.integer().notNull(),         
  initialEthLiquidity: t.bigint().notNull(),    
  blockMarketCap: t.bigint().notNull(),      
  teamBundle: t.boolean().notNull(),              
}), (table)=> ({
    tokenIndex: index().on(table.token),
    })
);

// ──────────────
// Sniper Table
// ──────────────
export const snipers = onchainTable("snipers", (t) => ({
  id: t.text().primaryKey(),
  pool: t.hex().notNull(),              
  address: t.hex(),                  
  volume: t.bigint(),              
  percentOfSupply: t.real(),          
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
