import { Hono } from "hono";
import schema from "ponder:schema";
import { db } from "ponder:api";
import { graphql, replaceBigInts, sql } from "ponder";
import { formatEther } from "viem";

const app = new Hono();

// Set up GraphQL endpoints
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

// Basic health check endpoint
app.get("/hello", (c) => {
  return c.json({ message: "Token Launch Indexer API is running!" });
});

// Get all tokens - USING SQL QUERY
app.get("/tokens", async (c) => {
  try {
    console.log("Fetching tokens from database...");
    
    // First verify DB is available
    if (!db) {
      console.error("API: Database connection not available!");
      return c.json({ error: "Database connection not available" }, 500);
    }
    
    // Add a test token directly via SQL to ensure the tokens table is accessible
    try {
      const testTokenId = `0x${Date.now().toString(16)}`;
      await db.execute(
        sql`INSERT INTO "tokens" ("address", "name", "symbol", "creationBlock", "deployer") 
            VALUES (${testTokenId}, 'Test Token', 'TEST', 1, '0x0000000000000000000000000000000000000000')
            ON CONFLICT DO NOTHING`
      );
      console.log("API: Test token insert successful or already exists");
    } catch (insertError) {
      console.log("API: Test token insert failed, but continuing with query:", insertError);
    }
    
    // Query the tokens table
    const tokensResult = await db.execute(
      sql`SELECT * FROM "tokens" LIMIT 100`
    );
    
    console.log(`Found ${tokensResult.rows.length} tokens`);
    console.log("Token data:", JSON.stringify(tokensResult.rows));
    
    return c.json({ 
      tokens: replaceBigInts(tokensResult.rows, 
        (b) => typeof b === "bigint" ? b.toString() : b) 
    });
  } catch (error: any) {
    console.error("API: Error fetching tokens:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get a specific token by address - USING SQL QUERY
app.get("/token/:address", async (c) => {
  try {
    const address = c.req.param("address").toLowerCase();
    
    const result = await db.execute(
      sql`SELECT * FROM "tokens" WHERE address = ${address} LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      return c.json({ error: "Token not found" }, 404);
    }
    
    return c.json(replaceBigInts(result.rows[0], (b) => typeof b === "bigint" && b > 0n ? formatEther(b) : b.toString()));
  } catch (error: any) {
    console.error("Error fetching token:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all pools (V2) - USING SQL QUERY 
app.get("/pools", async (c) => {
  try {
    const result = await db.execute(
      sql`SELECT * FROM "poolsV2" LIMIT 100`
    );
    
    return c.json(replaceBigInts(result.rows, (b) => typeof b === "bigint" && b > 0n ? formatEther(b) : b.toString()));
  } catch (error: any) {
    console.error("Error fetching pools:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get a specific pool - USING SQL QUERY
app.get("/pool/:id", async (c) => {
  try {
    const id = c.req.param("id").toLowerCase();
    
    const result = await db.execute(
      sql`SELECT * FROM "poolsV2" WHERE id = ${id} LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      return c.json({ error: "Pool not found" }, 404);
    }
    
    return c.json(replaceBigInts(result.rows[0], (b) => typeof b === "bigint" && b > 0n ? formatEther(b) : b.toString()));
  } catch (error: any) {
    console.error("Error fetching pool:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all snipers for a pool - USING SQL QUERY
app.get("/snipers/:poolId", async (c) => {
  try {
    const poolId = c.req.param("poolId").toLowerCase();
    
    const result = await db.execute(
      sql`SELECT * FROM "snipers" WHERE pool = ${poolId} LIMIT 100`
    );
    
    return c.json(replaceBigInts(result.rows, (b) => typeof b === "bigint" && b > 0n ? formatEther(b) : b.toString()));
  } catch (error: any) {
    console.error("Error fetching snipers:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all funding entries for a token - USING SQL QUERY
app.get("/funding/:tokenAddress", async (c) => {
  try {
    const tokenAddress = c.req.param("tokenAddress").toLowerCase();
    
    const result = await db.execute(
      sql`SELECT * FROM "funding" WHERE token = ${tokenAddress} ORDER BY level DESC`
    );
    
    return c.json(replaceBigInts(result.rows, (b) => typeof b === "bigint" && b > 0n ? formatEther(b) : b.toString()));
  } catch (error: any) {
    console.error("Error fetching funding:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get dashboard stats - USING SQL QUERY
app.get("/dashboard", async (c) => {
  try {
    // Count total tokens
    const tokensResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM "tokens"`
    );
    const tokensCount = Number(tokensResult.rows[0].count);
    
    // Count total pools
    const poolsResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM "poolsV2"`
    );
    const poolsCount = Number(poolsResult.rows[0].count);
    
    // Get latest tokens (created most recently)
    const latestTokensResult = await db.execute(
      sql`SELECT * FROM "tokens" ORDER BY "creationBlock" DESC LIMIT 5`
    );
    
    // Get tokens with team bundles
    const teamBundleTokensResult = await db.execute(
      sql`SELECT * FROM "tokens" WHERE "hasTeamBundle" = true LIMIT 5`
    );
    
    const dashboardData = {
      stats: {
        totalTokens: tokensCount,
        totalPools: poolsCount,
      },
      latestTokens: latestTokensResult.rows,
      tokensWithTeamBundles: teamBundleTokensResult.rows
    };
    
    return c.json(replaceBigInts(dashboardData, (b) => typeof b === "bigint" && b > 0n ? formatEther(b) : b.toString()));
  } catch (error: any) {
    console.error("Error fetching dashboard:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Launch summary with JOIN operations - USING SQL QUERY
app.get("/launch-summary/:tokenAddress", async (c) => {
  try {
    const tokenAddress = c.req.param("tokenAddress").toLowerCase();
    
    // Get token details
    const tokenResult = await db.execute(
      sql`SELECT * FROM "tokens" WHERE address = ${tokenAddress} LIMIT 1`
    );
    
    if (tokenResult.rows.length === 0) {
      return c.json({ error: "Token not found" }, 404);
    }
    
    const token = tokenResult.rows[0];
    
    // Get pool details (using OR condition)
    const poolResult = await db.execute(
      sql`SELECT * FROM "poolsV2" WHERE token0 = ${tokenAddress} OR token1 = ${tokenAddress} LIMIT 1`
    );
    
    const pool = poolResult.rows.length > 0 ? poolResult.rows[0] : null;
    
    // Get related data if pool exists
    let snipers = [];
    if (pool) {
      const snipersResult = await db.execute(
        sql`SELECT * FROM "snipers" WHERE pool = ${pool.id} LIMIT 100`
      );
      snipers = snipersResult.rows;
    }
    
    // Get funding data
    const fundingResult = await db.execute(
      sql`SELECT * FROM "funding" WHERE token = ${tokenAddress} ORDER BY level DESC`
    );
    
    // Get pools with team bundles
    const poolsWithTeamBundleResult = await db.execute(
      sql`SELECT * FROM "poolsV2" WHERE "teamBundle" = true AND token1 = ${tokenAddress} LIMIT 100`
    );
    
    const summary = {
      token,
      pool,
      snipersCount: snipers.length,
      snipers,
      fundingCount: fundingResult.rows.length,
      funding: fundingResult.rows,
      teamBundlesCount: poolsWithTeamBundleResult.rows.length,
      teamBundles: poolsWithTeamBundleResult.rows
    };
    
    return c.json(replaceBigInts(summary, (b) => typeof b === "bigint" && b > 0n ? formatEther(b) : b.toString()));
  } catch (error: any) {
    console.error("Error fetching launch summary:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Add dummy endpoint with connection check for testing database operations
app.get('/dummy', async (c) => {
  try {
    // First verify DB is available
    if (!db) {
      console.error("API: Database connection not available!");
      return c.json({ error: "Database connection not available" }, 500);
    }
    
    // Add a direct test insert to ensure DB is working
    try {
      await db.execute(
        sql`INSERT INTO "dummyTable" ("id", "name", "value", "created_at") 
            VALUES (${'api-test-' + Date.now()}, 'API Test', 1, ${Math.floor(Date.now()/1000)})`
      );
      console.log("API: Test insert successful");
    } catch (insertError) {
      console.log("API: Test insert failed, but continuing with query:", insertError);
    }
    
    console.log("API: Fetching dummy records...");
    const dummyResult = await db.execute(
      sql`SELECT * FROM "dummyTable" ORDER BY "created_at" DESC LIMIT 100`
    );
    console.log(`API: Found ${dummyResult.rows.length} dummy records`);
    return c.json({ dummyData: dummyResult.rows });
  } catch (error: any) {
    console.error("API: Error fetching dummy data:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;