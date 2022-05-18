import { BigNumber } from "ethers";

export function toDate(i: BigNumber) { return new Date(i.toNumber() * 1000); }