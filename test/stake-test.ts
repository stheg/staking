import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { delay, toDate } from "../scripts/misc";
import { provideLiquidityForTests } from "../scripts/provide-liquidity";
import { IERC20, StakingPlatform } from "../typechain-types";
import { testDeployment } from "../scripts/test-deployment";

describe("stake", () => {
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

    it("should increase staked amount", async () => {
        const half = Math.floor(availableLpTokenBalance.toNumber() / 2);
        await stakingToken.approve(contract.address, 2 * half);

        //stake #1
        await contract.stake(half);
        let [stakedAmount, , ,] = await contract.getDetails(staker.address);
        expect(stakedAmount).eq(half);

        //stake #2 should increase amount
        await contract.stake(half);
        [stakedAmount, , ,] = await contract.getDetails(staker.address);
        expect(stakedAmount).eq(2 * half);
    });

    it("should change dates", async () => {
        const half = Math.floor(availableLpTokenBalance.toNumber() / 2);
        await stakingToken.approve(contract.address, 2 * half);

        //stake #1
        await contract.stake(half);
        let [, , lastStakeDate1, lastRewardDate1] = 
            await contract.getDetails(staker.address);
        //stake #2 should set new dates
        await contract.stake(half);
        let [, , lastStakeDate2, lastRewardDate2] =
            await contract.getDetails(staker.address);

        expect(toDate(lastStakeDate2)).greaterThan(toDate(lastStakeDate1));
        expect(toDate(lastRewardDate2)).greaterThan(toDate(lastRewardDate1));
    });

    it("should accumulate rewards", async () => {
        const oneThird = Math.floor(availableLpTokenBalance.toNumber() / 3);
        await stakingToken.approve(contract.address, 3 * oneThird);

        //stake #1
        await contract.stake(oneThird);
        
        const rewardPercentage = await contract.getRewardPercentage();
        const rewardDelay = await contract.getRewardDelay();
        await delay(rewardDelay);
        let expectedReward = 
            Math.floor(oneThird * rewardPercentage.toNumber() / 100);

        //stake #2 should calculate reward
        await contract.stake(oneThird);
        let [, actualReward, ,] = await contract.getDetails(staker.address);
        expect(actualReward.toNumber()).eq(expectedReward);

        expectedReward +=
            Math.floor(2*oneThird * rewardPercentage.toNumber() / 100);

        await delay(rewardDelay);

        //stake #3 should calculate again and increase prev amount
        await contract.stake(oneThird);
        [, actualReward, ,] = await contract.getDetails(staker.address);
        expect(actualReward.toNumber()).eq(expectedReward);
    });

    it("shouldn't calculate reward if too early", async () => {
        const oneThird = Math.floor(availableLpTokenBalance.toNumber() / 3);
        await stakingToken.approve(contract.address, 3 * oneThird);

        //stake #1
        await contract.stake(oneThird);

        const rewardDelay = await contract.getRewardDelay();
        await delay(rewardDelay, -60);//-60 seconds

        const expectedReward = 0;
        //stake #2 shouln't calculate reward because it is too early
        await contract.stake(oneThird);
        let [, actualReward, ,] = await contract.getDetails(staker.address);
        expect(actualReward.toNumber()).eq(expectedReward);
    });
});