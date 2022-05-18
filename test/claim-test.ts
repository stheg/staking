import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { delay, toDate } from "../scripts/misc";
import { provideLiquidityForTests } from "../scripts/provide-liquidity";
import { IERC20, StakingPlatform } from "../typechain-types";
import { testDeployment } from "./test-deployment";

describe("claim", () => {
    let accounts: SignerWithAddress[];
    let owner: SignerWithAddress;
    let rewardTokenOwner: SignerWithAddress;
    let staker: SignerWithAddress;
    let contract: StakingPlatform;
    let stakingToken: IERC20;
    let rewardToken: IERC20;
    let availableLpTokenBalance: BigNumber;

    beforeEach(async () => {
        accounts = await ethers.getSigners();
        rewardTokenOwner = accounts[0];
        owner = accounts[1];
        staker = accounts[2];

        [stakingToken, rewardToken] =
            await provideLiquidityForTests(staker, rewardTokenOwner);

        availableLpTokenBalance = await stakingToken.balanceOf(staker.address);

        contract = await testDeployment(stakingToken, rewardToken, owner);
        contract = contract.connect(staker);

        await rewardToken.connect(rewardTokenOwner)
            .mint(contract.address, 50000);
    });

    it("should revert if reward = 0", async () => {
        const tx = contract.claim();
        await expect(tx).to.be.revertedWith("Nothing to claim yet");
    });

    it("should revert if too early", async () => {
        //environment
        const halfOfAmount = Math.floor(availableLpTokenBalance.toNumber() / 2);
        await stakingToken.approve(contract.address, 2 * halfOfAmount);
        await contract.stake(halfOfAmount);
        const rewardDelay = await contract.getRewardDelay();
        //current test config
        await delay(rewardDelay, -60);//-60 seconds
        //action
        const tx = contract.claim();
        //checks
        await expect(tx).to.be.revertedWith("Nothing to claim yet");
    });

    it("shouldn't change amount, but should reset reward to 0", async () => {
        //environment
        const halfOfAmount = Math.floor(availableLpTokenBalance.toNumber() / 2);
        await stakingToken.approve(contract.address, 2 * halfOfAmount);
        await contract.stake(halfOfAmount);
        //current test config
        const rewardDelay = await contract.getRewardDelay();
        await delay(rewardDelay, 60);
        const [amountBefore, , ,] = await contract.getDetails(staker.address);
        //action
        await contract.claim();
        //checks
        const [amountAfter, reward, ,] = await contract.getDetails(staker.address);
        expect(amountAfter).eq(amountBefore);
        expect(reward.toNumber()).eq(0);
    });

    it("should transfer accumulated rewards for passed periods", async () => {
        //environment
        const oneThird = Math.floor(availableLpTokenBalance.toNumber() / 3);
        await stakingToken.approve(contract.address, 3 * oneThird);
        await contract.stake(oneThird);
        //current test config
        const rewardPercentage = await contract.getRewardPercentage();
        const rewardDelay = await contract.getRewardDelay();
        const periods = 2;
        await delay(rewardDelay.mul(periods), 60);//+60 seconds
        const expectedReward =
            Math.floor(oneThird * periods * rewardPercentage.toNumber() / 100);
        //action
        const balanceBefore = await rewardToken.balanceOf(staker.address);
        await contract.claim();
        //checks
        const balanceAfter = await rewardToken.balanceOf(staker.address);
        expect(balanceAfter).eq(balanceBefore.add(expectedReward));
    });

    it("should transfer sum of saved reward and calculated one", async () => {
        //environment
        const oneThird = Math.floor(availableLpTokenBalance.toNumber() / 3);
        await stakingToken.approve(contract.address, 3 * oneThird);
        await contract.stake(oneThird);
        //current test config
        const rewardPercentage = await contract.getRewardPercentage();
        const rewardDelay = await contract.getRewardDelay();
        await delay(rewardDelay, 60);//+60 seconds
        await contract.stake(oneThird);
        const [currentAmount, savedReward,,] = 
            await contract.getDetails(staker.address);
        //action
        await delay(rewardDelay, 60);//+60 seconds
        const expectedCalculatedReward =
            Math.floor(currentAmount.mul(rewardPercentage).div(100).toNumber());
        const balanceBefore = await rewardToken.balanceOf(staker.address);
        await contract.claim();
        //checks
        const balanceAfter = await rewardToken.balanceOf(staker.address);
        expect(balanceAfter)
            .eq(balanceBefore.add(expectedCalculatedReward).add(savedReward));
    });

    it("shouldn't add reward for another period if too early", async () => {
        //environment
        const oneThird = Math.floor(availableLpTokenBalance.toNumber() / 3);
        await stakingToken.approve(contract.address, 3 * oneThird);
        await contract.stake(oneThird);
        //current test config
        const rewardPercentage = await contract.getRewardPercentage();
        const rewardDelay = await contract.getRewardDelay();
        const periods = 2;
        /// wait for ALMOST 3 reward periods
        await delay(rewardDelay.mul(periods+1), -120);//-120 seconds
        /// it should be rewards only for 2 periods, not 3
        let expectedReward = Math.floor(
            oneThird * periods * rewardPercentage.toNumber() / 100
        );
        //action
        const balanceBefore = await rewardToken.balanceOf(staker.address);
        await contract.claim();
        //checks
        const balanceAfter = await rewardToken.balanceOf(staker.address);
        expect(balanceAfter.toNumber())
            .eq(balanceBefore.add(expectedReward).toNumber());
    });

    it("should change last reward date after reward calculation", async () => {
        //environment
        const oneThird = Math.floor(availableLpTokenBalance.toNumber() / 3);
        await stakingToken.approve(contract.address, 3 * oneThird);
        await contract.stake(oneThird);
        //current test config
        let [, , , lastRewardDate1] =
            await contract.getDetails(staker.address);
        const rewardDelay = await contract.getRewardDelay();
        await delay(rewardDelay, 60);
        //action
        await contract.claim();
        //checks
        let [, , , lastRewardDate2] = 
            await contract.getDetails(staker.address);
        expect(toDate(lastRewardDate2)).greaterThan(toDate(lastRewardDate1));
    });
});