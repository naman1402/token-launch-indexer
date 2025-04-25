export const uniswapV2FactoryABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "token0", "type": "address" },
      { "indexed": true, "name": "token1", "type": "address" },
      { "indexed": false, "name": "pair", "type": "address" },
      { "indexed": false, "name": "arg3", "type": "uint256" }
    ],
    "name": "PairCreated",
    "type": "event"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "feeTo",
    "outputs": [{ "name": "", "type": "address" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "feeToSetter",
    "outputs": [{ "name": "", "type": "address" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "", "type": "address" }, { "name": "", "type": "address" }],
    "name": "getPair",
    "outputs": [{ "name": "", "type": "address" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "", "type": "uint256" }],
    "name": "allPairs",
    "outputs": [{ "name": "", "type": "address" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "allPairsLength",
    "outputs": [{ "name": "", "type": "uint256" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{ "name": "tokenA", "type": "address" }, { "name": "tokenB", "type": "address" }],
    "name": "createPair",
    "outputs": [{ "name": "pair", "type": "address" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;