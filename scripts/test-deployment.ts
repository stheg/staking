import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { IERC20, StakingPlatform } from "../typechain-types";
const maerc20 = require("../required-data/MAERC20.json");

export async function testDeployment(
    tokenToStake:IERC20, 
    rewardToken:IERC20, 
    owner:SignerWithAddress
):Promise<StakingPlatform> {
    const contractFactory = 
        await ethers.getContractFactory("StakingPlatform", owner);
    const contract = await contractFactory.deploy() as StakingPlatform;
    
    await contract.deployed();
    await contract.setStakingToken(tokenToStake.address);
    await contract.setRewardToken(rewardToken.address);
    await contract.setLock(false);
    
    return contract;
}

export async function deployMAERC20(name: string, owner: SignerWithAddress)
: Promise<IERC20> {
    const contractFactory =
        await ethers.getContractFactory(maerc20.abi, maerc20.bytecode, owner);
    const contract = await contractFactory.deploy(name, name) as IERC20;
    await contract.deployed();
    return contract;
}