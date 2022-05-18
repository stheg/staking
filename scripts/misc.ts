import { BigNumber } from "ethers";
import { network } from "hardhat";

export function toDate(i: BigNumber) { return new Date(i.toNumber() * 1000); }

export async function delay(delayInSeconds:BigNumber,extraSeconds:number=0) {
    await network.provider.send(
        "evm_increaseTime",
        [delayInSeconds.toNumber() + extraSeconds]//+extra seconds
    );
}