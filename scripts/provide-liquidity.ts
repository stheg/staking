import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployMAERC20 } from "./test-deployment";
import { IERC20, IUniswapV2Router02, IUniswapV2Factory } from "../typechain-types";
import { ethers } from "hardhat";

export async function getFactory(
    signer:SignerWithAddress, 
    atAddress:string | undefined = undefined
):Promise<IUniswapV2Factory> {
    return await ethers.getContractAt(
        "IUniswapV2Factory",
        atAddress ?? "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
        signer
    ) as IUniswapV2Factory;
}

export async function getRouter(
    signer:SignerWithAddress, 
    atAddress:string | undefined = undefined
):Promise<IUniswapV2Router02> {
    return await ethers.getContractAt(
        "IUniswapV2Router02",
        atAddress ?? "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        signer
    ) as IUniswapV2Router02;
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
        10000,
        rewardToken,
        1000, 
        uniFactory,
        uniRouter
    );
    return [lpToken, rewardToken];
}

export async function provideLiquidity(
    provider:SignerWithAddress, 
    tokenA:IERC20,
    amountA:number,
    tokenB:IERC20,
    amountB:number,
    uniFactory: IUniswapV2Factory,
    uniRouter: IUniswapV2Router02
):Promise<IERC20> {
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const deadline = blockBefore.timestamp + 30;//+30 sec

    await tokenA.connect(provider).approve(uniRouter.address, amountA);
    await tokenB.connect(provider).approve(uniRouter.address, amountB);

    let lpToken = await uniFactory.getPair(tokenA.address, tokenB.address);
    if (lpToken == ethers.constants.AddressZero)
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

    lpToken = await uniFactory.getPair(tokenA.address, tokenB.address);
    const stakingToken = await ethers.getContractAt(
        "IERC20",
        lpToken,
        provider
    ) as IERC20;

    return stakingToken;
}