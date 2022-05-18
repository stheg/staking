import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, network } from "hardhat";
import { toDate } from "../scripts/misc";
import { provideLiquidityForTests } from "../scripts/provide-liquidity";
import { IERC20, StakingPlatform } from "../typechain-types";
import { testDeployment } from "./test-deployment";

describe("unstake", () => {
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

    it("should revert if staked amount = 0", async () => {
        const tx = contract.unstake();
        await expect(tx).to.be.revertedWith("Cannot unstake yet");
    });

    it("should revert if too early", async () => {
        //preparing
        const halfOfAmount = Math.floor(availableLpTokenBalance.toNumber() / 2);
        await stakingToken.approve(contract.address, 2 * halfOfAmount);
        await contract.stake(halfOfAmount);
        const unstakeDelay = await contract.getUnstakeDelay();
        await network.provider.send(
            "evm_increaseTime",
            [unstakeDelay.toNumber() - 60]//-60 seconds
        );
        //action
        const tx = contract.unstake();
        //checks
        await expect(tx).to.be.revertedWith("Cannot unstake yet");
    });

    it("should reset staked amount to 0", async () => {
        //preparing
        const halfOfAmount = Math.floor(availableLpTokenBalance.toNumber() / 2);
        await stakingToken.approve(contract.address, 2 * halfOfAmount);
        await contract.stake(halfOfAmount);
        const unstakeDelay = await contract.getUnstakeDelay();
        await network.provider.send(
            "evm_increaseTime",
            [unstakeDelay.toNumber() + 60]//+60 seconds
        );
        //action
        await contract.unstake();
        //checks
        let [stakedAmount, , ,] = await contract.getDetails(staker.address);
        expect(stakedAmount.toNumber()).eq(0);
    });

    it("should calculate reward", async () => {
        //preparing
        const oneThird = Math.floor(availableLpTokenBalance.toNumber() / 3);
        await stakingToken.approve(contract.address, 3 * oneThird);
        await contract.stake(oneThird);
        const rewardPercentage = await contract.getRewardPercentage();
        const rewardDelay = await contract.getRewardDelay();
        const unstakeDelay = await contract.getUnstakeDelay();
        await network.provider.send(
            "evm_increaseTime",
            [unstakeDelay.toNumber() + 60]//+60 seconds
        );
        const periods = Math.floor(
            unstakeDelay.toNumber() / rewardDelay.toNumber()
        );
        let expectedReward =
            Math.floor(oneThird * periods * rewardPercentage.toNumber() / 100);
        //action
        await contract.unstake();
        //checks
        let [, actualReward, ,] = await contract.getDetails(staker.address);
        expect(actualReward.toNumber()).eq(expectedReward);
    });

    it("shouldn't calculate reward if too early", async () => {
        //preparing
        const rewardDelay = await contract.getRewardDelay();
        const moreThanUnstakeDelayLessThanRewardDelay = 
            rewardDelay.toNumber() - 60;//-60 seconds
        await contract.connect(owner).setUnstakeDelay(
            moreThanUnstakeDelayLessThanRewardDelay - 60//-60 seconds
        );
        const oneThird = Math.floor(availableLpTokenBalance.toNumber() / 3);
        await stakingToken.approve(contract.address, 3 * oneThird);
        await contract.stake(oneThird);

        await network.provider.send(
            "evm_increaseTime",
            [moreThanUnstakeDelayLessThanRewardDelay]
        );
        //action
        let expectedReward = 0;
        await contract.unstake();
        //checks
        let [, actualReward, ,] = await contract.getDetails(staker.address);
        expect(actualReward.toNumber()).eq(expectedReward);
    });

    it("should change last reward date after reward calculation", async () => {
        //preparing
        const oneThird = Math.floor(availableLpTokenBalance.toNumber() / 3);
        await stakingToken.approve(contract.address, 3 * oneThird);
        await contract.stake(oneThird);
        let [, , , lastRewardDate1] =
            await contract.getDetails(staker.address);
        const unstakeDelay = await contract.getUnstakeDelay();
        const rewardDelay = await contract.getRewardDelay();
        await network.provider.send(
            "evm_increaseTime",
            [Math.max(rewardDelay.toNumber(), unstakeDelay.toNumber()) + 60]
        );
        //action
        await contract.unstake();
        //checks
        let [, , , lastRewardDate2] =
            await contract.getDetails(staker.address);
        expect(toDate(lastRewardDate2)).greaterThan(toDate(lastRewardDate1));
    });
});