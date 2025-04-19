import { ponder } from "@/generated";
import { handleV2Factory } from "./handlers/v2factory";
import { handleV3Factory } from "./handlers/v3factory";

ponder.on("UniswapV2Factory:PairCreated", handleV2Factory);
ponder.on("UniswapV3Factory:PoolCreated", handleV3Factory);
