//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import ".././contracts/IERC20.sol";

/// @title Staking Platform
/// @notice Allows to stake ERC-20 tokens and get reward for holding.
/// @notice Has determined reward rate, claim delay and unstake delay
contract StakingPlatform {
    struct Stake {
        uint256 amount;
        uint256 reward;
        uint256 lastStakeDate;
        uint256 lastRewardDate;
    }

    /// @notice Informs that reward rate is changed
    event RewardRateChanged(uint256 indexed rewardPercentage);
    /// @notice Informs that reward delay is changed
    event RewardDelayChanged(uint256 indexed rewardDelay);
    /// @notice Informs that unstake delay is changed
    event UnstakeDelayChanged(uint256 indexed unstakeDelay);

    uint256 private _rewardPercentage = 20;
    uint256 private _rewardDelay = 10 minutes;
    uint256 private _unstakeDelay = 20 minutes;

    bool private _isLocked = false;
    address private _owner;
    IERC20 private _stakingToken;
    IERC20 private _rewardToken;
    mapping(address => Stake) private _stakes;

    modifier onlyOwner() {
        require(msg.sender == _owner, "No access");
        _;
    }

    modifier whenLocked() {
        require(_isLocked, "Should be locked");
        _;
    }

    modifier whenUnlocked() {
        require(!_isLocked, "Functionality is locked");
        _;
    }

    constructor(address stakingToken, address rewardToken) {
        _stakingToken = IERC20(stakingToken);
        _rewardToken = IERC20(rewardToken);
        _owner = msg.sender;
    }

    function getRewardPercentage() external view returns(uint256) {
        return _rewardPercentage;
    }
    
    function getRewardDelay() external view returns(uint256) {
        return _rewardDelay;
    }

    function getUnstakeDelay() external view returns(uint256) {
        return _unstakeDelay;
    }

    function getDetails(address staker) external view returns(Stake memory) {
        require(msg.sender == staker || msg.sender == _owner, "No access");
        return _stakes[staker];
    }

    function setLock(bool value) external onlyOwner {
        _isLocked = value;
    }

    function setRewardPercentage(uint256 newRewardPercentage)
        public
        onlyOwner
    {
        _rewardPercentage = newRewardPercentage;
        emit RewardRateChanged(newRewardPercentage);
    }

    function setRewardDelay(uint256 newRewardDelay) public onlyOwner {
        _rewardDelay = newRewardDelay;
        emit RewardDelayChanged(newRewardDelay);
    }

    function setUnstakeDelay(uint256 newUnstakeDelay) public onlyOwner {
        _unstakeDelay = newUnstakeDelay;
        emit UnstakeDelayChanged(newUnstakeDelay);
    }

    function setRewardToken(address newRewardToken) 
        public 
        onlyOwner 
        whenLocked 
    {
        _rewardToken = IERC20(newRewardToken);
    }

    function setStakingToken(address newStakingToken) 
        public 
        onlyOwner 
        whenLocked 
    {
        _stakingToken = IERC20(newStakingToken);
    }

    function stake(uint256 amount) public whenUnlocked {
        Stake memory staking = _stakes[msg.sender];

        uint256 calculatedReward = _calculateCurrentReward(
            staking.amount, 
            _getRewardPeriodsNumber(staking.lastRewardDate)
        );

        _stakes[msg.sender].reward = staking.reward + calculatedReward;
        _stakes[msg.sender].lastRewardDate = block.timestamp;
        _stakes[msg.sender].lastStakeDate = block.timestamp;
        _stakes[msg.sender].amount += amount;
        
        _stakingToken.transferFrom(msg.sender, address(this), amount);
    }

    function unstake() public whenUnlocked {
        Stake memory staking = _stakes[msg.sender];
        require(
            staking.amount > 0 &&
            block.timestamp > staking.lastStakeDate + _unstakeDelay,
            "Cannot unstake yet"
        );
        uint256 stakedAmount = staking.amount;
        _stakes[msg.sender].amount = 0;

        uint256 periods = _getRewardPeriodsNumber(staking.lastRewardDate);
        uint256 reward = _calculateCurrentReward(stakedAmount, periods);
        
        _stakes[msg.sender].reward = reward;
        _stakes[msg.sender].lastRewardDate =
            staking.lastRewardDate + periods * _rewardDelay;
        
        _stakingToken.transfer(msg.sender, stakedAmount);
    }

    function claim() public whenUnlocked {
        Stake memory staking = _stakes[msg.sender];
        require(
            staking.reward > 0 &&
            block.timestamp > staking.lastRewardDate + _rewardDelay,
            "Nothing to claim yet"
        );
        uint256 totalReward = staking.reward;
        uint256 periods = _getRewardPeriodsNumber(staking.lastRewardDate);

        _stakes[msg.sender].reward = 0;
        _stakes[msg.sender].lastRewardDate =
            staking.lastRewardDate + periods * _rewardDelay;
        
        totalReward += _calculateCurrentReward(staking.amount, periods);
        _rewardToken.transfer(msg.sender, totalReward);
    }

    function _getRewardPeriodsNumber(uint256 lastRewardDate)
        private
        view
        returns (uint256)
    {
        if (block.timestamp <= lastRewardDate) 
            return 0;
        return (block.timestamp - lastRewardDate) / _rewardDelay;
    }

    function _calculateCurrentReward(
        uint256 stakedAmount,
        uint256 numberOfPeriods
    ) private view returns (uint256) {
        return numberOfPeriods * (stakedAmount * _rewardPercentage / 100);
    }
}
