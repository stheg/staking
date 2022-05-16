//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import ".././contracts/IERC20.sol";
import "../.././erc20/contracts/MAERC20.sol";

/// @title Staking Platform
/// @notice Allows to stake ERC-20 tokens and get reward for holding.
/// @notice Has determined reward rate, claim delay and unstake delay
contract StakingPlatform {
    struct Stake {
        uint256 amount;
        uint256 reward;
        uint256 unstakeDate;
        uint256 claimDate;
    }

    /// @notice Informs that reward rate is changed
    event RewardRateChanged(uint256 indexed rewardPercentage);
    /// @notice Informs that reward delay is changed
    event RewardDelayChanged(uint256 indexed rewardDelay);
    /// @notice Informs that unstake delay is changed
    event UnstakeDelayChanged(uint256 indexed unstakeDelay);

    uint256 public rewardPercentage = 20;
    uint256 public rewardDelay = 10 minutes;
    uint256 public unstakeDelay = 20 minutes;

    address private _owner;
    IERC20 private _stakingToken;
    MAERC20 private _rewardToken;
    mapping(address => Stake) private _stakes;

    modifier authorized() {
        require(msg.sender == _owner, "Not athorized");
        _;
    }

    constructor(address stakingToken, address rewardToken) {
        _stakingToken = IERC20(stakingToken);
        //should we create or use existing one?
        //in case 1: we can mint
        //in case 2: we expect we have enough tokens to send
        _rewardToken = MAERC20(rewardToken);
        _owner = msg.sender;
    }

    function setRewardPercentage(uint256 newRewardPercentage)
        public
        authorized
    {
        rewardPercentage = newRewardPercentage;
        emit RewardRateChanged(newRewardPercentage);
    }

    function setRewardDelay(uint256 newRewardDelay) public authorized {
        rewardDelay = newRewardDelay;
        emit RewardDelayChanged(newRewardDelay);
    }

    function setUnstakeDelay(uint256 newUnstakeDelay) public authorized {
        unstakeDelay = newUnstakeDelay;
        emit UnstakeDelayChanged(newUnstakeDelay);
    }

    function stake(uint256 amount) public {
        Stake storage staking = _stakes[msg.sender];
        staking.unstakeDate = block.timestamp + unstakeDelay;
        staking.claimDate = block.timestamp + rewardDelay;
        staking.amount += amount;
        _stakingToken.transferFrom(msg.sender, address(this), amount);
    }

    function unstake() public {
        Stake storage staking = _stakes[msg.sender];
        if (staking.amount > 0 && block.timestamp <= staking.unstakeDate)
            revert("Nothing to unstake yet");
        uint256 availableAmount = staking.amount;
        staking.amount = 0;
        _stakingToken.transfer(msg.sender, availableAmount);
    }

    function claim() public {
        Stake storage staking = _stakes[msg.sender];
        if (block.timestamp <= staking.claimDate)
            revert("Nothing to claim yet");
        (uint256 reward, uint256 rest) = _getTotalRewardUnsafely(
            staking.amount, 
            staking.reward
        );
        staking.reward = 0;
        _rewardToken.transfer(msg.sender, reward);
        staking.reward = rest;
        //wait until more tokens appear
    }

    /// @dev Unchecked calculations to get reward.
    /// @dev if (`currentReward` + calculated) exceeds uint256.MaxValue, then
    /// @dev it returns `currentReward` as `totalReward` and
    /// @dev calculated reward as `rest`.
    /// @dev Can also revert if `rewardPercantage` is a very, VERY big uint256
    function _getTotalRewardUnsafely(
        uint256 availableAmount, 
        uint256 currentReward
    )
        private
        view
        returns (uint256 totalReward, uint256 rest)
    {
        totalReward = currentReward;
        rest = 0;
        //to avoid situation when we get an error and can't finish claim func
        unchecked {
            uint256 part1 = availableAmount * rewardPercentage;
            //make sure there is no overflow
            if (part1 >= availableAmount) {
                part1 = part1 / 100;
            } else {//if (availableAmount >= 100)
                part1 = availableAmount / 100;
                uint256 tmp = part1 * rewardPercentage;
                //make sure there is no overflow again
                if (tmp >= part1)
                    part1 = tmp;
                else
                    revert("Too big reward rate");
            }
            //make sure there is no overflow one more time
            uint256 part2 = totalReward + part1;
            if (part2 >= totalReward && part2 >= part1)
                totalReward = part2;
            else
                rest = part2;
        }
        return (totalReward, rest);
    }
}
