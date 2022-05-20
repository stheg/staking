//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

interface IERC20 {
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed from,
        address indexed spender,
        uint256 value
    );
}

interface IMintableERC20 is IERC20 {
    function mint(address to, uint256 value) external;
}