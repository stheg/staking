import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { StakingPlatform } from "../typechain-types";

export default testDeployment;

async function testDeployment()
    : Promise<[SignerWithAddress[], SignerWithAddress, StakingPlatform]> {
    const accounts = await ethers.getSigners();
    const owner = accounts[0];

    const contractFactory = await ethers.getContractFactory("StakingPlatform", owner);
    const contract = await contractFactory.deploy() as StakingPlatform;
    await contract.deployed();

    return [accounts, owner, contract];
}