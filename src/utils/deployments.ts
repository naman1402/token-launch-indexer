import * as fs from 'fs';
import * as path from 'path';

interface DeployedAddresses {
  weth: string;
  factory: string;
  tokenFactory: string;
  testScenario: string;
  memeToken: string;
  pair: string;
}

export function getDeployedAddresses(): DeployedAddresses {
  const deploymentPath = path.join(__dirname, '../../testing/deployments.json');
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error('Deployment addresses not found. Run forge script first!');
  }

  return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
}

const addresses = getDeployedAddresses();

// Export individual addresses
export const WETH_ADDRESS = addresses.weth;
export const FACTORY_ADDRESS = addresses.factory;
export const TOKEN_FACTORY_ADDRESS = addresses.tokenFactory;
export const TEST_SCENARIO_ADDRESS = addresses.testScenario;
export const MEME_TOKEN_ADDRESS = addresses.memeToken;
export const PAIR_ADDRESS = addresses.pair;