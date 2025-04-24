import * as fs from 'fs';
import * as path from 'path';
import { Address } from 'viem';

export interface DeployedAddresses {
  weth: Address;
  factory: Address;
  tokenFactory: Address;
  testScenario: Address;
  memeToken: Address;
  pair: Address;
}

interface BroadcastTransaction {
  contractName?: string;
  contractAddress: string;
  function?: string | null;
  arguments?: any[] | null;
  transaction?: any;
}

/**
 * Reads the latest deployed contract addresses from the Foundry broadcast run-latest.json file
 * @returns An object containing the deployed contract addresses
 */
export function getDeployedAddresses(): DeployedAddresses {
  // Path to the Foundry broadcast file
  const broadcastPath = path.join(__dirname, '../../testing/broadcast/Deploy.s.sol/31337/run-latest.json');
  
  // Fallback to the original deployments.json if the broadcast file doesn't exist
  const deploymentPath = path.join(__dirname, '../../testing/deployments.json');

  // Check if the broadcast file exists
  if (!fs.existsSync(broadcastPath)) {
    // If not, fall back to the old deployment file
    if (!fs.existsSync(deploymentPath)) {
      throw new Error('Deployment addresses not found. Run forge script first!');
    }
    
    // Parse the JSON file and ensure addresses have the correct type
    const addresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    // Ensure all addresses start with '0x'
    Object.keys(addresses).forEach(key => {
      if (typeof addresses[key] === 'string' && !addresses[key].startsWith('0x')) {
        addresses[key] = `0x${addresses[key]}`;
      }
    });

    return addresses as DeployedAddresses;
  }

  // Parse the broadcast JSON file
  const broadcastData = JSON.parse(fs.readFileSync(broadcastPath, 'utf8'));
  
  // Extract transactions that deploy contracts
  const transactions: BroadcastTransaction[] = broadcastData.transactions;

  // Contract name mapping to our interface keys
  const contractMapping: Record<string, keyof DeployedAddresses> = {
    'WETH9': 'weth',
    'UniswapV2Factory': 'factory',
    'TokenFactory': 'tokenFactory',
    'TestScenario': 'testScenario'
  };

  // Initialize addresses object
  const addresses: Partial<DeployedAddresses> = {};

  // Extract contract addresses based on contract names
  transactions.forEach(tx => {
    if (tx.contractName && tx.contractAddress && contractMapping[tx.contractName]) {
      const key = contractMapping[tx.contractName];
      if (key) { // Ensure key is defined
        addresses[key] = tx.contractAddress as Address;
      }
    }
    
    // Special handling for MemeToken which might be deployed through TokenFactory
    if (tx.contractName === 'TokenFactory' && 
        tx.function === 'launchTokenWithLiquidity(string,string,uint256,uint256)' && 
        tx.arguments && tx.arguments[0] === 'Meme Token') {
      // The MemeToken address would typically be returned in a subsequent transaction or event
      // This is a simplification - we might need to parse event logs or examine output
    }
  });

  // Look for the first pair created - this is typically found in a PairCreated event
  // This is a simplification - we would need to parse event logs accurately
  const memeTokenTransaction = transactions.find(tx => 
    tx.function === 'snipe(address,uint256,uint256)' && tx.arguments && tx.arguments.length > 0
  );
  
  if (memeTokenTransaction && memeTokenTransaction.arguments) {
    addresses.pair = memeTokenTransaction.arguments[0] as Address;
    // In a typical deployment the MemeToken is often on one side of the pair
    // This logic might need refinement based on your specific deployment script
  }

  // Fallback to deployments.json for any missing addresses
  if (!fs.existsSync(deploymentPath)) {
    console.warn('Some addresses could not be found in broadcast file. Consider updating the parsing logic.');
  } else {
    const fallbackAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    // Fill in any missing addresses from the fallback file
    for (const contractName in contractMapping) {
      const key = contractMapping[contractName];
      if (key && !addresses[key] && fallbackAddresses[key]) {
        addresses[key] = fallbackAddresses[key];
      }
    }

    // Also get memeToken and pair if they're missing
    if (!addresses.memeToken && fallbackAddresses.memeToken) {
      addresses.memeToken = fallbackAddresses.memeToken;
    }
    
    if (!addresses.pair && fallbackAddresses.pair) {
      addresses.pair = fallbackAddresses.pair;
    }
  }

  // Ensure all required addresses are available
  const requiredKeys: (keyof DeployedAddresses)[] = ['weth', 'factory', 'tokenFactory', 'testScenario', 'memeToken', 'pair'];
  const missingKeys = requiredKeys.filter(key => !addresses[key]);
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing required contract addresses: ${missingKeys.join(', ')}. Update the broadcast parsing logic or manually set addresses in deployments.json.`);
  }

  return addresses as DeployedAddresses;
}

// Export individual addresses for convenience
export const getContractAddresses = () => {
  const addresses = getDeployedAddresses();
  
  return {
    // V2 addresses
    UNISWAP_V2_FACTORY_ADDRESS: addresses.factory as Address,
    // V3 addresses - if they exist in your deployment file
    // Hard-coded for now, but should be added to deployments.json
    UNISWAP_V3_FACTORY_ADDRESS: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" as Address,
    
    // Other addresses
    WETH_ADDRESS: addresses.weth,
    TOKEN_FACTORY_ADDRESS: addresses.tokenFactory,
    TEST_SCENARIO_ADDRESS: addresses.testScenario,
    MEME_TOKEN_ADDRESS: addresses.memeToken,
    PAIR_ADDRESS: addresses.pair,
  };
};