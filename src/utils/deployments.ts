import * as fs from 'fs';
import * as path from 'path';

interface DeployedAddresses {
  weth: string;
  usdc: string;
  usdt: string;
  factory: string;
  router: string;
  tokenFactory: string;
}

export function getDeployedAddresses(): DeployedAddresses {
  const deploymentPath = path.join(__dirname, '../../testing/deployments.json');
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error('Deployment addresses not found. Run forge script first!');
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  return deployments.deployments;
}