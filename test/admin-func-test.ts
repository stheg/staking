import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { provideLiquidityForTests } from "../scripts/provide-liquidity";
import { IERC20, StakingPlatform } from "../typechain-types";
import { testDeployment } from "../scripts/test-deployment";

describe("lock-unlock functions", () => {
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

        [stakingToken, rewardToken] =
            await provideLiquidityForTests(staker, rewardTokenOwner);

        contract = await testDeployment(stakingToken, rewardToken, owner);
        contract = contract.connect(staker);
    });

    it("only owner can call setLock", async () => {
        const tx = contract.setLock(true);
        await expect(tx).to.be.revertedWith("No access");
    });

    it("only owner can call setRewardPercentage", async () => {
        const tx = contract.setRewardPercentage(10);
        await expect(tx).to.be.revertedWith("No access");
    });

    it("only owner can call setRewardDelay", async () => {
        const tx = contract.setRewardDelay(5);
        await expect(tx).to.be.revertedWith("No access");
    });

    it("only owner can call setUnstakeDelay", async () => {
        const tx = contract.setUnstakeDelay(0);
        await expect(tx).to.be.revertedWith("No access");
    });

    it("only owner can call setRewardToken", async () => {
        const tx = contract.setRewardToken(stakingToken.address);
        await expect(tx).to.be.revertedWith("No access");
    });

    it("only owner can call setStakingToken", async () => {
        const tx = contract.setStakingToken(rewardToken.address);
        await expect(tx).to.be.revertedWith("No access");
    });

    it("only owner can call setRewardToken", async () => {
        const tx = contract.setRewardToken(stakingToken.address);
        await expect(tx).to.be.revertedWith("No access");
    });

    it("one cannot get other's details", async () => {
        const tx = 
            contract.connect(staker).getDetails(rewardTokenOwner.address);
        await expect(tx).to.be.revertedWith("No access");
    });

    it("owner can get someone's details", async () => {
        const tx =
            contract.connect(owner).getDetails(rewardTokenOwner.address);
        await expect(tx).to.not.be.revertedWith("No access");
    });

    it("owner can change reward token ", async () => {
        contract = contract.connect(owner);
        await contract.setLock(true);
        await contract.setRewardToken(stakingToken.address);
        const addr = await contract.getRewardToken();
        await expect(addr).eq(stakingToken.address);
    });

    it("owner can change staking token ", async () => {
        contract = contract.connect(owner);
        await contract.setLock(true);
        await contract.setStakingToken(rewardToken.address);
        const addr = await contract.getStakingToken();
        await expect(addr).eq(rewardToken.address);
    });

    it("setRewardPercentage emits an event ", async () => {
        const newOne = 15;
        const tx = contract.connect(owner).setRewardPercentage(newOne);
        await expect(tx).to.emit(contract, "RewardRateChanged")
            .withArgs(newOne);
    });

    it("setRewardDelay emits an event ", async () => {
        const newOne = 15;
        const tx = contract.connect(owner).setRewardDelay(newOne);
        await expect(tx).to.emit(contract, "RewardDelayChanged")
            .withArgs(newOne);
    });

    it("setUnstakeDelay emits an event ", async () => {
        const newOne = 15;
        const tx = contract.connect(owner).setUnstakeDelay(newOne);
        await expect(tx).to.emit(contract, "UnstakeDelayChanged")
            .withArgs(newOne);
    });

});