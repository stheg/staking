import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { provideLiquidityForTests } from "../scripts/provide-liquidity";
import { IERC20, StakingPlatform } from "../typechain-types";
import { testDeployment } from "./test-deployment";

describe("stake functions", () => {
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

    it("should work", async () => {
        await stakingToken.approve(contract.address, availableLpTokenBalance);

        await contract.stake(availableLpTokenBalance);

        const [stakedAmount,,,] = 
            await contract.getDetails(staker.address);
        expect(stakedAmount).eq(availableLpTokenBalance);
    });
});