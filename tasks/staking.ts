import { task } from "hardhat/config";
import { IERC20, IMintableERC20, StakingPlatform } from "../typechain-types";

task("stake", "Allows to stake some amount of tokens")
    .addParam("contract", "address of the staking platform")
    .addOptionalParam("value", "amount to be approved and staked")
    .addOptionalParam("staker", "address of the account")
    .setAction(async (args, hre) => {
        let [contractOwner, ercOwner, staker] = await hre.ethers.getSigners();
        if (args.staker)
            staker = await hre.ethers.getSigner(args.staker);

        const stakingPlatform = await hre.ethers.getContractAt(
            "StakingPlatform",
            args.contract,
            staker
        ) as StakingPlatform;

        const erc20Addr = await stakingPlatform.getStakingToken();
        const stakingToken = await hre.ethers.getContractAt(
            "IERC20",
            erc20Addr,
            staker
        ) as IERC20;
        
        let amount = args.value ? hre.ethers.BigNumber.from(args.value) 
            : await stakingToken.balanceOf(staker.address);
        
        await stakingToken.approve(stakingPlatform.address, amount);
        await stakingPlatform.stake(amount);
    });

task("unstake", "Allows to unstake some amount of tokens")
    .addParam("contract", "address of the staking platform")
    .addOptionalParam("staker", "address of the account")
    .setAction(async (args, hre) => {
        let [contractOwner, ercOwner, staker] = await hre.ethers.getSigners();
        if (args.staker)
            staker = await hre.ethers.getSigner(args.staker);

        const stakingPlatform = await hre.ethers.getContractAt(
            "StakingPlatform",
            args.contract,
            staker
        ) as StakingPlatform;

        await stakingPlatform.unstake();
    });

task("claim", "Allows to withdraw available reward tokens")
    .addParam("contract", "address of the staking platform")
    .addOptionalParam("staker", "address of the account")
    .setAction(async (args, hre) => {
        let [contractOwner, ercOwner, staker] = await hre.ethers.getSigners();
        if (args.staker)
            staker = await hre.ethers.getSigner(args.staker);

        const stakingPlatform = await hre.ethers.getContractAt(
            "StakingPlatform",
            args.contract,
            staker
        ) as StakingPlatform;

        const erc20Addr = await stakingPlatform.getRewardToken();
        const rewardToken = await hre.ethers.getContractAt(
            "IMintableERC20",
            erc20Addr,
            staker
        ) as IMintableERC20;

        if (hre.network.name == "hardhat") {
            // just for test
            await rewardToken.connect(ercOwner)
                .mint(stakingPlatform.address, 5000);
        }

        let r = await rewardToken.balanceOf(staker.address);
        console.log("Amount of reward tokens before claim: " + r);
        await stakingPlatform.claim();

        r = await rewardToken.balanceOf(staker.address);
        console.log("Current amount of reward tokens: " + r);
    });

task("get-details", "Returns the details")
    .addParam("contract", "address of the staking platform")
    .addOptionalParam("staker", "address of the account")
    .setAction(async (args, hre) => {
        let [contractOwner, ercOwner, staker] = await hre.ethers.getSigners();
        if (args.staker)
            staker = await hre.ethers.getSigner(args.staker);

        const stakingPlatform = await hre.ethers.getContractAt(
            "StakingPlatform",
            args.contract,
            staker
        ) as StakingPlatform;

        const [a, r, ud, rd] = await stakingPlatform.getDetails(staker.address);
        console.log("Amount: " + a);
        console.log("Reward: " + r);
        console.log("Unstake Date: " + ud);
        console.log("Reward Date: " + rd);
    }); 