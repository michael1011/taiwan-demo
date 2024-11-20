import { Contract, ContractFactory, Wallet, JsonRpcProvider } from "ethers";
import { abi, bytecode } from "./out/ERC20.sol/ERC20.json"

const alice = "0x4daBec0678e8Dc1A57C9F2bb651546970Eaf4f47";

(async () => {
  const provider = new JsonRpcProvider("http://127.0.0.1:8545");
  const signer = Wallet.fromPhrase(
    "test test test test test test test test test test test junk"
  ).connect(provider);

  const factory = new ContractFactory(abi, bytecode.object).connect(signer);
  const deployment = await factory.deploy("Test", "ERC20");
  await deployment.deploymentTransaction()!.wait(1);
  const contractAddress = await deployment.getAddress();
  console.log('Deployed contract at', contractAddress);
  const contract = new Contract(contractAddress, abi).connect(signer) as any;

  console.log("Balance of alice", await contract.balanceOf(alice));
  
  const amount = 1n;
  console.log(`Sending ${amount} tokens`);
  await (await contract.transfer(alice, amount)).wait(1);

  console.log("Balance of alice", await contract.balanceOf(alice));
})();
