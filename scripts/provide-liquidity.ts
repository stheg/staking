import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { deployMAERC20 } from "../test/test-deployment";
import { IERC20, IRouter, IUniswapV2Factory } from "../typechain-types";

const uniswapRouter = require("../node_modules/@uniswap/v2-periphery/build/IUniswapV2Router02.json");
const uniswapFactory = require("../node_modules/@uniswap/v2-core/build/IUniswapV2Factory.json");

export async function getFactory(
    signer:SignerWithAddress, 
    atAddress:string | undefined = undefined
):Promise<IUniswapV2Factory> {
    return await ethers.getContractAt(
        uniswapFactory.abi,
        atAddress ?? "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
        signer
    ) as IUniswapV2Factory;
}

export async function getRouter(
    signer:SignerWithAddress, 
    atAddress:string | undefined = undefined
):Promise<IRouter> {
    return await ethers.getContractAt(
        uniswapRouter.abi,
        atAddress ?? "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        signer
    ) as IRouter;
}

export async function provideLiquidityForTests(
    provider: SignerWithAddress,
    rewardTokenOwner: SignerWithAddress
):Promise<[IERC20, IERC20]> {
    const rewardToken = await deployMAERC20("RWD", rewardTokenOwner);
    await rewardToken.mint(provider.address, 50000);
    
    const someToken = await deployMAERC20("SOME", provider);
    await someToken.mint(provider.address, 50000);
    
    const uniFactory = await getFactory(provider);
    const uniRouter = await getRouter(provider);

    const lpToken = await provideLiquidity(
        provider, 
        someToken,
        BigNumber.from(10000),
        rewardToken,
        BigNumber.from(1000), 
        uniFactory,
        uniRouter
    );
    return [lpToken, rewardToken];
}

export async function provideLiquidity(
    provider:SignerWithAddress, 
    tokenA:IERC20,
    amountA:BigNumber,
    tokenB:IERC20,
    amountB:BigNumber,
    uniFactory: IUniswapV2Factory,
    uniRouter: IRouter
):Promise<IERC20> {
    const revertDate = new Date();//today
    const deadline = Math.floor(revertDate.getTime() / 1000) + 30;//+30 sec

    await tokenA.connect(provider).approve(uniRouter.address, amountA);
    await tokenB.connect(provider).approve(uniRouter.address, amountB);

    await uniFactory.createPair(tokenA.address, tokenB.address);

    await uniRouter.addLiquidity(
        tokenA.address,
        tokenB.address,
        amountA,
        amountB,
        amountA,
        amountB,
        provider.address,
        deadline
    );

    const lpToken = await uniFactory.getPair(tokenA.address, tokenB.address);
    const stakingToken = await ethers.getContractAt(
        "IERC20",
        lpToken,
        provider
    ) as IERC20;

    return stakingToken;
}