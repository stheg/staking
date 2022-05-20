import { task } from "hardhat/config";
import { StakingPlatform, IUniswapV2Router02, IUniswapV2Factory, IMintableERC20, IUniswapV2Pair } from "../typechain-types";
const maerc20 = require("../required-data/MAERC20.json");

task("provide-liquidity", "Add tokens to a pool and get LP tokens back")
    .addParam("provider", "address of account which provides tokens")
    .addParam("tokena", "first ERC20 token's address")
    .addParam("tokenb", "second ERC20 token's address")
    .addParam("amounta", "amount of the first ERC20 token")
    .addOptionalParam("amountb", "amount of the second ERC20 token")
    .addOptionalParam("factory", "address of IUniswapV2Factory")
    .addOptionalParam("router", "address of IUniswapV2Router")
    .setAction(async (args, hre): Promise<IUniswapV2Pair> => {
        let provider = await hre.ethers.getSigner(args.provider);
        const accounts = await hre.ethers.getSigners();

        const tokenA = await hre.ethers.getContractAt(
            "IMintableERC20",
            args.tokena,
            provider
        ) as IMintableERC20;
        const tokenB = await hre.ethers.getContractAt(
            "IMintableERC20",
            args.tokenb,
            provider
        ) as IMintableERC20;

        const factory = await hre.ethers.getContractAt(
            "IUniswapV2Factory",
            args.factory ?? "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
            provider
        ) as IUniswapV2Factory;
        
        let ratio = 10;
        let lpTokenAddr = await factory.getPair(tokenA.address, tokenB.address);
        let lpToken:IUniswapV2Pair;
        if (lpTokenAddr != hre.ethers.constants.AddressZero) {
            lpToken = await hre.ethers.getContractAt(
                "IUniswapV2Pair",
                lpTokenAddr,
                provider
            ) as IUniswapV2Pair
            const [a, b] = await lpToken.getReserves();
            if (!a.isZero() && !b.isZero())
                ratio = a.div(b).toNumber();
        }

        const amountA = hre.ethers.BigNumber.from(args.amounta);
        //input or amountA / ration
        const amountB = args.amountb ?
            hre.ethers.BigNumber.from(args.amountb) : 
            amountA.div(ratio);
        
        const router = await hre.ethers.getContractAt(
            "IUniswapV2Router02",
            args.router ?? "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
            provider
        ) as IUniswapV2Router02;

        const blockNumBefore = await hre.ethers.provider.getBlockNumber();
        const blockBefore = await hre.ethers.provider.getBlock(blockNumBefore);
        const deadline = blockBefore.timestamp + 120;//+120 sec

        await tokenA.connect(provider).approve(router.address, amountA);
        await tokenB.connect(provider).approve(router.address, amountB);

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
        lpToken = await hre.ethers.getContractAt(
            "IUniswapV2Pair",
            lpTokenAddr,
            provider
        ) as IUniswapV2Pair;

        console.log("LP token address: " + lpToken.address);
        return lpToken;
    });

// task("provide-liquidity-eth", "Add tokens to a pool and get LP tokens back")
//     .addParam("provider", "address of account which provides tokens")
//     .addParam("tokena", "ERC20 token's address")
//     .addOptionalParam("amounta", "amount of the first ERC20 token")
//     .addOptionalParam("amounteth", "amount of ETH")
//     .addOptionalParam("factory", "address of IUniswapV2Factory")
//     .addOptionalParam("router", "address of IUniswapV2Router")
//     .setAction(async (args, hre): Promise<IUniswapV2Pair> => {
//         let provider = await hre.ethers.getSigner(args.provider);
//         const accounts = await hre.ethers.getSigners();

//         const tokenA = await hre.ethers.getContractAt(
//             "IMintableERC20",
//             args.tokena,
//             provider
//         ) as IMintableERC20;

//         const amountA = args.amounta ?
//             hre.ethers.BigNumber.from(args.amounta) :
//             await tokenA.balanceOf(provider.address);
//         await tokenA.connect(accounts[1])
//             .mint(provider.address, amountA.mul(2));
        
//         const factory = await hre.ethers.getContractAt(
//             "IUniswapV2Factory",
//             args.factory ?? "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
//             provider
//         ) as IUniswapV2Factory;

//         const router = await hre.ethers.getContractAt(
//             "IUniswapV2Router02",
//             args.router ?? "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
//             provider
//         ) as IUniswapV2Router02;

//         const blockNumBefore = await hre.ethers.provider.getBlockNumber();
//         const blockBefore = await hre.ethers.provider.getBlock(blockNumBefore);
//         const deadline = blockBefore.timestamp + 30;//+30 sec

//         await tokenA.connect(provider).approve(router.address, amountA);
        
//         let wETH = "0x";
//         let lpTokenAddr = await factory.getPair(tokenA.address, wETH);

//         await router.addLiquidityETH(
//             tokenA.address,
//             amountA,
//             amountA,
//             eth,
//             provider.address,
//             deadline,
//             {value:eth}
//         );

//         lpTokenAddr = await factory.getPair(tokenA.address, wETH);
//         const lpToken = await hre.ethers.getContractAt(
//             "IUniswapV2Pair",
//             lpTokenAddr,
//             provider
//         ) as IUniswapV2Pair;

//         console.log("LP token address: " + lpToken.address);
//         return lpToken;
//     });

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
        ) as IMintableERC20;
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