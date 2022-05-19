import { task } from "hardhat/config";
import { getFactory, getRouter, provideLiquidity } from "../scripts/provide-liquidity";
import { deployMAERC20 } from "../scripts/test-deployment";
import { IERC20, StakingPlatform } from "../typechain-types";

task("provide-liquidity", "Add tokens to a pool and get LP tokens back")
    .addParam("provider", "address of account which provides tokens")
    .addParam("tokenA", "first ERC20 token's address")
    .addParam("tokenB", "second ERC20 token's address")
    .addOptionalParam("amountA", "amount of the first ERC20 token")
    .addOptionalParam("amountB", "amount of the second ERC20 token")
    .addOptionalParam("factory", "address of IUniswapV2Factory")
    .addOptionalParam("router", "address of IUniswapV2Router")
    .setAction(async (args, hre):Promise<IERC20> => {
        let provider = await hre.ethers.getSigner(args.provider);

        const tokenA = await hre.ethers.getContractAt(
            "IERC20",
            args.tokenA,
            provider
        ) as IERC20;
        const tokenB = await hre.ethers.getContractAt(
            "IERC20",
            args.tokenA,
            provider
        ) as IERC20;

        const amountA = args.amountA ?? await tokenA.balanceOf(provider.address);
        const amountB = args.amountB ?? await tokenB.balanceOf(provider.address);
        
        const factory = await getFactory(provider, args.factory);
        const router = await getRouter(provider, args.router);

        const lpToken = await provideLiquidity(
            provider, 
            tokenA, 
            amountA, 
            tokenB, 
            amountB,
            factory,
            router
        );
        console.log("LP token address: " + lpToken.address);
        return lpToken;
    });

task("deploy-token", "Allows to deploy test token")
    .addParam("name", "name & symbol of test token")
    .addParam("value", "amount to mint for a staker")
    .setAction(async (args, hre) => {
        let [contractOwner, ercOwner, staker] = await hre.ethers.getSigners();
        const t = await deployMAERC20(args.name, ercOwner);
        t.mint(staker.address, hre.ethers.BigNumber.from(args.value));
        console.log(args.name + " deployed: " + t.address);
    });

task("set-token", "Allows to set reward token")
    .addParam("contract", "address of the staking platform")
    .addParam("type", "set reward or staking token")
    .addParam("token", "address of the new reward token")
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