import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { provideLiquidityForTests } from "../scripts/provide-liquidity";
import { IERC20, StakingPlatform } from "../typechain-types";
import { testDeployment } from "./test-deployment";

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

    describe("unlocked state", () => {
        it("setRewardToken should revert", async () => {
            const tx = contract.connect(owner).setRewardToken(stakingToken.address);
            await expect(tx).to.be.revertedWith("Should be locked");
        });

        it("setStakingToken should revert", async () => {
            const tx = contract.connect(owner).setStakingToken(rewardToken.address);
            await expect(tx).to.be.revertedWith("Should be locked");
        });
    });

    describe("locked state", () => {
        it("stake should revert ", async () => {
            await contract.connect(owner).setLock(true);
            const tx = contract.stake(1);
            await expect(tx).to.be.revertedWith("Functionality is locked");
        });

        it("unstake should revert ", async () => {
            await contract.connect(owner).setLock(true);
            const tx = contract.unstake();
            await expect(tx).to.be.revertedWith("Functionality is locked");
        });

        it("claim should revert ", async () => {
            await contract.connect(owner).setLock(true);
            const tx = contract.claim();
            await expect(tx).to.be.revertedWith("Functionality is locked");
        });
    });
});