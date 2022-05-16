import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { StakingPlatform } from "../typechain-types";
import testDeployment from "./test-deployment";

describe("unstake functions", () => {
    let accounts: SignerWithAddress[];
    let owner: SignerWithAddress;
    let contract: StakingPlatform;

    beforeEach(async function () {
        [accounts, owner, contract] =
            await testDeployment();
    });

    it("should work", async () => {
        const implemented = false;
        expect(implemented).eq(true);
    });
});