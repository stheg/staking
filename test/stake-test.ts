import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { IERC20, StakingPlatform } from "../typechain-types";
import { testDeployment, getTokenContract } from "./test-deployment";

describe("stake functions", () => {
    let accounts: SignerWithAddress[];
    let owner: SignerWithAddress;
    let rewardTokenOwner: SignerWithAddress;
    let staker: SignerWithAddress;
    let contract: StakingPlatform;
    let stakingToken: IERC20;
    let rewardToken: IERC20;

    beforeEach(async () => {
        accounts = await ethers.getSigners();
        rewardTokenOwner = accounts[0];
        owner = accounts[1];
        staker = accounts[2];

        //TODO: provide liquidity and get lpToken

        //lpToken.address
        const stakingTokenAddr = "0x0d1e5112B7Bf0595837f6e19A8233e8b918Ef3aA";
        const rewardTokenAddr = "0x1A13F7fB13BCa03FF646702C6Af9D699729A0C1d";
        stakingToken = await getTokenContract(stakingTokenAddr, staker, uniV2);
        rewardToken = await getTokenContract(rewardTokenAddr, staker, maerc20); 

        contract = await testDeployment(stakingToken, rewardToken, owner);
        contract = contract.connect(staker);
    });

    it("should work", async () => {
        // const amount = await stakingToken.balanceOf(staker.address);
        // console.log(amount);
        // await stakingToken.approve(contract.address, amount);

        // //const tx = 
        // await contract.stake(amount);

        // //await expect(tx)

        // const [actualAmount,,,] = 
        //     await contract.getDetails(staker.address);
        // expect(actualAmount).eq(amount);
    });
});