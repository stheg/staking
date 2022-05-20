import { ethers } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("StakingPlatform", owner);
  const contract = await factory.deploy();

  await contract.deployed();

  console.log("Staking Platform to:", contract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
