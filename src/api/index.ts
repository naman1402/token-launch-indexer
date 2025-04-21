import { Hono } from "hono";
import { db } from "ponder:api";
import schema from "ponder:schema";
import { client, graphql } from "ponder";



// Create a new Hono app
const app = new Hono();

app.get("/hello", (c) => {
  return c.json({ message: "Hello from Ponder API!" });
});

app.use("/sql", client({ db, schema })); 
app.use("/graphql", graphql({ db, schema }));
// app.use("*", handle);

export default app;