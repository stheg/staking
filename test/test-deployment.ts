import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { IERC20, StakingPlatform } from "../typechain-types";

export async function testDeployment(
    tokenToStake:IERC20, 
    rewardToken:IERC20, 
    owner:SignerWithAddress
):Promise<StakingPlatform> {
    const contractFactory = 
        await ethers.getContractFactory("StakingPlatform", owner);
    const contract = await contractFactory.deploy(
        tokenToStake.address, 
        rewardToken.address
    ) as StakingPlatform;
    
    await contract.deployed();

    return contract;
}

export async function getTokenContract(address:string, owner:SignerWithAddress, abi:string)
    :Promise<IERC20> 
{
    //const contractFactory = await ethers.getContractFactory(, owner);
    const contract = await ethers.getContractAt(
        abi,
        address, 
        //contractFactory.interface, 
        owner
    ) as IERC20;

    return contract;
}