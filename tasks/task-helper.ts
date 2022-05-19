import { task } from "hardhat/config";
import { IERC20, StakingPlatform, IUniswapV2Router02, IUniswapV2Factory } from "../typechain-types";
const maerc20 = require("../required-data/MAERC20.json");

task("provide-liquidity", "Add tokens to a pool and get LP tokens back")
    .addParam("provider", "address of account which provides tokens")
    .addParam("tokena", "first ERC20 token's address")
    .addParam("tokenb", "second ERC20 token's address")
    .addOptionalParam("amounta", "amount of the first ERC20 token")
    .addOptionalParam("amountb", "amount of the second ERC20 token")
    .addOptionalParam("factory", "address of IUniswapV2Factory")
    .addOptionalParam("router", "address of IUniswapV2Router")
    .setAction(async (args, hre):Promise<IERC20> => {
        let provider = await hre.ethers.getSigner(args.provider);
        const accounts = await hre.ethers.getSigners();
        console.log(accounts[2].address == provider.address);

        const tokenA = await hre.ethers.getContractAt(
            "IERC20",
            args.tokena,
            provider
        ) as IERC20;
        const tokenB = await hre.ethers.getContractAt(
            "IERC20",
            args.tokenb,
            provider
        ) as IERC20;

        const amountA = args.amounta ? 
            hre.ethers.BigNumber.from(args.amounta) : 
            await tokenA.balanceOf(provider.address);
        await tokenA.connect(accounts[1])
            .mint(provider.address, amountA.mul(2));
        console.log("Amount A: " + await tokenA.balanceOf(provider.address));
        const amountB = args.amountb ?
            hre.ethers.BigNumber.from(args.amountb) : 
            await tokenB.balanceOf(provider.address);
        await tokenB.connect(accounts[1])
            .mint(provider.address, amountB.mul(2));
        console.log("Amount B: " + await tokenB.balanceOf(provider.address));

        const factory = await hre.ethers.getContractAt(
            "IUniswapV2Factory",
            args.factory ?? "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
            provider
        ) as IUniswapV2Factory;

        const router = await hre.ethers.getContractAt(
            "IUniswapV2Router02",
            args.router ?? "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
            provider
        ) as IUniswapV2Router02;

        const deadline = Math.floor(new Date().getTime() / 1000) + 30;//+30 sec

        await tokenA.connect(provider).approve(router.address, amountA);
        await tokenB.connect(provider).approve(router.address, amountB);

        let lpTokenAddr = await factory.getPair(tokenA.address, tokenB.address);
        if (lpTokenAddr == hre.ethers.constants.AddressZero)
            await factory.createPair(tokenA.address, tokenB.address);

        await router.addLiquidity(
            tokenA.address,
            tokenB.address,
            amountA,
            amountB,
            amountA,
            amountB,
            provider.address,
            deadline
        );
 
        lpTokenAddr = await factory.getPair(tokenA.address, tokenB.address);
        const lpToken = await hre.ethers.getContractAt(
            "IERC20",
            lpTokenAddr,
            provider
        ) as IERC20;

        console.log("LP token address: " + lpToken.address);
        return lpToken;
    });

task("deploy-token", "Allows to deploy test token")
    .addParam("n", "name & symbol of test token")
    .addParam("v", "amount to mint for a staker")
    .setAction(async (args, hre) => {
        let [contractOwner, erc20Owner, staker] = 
            await hre.ethers.getSigners();
        const contractFactory = await hre.ethers.getContractFactory(
            maerc20.abi, 
            maerc20.bytecode, 
            erc20Owner
        );
        const erc20 = await contractFactory.deploy(
            args.n, 
            args.n
        ) as IERC20;
        await erc20.deployed();
        erc20.mint(staker.address, hre.ethers.BigNumber.from(args.v));
        console.log(args.n + " deployed: " + erc20.address);
    });

task("set-token", "Allows to set reward token")
    .addParam("contract", "address of the staking platform")
    .addParam("type", "set reward or staking token")
    .addParam("token", "address of the new reward token")
    .addFlag("unlock", "Unlocks the platforms")
    .setAction(async (args, hre) => {
        let [contractOwner, ercOwner, staker] = await hre.ethers.getSigners();

        const stakingPlatform = await hre.ethers.getContractAt(
            "StakingPlatform",
            args.contract,
            contractOwner
        ) as StakingPlatform;

        await stakingPlatform.setLock(true);
        if (args.type == "reward")
            await stakingPlatform.setRewardToken(args.token);
        else
            await stakingPlatform.setStakingToken(args.token);
        if (args.unlock)
            await stakingPlatform.setLock(false);
    });

task("set-period", "Allows to set reward token")
    .addParam("contract", "address of the staking platform")
    .addParam("type", "set reward or unstake period")
    .addParam("value", "new period in minutes")
    .setAction(async (args, hre) => {
        let [contractOwner, ercOwner, staker] = await hre.ethers.getSigners();

        const stakingPlatform = await hre.ethers.getContractAt(
            "StakingPlatform",
            args.contract,
            contractOwner
        ) as StakingPlatform;

        const delay = hre.ethers.BigNumber.from(args.value).mul(60);

        if (args.type == "reward")
            await stakingPlatform.setRewardDelay(delay);
        else
            await stakingPlatform.setUnstakeDelay(delay);

        const rewardDelay = await stakingPlatform.getRewardDelay();
        const unstakeDelay = await stakingPlatform.getUnstakeDelay();
        console.log("reward: " + rewardDelay + ", unstake: " + unstakeDelay)
    });